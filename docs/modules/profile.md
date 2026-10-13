# ApplynTrack — Profile Module

Status: Built
Last updated: October 2026

## 1. Module Overview

The profile page lets a user update their local profile and upload the single resume used by Resume Analysis across applications; it is a utility page, but an uploaded resume is required before Resume Analysis can work.

---

## 2. Backend API Contract

All routes require `Authorization: Bearer <token>`. Get a fresh token with `const token = await getToken()` before each call. Do not send a `userId`; the backend derives it from the validated Clerk token.

### User response shape

The user object returned by profile endpoints has this shape:

```json
{
  "id": "cmp07oqw40000r9w593fvr195",
  "clerkId": "user_3DXzII2iaUCBA70MGr62tfNIGzG",
  "name": "Nitish Jha",
  "email": "nitish11jha@gmail.com",
  "profilePicture": "https://img.clerk.com/...",
  "targetRole": "Backend Developer",
  "experienceLevel": "Fresher",
  "resumeUrl": "https://...supabase.co/storage/v1/object/public/resumes/.../resume.pdf",
  "resumeText": "Full extracted text of the resume...",
  "createdAt": "2026-05-10T20:14:40.420Z",
  "updatedAt": "2026-08-18T11:39:26.856Z"
}
```

### GET /api/user/profile

No request body.

Response `200`:

```json
{ "user": { "id": "...", "clerkId": "...", "name": "...", "email": "...", "profilePicture": "...", "targetRole": "...", "experienceLevel": "...", "resumeUrl": "...", "resumeText": "...", "createdAt": "...", "updatedAt": "..." } }
```

Errors: missing or invalid token returns `401 { "error": "Unauthorized" }`; a valid Clerk token without a local user returns `401 { "error": "User not found. Please sync first." }` (from `requireUser`, the same as every other protected route); unexpected failures return `500 { "error": "Internal server error" }`. The controller also contains a `404 { "error": "User not found" }` branch, but `requireUser` runs first, so that response is effectively never returned (see `docs/code-bugs.md` CB-14).

### PUT /api/user/profile

All request fields are optional.

```json
{
  "name": "Nitish Jha",
  "targetRole": "Backend Developer",
  "experienceLevel": "Fresher"
}
```

Response `200`:

```json
{ "user": { "id": "...", "clerkId": "...", "name": "...", "email": "...", "profilePicture": "...", "targetRole": "...", "experienceLevel": "...", "resumeUrl": "...", "resumeText": "...", "createdAt": "...", "updatedAt": "..." } }
```

Errors: missing or invalid token returns `401 { "error": "Unauthorized" }`; a valid Clerk token without a local user returns `401 { "error": "User not found. Please sync first." }`; unexpected failures return `500 { "error": "Internal server error" }`.

### POST /api/user/resume

Send multipart form data. The field name must be `resume`, and only PDF files are accepted.

```ts
const formData = new FormData()
formData.append("resume", file)

fetch(`${API_URL}/api/user/resume`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${token}` },
  body: formData,
})
```

Do **not** set `Content-Type` manually. The browser sets `multipart/form-data` with the required boundary. This request intentionally bypasses the JSON `apiFetch` helper and uses raw `fetch` through `uploadResume`.

Response `200`:

```json
{
  "message": "Resume uploaded successfully",
  "resumeUrl": "https://...supabase.co/storage/v1/object/public/resumes/.../resume.pdf",
  "resumeText": "Extracted text content of the PDF..."
}
```

Errors: `400 { "error": "No file uploaded" }`; `400 { "error": "Only PDF files are allowed" }`; `500 { "error": "Failed to upload to storage" }`; unexpected failures return `500 { "error": "Internal server error" }`, including a PDF that `pdf2json` cannot parse.

The upload has no file-size limit, and the PDF check uses only the client-declared mimetype. Errors raised by `multer` itself (for example an unexpected form field name) are not caught by the controller, and the exact response was not verified; do not rely on it having the `{ "error": ... }` shape. A PDF with no extractable text (for example a scanned image) is accepted and stored with empty `resumeText`. Known issue — see `docs/code-bugs.md` CB-02.

---

## 3. Page Location

```text
app/(protected)/profile/page.tsx
```

---

## 4. Sections in Render Order

### Profile section

The profile section renders `name`, `targetRole`, and `experienceLevel` text inputs. `useProfile()` owns the `GET /api/user/profile` request and its user-scoped cache. The fields initialize once per fetched profile ID, with `?? ""` for nullable values, so a refetch does not overwrite edits in progress.

The Save button calls `PUT /api/user/profile` with the current three fields.

- On success, `useUpdateProfile()` writes the returned user into the profile cache and shows `Profile saved.` below the button.
- On failure, render the API error message in red below the button.

### Resume section

The resume stored here is the input to Resume Analysis for every application.

#### No Resume Uploaded

Render a muted card with a dashed border (`#D1D5DB`) on a light gray background (`#F9FAFB`), containing:

