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

### Header and identity

The header reads `Profile` with the subline `Your details and the resume used for AI fit.`. A `You` section shows the user's avatar (profile picture, else initials), saved name, email, and a `Managed by your Google sign-in` note. The email is read-only here and comes from the profile response.

### Profile section

The profile section renders `name`, `targetRole`, and `experienceLevel` text inputs in a two-column grid. `useProfile()` owns the `GET /api/user/profile` request and its user-scoped cache. The fields initialize once per fetched profile ID, with `?? ""` for nullable values, so a refetch does not overwrite edits in progress.

The `Save Profile` button calls `PUT /api/user/profile` with the current three fields.

- On success, `useUpdateProfile()` writes the returned user into the profile cache and shows `Profile saved.` beside the button.
- On failure, render the API error message in red beside the button.

### Resume section

The resume stored here is the input to Resume Analysis for every application. Choosing a PDF uploads it immediately; there is no separate `Upload` button. The hidden file input accepts `.pdf`, and a PDF can also be dropped onto the empty-state box.

#### No resume uploaded

A dashed drop zone shows `Upload your resume`, `Unlocks AI resume fit on your applications. PDF only, up to 5 MB.` and a `Choose PDF` button.

#### Resume uploaded

A file row shows a file icon, the file name taken from the stored URL (`resume.pdf`), `PDF`, a `View` link that opens the Supabase URL in a new tab, and a `Replace` button. `Replace` opens a small warning popover, `Replace your resume?` / `Saved AI fit results for your applications will be cleared. You can re-analyze any application afterwards.`, with `Cancel` and `Choose new PDF`. `Choose new PDF` opens the file picker. The design's file size and upload date are not displayed because the profile has no such data.

While an upload is in flight the row shows `Uploading…` with a thin pulsing bar along its bottom edge, and `View` and `Replace` are disabled. Replacing is the same upload flow; the backend overwrites the user's existing `resume.pdf` and returns the new URL.

#### Client-side validation and successful upload

Before calling the API:

1. When no file is passed to the handler, show `Please select a PDF file.` and return (not reachable from the normal picker).
2. When `selectedFile.type !== "application/pdf"`, show `Only PDF files are allowed.` and return.

On success, `useUploadResume()` writes the returned `resumeUrl` and `resumeText` into the cached profile, replaces all cached resume analyses for the signed-in user with `null`, clears the file input, and shows `Resume uploaded successfully.` in green mono type. No full profile re-fetch is needed. A hint under the section reads `PDF only, up to 5 MB. This resume is used for AI fit on every application.`

---

## 5. State Variables

```ts
const [name, setName] = useState("")
const [targetRole, setTargetRole] = useState("")
const [experienceLevel, setExperienceLevel] = useState("")
const [profileSaved, setProfileSaved] = useState(false)
const [profileError, setProfileError] = useState<string | null>(null)

const [initializedFor, setInitializedFor] = useState<string | null>(null)
const [replaceWarningOpen, setReplaceWarningOpen] = useState(false)
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
| Profile saved | **"Profile saved."** in green beside the button |
| Profile save error | Error message in red beside the button |
| No file passed to the upload handler | **"Please select a PDF file."** in red |
| Non-PDF file selected | **"Only PDF files are allowed."** in red |
| Upload in progress | File row shows **"Uploading…"** with a pulsing bar and `View`/`Replace` disabled; in the empty state `Choose PDF` shows **"Uploading..."**, disabled |
| Upload success | **"Resume uploaded successfully."** in green; profile cache updates in place and cached resume analyses clear |
| Upload error | Error message in red below the resume section |

The fields initialize during render the first time a profile ID arrives (guarded by `initializedFor`) and never again for that ID.


---

## 7. What Is Deliberately Not Here

| Item | Reason excluded |
|---|---|
| Editable email | Email is managed by Clerk — it is shown read-only |
| Profile picture upload | Managed by Clerk — not in scope |
| Password change | Clerk handles auth — no passwords in the system |
| Resume delete without replace | No use case — a user always wants a resume present |
| Zod validation | Deferred — client-side type check on file is sufficient for now |

---

## 8. Known Limitations

- Resume files are served from a public Supabase Storage URL. Anyone with the URL can access the file.
- The redesigned sidebar footer shows name and email instead of the target role, so the old `publicMetadata.targetRole` read (CB-06) no longer exists in the code. The role saved here is still not shown in the sidebar.
- The resume upload has no size limit and does not reject a PDF with no extractable text. See `docs/code-bugs.md` CB-02.
