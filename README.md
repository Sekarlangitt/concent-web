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

The questionnaire is **database-managed and versioned** (PostgreSQL via Prisma).
The database is the single source of truth for question texts, answer options,
and scoring weights — there is no competing TypeScript question bank at
runtime.

- **40 questions across two published questionnaires:** Informatics (20) and
  Information Systems (20). Each student answers **exactly the 20 questions of
  their selected major** — never all 40, never a mixed set.
- Every question belongs to exactly one **QuestionnaireVersion**. A version
  has one of three statuses: `DRAFT`, `PUBLISHED`, or `ARCHIVED`. Each major
  has at most **one** published version at a time.
- Students only select their **major**; the concentration is never picked
  directly. It is inferred from their answers by the server-side scoring
  engine using the database weights of the locked version.

### Questionnaire versioning

Versioning protects historical integrity:

1. The initial seed creates **Version 1 (PUBLISHED)** for each major.
2. Admins never edit a published version. To make changes they click
   **Create Draft From Published**, which copies the published questions,
   options, and weights into a new `DRAFT` version.
3. The draft is edited, validated, previewed, and **published** atomically:
   the previous published version becomes `ARCHIVED` and the draft becomes
   `PUBLISHED`.
4. A student who starts an assessment is **locked to the version that is
   published at that moment** — even if the admin publishes a newer version
   mid-attempt, the student keeps answering and submitting against their
   original version. Archived versions therefore stay queryable forever.

### Exactly-20 rule and publish validation

A draft can only be published when it passes server-side validation:

- exactly 20 questions, with deterministic gap-free ordering;
- every question has non-empty text, a supported type, and at least 2 answer
  options with non-empty labels;
- every weight is an integer in **0–5** and only targets concentrations
  belonging to the questionnaire's major (rejects cross-major combinations);
- every concentration has a **theoretical maximum score > 0** (it can actually
  receive points somewhere in the questionnaire).

The admin validation panel shows the question count, per-concentration
coverage and theoretical maxima, and any blocking errors. Reasonable maximum
spreads produce a warning, never a block (normalization compensates).

### Historical snapshots

On submission the server stores, for each answer, the **question text and
answer label at that time** (`questionSnapshot` / `answerSnapshot`), plus the
`questionnaireVersionId`. Legacy assessments created before versioning were
backfilled with snapshots from the old question bank, so historical records
remain readable even after questionnaires evolve.

## Scoring model

- Scoring is **server-side and authoritative**. The browser submits only
  `{ fullName, major, questionnaireVersionId, answers }` — question/option IDs.
  The server loads the locked version's questions, options, and **database
  weights**, then computes raw scores, normalized scores, the recommendation,
  and the confidence label in `lib/scoring/score-assessment.ts`. Nothing
  scoring-related is ever accepted from the client.
- Weights are hidden from students: the questionnaire API and session store
  only question IDs, text, types, and option IDs/labels.
- Each concentration is normalized **independently**:

  ```text
  normalizedScore = (rawScore / theoreticalMaximumForThatConcentration) * 100
  ```

  The theoretical maximum is derived from the database weights of the locked
  version (highest weight available per question, summed).
- The recommendation is the concentration with the **highest normalized
  score**.
- **Deterministic tie handling** (documented in `lib/scoring/tie-break.ts`):

  1. highest normalized score (rounded to 1 decimal),
  2. most strong responses — questions where the chosen answer carried a
     weight ≥ 4 for that concentration,
  3. a fixed, documented concentration priority order.

  No randomness, timestamps, or database row order ever participate, so the
  same answers always produce the same result.

> **Disclaimer:** recommendations are questionnaire-based guidance — an
> indication of fit, not a final academic decision and not a prediction of
> success. Students should discuss options with academic staff.

### Weight security