- `No resume uploaded yet.`
- `Upload a resume to unlock AI resume analysis on your applications.`

Below the card, a file picker labelled `Upload resume` and an `Upload` button render. The picker is a `Choose File` button with a file-name label that reads `No file chosen` until a file is selected; the native input is hidden and accepts `.pdf`.

#### Resume Uploaded

Render an orange-tinted card (background `#FFF8F5`, border `#FFD9C7`) with a filled orange circle holding a white SVG checkmark (not a text character) and:

- `Resume uploaded`
- A `View current resume` link that opens the Supabase URL in a new tab
- Below the card, the same file picker, labelled `Replace resume`
- An `Upload` button

Replacing is the same upload flow; the backend overwrites the user's existing `resume.pdf` and returns the new URL.

#### Client-side validation and successful upload

Before calling the API:

1. When no file is selected, show `Please select a PDF file.` and return.
2. When `selectedFile.type !== "application/pdf"`, show `Only PDF files are allowed.` and return.

On success, `useUploadResume()` writes the returned `resumeUrl` and `resumeText` into the cached profile, replaces all cached resume analyses for the signed-in user with `null`, clears `selectedFile` and the file input, and shows `Resume uploaded successfully.`. No full profile re-fetch is needed.

---

## 5. State Variables

```ts
const [name, setName] = useState("")
const [targetRole, setTargetRole] = useState("")
const [experienceLevel, setExperienceLevel] = useState("")
const [profileSaved, setProfileSaved] = useState(false)
const [profileError, setProfileError] = useState<string | null>(null)

const [selectedFile, setSelectedFile] = useState<File | null>(null)
const [uploadError, setUploadError] = useState<string | null>(null)
const [uploadSuccess, setUploadSuccess] = useState(false)
```

Server data, initial loading, and query errors come from `useProfile()`. `useUpdateProfile()` and `useUploadResume()` expose their own `isPending` state; the page keeps only UI input and feedback state.

---

## 6. Loading and Error States

| State | What to show |
|---|---|
| Initial load in flight | Full-page `Skeleton` placeholders |
| Load error | Error message in red, full page |
| Profile not found | **"Profile not found."** — should not happen if `syncUser` ran on layout mount |
| Saving profile | Save button shows **"Saving..."**, disabled |
| Profile saved | **"Profile saved."** in green below the button |
| Profile save error | Error message in red below the button |
| No file selected on upload | **"Please select a PDF file."** in red |
| Non-PDF file selected | **"Only PDF files are allowed."** in red |
| Upload in progress | Upload button shows **"Uploading..."**, disabled |
| Upload success | **"Resume uploaded successfully."** in green; profile cache updates in place and cached resume analyses clear |
| Upload error | Error message in red below the upload button |

The form initialization runs after profile data arrives and only once for that profile ID.


---

## 7. What Is Deliberately Not Here

| Item | Reason excluded |
|---|---|
| Email field | Email is managed by Clerk — not editable from the app |
| Profile picture upload | Managed by Clerk — not in scope |
| Password change | Clerk handles auth — no passwords in the system |
| Resume delete without replace | No use case — a user always wants a resume present |
| Zod validation | Deferred — client-side type check on file is sufficient for now |

---

## 8. Known Limitations

- Resume files are served from a public Supabase Storage URL. Anyone with the URL can access the file.
- The sidebar shows the user's target role from Clerk `publicMetadata.targetRole` (`frontend/app/components/Sidebar.tsx:39`), not from the profile saved here. The app never writes that metadata, so the role entered on this page does not appear in the sidebar. Known issue — see `docs/code-bugs.md` CB-06.
- The resume upload has no size limit and does not reject a PDF with no extractable text. See `docs/code-bugs.md` CB-02.
