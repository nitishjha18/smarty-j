# ApplynTrack - Backend API Contract

This document is the complete reference for the ApplynTrack backend API.
It is written for frontend developers and AI assistants building the frontend.
Do not modify the backend based on this document. The backend implementation is the source of truth.

Last updated: October 29, 2026

Where the backend behaves differently from what a contract would normally promise, this document describes the real behavior and lists the gap under "Remaining Backend Work".

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

### Global error responses

Every endpoint can also return one of these shared error shapes. The body is always `{ "error": "<message>" }`:

| Status | Message | When |
|---|---|---|
| 400 | `Invalid JSON in request body` | Request body is not valid JSON. |
| 400 | `Invalid request data` | Prisma rejected an input (bad enum, bad date, wrong type, foreign key failure). |
| 400 | `Invalid file upload` | A multer error other than file-size. |
| 404 | `Route not found` | Unknown route. |
| 404 | `Resource not found` | Prisma `P2025` (record not found). |
| 409 | `Resource already exists` | Prisma `P2002` (unique constraint). |
| 413 | `File is too large. Maximum size is 5 MB.` | Resume upload exceeded the size limit. |
| 500 | `Internal server error` | Any unhandled error. Internal details (Prisma, Gemini, stack traces) are not exposed. |
| 503 | `AI analysis is temporarily unavailable. Please try again in a moment.` | Gemini call, JSON parse, or shape validation failed on an AI endpoint. |

Every response also includes an `X-Request-Id` header that correlates with backend logs. The backend reuses an incoming `X-Request-Id` request header when present and generates a UUID otherwise.

How errors are produced: controllers and services throw an `AppError` (`backend/src/utils/AppError.ts`) with an explicit status code and a client-safe message, or let any other error propagate. One global Express error handler (`backend/src/middleware/errorHandler.ts`) turns the error into the response. It is registered after all routes, behind a JSON `404 { "error": "Route not found" }` handler for unknown routes. Errors with status 500 or higher are logged at `error` level with the stack; lower statuses are logged at `warn`. Request bodies, the `Authorization` header and cookies are never logged.

Input validation is limited to a few manual required-field checks (listed per endpoint below). There is no schema validator, so a wrongly typed value is only caught when Prisma rejects it, which returns `400 { "error": "Invalid request data" }`.

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
- API responses parse `missingKeywords`, `strongestPoints`, `redFlags` and `suggestions` into arrays, in both the POST and the GET response.
- `suggestions` is always stored as the JSON string `"[]"` and is reserved for future use; both endpoints return it as an empty array.
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

Response 400 when the Clerk user has no email address:

```json
{ "error": "Clerk user has no email address" }
```

Response 500 (for example when the Clerk API call fails):

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

The controller also contains a `404 { "error": "User not found" }` branch, but `requireUser` runs first, so that response is effectively never returned.

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

The controller does not validate the body. Fields are passed straight to Prisma, so an empty string is saved as-is and a non-string value returns `400 { "error": "Invalid request data" }`.

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

```json
{ "error": "Could not read this PDF. Please upload a different file." }
```

```json
{ "error": "No readable text found in this PDF. Please upload a text-based PDF, not a scanned image." }
```

Response 413:

```json
{ "error": "File is too large. Maximum size is 5 MB." }
```

Response 500:

```json
{ "error": "Failed to upload to storage" }
```

```json
{ "error": "Internal server error" }
```

Notes:

- The upload has a 5 MB size limit enforced by `multer`.
- The PDF check uses the client-declared mimetype.
- If `pdf2json` cannot parse the file, the response is `400 { "error": "Could not read this PDF. Please upload a different file." }`.
- If the extracted text is empty or whitespace only (for example a scanned image PDF), the response is `400 { "error": "No readable text found in this PDF. Please upload a text-based PDF, not a scanned image." }` and the file is not uploaded to storage.

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

Single-application endpoints return `404 { "error": "Application not found" }` when the application does not exist or belongs to another user. An invalid `status`, `source`, or `dateApplied` value is mapped to `400 { "error": "Invalid request data" }` by the global error handler. Any unexpected failure is `500 { "error": "Internal server error" }`; raw Prisma or database messages are never returned to the client.

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
{ "error": "No job description found for this application." }
```

Response 404:

```json
{ "error": "Application not found." }
```

Response 503:

```json
{ "error": "AI analysis is temporarily unavailable. Please try again in a moment." }
```

Returned when the Gemini call fails (network, 401/403 bad API key, 429/503 overload) or its response cannot be parsed or does not match the expected shape. The original Gemini error is logged, never returned to the client.

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

`suggestions` is returned as an array (parsed from the stored JSON string). The frontend does not read the field.

Response 200 when no saved analysis exists:

```json
{ "analysis": null }
```

Response 404:

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

An unparseable `reminderDate` becomes an invalid `Date`, which Prisma rejects: `400 { "error": "Invalid request data" }`.

Response 404:

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

This endpoint updates only `reminderDate` and `notes`. It does not reset `isSent`, so a reminder that has already been sent stays `isSent: true` after a reschedule, and the cron job (which selects only `isSent: false`) never sends it again.

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

Response 404:

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

Response 404:

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
- `staleApplications` counts applications with status `APPLIED` whose `dateApplied` is earlier than the current time minus 14 days (server local time, strict `<`). The frontend does not use this field; the dashboard computes its own count. The product defines "stale" in several slightly different ways (this stat, the dashboard page, and the Applications board's header count and card label), so the numbers can disagree.
- Unexpected failures are mapped by the global error handler (see the top of this document).
- Rates are rounded integers from 0 to 100.

---

## Remaining Backend Work

The following items are intentionally deferred until after the functional frontend is complete. Do not implement these during frontend development unless the backend task explicitly asks for them.

- Input validation with Zod or a similar validator. Validation is limited to the manual required-field checks described per endpoint; everything else relies on Prisma rejecting bad values with `400 Invalid request data`.
- `.gitignore` cleanup. `backend/.gitignore` lists `/generated/prisma`, but the generated client lives at `backend/src/generated/prisma`, and no `.gitignore` excludes `backend/dist`.
- Unused backend dependencies: `axios`, `jsonwebtoken`, `@types/jsonwebtoken` and `@types/pdf-parse` are not imported anywhere in `backend/src`.
- Automated tests. No backend test suite or test script exists.
- Resume upload: the PDF check trusts the client-declared mimetype (`req.file.mimetype`), not the file contents.
- Reminder content hardening. The reminder email HTML inserts the user's name, job title, company name and note without escaping, and `PUT /api/reminders/:id` does not reset `isSent`.
- `getProfileController` has a `404 User not found` branch that is unreachable because `requireUser` runs first.

---

## Notes For Frontend Development

- Never hardcode `http://localhost:5000`; always use `process.env.NEXT_PUBLIC_API_URL`. The frontend itself falls back to `http://localhost:5000` when the variable is missing, so a missing value fails silently in a deployment. `frontend/next.config.ts` also rewrites `/api/*` to `http://localhost:5000` and lists a personal ngrok host in `allowedDevOrigins`.
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
