# ApplynTrack - Backend API Contract

This document is the complete reference for the ApplynTrack backend API.
It is written for frontend developers and AI assistants building the frontend.
Do not modify the backend based on this document. The backend implementation is the source of truth.

Last updated: October 2026

Where the backend behaves differently from what a contract would normally promise, this document describes the real behavior and links to the matching entry in `docs/code-bugs.md`.

---

## Base URL

```txt
http://localhost:5000
```

In production this will be the Railway deployment URL. Use an environment variable:

```txt
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Authentication

Every endpoint except `/health` requires a Clerk bearer token.

The token comes from Clerk's `useAuth` hook on the frontend:

```ts
const { getToken } = useAuth()
const token = await getToken()
```

Send it as an Authorization header on every protected request:

```ts
headers: {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
}
```

The token expires frequently. Always call `getToken()` fresh before each request; Clerk caches it internally.

If the token is missing or invalid the backend returns:

```json
{ "error": "Unauthorized" }
```

with status 401.

For all protected routes except `/api/user/sync`, the backend also requires a matching local database user. If the Clerk user exists but has not been synced locally, the backend returns:

```json
{ "error": "User not found. Please sync first." }
```

with status 401.

---

## Enum Values

Use these exact strings when sending `source` or `status` values. Any other value will fail at the Prisma/database layer.

### ApplicationStatus

```txt
APPLIED
SCREENING
INTERVIEW
ASSIGNMENT
OFFER
REJECTED
```

### ApplicationSource

```txt
LINKED_IN
NAUKARI
REFERAL
COLDEMAIL
SOCIAL_MEDIA
OTHER_JOB_APPS
```

Note: `NAUKARI`, `REFERAL`, and `COLDEMAIL` are intentional legacy spellings in the schema. Do not correct them in frontend payloads.

---

## Schema Field Names

Critical: these are the exact field names the backend uses. Do not assume alternatives.

### User

```txt
id
clerkId
name
email
profilePicture
targetRole
experienceLevel
resumeUrl
resumeText
createdAt
updatedAt
```

### Application

```txt
id
userId
companyName
companyDomain      <- optional, null if not set; a bare domain like "zomato.com"
jobTitle          <- NOT "role" or "title"
jobDescription
status
source
dateApplied       <- NOT "appliedAt" or "date"
notes
createdAt
updatedAt
```

### StatusHistory

```txt
id
applicationId
status
createdAt
```

### ResumeAnalysis

```txt
id
applicationId
matchScore
missingKeywords
strongestPoints
redFlags
recruiterTake
suggestions
createdAt
updatedAt
```

Notes:

- The database stores `missingKeywords`, `strongestPoints`, `redFlags`, and `suggestions` as JSON strings.
- API responses parse `missingKeywords`, `strongestPoints` and `redFlags` into arrays. `suggestions` is parsed by the POST response only (see below).
- `suggestions` is always stored as the JSON string `"[]"` and is reserved for future use. `POST /api/ai/analyze-resume` returns it as an empty array, but `GET /api/ai/resume-analysis/:appId` returns the raw string `"[]"` because the GET path does not parse it. Known issue — see `docs/code-bugs.md` CB-07.
- There is at most one `ResumeAnalysis` per application. Re-running analysis overwrites the previous saved result.

### Reminder

```txt
id
userId
applicationId
reminderDate
isSent            <- NOT "sent"
notes
createdAt
updatedAt
```

---

## Endpoints

---

### Health Check

```http
GET /health
```

No auth required.

Response 200:

```json
{ "message": "Job tracker's server is live" }
```

---

## User Module

---

### Sync User

```http
POST /api/user/sync
```

Call this on every app load after sign in. It creates the local user if they do not exist. It is safe to call multiple times.

No request body is needed.

Response 200:

```json
{
  "user": {
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
}
```

Response 401:

```json
{ "error": "Unauthorized" }
```

Response 500:

```json
{ "error": "Internal server error" }
```

---

### Get User Profile

```http
GET /api/user/profile
```

Response 200:

```json
{
  "user": {
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
}
```

Response 401 when the Clerk user has no local user:

```json
{ "error": "User not found. Please sync first." }
```

Response 500:

```json
{ "error": "Internal server error" }
```

The controller also contains a `404 { "error": "User not found" }` branch, but `requireUser` runs first, so that response is effectively never returned. See `docs/code-bugs.md` CB-14.

---

### Update User Profile

```http
PUT /api/user/profile
```

Request body, all fields optional:

```json
{
  "name": "Nitish Jha",
  "targetRole": "Backend Developer",
  "experienceLevel": "Fresher"
}
```

Response 200:

```json
{
  "user": {
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
}
```

Response 401 and 500: same as Get User Profile (`Unauthorized`; `User not found. Please sync first.`; `Internal server error`).

---

### Upload Resume

```http
POST /api/user/resume
```

Send as `multipart/form-data`. Field name must be `resume`. Only PDF files are accepted.

```txt
Content-Type: multipart/form-data
Body: form-data key="resume" value=<PDF file>
```

Do not send this endpoint as JSON. Use `FormData` in the frontend:

```ts
const formData = new FormData()
formData.append("resume", file)

fetch(`${API_URL}/api/user/resume`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${token}` },
  body: formData
  // Do not set Content-Type. The browser sets the multipart boundary.
})
```

Behavior:

- The PDF is uploaded to the Supabase `resumes` bucket at `<userId>/resume.pdf`.
- The file path uses `upsert: true`, so a new upload replaces the previous resume file.
- Text is extracted from the PDF and stored in `user.resumeText`.
- All saved `ResumeAnalysis` rows for the user's applications are deleted so future analysis is based on the new resume.

Response 200:

```json
{
  "message": "Resume uploaded successfully",
  "resumeUrl": "https://...supabase.co/storage/v1/object/public/resumes/.../resume.pdf",
  "resumeText": "Extracted text content of the PDF..."
}
```

Response 400:

```json
{ "error": "No file uploaded" }
```

```json
{ "error": "Only PDF files are allowed" }
```

Response 500:

```json
{ "error": "Failed to upload to storage" }
```

```json
{ "error": "Internal server error" }
```

The last response also covers a PDF that `pdf2json` cannot parse.

Known limits of this endpoint (see `docs/code-bugs.md` CB-02):

- There is no file-size limit. `multer` uses memory storage with no `limits`.
- The PDF check uses only the client-declared mimetype.
- A `multer` error (for example an unexpected form field name) is not caught by the controller. The exact response was not verified; do not assume it has the `{ "error": ... }` shape.
- A PDF with no extractable text is accepted and stored with empty `resumeText`.

---

## Applications Module

---

### Create Application

```http
POST /api/applications
```

Request body:

```json
{
  "companyName": "Google",
  "companyDomain": "google.com",
  "jobTitle": "Backend Engineer",
  "jobDescription": "Design and build scalable backend systems...",
  "source": "LINKED_IN",
  "notes": "Referral from college senior",
  "dateApplied": "2026-08-20"
}
```

Required: `companyName`, `jobTitle`, `source`

Optional: `jobDescription`, `notes`, `dateApplied`, `companyDomain`

If `jobDescription` is omitted, the backend stores an empty string. If `dateApplied` is omitted, it defaults to the current server time.

`companyDomain` is the company's website domain (for example `zomato.com`). The frontend uses it to show the company logo. Send a bare domain, not a URL. An empty string is treated as not provided, and applications without one return `companyDomain: null`.

Response 201:

```json
{
  "application": {
    "id": "cmsyideb30007ncphs5gpgeph",
    "userId": "cmp07oqw40000r9w593fvr195",
    "companyName": "Google",
    "companyDomain": "google.com",
    "jobTitle": "Backend Engineer",
    "jobDescription": "Design and build scalable backend systems...",
    "status": "APPLIED",
    "source": "LINKED_IN",
    "dateApplied": "2026-08-20T00:00:00.000Z",
    "notes": "Referral from college senior",
    "createdAt": "2026-08-20T10:17:03.663Z",
    "updatedAt": "2026-08-20T10:17:03.663Z"
  }
}
```

Response 400:

```json
{ "error": "companyName, jobTitle, and source are required" }
```

A `StatusHistory` record is automatically created with status `APPLIED`.

---

### List All Applications

```http
GET /api/applications
```

No request body.

Response 200:

```json
{
  "applications": [
    {
      "id": "cmsyideb30007ncphs5gpgeph",
      "userId": "cmp07oqw40000r9w593fvr195",
      "companyName": "Google",
      "companyDomain": "google.com",
      "jobTitle": "Backend Engineer",
      "jobDescription": "Design and build scalable backend systems...",
      "status": "APPLIED",
      "source": "LINKED_IN",
      "dateApplied": "2026-08-20T00:00:00.000Z",
      "notes": "Referral from college senior",
      "createdAt": "2026-08-20T10:17:03.663Z",
      "updatedAt": "2026-08-20T10:17:03.663Z",
      "statusHistory": [
        {
          "id": "cmt0history0001",
          "applicationId": "cmsyideb30007ncphs5gpgeph",
          "status": "APPLIED",
          "createdAt": "2026-08-20T10:17:03.663Z"
        }
      ]
    }
  ]
}
```

Applications are ordered by `dateApplied` descending. Each application includes `statusHistory`, ordered by `createdAt` descending.

---

### Get Single Application

```http
GET /api/applications/:id
```

Response 200:

```json
{
  "application": {
    "id": "cmsyideb30007ncphs5gpgeph",
    "userId": "cmp07oqw40000r9w593fvr195",
    "companyName": "Google",
    "companyDomain": "google.com",
    "jobTitle": "Backend Engineer",
    "jobDescription": "Design and build scalable backend systems...",
    "status": "SCREENING",
    "source": "LINKED_IN",
    "dateApplied": "2026-08-20T00:00:00.000Z",
    "notes": "Referral from college senior",
    "createdAt": "2026-08-20T10:17:03.663Z",
    "updatedAt": "2026-08-21T09:00:00.000Z",
    "statusHistory": [
      {
        "id": "cmt0history0002",
        "applicationId": "cmsyideb30007ncphs5gpgeph",
        "status": "SCREENING",
        "createdAt": "2026-08-21T09:00:00.000Z"
      },
      {
        "id": "cmt0history0001",
        "applicationId": "cmsyideb30007ncphs5gpgeph",
        "status": "APPLIED",
        "createdAt": "2026-08-20T10:17:03.663Z"
      }
    ]
  }
}
```

Response 404:

```json
{ "error": "Application not found" }
```

---

### Update Application

```http
PUT /api/applications/:id
```

Request body, all fields optional:

```json
{
  "companyName": "Google",
  "companyDomain": "google.com",
  "jobTitle": "Senior Backend Engineer",
  "jobDescription": "Updated job description...",
  "source": "LINKED_IN",
  "status": "SCREENING",
  "notes": "Updated notes",
  "dateApplied": "2026-08-20"
}
```

When `status` changes, a new `StatusHistory` record is automatically created.

`companyDomain` can be set or changed here. An empty string is ignored, so a stored domain cannot currently be cleared through this endpoint.

Response 200:

```json
{
  "application": {
    "id": "cmsyideb30007ncphs5gpgeph",
    "userId": "cmp07oqw40000r9w593fvr195",
    "companyName": "Google",
    "companyDomain": "google.com",
    "jobTitle": "Senior Backend Engineer",
    "jobDescription": "Updated job description...",
    "status": "SCREENING",
    "source": "LINKED_IN",
    "dateApplied": "2026-08-20T00:00:00.000Z",
    "notes": "Updated notes",
    "createdAt": "2026-08-20T10:17:03.663Z",
    "updatedAt": "2026-08-21T09:00:00.000Z",
    "statusHistory": [
      {
        "id": "cmt0history0002",
        "applicationId": "cmsyideb30007ncphs5gpgeph",
        "status": "SCREENING",
        "createdAt": "2026-08-21T09:00:00.000Z"
      }
    ]
  }
}
```

Response 404:

```json
{ "error": "Application not found" }
```

---

### Delete Application

```http
DELETE /api/applications/:id
```

Response 200:

```json
{ "message": "Application deleted successfully" }
```

Response 404:

```json
{ "error": "Application not found" }
```

Deleting an application also cascades related `ResumeAnalysis` and `Reminder` rows through database relations. The service explicitly deletes related `StatusHistory` rows.

### Applications module error responses

Every Applications endpoint returns `500` for an unexpected failure. The body is `{ "error": <raw error message> }`, which can be a Prisma or database message, or `"Internal server error"` when a non-`Error` value is thrown. Single-application endpoints return `404 { "error": "Application not found" }` when the application does not exist or belongs to another user. There is no request-body validation: an invalid `status` or `source` value surfaces as a `500` with the Prisma message. See `docs/code-bugs.md` CB-01.

---

## AI Module

The AI module supports resume-to-job analysis.

---

### Analyze Resume

```http
POST /api/ai/analyze-resume
```

Compares the user's stored resume text against the application's job description.

The backend:

- Requires that the user has uploaded a resume first.
- Requires that the application belongs to the current user.
- Requires that the application has a non-empty `jobDescription`.
- Extracts up to 10 missing keywords locally from the job description.
- Calls Gemini for `matchScore`, `strongestPoints`, `redFlags`, and `recruiterTake`.
- Upserts one `ResumeAnalysis` row for the application, replacing any previous analysis for that application.

Request body:

```json
{
  "applicationId": "cmsyideb30007ncphs5gpgeph"
}
```

Response 200:

```json
{
  "analysis": {
    "id": "cmt0analysis0001",
    "applicationId": "cmsyideb30007ncphs5gpgeph",
    "matchScore": 72,
    "missingKeywords": ["docker", "kubernetes", "redis"],
    "strongestPoints": [
      "Backend API experience aligns well with the role.",
      "Database work is relevant to the job description."
    ],
    "redFlags": [
      "The resume does not clearly show production cloud deployment experience."
    ],
    "recruiterTake": "A promising backend candidate, but the resume should show stronger evidence of cloud and scaling experience.",
    "suggestions": [],
    "createdAt": "2026-09-20T01:22:57.000Z",
    "updatedAt": "2026-09-20T01:22:57.000Z"
  }
}
```

Response 400:

```json
{ "error": "applicationId is required" }
```

```json
{ "error": "Resume not found. Please upload your resume first." }
```

```json
{ "error": "Application not found." }
```

```json
{ "error": "No job description found for this application." }
```

Any other `Error` thrown while analysing (for example a Gemini or database failure) is also returned as `400` with the raw error message. `500 { "error": "Internal server error" }` is returned only when a non-`Error` value is thrown. Known issue — see `docs/code-bugs.md` CB-01.

---

### Get Saved Resume Analysis

```http
GET /api/ai/resume-analysis/:appId
```

Fetches the saved resume analysis for an application owned by the current user.

Response 200 when analysis exists:

```json
{
  "analysis": {
    "id": "cmt0analysis0001",
    "applicationId": "cmsyideb30007ncphs5gpgeph",
    "matchScore": 72,
    "missingKeywords": ["docker", "kubernetes", "redis"],
    "strongestPoints": [
      "Backend API experience aligns well with the role.",
      "Database work is relevant to the job description."
    ],
    "redFlags": [
      "The resume does not clearly show production cloud deployment experience."
    ],
    "recruiterTake": "A promising backend candidate, but the resume should show stronger evidence of cloud and scaling experience.",
    "suggestions": "[]",
    "createdAt": "2026-09-20T01:22:57.000Z",
    "updatedAt": "2026-09-20T01:22:57.000Z"
  }
}
```

`suggestions` is the string `"[]"`, not an array, in this response. The POST response returns `[]`. The frontend does not read the field. Known issue — see `docs/code-bugs.md` CB-07.

Response 200 when no saved analysis exists:

```json
{ "analysis": null }
```

Response 400:

```json
{ "error": "Application not found." }
```

As with the POST endpoint, any other `Error` is returned as `400` with its raw message (CB-01).

Important frontend behavior:

- Call `POST /api/ai/analyze-resume` to generate or refresh analysis.
- Call `GET /api/ai/resume-analysis/:appId` to load an existing saved result.
- After `POST /api/user/resume`, previous saved analyses are deleted and this endpoint will return `null` until analysis is run again.

---

## Reminders Module

There is no list reminders endpoint currently. Reminders can be created, updated, and deleted.

Error handling for all three reminder endpoints: any `Error` thrown by the service (including database failures) is returned as `400` with the raw message. `500 { "error": "Internal server error" }` is returned only when a non-`Error` value is thrown. See `docs/code-bugs.md` CB-01.

---

### Create Reminder

```http
POST /api/reminders
```

Request body:

```json
{
  "applicationId": "cmsyideb30007ncphs5gpgeph",
  "reminderDate": "2026-08-25",
  "notes": "Follow up on application status"
}
```

Required: `applicationId`, `reminderDate`

Optional: `notes`

Response 201:

```json
{
  "reminder": {
    "id": "cmt0iijwk000110ec5zyy1zqi",
    "applicationId": "cmsyideb30007ncphs5gpgeph",
    "userId": "cmp07oqw40000r9w593fvr195",
    "reminderDate": "2026-08-25T00:00:00.000Z",
    "isSent": false,
    "notes": "Follow up on application status",
    "createdAt": "2026-08-20T10:17:03.663Z",
    "updatedAt": "2026-08-20T10:17:03.663Z"
  }
}
```

Response 400:

```json
{ "error": "applicationId and reminderDate are required" }
```

```json
{ "error": "Application not found." }
```

---

### Update Reminder

```http
PUT /api/reminders/:id
```

Request body:

```json
{
  "reminderDate": "2026-09-01",
  "notes": "Interview scheduled for 3pm"
}
```

Required: `reminderDate`

Optional: `notes`

This endpoint updates only `reminderDate` and `notes`. It does not reset `isSent`, so a reminder that has already been sent stays `isSent: true` after a reschedule, and the cron job (which selects only `isSent: false`) never sends it again. Known issue — see `docs/code-bugs.md` CB-10.

Response 200:

```json
{
  "reminder": {
    "id": "cmt0iijwk000110ec5zyy1zqi",
    "applicationId": "cmsyideb30007ncphs5gpgeph",
    "userId": "cmp07oqw40000r9w593fvr195",
    "reminderDate": "2026-09-01T00:00:00.000Z",
    "isSent": false,
    "notes": "Interview scheduled for 3pm",
    "createdAt": "2026-08-20T10:17:03.663Z",
    "updatedAt": "2026-08-21T09:00:00.000Z"
  }
}
```

Response 400:

```json
{ "error": "reminderDate is required" }
```

```json
{ "error": "Reminder not found." }
```

---

### Delete Reminder

```http
DELETE /api/reminders/:id
```

Response 200:

```json
{ "message": "Reminder deleted successfully" }
```

Response 400:

```json
{ "error": "Reminder not found." }
```

---

## Dashboard Module

---

### Get Stats

```http
GET /api/dashboard/stats
```

Response 200:

```json
{
  "stats": {
    "totalApplications": 12,
    "responseRate": 33,
    "rejectionRate": 25,
    "bestSource": "LINKED_IN",
    "staleApplications": 3
  }
}
```

When there are no applications:

```json
{
  "stats": {
    "totalApplications": 0,
    "responseRate": 0,
    "rejectionRate": 0,
    "bestSource": null,
    "staleApplications": 0
  }
}
```

Field notes:

- `responseRate` is the percentage of applications that moved past `APPLIED`.
- `rejectionRate` is the percentage of applications with `REJECTED` status.
- `bestSource` is the `ApplicationSource` enum value with the most non-`APPLIED` applications, or `null` if there are no responses.
- `staleApplications` counts applications with status `APPLIED` whose `dateApplied` is earlier than the current time minus 14 days (server local time, strict `<`). The frontend does not use this field; the dashboard computes its own count. The product has five different "stale" definitions — see `docs/code-bugs.md` CB-04.
- `GET /api/dashboard/stats` returns `500 { "error": "Internal server error" }` on an unexpected failure.
- Rates are rounded integers from 0 to 100.

---

## Remaining Backend Work

The following items are intentionally deferred until after the functional frontend is complete. Do not implement these during frontend development unless the backend task explicitly asks for them.

- Global error handler middleware. Every controller handles errors with its own try/catch block and the status codes differ by module (CB-01).
- Input validation with Zod or a similar validator. Request body validation is currently manual and incomplete (CB-01).
- Resume upload limits. No file-size limit, and multer errors are not handled (CB-02).
- `.gitignore` cleanup. `backend/dist` and `backend/src/generated/prisma` are tracked in git, and the backend ignore file lists the wrong Prisma path (CB-03).
- Unused backend dependencies (CB-11).
- Automated tests. No backend test suite exists yet (CB-01).
- Reminder delivery hardening. The reminder job exists, but this document only covers CRUD endpoints; known reminder issues are CB-09 and CB-10.

All items are tracked in `docs/code-bugs.md`.

---

## Notes For Frontend Development

- Never hardcode `http://localhost:5000`; always use `process.env.NEXT_PUBLIC_API_URL`. The frontend itself falls back to `http://localhost:5000` when the variable is missing (CB-05).
- Never send `userId` from the frontend. The backend reads the user from the Clerk token and local database.
- The protected frontend layout runs the shared `POST /api/user/sync` query after sign-in; other frontend queries wait for it to succeed.
- The `requireUser` middleware attaches the local DB user to the request for protected routes.
- All timestamps are UTC; convert to local timezone for display.
- Resume upload uses `FormData`, not JSON. Do not set the `Content-Type` header manually for multipart upload.
- Uploading a new resume deletes saved resume analyses. The frontend clears its cached analyses automatically, so active analysis UI reflects the no-analysis state without a manual refresh.
- Frontend responses are cached client-side with TanStack Query under user-scoped query keys.
- The `jobTitle` field is not called `role`.
- The `dateApplied` field is not called `appliedAt`.
- The `isSent` field on `Reminder` is not called `sent`.
- The `companyDomain` field on `Application` is optional and can be `null`. Never send a logo URL; the frontend builds logo URLs from the domain.
- Brandfetch calls (company search and logo images) are made from the browser using `NEXT_PUBLIC_BRANDFETCH_CLIENT_ID`. The backend never calls Brandfetch.