Scoring weights live only in PostgreSQL and in server-only code
(`lib/scoring`, `lib/questionnaires`). The student payload, the assessment
session, and every Client Component receive question metadata only. There is
no public weights endpoint; every admin mutation requires an authenticated
admin session (`requireAdmin()` server-side on each action).



## Admin — Questionnaire Management

The admin area (`/admin/questions`, protected by the same admin login) manages
questions, options, and scoring weights entirely through the database.

### Admin workflow

```text
Login
  → Questions
  → Choose Major (Informatics / Information Systems)
  → See Published Version
  → Create Draft From Published
  → Add / Edit / Delete Questions
  → Edit Options
  → Configure Weight Matrix
  → Reorder Questions
  → Validation
  → Preview (admin-only "Show Weights" toggle)
  → Publish
  → New students use the new version
```

- **Published / Archived versions are read-only.** Every mutation re-verifies
  server-side that the target version is a `DRAFT` — a direct URL edit attempt
  against a published version is rejected, not just hidden by the UI.
- **Create Draft From Published** clones the current published version
  (questions, options, weights) into a new draft. There is one active draft per
  major; if one already exists it is reopened instead of duplicated.
- The question editor covers question text/type, answer options (add, edit,
  reorder, delete), and the **weight matrix** per concentration.
- **Publish** validates the whole draft (exactly 20 questions, valid orders,
  labels, weights, coverage) inside the same database transaction that
  archives the previous published version and marks the draft `PUBLISHED` — a
  major can never end up with two active published versions.
- **Version history** lists archived versions, which remain queryable for
  historical assessments.

### Why published versions are immutable

Questionnaire versioning protects historical integrity:

1. Student A starts Informatics Version 1.
2. The admin publishes Version 2.
3. Student A continues answering and submitting **Version 1** (the locked
   version stored in their session). Student B, who starts later, gets
   Version 2.
4. Version 1 becomes `ARCHIVED` but is never deleted or modified, so Student
   A's stored answers, snapshots, scores, and recommendation stay accurate
   forever.

Changing a published questionnaire directly would retroactively corrupt
results. That is why edits always happen in a draft, and drafts are only ever
cloned from — never written back into — a published version.

## Questionnaire writing guide (for future admins)

The questionnaire targets **first-year / freshman students** who may not yet
know what DevOps, ERP, IoT, AI, or cybersecurity mean. Questions should
measure **potential interest and natural preference**, never existing technical
knowledge.

**Do focus on:**

- curiosity and motivation;
- preferred activities and ways of working;
- problem-solving and thinking styles;
- creativity and investigative tendencies;
- comfort with data, patterns, processes, and reliability;
- interest in technology, health, games, and physical/digital connections.

**Do avoid:**

- advanced terminology (penetration testing, Kubernetes, CI/CD, ERP modules,
  neural networks, sensor protocols, …);
- testing prior coursework or technical knowledge;
- leading students toward a named concentration
  (e.g. "Would you like to study Cyber Security?" is a giveaway; asking about
  investigating unusual events is not);
- assuming university-level vocabulary.

Good examples (from the initial seed):

- "When something unusual happens, are you curious to investigate what caused it?"
- "Would you enjoy creating an interactive world where people can explore and make choices?"
- "Are you curious about how smart watches, sensors, or other devices can communicate with each other?"
- "When you see a lot of information, do you enjoy looking for patterns in it?"
- "Would you enjoy finding ways to make a complicated process simpler and more organized?"

Keep the mix of question types (Likert, Agreement, Multiple Choice, Scenario,
Priority) and keep each major's questionnaire balanced so every concentration
has meaningful scoring opportunities.

## Weight guide (for future admins)

Each answer option's **weight** is how strongly that answer indicates each
concentration:

```text
0    no signal
1–2  weak indication
3    moderate indication
4–5  strong indication
```

- Weights are whole numbers from **0 to 5**.
- One answer may contribute to **several concentrations** (interdisciplinary
  interests are fine and encouraged).
