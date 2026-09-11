# ApplynTrack — Backend API Contract

This document is the complete reference for the ApplynTrack backend API.
It is written for frontend developers and AI assistants building the frontend.
Do not modify the backend based on this document — the backend is complete and tested.

---

## Base URL

```
http://localhost:5000
```

In production this will be the Railway deployment URL. Use an environment variable:

```
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

Send it as an Authorization header on every request:

```ts
headers: {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
}
```

The token expires every 60 seconds. Always call `getToken()` fresh before each request — Clerk caches it internally so this is not expensive.

If the token is missing or invalid the backend returns:
```json
{ "error": "Unauthorized" }
```
with status 401.

If the user exists in Clerk but not in the local database, the backend returns:
```json
{ "error": "User not found. Please sync first." }
```
with status 401.

---

## Enum Values

Use these exact strings when sending source or status values. Any other value will fail.

### ApplicationStatus
```
APPLIED
SCREENING
INTERVIEW
ASSIGNMENT
OFFER
REJECTED
```

### ApplicationSource
```
LINKED_IN
NAUKARI
REFERAL
COLDEMAIL
SOCIAL_MEDIA
OTHER_JOB_APPS
```

Note: NAUKARI, REFERAL are intentional legacy spellings in the schema. Do not correct them.

---

## Schema Field Names

Critical — these are the exact field names the backend uses. Do not assume alternatives.

### User
```
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
```
id
userId
companyName
jobTitle          ← NOT "role" or "title"
jobDescription
status
source
dateApplied       ← NOT "appliedAt" or "date"
notes
createdAt
updatedAt
```

### StatusHistory
```
id
applicationId
status
createdAt
```

### AiInterview
```
id
applicationId
overallScore
overallFeedback
createdAt
updatedAt
```

### AiInterviewQuestion
```
id
aiInterviewId
question
userAnswer
questionNumber
createdAt
updatedAt
```

### Reminder
```
id
userId
applicationId
reminderDate
isSent            ← NOT "sent"
notes
createdAt
updatedAt
```

---

## Endpoints

---

### Health Check

```
GET /health
```

No auth required.

Response 200:
```json
{ "message": "Job tracker's server is live" }
```

---

### User Module

---

#### Sync User

```
POST /api/user/sync
```

Call this on every app load after sign in. Creates the local user if they don't exist. Safe to call multiple times — idempotent.

No request body needed.

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

#### Get User Profile

```
GET /api/user/profile
```

Response 200: same shape as sync response above.

Response 404:
```json
{ "error": "User not found" }
```

---

#### Update User Profile

```
PUT /api/user/profile
```

Request body (all fields optional):
```json
{
  "name": "Nitish Jha",
  "targetRole": "Backend Developer",
  "experienceLevel": "Fresher"
}
```

Response 200: full updated user object.

---

#### Upload Resume

```
POST /api/user/resume
```

Send as multipart/form-data. Field name must be `resume`. Only PDF files accepted.

```
Content-Type: multipart/form-data
Body: form-data key="resume" value=<PDF file>
```

Do NOT send as JSON. Use FormData in the frontend:

```ts
const formData = new FormData()
formData.append("resume", file)

fetch(`${API_URL}/api/user/resume`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${token}` },
  body: formData
  // Do NOT set Content-Type header — browser sets it automatically with boundary
})
```

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
{ "error": "Only PDF files are allowed" }
```

---

### Applications Module

---

#### Create Application

```
POST /api/applications
```

Request body:
```json
{
  "companyName": "Google",
  "jobTitle": "Backend Engineer",
  "jobDescription": "Design and build scalable backend systems...",
  "source": "LINKED_IN",
  "notes": "Referral from college senior",
  "dateApplied": "2026-08-20"
}
```

Required: `companyName`, `jobTitle`, `source`
Optional: `jobDescription`, `notes`, `dateApplied` (defaults to now)

Response 201:
```json
{
  "application": {
    "id": "cmsyideb30007ncphs5gpgeph",
    "userId": "cmp07oqw40000r9w593fvr195",
    "companyName": "Google",
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

StatusHistory record is automatically created with status APPLIED.

---

#### List All Applications

```
GET /api/applications
```

No request body.

Response 200:
```json
{
  "applications": [
    {
      "id": "...",
      "companyName": "Google",
      "jobTitle": "Backend Engineer",
      "status": "APPLIED",
      "source": "LINKED_IN",
      "dateApplied": "2026-08-20T00:00:00.000Z",
      "notes": "...",
      "createdAt": "...",
      "updatedAt": "...",
      "userId": "...",
      "statusHistory": [
        {
          "id": "...",
          "applicationId": "...",
          "status": "APPLIED",
          "createdAt": "..."
        }
      ]
    }
  ]
}
```

Ordered by dateApplied descending. Includes statusHistory for each application.

---

#### Get Single Application

```
GET /api/applications/:id
```

Response 200:
```json
{
  "application": {
    "id": "...",
    "companyName": "Google",
    "jobTitle": "Backend Engineer",
    "jobDescription": "...",
    "status": "SCREENING",
    "source": "LINKED_IN",
    "dateApplied": "...",
    "notes": "...",
    "createdAt": "...",
    "updatedAt": "...",
    "userId": "...",
    "statusHistory": [
      { "id": "...", "status": "SCREENING", "createdAt": "..." },
      { "id": "...", "status": "APPLIED", "createdAt": "..." }
    ]
  }
}
```

Response 404:
```json
{ "error": "Application not found" }
```

---

#### Update Application

```
PUT /api/applications/:id
```

Request body (all fields optional — send only what you want to change):
```json
{
  "companyName": "Google",
  "jobTitle": "Senior Backend Engineer",
  "jobDescription": "...",
  "source": "LINKED_IN",
  "status": "SCREENING",
  "notes": "Updated notes",
  "dateApplied": "2026-08-20"
}
```

When status changes, a new StatusHistory record is automatically created.

Response 200: full updated application with statusHistory.

Response 404:
```json
{ "error": "Application not found" }
```

---

#### Delete Application

```
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

