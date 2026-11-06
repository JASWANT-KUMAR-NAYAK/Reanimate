# Reanimate Frontend

Next.js (App Router) + TypeScript + Tailwind CSS dashboard for the Reanimate FastAPI backend.

## Run locally

```bash
# 1. Start the backend (see ../backend/README.md) on http://localhost:8000
# 2. Start the frontend
cp .env.example .env.local      # optional: only needed if the API is not on localhost:8000
npm install
npm run dev                     # http://localhost:3000
```

Production: `npm run build && npm start`. Type check: `npm run typecheck`.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Backend base URL (read at build/start time) |

The backend must allow this site's origin in `CORS_ORIGINS` (default `http://localhost:3000`). If Next.js starts on another port, add that origin to the backend `.env`.

## Structure

- `lib/types.ts` — TypeScript mirror of `backend/app/schemas.py` (the source of truth).
- `lib/api.ts` — the only module that talks to the backend: request, timeout, cancellation, error normalisation.
- `lib/validate.ts` — client-side mirror of the backend URL rules.
- `components/` — presentation: form, loading/error states, and `report/*` dashboard sections.
- `app/page.tsx` — idle / loading / error / success state machine.

## Behaviour notes

- Nothing is mocked: every number on screen comes from `POST /api/analyze`.
- AI insights are optional. When absent, the page says the deterministic analysis is complete and shows the backend's reason.
- Evidence IDs shown on indicators, AI findings and roadmap tasks are buttons that open the matching row in the Evidence explorer.
- Anonymous GitHub access allows ~7 analyses per hour; set `GITHUB_TOKEN` on the backend for more.