- Weights are server-side only — students never see them.
- Normalization divides each concentration's raw score by its **theoretical
  maximum** (the best weight that concentration can receive per question,
  summed over the questionnaire), producing a comparable 0–100 score. That is
  why zero-weights on some questions are acceptable, but every concentration
  must be able to score somewhere (publishing is blocked otherwise).



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
| `ADMIN_USERNAME` | Seed | Username of the initial admin account (provisioned with `npm run db:seed`) |
| `ADMIN_EMAIL` | Seed | Optional email for the initial admin (defaults to `<username>@president.ac.id`) |
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

1. `/admin/login` — admin enters **username** + password.
2. The server validates the input with **Zod**, looks up the `Admin` record by
   username through **Prisma**, and verifies the password with **bcrypt**
   (bcryptjs, cost **12**).
3. On success the server issues a signed session token (**JWT, HS256** signed
   with `AUTH_SECRET` using the `jose` library) and stores it in an
   **HttpOnly** cookie.
4. `/admin/dashboard` and all admin routes are protected by a server-side
   layout that verifies the session on every request and redirects logged-out
   visitors to `/admin/login`.

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

### Provisioning the initial admin and questionnaires

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` (placeholders are in
`.env.example`), then run:

```bash
npm run db:seed
```

`prisma/seed.ts` does two idempotent, non-destructive things:

1. **Admin provisioning** — normalizes the username (trim + lowercase),
   bcrypt-hashes the password (cost 12), and **upserts** the `Admin` record by
   username (falling back to email for backwards compatibility). Running it
   again never duplicates the admin; a changed `ADMIN_PASSWORD` updates the
   stored hash. Only the hash is ever stored.
2. **Questionnaire seeding** (`prisma/seed-questionnaires.ts`) — creates
   **Version 1 (PUBLISHED)** of each major's questionnaire (20 freshman-friendly
   questions per major, with options and weights) from the seed data in
   `prisma/question-bank.ts`.

Production safety: the questionnaire seed **never overwrites** an existing
published questionnaire. If a published version already exists for a major,
that major is skipped. To intentionally re-seed, archive/delete the existing
versions first.

Separate commands:

```bash
npm run db:seed:questionnaires   # questionnaire seed only
npm run db:backfill              # one-time legacy snapshot backfill
```

The legacy backfill (`prisma/backfill-snapshots.ts`) resolves pre-versioning
`AssessmentAnswer` rows against the old question bank to populate
`questionSnapshot` / `answerSnapshot`, and links legacy assessments to their
major's seeded Version 1.

### Generating AUTH_SECRET

`AUTH_SECRET` signs the session cookie and is **required**. Generate a strong
value (at least 32 characters):

```bash
openssl rand -base64 32
```

If it is missing or too weak the server fails clearly instead of falling back
to a known secret. Keep it server-side only — never `NEXT_PUBLIC_AUTH_SECRET`.

### Security notes

- Login errors are generic (`Invalid username or password.`) so responses
  never reveal whether a username exists or a password was wrong.
- Usernames are normalized (trim + lowercase) consistently for seeding, login,
  and database lookups.
- `passwordHash` is never selected for UI rendering and never sent to the
  browser; plaintext passwords never enter logs, URLs, or client state.
- A lightweight in-memory login rate limit (10 failed attempts per username
  per 15 minutes) is included. It is per-process by design.
- **Deployment hardening:** before public deployment, add a production-grade
  rate limiter (e.g. a managed or Redis-backed store), serve the app over
  HTTPS so the `Secure` cookie is honored, and keep `AUTH_SECRET` in your
  deployment environment.
- Admin password reset / change UI, roles, and audit logs are intentionally
  out of scope for STEP 9.

### Database models

- `Admin` — administrator accounts (username + email + password hash)
- `QuestionnaireVersion` — a versioned questionnaire per major
  (`major`, `versionNumber`, `status`: `DRAFT` / `PUBLISHED` / `ARCHIVED`,
  `publishedAt`). One published version per major.
- `Question` — one question of a version (`order`, `type`, `text`,
  `helpText`, `category`, `isRequired`); unique `(version, order)`.
- `QuestionOption` — one answer option of a question (`order`, `label`,
  `numericValue`); unique `(question, order)`.
- `QuestionOptionWeight` — how strongly an option indicates each
  concentration (`concentration`, `weight` 0–5); unique
  `(questionOption, concentration)`.
- `Assessment` — one completed student assessment, linked to the
  `QuestionnaireVersion` the student answered.
- `AssessmentAnswer` — one stored answer per question, with `questionSnapshot`
  / `answerSnapshot` (the text/label at submission time) and `optionId`
  (unique per `assessmentId + questionId`).
- `ConcentrationScore` — one score per concentration per assessment (unique per
  `assessmentId + concentration`). Raw and normalized scores are stored and
  never recalculated from later questionnaire versions.

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

The suite covers scoring correctness (database weights, maxima, normalization,
ties, client/server weight separation), questionnaire validation (exactly-20,
orders, weight bounds, cross-major rejection, coverage), draft/publish/version
lifecycle, admin auth, session/credentials/rate-limit logic, dashboard math,
assessment-list query parsing, and the freshman-friendly initial question bank
(no forbidden technical terms, coverage, balance). Tests are pure logic /
mocked — they never mutate production Supabase data.

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
   ADMIN_USERNAME initial admin username (seed only)
   ADMIN_EMAIL    optional admin email (seed only, defaults to <username>@president.ac.id)
   ADMIN_PASSWORD initial admin password (seed only)
   ```

   `ADMIN_USERNAME` / `ADMIN_PASSWORD` are only needed to provision the admin
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
  admin/                  admin login + protected area (dashboard, records,
                          questionnaire management)
  api/assessments/        POST submission route (DB weights + snapshots + transaction)
  api/questionnaire/      POST lock current published version for a major (no weights)
