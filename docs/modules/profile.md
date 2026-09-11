# ApplynTrack — Profile Module

Status: Built — UI redesign pending
Last updated: September 2026

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

Errors: missing or invalid token returns `401 { "error": "Unauthorized" }`; no local user returns `404 { "error": "User not found" }`; unexpected failures return `500 { "error": "Internal server error" }`.

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

Errors: `400 { "error": "No file uploaded" }`; `400 { "error": "Only PDF files are allowed" }`; `500 { "error": "Failed to upload to storage" }`; unexpected failures return `500 { "error": "Internal server error" }`.

---

## 3. Page Location

```text
app/(protected)/profile/page.tsx
```

---

## 4. Sections in Render Order

### Profile section

The profile section renders `name`, `targetRole`, and `experienceLevel` text inputs. `GET /api/user/profile` loads them on mount. `name` has a value from Clerk user creation; for new users, `targetRole` and `experienceLevel` can be `null`, so initialize them with `?? ""`.

The Save button calls `PUT /api/user/profile` with the current three fields.

- On success, update the profile state in place and show `Profile saved.` below the button.
- On failure, render the API error message in red below the button.

### Resume section

The resume stored here is the input to Resume Analysis for every application.

#### No Resume Uploaded

Render a dashed, muted-text card with:

- `No resume uploaded yet.`
- `Upload a resume to unlock AI resume analysis on your applications.`
- A file picker and `Upload` button.

The empty-state border color is `#E5E7EB`.

#### Resume Uploaded

Render a green-bordered card with a checkmark rendered as text (`✓`) and:

- `Resume uploaded`
- A `View current resume` link that opens the Supabase URL in a new tab
- A file picker labelled `Replace resume`
- An `Upload` button

Replacing is the same upload flow; the backend overwrites the user's existing `resume.pdf` and returns the new URL.

#### Client-side validation and successful upload

Before calling the API:

1. When no file is selected, show `Please select a PDF file.` and return.
2. When `selectedFile.type !== "application/pdf"`, show `Only PDF files are allowed.` and return.

On success, use the `POST /api/user/resume` response to:

1. Update `profile.resumeUrl` in state immediately.
2. Avoid a full profile re-fetch.
3. Set `selectedFile` to `null`.
4. Show `Resume uploaded successfully.`.

---

## 5. State Variables

```ts
const [profile, setProfile] = useState<User | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

const [name, setName] = useState("")
const [targetRole, setTargetRole] = useState("")
const [experienceLevel, setExperienceLevel] = useState("")
const [savingProfile, setSavingProfile] = useState(false)
const [profileSaved, setProfileSaved] = useState(false)
const [profileError, setProfileError] = useState<string | null>(null)

const [selectedFile, setSelectedFile] = useState<File | null>(null)
const [uploadingResume, setUploadingResume] = useState(false)
const [uploadError, setUploadError] = useState<string | null>(null)
const [uploadSuccess, setUploadSuccess] = useState(false)
```

Each operation has its own loading boolean and error string, so profile saving and resume uploading can succeed or fail independently.

---

## 6. Loading and Error States

| State | What to show |
|---|---|
| Initial load in flight | **"Loading profile..."** full page |
| Load error | Error message in red, full page |
| Profile not found | **"Profile not found."** — should not happen if `syncUser` ran on layout mount |
| Saving profile | Save button shows **"Saving..."**, disabled |
| Profile saved | **"Profile saved."** in green below the button |
| Profile save error | Error message in red below the button |
| No file selected on upload | **"Please select a PDF file."** in red |
| Non-PDF file selected | **"Only PDF files are allowed."** in red |
| Upload in progress | Upload button shows **"Uploading..."**, disabled |
| Upload success | **"Resume uploaded successfully."** in green; `resumeUrl` updates in place |
| Upload error | Error message in red below the upload button |

`getToken` is added to the `useEffect` dependency array with a null guard.

Without this, `targetRole` and `experienceLevel` fields were appearing empty on mount even when values existed in the database — Clerk was not fully initialized when the effect first fired.

```ts
useEffect(() => {
  const load = async () => {
    const token = await getToken()
    if (!token) return
    // ...
  }

  load()
}, [getToken])
```

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

No known limitations are documented for this page.
