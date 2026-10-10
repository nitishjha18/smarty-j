# ApplynTrack

ApplynTrack is a full-stack web application for students and freshers who need a structured way to manage job applications.

## Installation

```bash
cd backend && npm install
cd frontend && npm install
```

## Database Setup

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

## Development

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

Backend runs on `http://localhost:5000`
Frontend runs on `http://localhost:3000`

## Build

```bash
cd backend && npm run build
cd frontend && npm run build
```

## Environment Variables

### Backend — `backend/.env`

```text
PORT
CLIENT_URL
DATABASE_URL
DIRECT_URL
CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
```

### Frontend — `frontend/.env.local`

```text
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_BRANDFETCH_CLIENT_ID
```

`NEXT_PUBLIC_BRANDFETCH_CLIENT_ID` is the free client ID from the Brandfetch developer portal (developers.brandfetch.com). It powers company logos and company-name search. It is a public identifier, not a secret. Without it the app still works and shows letter avatars instead of logos. Restart the frontend dev server after adding it.

## Useful Files

- `docs/architecture.md` — technical decisions
- `docs/backend-api.md` — API contract
- `docs/modules/applications.md` — applications module
- `docs/modules/dashboard.md` — dashboard module
- `docs/modules/profile.md` — profile module

See [Client-side data fetching and caching](docs/architecture.md#client-side-data-fetching-and-caching) for the frontend query and cache design.
