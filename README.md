# LeadFlow

A single-screen lead manager: track leads, log every discussion, and never miss a follow-up.
Next.js 16 + FastAPI + Postgres (or SQLite).

![LeadFlow walkthrough](docs/leadflow-demo.gif)

[Full-quality video (MP4, 38 s)](docs/leadflow-demo.mp4) · [Screenshots](#screenshots)

## Run it

### With Docker (one command)

```bash
docker compose up --build
```

Open http://localhost:3000. The API and its interactive docs are at http://localhost:8000/docs.
On first start the database is seeded with 7 sample leads, so there is something to click on.
Copying `.env.example` to `.env` is optional; every value has a default.

### Without Docker

Needs Python 3.11+ and Node 20.9+. Uses SQLite by default, so there is nothing else to install.

```bash
# 1. API (terminal 1)
cd backend
python -m venv .venv
.venv\Scripts\activate              # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
python -m app.seed                  # sample leads into backend/leadflow.db
uvicorn app.main:app --reload       # http://localhost:8000

# 2. Web app (terminal 2)
cd frontend
npm install
npm run dev                         # http://localhost:3000
```

To use Postgres instead, set `DATABASE_URL` (see `backend/.env.example`). Run `python -m app.seed --reset` to start the sample data over.

### Environment variables

| Variable | Used by | Default | What it does |
| --- | --- | --- | --- |
| `DATABASE_URL` | API | `sqlite:///./leadflow.db` | SQLAlchemy URL; Postgres: `postgresql+psycopg://user:pass@host:5432/db` |
| `CORS_ORIGINS` | API | `http://localhost:3000` | Origins allowed to call the API from a browser directly |
| `SEED_TIMEZONE` | seed script | machine timezone | Timezone for seeded times such as "yesterday at 4 PM" |
| `API_URL` | web | `http://localhost:8000` | Where `/api/*` is proxied; read by `next dev` and at `next build` |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` | Compose | `leadflow` | Database credentials for the Compose stack |

Each lives in an `.env.example`: root (Compose), `backend/` and `frontend/`.

## What is covered

| Requirement | Where |
| --- | --- |
| List shows name, status, last note, time since | `frontend/src/components/lead-card.tsx`; last note picked in SQL in `backend/app/services.py` |
| Filter by status | Pills with live counts, `GET /api/leads?status=` |
| Today's follow-ups pinned | `frontend/src/lib/group-leads.ts` (unit tested) |
| Timeline dialog, newest first | `frontend/src/components/lead-dialog/`, `GET /api/leads/{id}` |
| Add a discussion with optional follow-up; list updates immediately | `useAddDiscussion` in `frontend/src/lib/queries.ts` writes the API response straight into the list cache |
| Status update from the dialog persists | Optimistic `PATCH /api/leads/{id}`, rolled back if the API refuses; logged on the timeline |
| Add new lead (name required, status New) | `frontend/src/components/add-lead-dialog.tsx`, `POST /api/leads` |
| Correct status codes, clean errors | 201 / 200 / 404 / 422 with a readable `detail`; a catch-all 500 handler that never leaks a stack trace |
| **Bonus:** search by name | Name or company, case-insensitive, `%` and `_` matched literally. Press `/` to focus |
| **Bonus:** overdue follow-ups in red | Overdue leads are pinned with today's, in red, with "was due yesterday at 4:00 PM" |
| **Bonus:** Docker Compose | `docker-compose.yml`: Postgres + API + standalone Next.js server, with health checks |
| **Bonus:** seed script, 5+ leads | `python -m app.seed`: 7 leads, 19 timeline entries, dates relative to today |

## API

| Method | Path | Body | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET` | `/api/leads?status=&q=` | | `200` `{ items, counts }` | `422` bad status |
| `POST` | `/api/leads` | `{ name, company?, phone? }` | `201` lead + timeline, `Location` header | `422` |
| `GET` | `/api/leads/{id}` | | `200` lead + timeline, newest first | `404` |
| `PATCH` | `/api/leads/{id}` | any of `{ status, name, company, phone, follow_up_at }` | `200` | `404`, `422` (incl. empty body) |
| `POST` | `/api/leads/{id}/discussions` | `{ body, follow_up_at? }` | `201` `{ discussion, lead }` | `404`, `422` (past or naive follow-up) |
| `GET` | `/api/health` | | `200` | |

Errors always look like `{ "detail": "name: String should have at least 1 character" }`; validation errors also include the raw `errors` list.

## How it works, and why

- **One screen, two dialogs.** The list is the page; the timeline and the add-lead form are native `<dialog>` elements, so focus trapping, Escape and the inert background come from the browser.
- **No CORS to configure.** The browser only talks to Next.js; a rewrite proxies `/api/*` to FastAPI.
- **A discussion completes the previous follow-up.** Logging a note sets the lead's follow-up to whatever that note scheduled, or clears it. Talking to the lead is what "doing" a follow-up means; the form says so before you save ("Saving completes the follow-up due today at 2:00 PM"). Old follow-ups stay on the timeline, greyed out.
- **"Today" is the viewer's today.** The API stores and returns UTC; the browser decides what is due today or overdue in its own timezone, and re-checks every 30 seconds. Follow-ups in the past are rejected by both the form and the API (with a 5-minute grace), and timestamps without an offset are refused.
- **The list is one query.** A window function picks each lead's latest note (falling back to its latest system event) in the same query as the leads, so there is no N+1 however long the list gets. Status changes are recorded on the timeline but never shown as the "last note".
- **The list updates without a refetch.** Mutations write the API's response into the TanStack Query cache, then refetch in the background to re-sort and recount. Hovering a card prefetches its timeline, so the dialog opens already filled.
- **Same suite, two databases.** Timestamps go through a small `UTCDateTime` type so SQLite and Postgres behave identically, and the API tests run on either.

## Tests

```bash
cd backend && pytest                    # 20 API tests on in-memory SQLite
TEST_DATABASE_URL=postgresql+psycopg://leadflow:leadflow@localhost:5432/leadflow_test pytest   # same suite on Postgres
cd frontend && npm test && npm run lint && npm run typecheck   # 19 unit tests, ESLint, TypeScript
```

## Project layout

```
backend/
  app/
    main.py          FastAPI app, error handlers, health check
    routers/leads.py HTTP layer: status codes and 404s
    services.py      queries and state changes
    models.py        Lead, Discussion
    schemas.py       request/response models and validation
    database.py      engine, session, UTC datetime type
    seed.py          sample data
  tests/
frontend/src/
  app/               layout, page, providers
  components/        lead-board, filter-bar, lead-list, lead-card, lead-dialog/, add-lead-dialog
  lib/               API client, query hooks, date helpers, grouping (+ tests)
docker-compose.yml
```

## What I would do next

Authentication (the brief made it optional), Alembic migrations instead of `create_all`, keeping the filters in the URL so a view can be shared, a "mark follow-up done" action that doesn't need a note, and an end-to-end Playwright suite in CI.

## Use of AI

Built with Claude (Anthropic) as a coding assistant, as the brief encouraged; commits it helped write carry a `Co-Authored-By` trailer. The decisions above are written down so they can be questioned in review, and every flow in the table was checked in a browser against the Postgres stack.

## Screenshots

| Lead list | Timeline dialog |
| --- | --- |
| ![Lead list with pinned follow-ups](docs/screenshots/lead-list.png) | ![Timeline dialog](docs/screenshots/lead-timeline.png) |
| **Add new lead** | **Mobile** |
| ![Add lead dialog](docs/screenshots/add-lead.png) | ![Mobile layout](docs/screenshots/mobile.png) |
