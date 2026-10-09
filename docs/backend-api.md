# ApplynTrack - Backend API Contract

This document is the complete reference for the ApplynTrack backend API.
It is written for frontend developers and AI assistants building the frontend.
Do not modify the backend based on this document. The backend implementation is the source of truth.

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

Note: `NAUKARI` and `REFERAL` are intentional legacy spellings in the schema. Do not correct them in frontend payloads.

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
- API responses parse those fields into arrays.
- `suggestions` currently returns an empty array and is reserved for future use.
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

Response 404:

```json
{ "error": "User not found" }
```

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

---

## AI Module

The AI module now supports resume-to-job analysis. The previous interview-prep, save-answers, and get-answers endpoints were removed when `AiInterview` and `AiInterviewQuestion` were replaced by `ResumeAnalysis`.

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
    "suggestions": [],
    "createdAt": "2026-09-20T01:22:57.000Z",
    "updatedAt": "2026-09-20T01:22:57.000Z"
  }
}
```

Response 200 when no saved analysis exists:

```json
{ "analysis": null }
```

Response 400:

```json
{ "error": "Application not found." }
```

Important frontend behavior:

- Call `POST /api/ai/analyze-resume` to generate or refresh analysis.
- Call `GET /api/ai/resume-analysis/:appId` to load an existing saved result.
- After `POST /api/user/resume`, previous saved analyses are deleted and this endpoint will return `null` until analysis is run again.

---

## Reminders Module

There is no list reminders endpoint currently. Reminders can be created, updated, and deleted.

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
- `staleApplications` counts applications still in `APPLIED` status after more than 14 days.
- Rates are rounded integers from 0 to 100.

---

## Remaining Backend Work

The following items are intentionally deferred until after the functional frontend is complete. Do not implement these during frontend development unless the backend task explicitly asks for them.

- Global error handler middleware. Most controllers still handle errors with local try/catch blocks.
- Input validation with Zod or a similar validator. Request body validation is currently manual and incomplete.
- `.gitignore` cleanup. `dist`, generated Prisma files, and environment files may not be fully ignored.
- Automated tests. No backend test suite exists yet.
- Reminder delivery hardening. The reminder job exists, but API documentation only covers CRUD endpoints.
- UI polish pass. This comes after the functional frontend is working.

---

## Notes For Frontend Development

- Never hardcode `http://localhost:5000`; always use `process.env.NEXT_PUBLIC_API_URL`.
- Never send `userId` from the frontend. The backend reads the user from the Clerk token and local database.
- Call `POST /api/user/sync` after sign in before calling routes protected by `requireUser`.
- The `requireUser` middleware attaches the local DB user to the request for protected routes.
- All timestamps are UTC; convert to local timezone for display.
- Resume upload uses `FormData`, not JSON. Do not set the `Content-Type` header manually for multipart upload.
- Uploading a new resume deletes saved resume analyses. Refresh any resume-analysis UI after upload.
- The `jobTitle` field is not called `role`.
- The `dateApplied` field is not called `appliedAt`.
- The `isSent` field on `Reminder` is not called `sent`.
- The `companyDomain` field on `Application` is optional and can be `null`. Never send a logo URL; the frontend builds logo URLs from the domain.
- Brandfetch calls (company search and logo images) are made from the browser using `NEXT_PUBLIC_BRANDFETCH_CLIENT_ID`. The backend never calls Brandfetch.
- Removed AI interview endpoints should not be called: `/api/ai/interview-prep`, `/api/ai/save-answers`, and `/api/ai/answers/:appId`.
