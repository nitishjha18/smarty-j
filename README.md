# ApplynTrack

ApplynTrack is a full-stack web application for students and freshers who need a structured way to manage job applications.

## Installation

Run these from the repository root:

```bash
cd backend && npm install
cd ../frontend && npm install
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
cd ../frontend && npm run build
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
LOG_LEVEL
```

### Frontend — `frontend/.env.local`

```text
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_BRANDFETCH_CLIENT_ID
```

`LOG_LEVEL` controls the Pino log level on the backend (`trace`, `debug`, `info`, `warn`, `error`, `fatal`, `silent`). Defaults to `info` when unset. Set `NODE_ENV=production` to switch Pino from pretty-printed output to plain JSON.

`CLERK_SECRET_KEY` is read by Clerk in the Next.js `middleware.ts`, which protects every route except `/`, `/sign-in` and `/sign-up`. `NEXT_PUBLIC_API_URL` falls back to `http://localhost:5000` when it is not set, so a missing value fails silently in a deployment. The optional `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` variables are read by Clerk and are not referenced in the app code.

`NEXT_PUBLIC_BRANDFETCH_CLIENT_ID` is the free client ID from the Brandfetch developer portal (developers.brandfetch.com). It powers company logos (in the app and on the landing page mockups) and company-name search. It is a public identifier, not a secret. Without it the app still works and shows letter avatars instead of logos. Next.js inlines `NEXT_PUBLIC_*` variables at build time, so set it in the environment before building the frontend for production, and restart the dev server after adding it locally.

## Useful Files

- `docs/architecture.md` — technical decisions
- `docs/backend-api.md` — API contract
- `docs/modules/applications.md` — applications module
- `docs/modules/dashboard.md` — dashboard module
- `docs/modules/profile.md` — profile module
- `docs/modules/landing.md` — public landing page
- `prd.md` — product requirements (kept local, listed in `.gitignore`)

See [Client-side data fetching and caching](docs/architecture.md#client-side-data-fetching-and-caching) for the frontend query and cache design.
