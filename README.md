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

```env
PORT=5000
CLIENT_URL=http://localhost:3000

DATABASE_URL=...
DIRECT_URL=...

CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

GEMINI_API_KEY=...

RESEND_API_KEY=...
RESEND_FROM_EMAIL=reminders@applyntrack.online
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Useful Files

- `docs/context.md` — session handoff and current state
- `docs/architecture.md` — technical decisions
- `docs/backend-api.md` — API contract
- `docs/modules/` — per-feature specs