---

### AI Module

---

#### Analyze Resume

```
POST /api/ai/analyze-resume
```

Compares the user's stored resume text against the application's job description using Gemini.
The user must have uploaded a resume first. The application must have a jobDescription.

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
    "matchScore": 72,
    "missingKeywords": ["Docker", "Kubernetes", "Redis"],
    "suggestions": [
      "Highlight your Node.js experience in the summary",
      "Add a projects section showing distributed systems work"
    ]
  }
}
```

Response 400:
```json
{ "error": "Resume not found. Please upload your resume first." }
{ "error": "Application not found." }
{ "error": "No job description found for this application." }
```

---

#### Generate Interview Prep

```
POST /api/ai/interview-prep
```

Generates interview questions based on the application's job description using Gemini.
Questions are saved to the database and returned.

Request body:
```json
{
  "applicationId": "cmsyideb30007ncphs5gpgeph"
}
```

Response 201:
```json
{
  "interviewPrep": {
    "interviewId": "cmsz36kto0001t0mfds7zwkpf",
    "questions": [
      {
        "id": "cmsz36lxc0003t0mfsftdvet6",
        "question": "What is the difference between horizontal and vertical scaling?",
        "userAnswer": null,
        "aiInterviewId": "cmsz36kto0001t0mfds7zwkpf",
        "questionNumber": 1,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
}
```

---

#### Save Answers

```
POST /api/ai/save-answers
```

Saves user answers to interview questions. Send all answers in one call.

Request body:
```json
{
  "answers": [
    {
      "questionId": "cmsz36lxc0003t0mfsftdvet6",
      "answer": "Horizontal scaling adds more machines..."
    },
    {
      "questionId": "cmsz36nih000ft0mfdcn94jc0",
      "answer": "Database indexing creates a data structure..."
    }
  ]
}
```

Response 200:
```json
{ "saved": 2 }
```

---

#### Get Answers

```
GET /api/ai/answers/:appId
```

Fetches all interview sessions and answers for an application.

Response 200:
```json
{
  "interviews": [
    {
      "id": "cmsz36kto0001t0mfds7zwkpf",
      "applicationId": "cmsyideb30007ncphs5gpgeph",
      "overallScore": null,
      "overallFeedback": null,
      "createdAt": "...",
      "updatedAt": "...",
      "questions": [
        {
          "id": "cmsz36lxc0003t0mfsftdvet6",
          "question": "What is the difference between horizontal and vertical scaling?",
          "userAnswer": "Horizontal scaling adds more machines...",
          "questionNumber": 1,
          "createdAt": "...",
          "updatedAt": "..."
        }
      ]
    }
  ]
}
```

---

### Reminders Module

---

#### Create Reminder

```
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
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

#### Update Reminder

```
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

Response 200: full updated reminder object.

Response 404:
```json
{ "error": "Reminder not found." }
```

---

#### Delete Reminder

```
DELETE /api/reminders/:id
```

Response 200:
```json
{ "message": "Reminder deleted successfully" }
```

---

### Dashboard Module

---

#### Get Stats

```
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

- `responseRate` — percentage of applications that moved past APPLIED status
- `rejectionRate` — percentage of applications with REJECTED status
- `bestSource` — the ApplicationSource enum value that gave the most responses
- `staleApplications` — applications still in APPLIED status after 14+ days
- All rates are integers 0-100

---

## Remaining Backend Work

The following items are intentionally deferred until after the functional frontend is complete. Do not implement these during frontend development.

- Global error handler middleware — currently each controller has its own try/catch
- Input validation with Zod — no request body validation exists yet
- Deprecated `requireAuth` from Clerk SDK — should be replaced with `clerkMiddleware` and `getAuth`
- `.gitignore` cleanup — dist, generated, env files may not be fully ignored
- Automated tests — no tests exist yet
- UI polish pass — comes after functional frontend is working

---

## Notes For Frontend Development

- Never hardcode `http://localhost:5000` — always use `process.env.NEXT_PUBLIC_API_URL`
- Never send a userId from the frontend — the backend reads it from the Clerk token
- The `requireUser` middleware runs before every protected route and attaches the local DB user to the request
- All timestamps are UTC — convert to local timezone for display
- Resume upload uses FormData, not JSON — do not set Content-Type header manually
- The `jobTitle` field is NOT called `role` — use the exact field names in this document
- The `dateApplied` field is NOT called `appliedAt` — use the exact field names in this document
- The `isSent` field on Reminder is NOT called `sent`