components/               UI + feature components (student, admin, results)
  admin/questions/        version cards, question list/editor, weight editor,
                          validation panel, preview, publish dialog
data/                     legacy question configuration + display helpers
  publicQuestions.ts      legacy client-safe metadata (used for historical backfill)
  informaticsQuestions.ts legacy server-only config (used for historical backfill)
  informationSystemsQuestions.ts legacy server-only config (used for historical backfill)
lib/
  questionnaires/         database-managed questionnaire services
    validation.ts         pure publish validation (exactly-20, weights, coverage)
    scoring.ts            DB version → scoring pipeline + answer snapshots
    admin-questionnaire.ts admin data service (draft clone, edits, atomic publish)
    student-questionnaire.ts published-version locking
    serialization.ts      weight-free student question serialization
  scoring/                pure scoring pipeline (server-authoritative)
    score-assessment.ts   scoring core (accepts an explicit DB question set)
    tie-break.ts          deterministic tie handling (normalized → strong responses → priority)
  auth/                   admin sessions, credentials, rate limiting
  admin/                  dashboard + assessment records + questionnaire actions
  results/                result-page helpers (deterministic explanations)
  generated/prisma/       generated Prisma Client (git-ignored)
prisma/                   schema, migrations, seed (admin + questionnaires)
  question-bank.ts        initial freshman-friendly question data (seed only)
  seed-questionnaires.ts  idempotent questionnaire seed
  backfill-snapshots.ts   one-time legacy snapshot backfill
tests/                    Vitest-only server-only stub
```

> The old TypeScript question files under `data/` are kept **only** as the
> historical backfill source for legacy assessments. They are not read by the
> production student flow — the database owns all live questionnaire content.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — learn about Next.js features
- [Prisma Documentation](https://www.prisma.io/docs) — Prisma ORM concepts and configuration
- [Supabase Documentation](https://supabase.com/docs) — hosted PostgreSQL and project settings

