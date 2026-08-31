# President University — Concentration Recommendation System

A web application that helps President University students discover the
concentration that best matches their interests and preferences.

Built with:

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com) (v4)
- [Prisma ORM](https://www.prisma.io) (v7) + [Supabase PostgreSQL](https://supabase.com)
- [Zod](https://zod.dev) (validation), [bcryptjs](https://github.com/dcodeIO/bcrypt.js) +
  [jose](https://github.com/panva/jose) (admin auth), [Recharts](https://recharts.org) (dashboard charts)
- [Vitest](https://vitest.dev) (unit tests)

> **Scope notice:** this repository intentionally has no STEP 13. STEP 12 was
> the final implementation step — this document describes the application as
> deployed.

## Supported majors and concentrations

| Major | Concentrations |
| --- | --- |
| **Informatics** | Cyber Security · Internet of Things (IoT) · Artificial Intelligence (AI) · AI in Healthcare · Game Development · DevOps |
| **Information Systems** | Data Science · Enterprise Resource Planning (ERP) |

These are the only concentrations that appear in question scoring, result
pages, dashboard charts, filters, and database score rows. There is **no**
standalone "VR" concentration: VR-related answers feed Game Development
and/or IoT as designed.

## Questionnaire structure

- The questionnaire has **40 questions total**.
- **Informatics:** 20 questions (`INF_Q01` … `INF_Q20`).
- **Information Systems:** 20 questions (`IS_Q01` … `IS_Q20`).
- A student answers **exactly the 20 questions of their selected major** —
  never all 40, and never a mixed set.

Students only select their **major**; the concentration is never picked
directly. It is inferred from their answers by the server-side scoring engine.

## Scoring model

- Scoring is **server-side and authoritative**. The browser submits only
  `{ fullName, major, answers }` — stable question/option IDs. Raw scores,
  normalized scores, the recommendation, and the confidence label are always
  computed by `lib/scoring/score-assessment.ts`, never accepted from the
  client.
- Each concentration is normalized **independently**:

  ```text
  normalizedScore = (rawScore / theoreticalMaximumForThatConcentration) * 100
  ```

  The theoretical maximum is derived from the trusted weight configuration
  (never a global maximum and never a question count).
- The recommendation is the concentration with the **highest normalized
  score**.
- **Deterministic tie handling** (documented in `lib/scoring/tie-break.ts`):

  1. highest normalized score (rounded to 1 decimal),
  2. highest raw score,
  3. high-value tie-breaker questions (`tieBreakerPriority`, lowest number
     first),
  4. a fixed, documented concentration priority order.

  No randomness, timestamps, or database row order ever participate, so the
  same answers always produce the same result.

> **Disclaimer:** recommendations are questionnaire-based guidance — an
> indication of fit, not a final academic decision and not a prediction of
> success. Students should discuss options with academic staff.

### Scoring configuration separation (STEP 12)

Scoring **weights** are server-only. The application is split so that Client
Components can never receive them:

| Layer | Files | Contents |
| --- | --- | --- |
| Client-safe public metadata | `data/publicQuestions.ts` | Question IDs, text, type, category, option IDs/labels — **no weights** |
| Server-only authoritative config | `data/informaticsQuestions.ts`, `data/informationSystemsQuestions.ts` | Full configuration **including per-option weights**; guarded with `import "server-only"` |
| Server-only weight maps | `lib/scoring/server/informaticsWeights.ts`, `lib/scoring/server/informationSystemsWeights.ts` | Derived authoritative weight maps, also `server-only` |

`lib/weight-parity.test.ts`, `lib/weight-parity-is.test.ts`, and
`lib/weight-parity-cross.test.ts` prove the public view and the authoritative
configuration never drift (same question/option IDs, text, labels, types, and
categories; 20 questions per major; no weights in the public view).


## Getting Started

```bash
npm install
npm run db:generate   # generate the Prisma Client (needs the schema only)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

The application is developed mobile-first and is responsive from ~375px
(phones) up to desktop widths.

## Database

The project uses **Supabase PostgreSQL** with **Prisma ORM** as the data
access layer.

```text
Next.js (server-side code)
   ↓
Prisma ORM (lib/prisma.ts)
   ↓
Supabase PostgreSQL
```

### Supabase connection architecture

Two PostgreSQL connection modes are used, matching Supabase's pooler:

| Mode | Port | Environment variable | Purpose |
| --- | --- | --- | --- |
| Transaction-mode pooler | 6543 | `DATABASE_URL` | Application / runtime connection |
| Session-mode pooler | 5432 | `DIRECT_URL` | Prisma migrations / CLI operations |

Because the transaction pooler (PgBouncer, `?pgbouncer=true`) does not support
everything Prisma Migrate needs, migrations run against the **session-mode
pooler** while the application runtime connects through the **transaction-mode
pooler**.

- **Runtime:** `lib/prisma.ts` creates the Prisma Client with the
  `@prisma/adapter-pg` driver adapter using `DATABASE_URL`.
- **CLI/migrations:** `prisma.config.ts` points Prisma CLI commands at
  `DIRECT_URL`.

### Prisma 7 configuration

This project uses **Prisma 7**, which configures the CLI datasource in
`prisma.config.ts` (connection URLs are no longer declared inside
`schema.prisma`). The generated Prisma Client lives in `lib/generated/prisma`
and is produced by the new `prisma-client` generator.

## Supabase setup

1. Create a Supabase project.
2. Find your connection strings under **Project Settings → Database →
   Connection string → Prisma** (or assemble them manually).

The connection strings follow this shape:

```text
Transaction pooler (runtime):
postgresql://postgres.<PROJECT_REF>:<PASSWORD>@<POOLER_HOST>:6543/postgres?pgbouncer=true

Session pooler (migrations):
postgresql://postgres.<PROJECT_REF>:<PASSWORD>@<POOLER_HOST>:5432/postgres
```

## Environment setup

Copy the template and fill in your real values:

```bash
cp .env.example .env
```

Then put the actual Supabase connection strings into `.env`:

```env
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@<POOLER_HOST>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@<POOLER_HOST>:5432/postgres"
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Supabase transaction-pooler connection (application runtime) |
| `DIRECT_URL` | Yes | Supabase session-pooler connection (Prisma CLI / migrations) |
| `AUTH_SECRET` | Yes | Signs the admin session cookie (JWT/HS256). Generate with `openssl rand -base64 32` |
| `ADMIN_EMAIL` | Seed | Email of the initial admin account (provisioned with `npm run db:seed`) |
| `ADMIN_PASSWORD` | Seed | Password of the initial admin account (bcrypt-hashed; only the hash is stored) |

> **Security:** never commit `.env`, never use `NEXT_PUBLIC_` prefixes for
> database credentials or `AUTH_SECRET`, and never print connection strings
> or credentials to the console. `.env.example` contains placeholders only
> and is safe to commit.

## Prisma commands

```bash
# Generate the Prisma Client (run after schema changes)
npx prisma generate

# Create and apply a new migration (development only — never on production)
npx prisma migrate dev --name init

# Apply committed migrations to the target database (PRODUCTION strategy)
npx prisma migrate deploy

# Validate the schema
npx prisma validate

# Inspect records in the database during development (never expose publicly)
npx prisma studio
```

Equivalent npm scripts:

```bash
npm run db:generate
npm run db:migrate     # dev
npm run db:deploy      # production
npm run db:validate
npm run db:seed
npm run db:studio
```

## Admin authentication (STEP 9)

Only **university/admin users** can authenticate. Students complete the
assessment **without an account** — there is no student login, no signup, and
no public admin registration. Admin accounts are provisioned manually,
server-side.

### How it works

1. `/admin/login` — admin enters email + password.
2. The server validates the input with **Zod**, looks up the `Admin` record
   through **Prisma**, and verifies the password with **bcrypt** (bcryptjs,
   cost **12**).
3. On success the server issues a signed session token (**JWT, HS256** signed
   with `AUTH_SECRET` using the `jose` library) and stores it in an
   **HttpOnly** cookie.
4. `/admin/dashboard` and all future admin routes are protected by a
   server-side layout that verifies the session on every request and redirects
   logged-out visitors to `/admin/login`.

### Session cookie

| Setting | Value |
| --- | --- |
| Name | `presuniv_admin_session` |
| HttpOnly | `true` (browser JavaScript cannot read it) |
| SameSite | `lax` |
| Secure | `true` in production (`NODE_ENV === "production"`), `false` in local dev over HTTP |
| Path | `/` |
| Lifetime | 8 hours (`Max-Age=28800`); the token also embeds an `exp` claim verified on every request |

Logout is a **POST server action** (`logoutAdmin`) that clears the cookie and
redirects to `/admin/login`. Because sessions are stateless signed tokens, a
token that was already issued stays cryptographically valid until it expires;
logout removes the cookie from the browser, and deleting the admin record in
the database invalidates future access (the admin is looked up on every
protected request). This matches the signed-session approach chosen for STEP 9.

### Provisioning the initial admin

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` (placeholders are in
`.env.example`), then run:

```bash
npm run db:seed
```

The seed (`prisma/seed.ts`) normalizes the email, bcrypt-hashes the password
(cost 12), and **upserts** the `Admin` record — running it again never
duplicates the admin, and a changed `ADMIN_PASSWORD` updates the stored hash
(convenient for manual password rotation). Only the hash is ever stored.

### Generating AUTH_SECRET

`AUTH_SECRET` signs the session cookie and is **required**. Generate a strong
value (at least 32 characters):

```bash
openssl rand -base64 32
```

If it is missing or too weak the server fails clearly instead of falling back
to a known secret. Keep it server-side only — never `NEXT_PUBLIC_AUTH_SECRET`.

### Security notes

- Login errors are generic (`Invalid email or password.`) so responses never
  reveal whether an email exists or a password was wrong.
- Emails are normalized (trim + lowercase) consistently for seeding, login,
  and database lookups.
- `passwordHash` is never selected for UI rendering and never sent to the
  browser; plaintext passwords never enter logs, URLs, or client state.
- A lightweight in-memory login rate limit (10 failed attempts per email per
  15 minutes) is included. It is per-process by design.
- **Deployment hardening:** before public deployment, add a production-grade
  rate limiter (e.g. a managed or Redis-backed store), serve the app over
  HTTPS so the `Secure` cookie is honored, and keep `AUTH_SECRET` in your
  deployment environment.
- Admin password reset / change UI, roles, and audit logs are intentionally
  out of scope for STEP 9.

### Database models

- `Admin` — administrator accounts (email + password hash)
- `Assessment` — one completed student assessment
- `AssessmentAnswer` — one stored answer per question (unique per
  `assessmentId + questionId`)
- `ConcentrationScore` — one score per concentration per assessment (unique per
  `assessmentId + concentration`)

## Admin dashboard (STEP 10)

`/admin/dashboard` (after login) gives administrators an overview of completed
concentration assessments. It is read-only and fully protected server-side.

### How the dashboard is protected

- The `(protected)` admin route-group layout calls `requireAdmin()` on every
  request (signed session cookie **and** a live `Admin` database lookup) and
  redirects logged-out visitors to `/admin/login` before any content renders.
- The dashboard page repeats the same boundary check before touching the
  database, so assessment statistics are never constructed for logged-out
  users.
- `export const dynamic = "force-dynamic"` on the layout keeps the page
  out of the static cache — admin analytics are never statically generated at
  build time or publicly cached.

### What counts as a "completed assessment"

The submission flow always stores `completedAt` when an assessment is saved,
so every stored `Assessment` is a completed submission (abandoned questionnaire
sessions are never written to the database). To stay consistent with the
nullable `completedAt` schema, every dashboard query explicitly requires
`completedAt: { not: null }`.

### How the statistics are calculated

All queries live in `lib/admin/dashboard.ts` (`getDashboardStats`) and run in
parallel (`Promise.all`) using Prisma `count` / `groupBy` / `aggregate`:

| Statistic | Query |
| --- | --- |
| Total assessments | `assessment.count` (completed) |
| Informatics / Information Systems | one `groupBy` on `major` + `recommendedConcentration` |
| Average suitability score | `_avg` of `recommendedScore` |
| Most recommended concentration | top of the grouped `recommendedConcentration` counts (deterministic; ties shown together) |
| Assessments over time | `completedAt` timestamps for the last 30 days, bucketed per day server-side |

Pure post-processing (zero-count filling, percentages, most-recommended, date
formatting) lives in `lib/admin/dashboard-utils.ts` and is fully unit-tested
(`lib/admin/dashboard-utils.test.ts`). Missing concentration categories are
filled with `0`, and a cross-major `recommendedConcentration` in the data is
excluded from the per-major charts and logged server-side.

### Charts (Recharts)

Charts are Client Components that receive plain serializable data from the
Server page — the browser never runs database queries:

- `Assessments by Major` — vertical bar chart (Informatics navy, Information
  Systems neutral slate).
- `Informatics — Recommendation Distribution` and
  `Information Systems — Recommendation Distribution` — horizontal bar charts
  (long labels are wrapped on the axis and shown in full in the tooltip and
  data table).
- `Assessments Over Time` — 30-day area chart.

Every chart is accompanied by a "View data table" `<details>` table so the
numbers remain available without the chart rendering.

### Time convention

The assessments-over-time timeline uses a simple **UTC** convention: each
day bucket is the UTC calendar date of `completedAt`, and the period is the
last 30 calendar days ending today (UTC). No university-timezone configuration
exists yet; this is documented and consistent across the dashboard.

## Assessment records (STEP 11)

`/admin/assessments` lists every completed assessment with search, filters,
sorting, and pagination; `/admin/assessments/[id]` shows a single record
(concentration scores + all 20 stored answers). Both routes live inside the
`(protected)` route group and repeat the `requireAdmin()` boundary check, so
they are never reachable without a valid admin session. Records are read-only
except for deletion.

### List page

- URL query parameters are the state: `q` (case-insensitive name search),
  `major`, `concentration`, `sort`, `page`. All values are parsed and
  sanitized by one helper (`lib/admin/assessment-query.ts`) — unknown values
  fall back to safe defaults, and an incompatible `major`+`concentration`
  combination is reset instead of returning a confusing empty result set.
- Filtering/sorting/pagination run server-side with Prisma (page size 10,
  stable `id` tie-break). Changing a filter resets `page` to 1; pagination
  preserves `q`/`major`/`concentration`/`sort`. A page beyond the last valid
  page redirects to the last valid page.
- Only completed records appear (`completedAt: { not: null }`), matching the
  dashboard semantics. The list selects only the table columns — no answer or
  score rows are loaded per record.

### Detail page

- Stored `questionId`/`answerKey` values are resolved to readable question
  text and answer labels using the trusted TypeScript question configuration,
  in questionnaire order. Unknown/corrupt entries render
  "Unable to resolve stored answer" with the stored IDs instead of crashing.
- Scores are filtered to the assessment's major (6 for Informatics, 2 for
  Information Systems), sorted by normalized score, and the stored
  recommendation is marked. Stored `recommendedConcentration` and
  `recommendedScore` are displayed as persisted — never rescored.

### Safe deletion

- Delete is a POST-only server action (`deleteAssessment`). It re-checks the
  admin session server-side, validates the unique assessment id, deletes the
  `Assessment` (the schema's `onDelete: Cascade` removes all related
  `AssessmentAnswer` and `ConcentrationScore` rows), revalidates
  `/admin/dashboard` and `/admin/assessments`, and redirects to the list.
- The confirmation dialog is the accessible, keyboard-friendly `ConfirmDialog`
  (no browser `confirm()`); an already-removed record and unexpected server
  errors return clean, non-technical outcomes.

## Security (STEP 12)

- **Secrets:** no credentials are committed. `.env`, `.env.local`, and
  `env.*.local` files are git-ignored; `.env.example` contains placeholders
  only. `AUTH_SECRET` is server-side only (no `NEXT_PUBLIC_` prefix), and the
  seed stores only the bcrypt hash — never the plaintext password.
- **Prisma server-only:** `lib/prisma.ts` imports `server-only`; Prisma and
  the authoritative question/weight modules never reach the browser bundle.
- **Security headers** are set by `next.config.ts` for every response:
  `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, and a restrictive
  `Permissions-Policy`. A Content-Security-Policy is deliberately **not**
  added (a broken CSP can destabilize Next.js/Recharts); the deployment host
  serves HTTPS.
- **Rate limiting:** a lightweight in-memory login rate limit (10 failed
  attempts per email per 15 minutes) is included. It is **per-process** — on a
  multi-instance/serverless deployment each instance keeps its own window, so
  this is best-effort hardening, not a distributed limit. Before public
  high-traffic deployment, add a production-grade limiter (managed or
  Redis-backed). Do not build a fragile in-memory limiter that gives false
  security across serverless instances.
- **Public result URLs** use unguessable CUID ids (e.g.
  `cmtheqo1i00000p0fkqinaspm`). The application has no student accounts, so
  direct URL access to a result is the intended behavior; sequential or
  guessable ids are not used.
- **Generic errors:** students and admins see friendly messages; raw
  Prisma/SQL/stack traces are never rendered. Server errors are logged with
  `console.error` server-side only.

## Tests

```bash
npm test            # Vitest — unit + scoring + auth + dashboard + parity tests
npm run lint        # ESLint (Next.js core-web-vitals + TypeScript rules)
npm run build       # Production build (type-check + static generation included)
```

The suite covers scoring correctness (weights, maxima, normalization, ties,
AI vs AI Healthcare, Data Science vs ERP, VR profiles), client/server weight
parity, session/credentials/rate-limit/auth logic, dashboard math, and
assessment-list query parsing. Tests are pure logic / mocked — they never
mutate production Supabase data.

## Production build

```bash
npm install            # also runs `postinstall: prisma generate`
npx prisma validate
npx prisma generate
npm run lint
npm test
npm run build
```

## Vercel deployment

The project deploys with standard Next.js behavior — no hardcoded deployment
URL, no runtime filesystem writes, no localhost-only URLs, and no
development-only assumptions. Prisma Client is generated during install via
the `postinstall` script (`prisma generate`), so no `vercel.json` is needed.

1. Push the repository to Git and import it into Vercel (or use the Vercel
   CLI).
2. Configure the **production environment variables** in the Vercel dashboard
   (never commit real values):

   ```text
   DATABASE_URL   Supabase transaction pooler (port 6543, ?pgbouncer=true)
   DIRECT_URL     Supabase session pooler (port 5432)
   AUTH_SECRET    strong value, e.g. `openssl rand -base64 32`
   ADMIN_EMAIL    initial admin email (seed only)
   ADMIN_PASSWORD initial admin password (seed only)
   ```

   `ADMIN_EMAIL` / `ADMIN_PASSWORD` are only needed to provision the admin
   (`npm run db:seed`); they can be removed from Vercel after provisioning if
   desired, because runtime login always verifies against the stored bcrypt
   hash.
3. Run migrations **before/while deploying** — never inside the application:

   ```bash
   npx prisma migrate deploy   # production migration strategy (NOT `migrate dev`)
   ```

   The migration uses `DIRECT_URL` (session pooler) from `prisma.config.ts`.
   Migrations are applied deliberately as a deployment operation; no route
   ever runs `migrate deploy`.
4. Deploy, then run the production smoke checks (landing → 20-question
   assessment → result, `/admin/login`, dashboard reconciliation).

## Project structure

```text
app/                      App Router pages and route handlers
  assessment/             student intro / questions / review / result
  admin/                  admin login + protected area (dashboard, records)
  api/assessments/        POST submission route (server scoring + transaction)
components/               UI + feature components (student, admin, results)
data/                     questionnaire configuration
  publicQuestions.ts      client-safe public metadata (no weights)
  informaticsQuestions.ts server-only authoritative config (weights)
  informationSystemsQuestions.ts server-only authoritative config (weights)
lib/
  scoring/                pure scoring pipeline (server-authoritative)
    server/               server-only weight maps
  auth/                   admin sessions, credentials, rate limiting
  admin/                  dashboard + assessment records (server-only)
  results/                result-page helpers (deterministic explanations)
  generated/prisma/       generated Prisma Client (git-ignored)
prisma/                   schema, migrations, seed (admin provisioning)
tests/                    Vitest-only server-only stub
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — learn about Next.js features
- [Prisma Documentation](https://www.prisma.io/docs) — Prisma ORM concepts and configuration
- [Supabase Documentation](https://supabase.com/docs) — hosted PostgreSQL and project settings

