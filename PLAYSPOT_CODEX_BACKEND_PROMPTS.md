# PlaySpot PK — Codex Backend Prompt Pack

**Deadline:** Saturday, November 14, 2026, 11:59 pm PKT  
**Frontend repository:** https://github.com/mustansar-dev/FYP_PlaySpot_React_Native_FE  
**Team:** Ibrahim Sattar (BSSE23004), Mustansar (BSSE23027), Hasham (BSSE23053)

Use these prompts sequentially. Each prompt is self-contained enough for a new Codex session, a different machine or a different ChatGPT/Codex account. Codex must not assume it remembers another developer's work or this conversation. The shared source of truth is the **committed backend root `README.md`, current source code, Prisma schema/migrations and merged Git branch**.

> **Repository documentation rule:** Maintain exactly one README in the backend repository: `README.md` at repository root. Do not create nested README files or separate Markdown documentation files in the backend repo. Put setup, architecture, API contract, frontend mapping, database schema summary, environment variable list, test instructions, limitations and team coordination notes in the root README. These prompt files are external inputs and should not be copied into the backend repository.

---

# GLOBAL RULES — include these rules in every Codex task

1. Start by reading the backend root `README.md`, `package.json`, `prisma/schema.prisma`, recent migrations and the module you are about to change. Run `git status --short --branch`, inspect the active branch and `git log -5 --oneline`. Never assume a previous Codex session completed something unless it is present in the working tree/current merged branch.
2. Do not rely on conversation memory, previous account sessions, files on another developer's PC or unmerged work. If something is missing, inspect the repository and ask for the missing path/contract only when you cannot safely proceed.
3. Do not switch branches, pull, reset or rebase automatically if there are uncommitted changes. Report the state first and preserve user changes.
4. Work only on the assigned task/module. Do not rewrite the entire app, replace existing architecture, remove files or reformat unrelated code.
5. Do not add a second README, nested README or separate Markdown docs. Update root `README.md` only when the task changes a real setup step, endpoint contract, environment variable, schema decision or known limitation.
6. Never commit `.env`, API keys, tokens, database URLs, payment credentials, private keys, production data or real customer information. Update `.env.example` with variable names and safe placeholders only.
7. Use the existing package manager and lockfile. Do not change major dependency versions without explaining the compatibility reason. Inspect frontend React Native version/map library before proposing a native map package.
8. Keep API names, DTOs, enums, response shape and database field names consistent with root README and merged code. If a schema or endpoint contract change is needed, write the proposed change in the PR summary and coordinate with the schema/API owner; do not invent a parallel contract.
9. Only the assigned DB schema owner edits `prisma/schema.prisma` and `prisma/migrations` during this short project. Other members request schema changes through their branch PR. Never run destructive operations on the shared Supabase database.
10. Implement server-side validation, authorization and business rules. The frontend is untrusted: do not accept client-supplied role, vendor ownership, price, distance, rating, payment success or permission as authoritative.
11. Use Zod for request/environment validation, typed services, parameterized SQL and a centralized error handler. Do not expose raw SQL/stack traces/secrets.
12. Add/update tests for each feature. Never claim tests/build/typecheck passed unless you actually ran them and observed success. Report commands and failures honestly.
13. Before finishing, run relevant test, lint, typecheck and build commands; inspect `git diff`; report changed files, API endpoints, schema impact, env vars, test evidence and remaining blockers.

---

# Prompt 0 — Day 1: Full frontend audit, API contract, database schema and backend skeleton

**Run today, Tuesday November 10.** This is the foundation phase. Do not jump ahead and implement the entire backend today.

```text
You are the backend architect and senior Node.js/Express engineer for PlaySpot PK. Your task TODAY is to understand the existing React Native frontend completely, map its actual requirements to a backend contract, then implement the initial backend repository structure and database schema. The project deadline is Saturday, November 14, 2026 at 11:59 pm Pakistan time.

PROJECT CONTEXT
PlaySpot PK is a sports venue booking and player matchmaking app for Pakistan. It has two main roles:
- PLAYER/USER: register/login, discover nearby sports venues, filter by sport/facilities/rating/price, view venue/court details and reviews, book time slots, rent equipment/add-ons, make group/split contributions, join/create public/private game rooms, chat, join tournaments and view leaderboards.
- VENDOR/VENUE PROVIDER: register/login, manage provider profile, create venues and courts/playing grounds, set dimensions, surface (real grass/turf/wood/etc.), condition, facilities/parking, photographs and optional videos, create equipment/add-ons for rental/sale, set opening hours/availability, manage app bookings, manually add walk-in bookings for customers who arrive physically, and view booking/revenue/occupancy analytics.
The completed React Native frontend is in https://github.com/mustansar-dev/FYP_PlaySpot_React_Native_FE. The local checkout path differs on each developer's computer.

TODAY'S SCOPE ONLY
A. Inspect and understand the frontend in depth.
B. Produce the frontend-to-backend screen/route/API/data contract.
C. Design and implement the PostgreSQL/PostGIS database schema after the inspection.
D. Create the Express + TypeScript + Prisma backend skeleton/folder structure.
E. Configure environment validation, database client, PostGIS migration and minimal health route.
F. Maintain exactly one README in backend root; update it with findings and commands.
Do NOT try to finish all API modules today. Do NOT make assumptions about routes/screens without looking at the actual frontend source.

STEP 1 — REPOSITORY SAFETY AND DISCOVERY
- Run `pwd`, `git status --short --branch`, `git log -5 --oneline`, list top-level files and inspect package manifests.
- Detect the actual backend repo root and its current branch strategy. Do not overwrite any existing work.
- Find the frontend checkout locally. Search a few parent/workspace directories for `FYP_PlaySpot_React_Native_FE`; do not assume a fixed absolute path. If it is not present, ask me for its local path before inventing any frontend contract. The public GitHub URL is supplied above, but do not make destructive changes in that repository.
- Read frontend `package.json`, navigation setup/route definitions, all relevant screens/forms, API service layer, typed interfaces/models, Redux/Context stores, mock data and relevant reusable components. Use `rg`/search for fetch, axios, API, auth, booking, venue, court, review, map/location, vendor, equipment/add-on, payment, room, chat, tournament, leaderboard and analytics references.
- Trace every main user flow from the button/form to its navigation target and any current local/mock data operation. Note the exact property names, enum strings, IDs and formatting the UI expects.
- Inspect current React Native, Expo/bare workflow, Android/iOS architecture and installed map library before recommending any map dependency. Never upgrade React Native merely to install a map SDK under this deadline.

STEP 2 — WRITE A FRONTEND CONTRACT INTO ROOT README
Create or update only the backend root `README.md`. Include:
1. Frontend repo URL and the actual local path observed on this PC (do not make that path a requirement for other PCs).
2. Navigation/role overview and a table of screen/flow → frontend fields → API calls → response fields → auth role → errors/loading states.
3. Current mock/dummy data sources to replace, including actual filenames and exported types found in the frontend.
4. Exact API DTO/property naming as needed by the existing frontend; note gaps where UI does not collect a required field.
5. Proposed REST route list under `/api/v1` and consistent success/error JSON envelope.
6. API base URL instructions for Android emulator/device and local development based on the current frontend environment setup. Do not invent a host IP.
7. Record unresolved assumptions and request confirmation for any genuinely ambiguous user-facing business rule.

STEP 3 — DATABASE DECISIONS
Use this recommended stack unless the repository already has a compelling compatible setup:
- Node.js LTS, Express 5-compatible version, TypeScript.
- PostgreSQL hosted on Supabase Free for the shared development DB.
- Enable PostGIS using `CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;` after confirming the Supabase extension instructions and schema availability. Add required spatial indexes.
- Prisma for ordinary models/CRUD. Prisma does not natively support PostGIS geography types; model the location as `Unsupported("geography(Point,4326)")` or the supported equivalent and isolate spatial reads/writes in parameterized raw SQL in a dedicated repository. Do not pretend Prisma Client can create/update unsupported geography fields through normal CRUD.
- Use UUID IDs, UTC timestamps (`timestamptz`), integer PKR paisa for all amounts, explicit enums, foreign keys and unique constraints.
- Vendor-owned venue/court/equipment entities; one booking table for APP and WALK_IN sources; split payment contribution ledger; persisted chat/room/tournament/review/payment data as required by the actual frontend.
- Use database constraints/transaction strategy for overlapping bookings. Prefer a Postgres GiST exclusion constraint using `btree_gist` and a half-open `tstzrange(starts_at, ends_at, '[)')` for active slot-holding statuses. If Prisma migration tooling cannot represent it, add a checked-in SQL migration and test it. If you choose row/advisory locking instead, justify it and add a concurrency integration test. A non-transactional pre-check alone is forbidden.

Expected schema domains (adapt after inspecting frontend): User, RefreshToken, VendorProfile, Sport, Venue, VenueMedia, Amenity, VenueAmenity, Court, CourtMedia, OperatingHour/AvailabilityRule, EquipmentItem/Addon, Booking, BookingItem, Review, ReviewMedia, GameRoom, GameRoomMember, Conversation, ConversationMember, Message, Tournament, TournamentParticipant, TournamentMatch (only if actually required), Payment, PaymentContribution/Allocation, WebhookEvent, MediaAsset (if useful), Notification (if UI uses it).
Do not add tables just because they appear in this list. Every entity needs a real use case and relation. Add a short rationale in README.

STEP 4 — MAP AND PAYMENT DESIGN (DO NOT IMPLEMENT ALL PROVIDERS TODAY)
- Map renderer and tiles are separate from address/routing APIs. Recommended target is MapLibre React Native + OpenFreeMap tiles and Geoapify geocoding/routing, but first verify existing frontend package compatibility. Nearby venues must be searched by PostGIS, not third-party search.
- OpenFreeMap public basemap is keyless/free for the academic demo but is a public service without a production SLA. Configure the style URL, show required attribution and keep the provider replaceable.
- Geoapify free tier currently advertises 3,000 credits/day and up to 5 requests/second; proxy key-bearing geocode/routing calls through backend where practical and keep the key in server env.
- Safepay is the selected payment provider family. Implement the standard Safepay Sandbox hosted-checkout flow first; evaluate the distinct Raastwire aggregator sandbox for vendor collection/payout only if access has been approved and credentials are available. Raastwire access requires an application and compliance review; do not assume approval by the deadline. Do not initiate live transactions. JazzCash sandbox is a fallback only if required. Stripe is not currently available for Pakistan business accounts in Stripe's official country list.
- Implement a provider adapter design today only. Payment completion must rely on a verified webhook or server-side status check, never a React Native success redirect.
- Split payments are per-participant contributions tracked in our database. Do not present this as escrow or automatic marketplace/vendor payouts.

STEP 5 — CREATE THE BACKEND SKELETON
Keep modular monolith structure and use current repo conventions. A reasonable target:
`src/app.ts`, `src/server.ts`, `src/config`, `src/common`, `src/middleware`, `src/database`, `src/modules/{auth,users,vendors,venues,courts,equipment,availability,bookings,reviews,payments,rooms,chat,tournaments,leaderboards,analytics,media,notifications}`, `src/integrations/{maps,payments,storage}`, `src/realtime`, `src/routes`, `prisma`, `tests`.
Do not create empty boilerplate for every module if there is no code yet; establish conventions and create only directories/files justified today.

Create:
- package scripts for dev/build/start/lint/typecheck/test/prisma generate/migrate/seed as applicable.
- `tsconfig.json`, `.gitignore`, `.env.example` with names and placeholders only.
- typed environment validation (Zod) that fails clearly if a required variable is absent.
- Prisma client singleton/database health check.
- Express app with JSON limit, Helmet, explicit CORS allowlist, `/health` and `/api/v1/health`, 404 and centralized error handler.
- initial Prisma schema and migration, including PostGIS extension/spatial columns/indexes and constraints decided above.
- idempotent seed for reference sports/amenities and a safe development-only seed if necessary. Do not seed real passwords or use hardcoded production credentials.
- a minimal integration test for health and database connectivity if credentials are available.

README RULE: exactly one README file exists and it is `/README.md` at backend root. Do not generate README in `src`, `prisma`, `tests` or nested folders. Do not create separate Markdown docs. Put the schema summary, API contract, decisions and commands in the root README.

STEP 6 — VALIDATE AND REPORT
- Run install using existing package manager/lockfile.
- Run Prisma validate/generate and migration status; apply migration only to the agreed dev DB after confirming target and no destructive action.
- Run typecheck/lint/tests/build and start server.
- Confirm PostGIS query can find a venue within a radius if test data exists; otherwise at least verify extension, type and index.
- Run `find . -name README.md -print` and prove there is only one in backend repo.
- Inspect `git diff`; do not commit .env, credentials, local DB dumps or frontend code.

DELIVERABLE REPORT
At the end tell me:
1. Which frontend routes/screens/files and forms you inspected.
2. Actual screen-to-endpoint contract findings.
3. Final ERD/model list and important constraints.
4. Backend folder structure created.
5. Database/provider configuration still needed from a human.
6. Exact commands/tests run and their true results.
7. Changed files and branch name.
8. Any unresolved decisions/blockers.
Stop after this Day 1 foundation. Do not start unrelated feature modules.
```

---

# Prompt 1 — Day 2: Authentication, roles, profiles and vendor onboarding

**Primary owner:** Ibrahim (BSSE23004).  
**Branch:** `feature/auth-booking` after foundation is merged to `develop`.

```text
Implement the PlaySpot PK authentication and onboarding module only, using the committed backend root README, current branch and Prisma schema as the contract.

First perform the GLOBAL RULES checks. Confirm `git status`, branch, last commits, read root README and inspect actual `auth`, `users`, `vendors` modules. Confirm the Day 1 foundation is merged into your branch. Do not assume it is present.

Frontend requirements: inspect the current frontend auth navigation and player/vendor registration forms. Match exact form property names and DTOs expected by those screens; do not invent a new frontend contract. Support PLAYER and VENDOR roles. A vendor may need a VendorProfile linked to User; follow the agreed schema.

Implement:
- Player registration and vendor registration with Zod validation.
- Login using normalized email/phone identifier as the frontend expects.
- Short-lived JWT access token, rotating refresh token, refresh token hash persisted in DB, refresh/logout/revocation flow.
- Password hashing with bcrypt/bcryptjs; never log or return hashes.
- `GET /api/v1/auth/me`, profile read/update, vendor profile onboarding/status endpoints.
- Role middleware (`requireAuth`, `requireRole`) and ownership helper; role must be read/validated on server, not trusted only from token/UI.
- Duplicate account handling, safe auth errors, rate limits on login/register/OTP if the starter supports it.
- If frontend asks for verification but no email/SMS provider credentials exist, implement a clearly labelled development-only OTP flow or verification status with a safe console-disabled approach; do not claim an OTP was delivered. Document the limitation in root README.
- Tests: player/vendor register, duplicate email, invalid fields, wrong password, refresh rotation, logout/revoked refresh, protected route, player forbidden on vendor route, vendor access to own profile only.

Do not implement real email/SMS sending unless credentials/provider have been explicitly supplied. Do not build a new frontend.

Run tests/typecheck/lint/build; inspect diff. Update root README only with real endpoints/env vars/setup/limitations. Do not create other README files. Commit scoped changes on your assigned feature branch and prepare a PR to `develop`.

Report changed files, endpoint examples, test commands/results, required env variables and open issues. Never claim unrun tests passed.
```

---

# Prompt 2 — Day 2/3: Vendor, venue, courts, equipment, media, maps and reviews

**Primary owner:** Mustansar (BSSE23027).  
**Branch:** `feature/vendor-venue-maps` from the latest `develop` after the foundation merge.

```text
Implement the PlaySpot vendor/venue/catalog/media/map/review APIs. Follow the GLOBAL RULES and inspect current root README, Prisma schema, latest merged source and frontend forms/screens before coding. This is a fresh Codex session on a potentially different computer: do not rely on another session's context or local files.

Before coding:
- Verify branch is `feature/vendor-venue-maps` and clean; fetch/rebase only if safe.
- Read exact frontend venue creation/edit forms, vendor dashboard, equipment/add-on UI, photos/videos, map/location screens and review cards/forms.
- Confirm actual route names/DTOs from root README and current code. If there is a mismatch, do not silently rename the API; document the discrepancy and propose a contract update.
- Do not edit `prisma/schema.prisma` or `prisma/migrations`; the single schema owner handles schema changes. If a required model/column is missing, describe the requested migration in the PR summary and coordinate with Ibrahim.

Implement within assigned module:
1. Vendor-owned venue create/read/update/soft-delete and public listing/detail.
2. Venue address, city/area, sport type, latitude/longitude, description, capacity, dimensions, surface type (real grass/turf/wood/etc.), condition, facilities/parking and opening-hour inputs according to actual frontend form.
3. Court/playing-area CRUD; opening hours/availability fields; venue amenities/facilities many-to-many if the schema supports it.
4. Equipment/add-ons for rental or sale: name, description, type, current price, stock/quantity, active status. Booking should snapshot the price at time of booking; do not overwrite history when vendor changes price.
5. Media flow: authenticated vendor asks backend for signed upload URL; backend verifies ownership, allowlists file type/size and creates controlled storage path; client uploads to Supabase Storage; client/backend confirms metadata and saves DB reference. Never return service-role key. If Storage credentials are not ready, use an interface and a documented development adapter; do not persist fake remote URLs as if uploaded.
6. `GET /api/v1/venues/nearby`: validate lat/lng/radius, filters and pagination; run parameterized PostGIS `ST_DWithin` radius filter and nearest-first `ST_Distance` ordering. Keep the SQL in the dedicated spatial repository. Correct coordinate order: PostGIS point constructor takes longitude then latitude. Do not fetch all rows and calculate in Node.
7. Geocoding/search/routing only where frontend needs it, through a small Geoapify service adapter. Read `GEOAPIFY_API_KEY` from env. Add rate/timeout/error handling and do not log the API key. If key is missing, keep venue pin entry/manual coordinates functional and return an actionable disabled-provider response.
8. Review create/edit/read: user must have eligible completed booking unless README states another agreed policy; enforce one review per booking/user; aggregate average/count from DB; validate rating range.

Map integration constraints:
- The app map renderer/tile source and address/routing provider are separate. Do not add/upgrade a React Native native map package from this backend task.
- Recommended frontend combo is MapLibre + OpenFreeMap, but it must be compatible with the actual existing frontend. Public OpenFreeMap is for academic/demo use and has no production SLA; show correct attribution and keep the style URL configurable.
- Geoapify Free plan currently lists 3,000 credits/day and 5 requests/second; avoid per-render calls and use server-side caching where safe.
- Do not rely on the public OpenStreetMap standard tile server as unrestricted production hosting and do not bulk-download tiles.

Tests:
- Vendor A cannot edit vendor B's venue/courts/equipment/media.
- Invalid coordinates and numeric ranges fail validation.
- Nearby venues within radius are returned, outside radius are excluded, distances are sorted correctly and coordinates are not reversed.
- Multiple amenity filters and pagination work.
- Review eligibility/duplicate behavior and aggregate rating are correct.
- Storage signing is inaccessible to anonymous or non-owner users.

Do not commit migration changes; coordinate any required schema change. Run tests/typecheck/lint/build and report exact results. Update only root README for actual API/environment contract. Commit scoped changes and prepare a PR to `develop`.
```

---

# Prompt 3 — Day 3: Availability, booking engine and vendor walk-in booking

**Primary owner:** Ibrahim (BSSE23004), with Mustansar reviewing venue/court model requirements.

```text
Implement the booking and availability domain for PlaySpot PK. Follow GLOBAL RULES. This is an independent Codex session: inspect latest branch and merged code, root README, Prisma schema/migrations, auth, venues and courts modules. Do not assume previous session memory.

First verify assigned branch `feature/auth-booking`, clean working tree and latest foundation merge. Do not auto-reset. Do not alter Prisma schema/migrations unless you are the designated schema owner (Ibrahim) and have reviewed the change with team.

Business requirements:
- A player selects a venue/court, start/end time and optional equipment/add-ons.
- A vendor/manager can create a manual WALK_IN booking when a customer physically arrives without using the app. The walk-in record must occupy the exact same court/time calendar as an online booking.
- Server computes the price from current venue/court rate, duration and add-on price/quantity. Ignore total/price sent by the client.
- No two active bookings can overlap for the same court. This must hold under concurrent requests, not merely sequential UI testing.

Implement:
1. Availability endpoint by court/date, based on venue operating hours, court hours, blocked times and active bookings. Use `Asia/Karachi` as venue timezone default; store absolute instants consistently in UTC.
2. Create player booking, booking items and booking price snapshot.
3. Vendor booking manager list/filter by date/status/court.
4. Vendor `WALK_IN` booking creation with customer name/phone optional, created-by vendor user, payment method/status and source enum. Require ownership of court/venue.
5. Booking read by participant/authorized vendor; cancellation/status transition rules in service; do not permit arbitrary state changes.
6. Pending payment slot hold expiry policy. If scheduler is unavailable, expire stale holds during availability and create-booking operations.
7. Database transaction and concurrency-safe overlap protection. Prefer DB exclusion constraint `EXCLUDE USING gist (court_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)` for slot-holding statuses (using `btree_gist` if required). If existing migration chose advisory/row locks, follow that implementation and extend its tests. Never use a check-then-insert without transaction/lock.
8. Idempotency for retried booking-create calls if it can prevent duplicate bookings.

Test requirements:
- Valid player booking succeeds, server computes total.
- Invalid/closed slot fails.
- Same court exact overlap rejected.
- Adjacent half-open slots are allowed if product policy allows (e.g. 18:00–19:00 and 19:00–20:00).
- Two concurrent requests for overlapping slots: exactly one succeeds.
- WALK_IN conflicts with online booking and vice versa.
- Vendor cannot create walk-in on another vendor's court.
- Cancelled/expired booking releases availability according to policy.
- Add-on stock and price snapshot behave correctly.

Coordinate endpoint response shapes with actual frontend. Run tests/typecheck/lint/build, inspect diff, update root README only as needed, commit on assigned branch and open PR to `develop`. List migration changes separately and coordinate them with schema owner.
```

---

# Prompt 4 — Day 3/4: Safepay Sandbox integration and split contributions

**Primary owner:** Hasham (BSSE23053). Ibrahim reviews booking/payment state transitions.

```text
Implement the PlaySpot payment module using Safepay Sandbox as the primary provider. Follow GLOBAL RULES and inspect current root README, Prisma schema, current payment/booking modules, frontend checkout/split-payment screens, and latest merged code first. Do not rely on prior session memory.

Safety and scope:
- This is a sandbox integration for an academic demo. Do not enable live transactions or use real customer cards.
- Safepay standard sandbox transactions have no financial impact and test credentials are documented by Safepay. Live payments require onboarding and fees; do not claim live readiness unless actually approved.
- Safepay also has a distinct Raastwire aggregator product with merchant linking and payout APIs. Aggregator access requires an application with business details and compliance review. Do not assume the team will receive access before the deadline. Only build payout integration if Safepay has actually issued the required sandbox aggregator ID/secret and onboarding instructions.
- Stripe is not the selected provider because Pakistan is not listed on its current supported business-country page.
- JazzCash sandbox is a fallback, not a parallel first integration. Do not build multiple gateways before one complete tested flow.
- Split payments mean the app stores individual participant contributions to one booking. This is NOT escrow, regulated custody or automatic marketplace payout to each venue provider. Do not promise vendor settlement splitting unless Safepay contract/account explicitly supports it and team has confirmation.

Implement:
1. `PaymentGateway` provider interface with functions such as `createCheckout`, `verifyWebhook`, `getPaymentStatus` and optional `refund` only if safely supported.
2. Safepay sandbox adapter isolated under `src/integrations/payments/`. Use official Safepay API docs/Node library and the documented sandbox base URL. Keep secret/API/webhook keys in server env only.
3. Checkout initiation endpoint: authenticate payer, load booking/contribution from DB, calculate amount server-side, enforce idempotency, create local pending payment, call Safepay and return only provider checkout URL/reference needed by frontend.
4. Hosted checkout return/cancel handling. A return URL must never mark a payment as paid.
5. Webhook endpoint configured to receive raw bytes where signature verification requires them. For **Raastwire specifically**, read `X-SFPY-SIGNATURE` and `X-SFPY-TIMESTAMP`; verify HMAC-SHA256 over `timestamp + '.' + raw_body` using the base64-decoded webhook secret; compare the `sha256=<lowercase hex>` signature in constant time and enforce a timestamp tolerance. Do not parse/re-serialize JSON before verification. For standard Safepay hosted checkout, follow that product's own current official webhook instructions; do not assume its algorithm is identical to Raastwire. Persist provider event ID, deduplicate retries and update local payment/contribution/booking in one transaction. Invalid signature must not change state.
6. Server-side payment status check/polling endpoint for client status refresh, using the provider only if webhook delivery is delayed.
7. Split contributions: participant/share table, amount due, contributions initiated and verified. Prevent a participant from paying for another participant unless feature rules allow it. Do not over-allocate total; concurrency-safe transaction. Booking becomes fully paid/confirmed only when verified paid contributions reach the required threshold.
8. Store monetary amounts as integer paisa and currency `PKR`; do not use floats.
9. Refund endpoint only if provider and policy support it; otherwise record refund request state and document manual processing.

Testing:
- Create sandbox checkout with a known booking total.
- Missing provider credentials return clear configuration error, not fake success.
- Checkout redirect alone does not mark payment paid.
- Valid webhook updates once; invalid signature rejected; duplicate event does not duplicate contribution; the signature algorithm matches the Safepay product being used.
- Simulate failed/cancelled/timeout payment status.
- Concurrent contribution attempts cannot exceed amount due.
- User cannot read/pay another user's contribution unless explicitly a booking participant.
- Test payment keys never appear in API response/logs/frontend build.

Update root README with exact sandbox environment variable names, how to create sandbox credentials, webhook exposure/testing steps, supported flow and known limits. Never add credentials. Run tests/typecheck/lint/build; report actual outcome and commit on `feature/payments-community`, PR to `develop`.
```

---

# Prompt 5 — Day 4: Game rooms, persisted chat, Socket.IO, tournaments, leaderboards and analytics

**Primary owner:** Hasham (BSSE23053), coordinate API integration with Mustansar and Ibrahim.

```text
Implement community and vendor analytics modules for PlaySpot PK. Follow GLOBAL RULES. Start with git status/branch/log and read root README, schema, auth, booking, payment and existing realtime code. This session may run on a different developer's PC/account; do not assume previous unmerged work exists.

Implement only against merged schema/contracts. If model/field missing, send a precise schema request to the schema owner rather than editing migration files yourself.

A. Public/private game rooms
- Create room with sport, optional venue, date/time, capacity, description, public/private flag, creator/host and invite code for private rooms.
- List public rooms with filters and pagination; never list private rooms in public result.
- Join/leave room, enforce capacity and one membership per user. Use transaction/locking to prevent concurrent over-capacity joins.
- Private join must validate invitation/access rules. Host can manage room and participant status.

B. Chat
- Persist conversations, participants and messages in DB.
- REST APIs to list conversations, page messages and send messages (if frontend calls REST).
- Socket.IO server attached to existing HTTP server. Authenticate handshake with access JWT. Join a socket room only after checking DB conversation membership.
- Event names and payloads must be documented in root README, e.g. `chat:join`, `chat:message`, `chat:message:new`, `chat:typing` only if implemented.
- Persist message before broadcasting; send delivery/error acknowledgement. Do not trust `senderId` from client; derive sender from authenticated socket token.
- If Socket.IO is unavailable on deployment, REST message history/send must still work.
- Do not implement voice/video calling or push notifications unless separately approved.

C. Tournaments and leaderboard
- Create/list/get tournament; host/organizer authorization; join/leave participant; capacity/status/date checks.
- If bracket management is too large, deliver a basic team/player participant list and recorded results with a documented ranking/points rule. Never show a fake bracket as complete.
- Leaderboard data must be computed from persisted tournament/game results, not hardcoded arrays.

D. Vendor analytics
- Endpoint for authenticated vendor's date-range dashboard.
- Calculate booking counts by agreed date semantics, verified paid revenue only, and occupancy percentage based on booked court-minutes divided by available court-minutes, excluding closed/blocked periods consistently.
- Scope every query to the authenticated vendor. Never accept arbitrary vendorId from the client as authority.
- Return a stable DTO for frontend chart components, with empty-range zero values and PKR formatting handled by frontend.

Tests:
- Private room excluded from public search; invalid invite rejected.
- Concurrent joins cannot exceed capacity; duplicate join prevented.
- Non-member cannot read conversation or join Socket.IO room.
- Message sender is server-derived and message persists before broadcast.
- Tournament host-only changes; invalid capacity/date rejected.
- Leaderboard order deterministic for ties and score rule documented.
- Vendor cannot see another vendor's analytics; unpaid/cancelled transactions excluded from revenue; occupancy denominator correct for closed/blocked court time.

Run tests/typecheck/lint/build; update root README only with actual routes/events/metrics. Commit on assigned branch and PR to develop. Report test evidence and unresolved limitations.
```

---

# Prompt 6 — Day 4: React Native frontend ↔ backend integration

**Primary owner:** Ibrahim coordinates; Mustansar and Hasham own their feature screens. Run on the actual frontend repo and backend repo. Do not let Codex overwrite existing frontend work.

```text
Integrate the PlaySpot React Native frontend with the backend API. This is a coordinated task across two local repositories. First locate both repositories and inspect them; do not assume absolute paths or use unmerged files from another developer's computer.

Before editing:
- Confirm current frontend and backend branch/status in each repo. Preserve uncommitted changes. Read backend root README and actual frontend package/navigation/services/types/stores/screens.
- Confirm backend `develop` contains the merged endpoints required. Build a real screen-to-API checklist from frontend source and backend README.
- Never copy backend .env values into frontend source. Frontend may have a public API base URL and public map config only; no database, Safepay, Supabase service-role or private Geoapify keys.

Integration tasks:
1. Add/repair one typed API client using the frontend's existing style (Axios/fetch) and a configurable `API_BASE_URL` per environment. Do not scatter URLs across screens.
2. Add bearer-token handling, refresh flow and logout handling. Ensure refresh does not create an infinite request loop; clear local session on invalid refresh.
3. Replace mock data in high-priority flows with backend calls: player/vendor auth, vendor onboarding, venue list/detail/nearby, court availability, booking create/list/detail, vendor walk-in booking, equipment, reviews, vendor analytics, rooms/chat, payment status, tournaments/leaderboard based on merged API coverage.
4. Keep loading, empty, validation and network error states. Do not silently fall back to fake mock data after an API failure; if a development mock fallback remains, make it explicitly selectable and visually distinguish it.
5. Convert backend errors into understandable UI errors while retaining safe diagnostic logs in development only.
6. Configure Android emulator/physical device base URL correctly. `localhost` inside Android emulator is not the development host; use the correct emulator host alias or LAN/tunnel URL. Do not invent the developer's IP address.
7. Connect chat Socket.IO client using the same access token and documented event payloads. Keep REST history as initial load/fallback.
8. For payment, open only the checkout URL returned by backend and refresh status from backend; never mark paid from a deep-link success parameter alone.
9. Map: verify frontend React Native map package/version compatibility. Keep PostGIS nearby search from API and use OpenFreeMap style only if compatible. Add attribution and configure Geoapify through server-side API where possible. Do not upgrade the RN core under deadline just to force a map renderer.
10. Run app TypeScript checks and launch app. Test on emulator/device with backend reachable.

Do not change backend API contracts to suit one screen without coordinating. Do not delete or regenerate navigation/screens. Update only the appropriate root README in backend for integration base URL and contract changes; do not add any nested README.

Report every screen connected, every remaining mocked flow, exact app/backend test commands and real results. Commit frontend changes only in frontend branch; backend changes only in backend feature branch. PR each repo to its own develop branch.
```

---

# Prompt 7 — Saturday, November 14: Final end-to-end QA, security pass, release and handoff

**Run by all three developers; Ibrahim coordinates final release.**

```text
Perform final release QA for PlaySpot PK backend and React Native integration. The hard deadline is 11:59 pm PKT today. Prioritize fixing real blockers over adding features.

Follow GLOBAL RULES. Inspect both repos, branches, git status, root backend README, Prisma schema/migrations, package files and merged develop branches. Preserve all uncommitted changes and do not reset/force-push.

STEP 1 — REPRODUCIBLE STARTUP
- Verify clean clone setup steps documented in root README.
- Verify env variables from `.env.example` and fail-fast validation. Do not inspect/print secret values.
- Run Prisma validate/generate/migrate status; verify shared DB target and no destructive migration.
- Run seed safely and confirm no duplicate seed records.
- Start backend and confirm `/health`, DB health and Socket.IO startup.

STEP 2 — END-TO-END PLAYER FLOW
- Register player → login → me/profile → nearby venues → detail/courts/reviews → availability → create booking → sandbox checkout → verified payment status → booking history/cancel policy.
- Group booking → add participants → participant contributions → paid threshold.
- Join public room → join private room with invite → send/read persisted chat.
- Join tournament → leaderboard.

STEP 3 — END-TO-END VENDOR FLOW
- Register vendor → login → vendor profile → create venue → court/dimensions/surface/condition/facilities/parking → photo upload path → equipment/add-on → opening hours.
- Player booking appears in vendor manager.
- Vendor creates walk-in booking for an external customer; same slot blocks app booking.
- Vendor analytics shows DB-backed monthly bookings, verified revenue and occupancy.

STEP 4 — SECURITY / NEGATIVE CASES
- Player cannot create/edit venue or read vendor analytics.
- Vendor A cannot edit Vendor B's records.
- Invalid/missing JWT rejected; expired/revoked refresh rejected.
- Bad payload rejected; pagination and filters bounded.
- Booking overlap race: two concurrent requests cannot both reserve same court/time.
- Client price/payment status manipulation has no effect.
- Invalid/duplicate Safepay webhook cannot mark payment twice.
- Private room and chat membership checks enforced.
- Secrets absent from Git history of current changes, frontend bundle, API responses and logs.
- Check CORS, request size, rate limits and stack-trace leakage.

STEP 5 — QA AUTOMATION
Run all available backend tests, frontend typecheck/lint/tests and backend build. Record exact command and outcome. Fix only high-value issues that can be verified. Do not claim a test passed if it wasn't run. If a third-party sandbox/network credential is unavailable, test the adapter using deterministic mocks and record that limitation; do not claim live provider verification.

STEP 6 — README AND RELEASE
- Update only backend root `README.md` with final install/setup, environment variable names, migration/seed commands, endpoint list, Socket.IO events, API base URL, maps/payment setup, tested flows, known limitations and team attribution.
- Run `find . -name README.md -print`; ensure exactly one README in backend repository.
- Verify no .env or credentials staged. Review `git diff --check`, `git status` and commit history.
- Merge feature PRs into `develop`; after final acceptance, release lead merges `develop` into `main`. Do not force-push.
- Tag release only if team is already using tags; otherwise keep it simple.

FINAL HANDOFF REPORT
Provide:
- commit hash / merged PR list and release branch;
- tested startup commands;
- database host/setup and migration status without exposing connection strings;
- endpoint groups and frontend flows that are actually working;
- exact test commands/results;
- payment provider environment (sandbox or live) and limitations;
- maps provider and quota/attribution note;
- known issues/deferred features;
- confirmation that only one root README exists.

Deadline is 11:59 pm PKT. Stop feature additions once the freeze is called. Prioritize a stable demonstrable app over unfinished extras.
```

---

# Optional Prompt 8 — If a provider/account is unavailable: implement a safe local adapter, not fake success

```text
A third-party account/credential or provider webhook is unavailable. Do not pretend the external integration succeeded, do not hardcode fake production URLs, and do not return `paid=true` from a stub.

Inspect current provider interface and README. Implement a clearly named development-only adapter/mock behind an explicit environment flag such as `PAYMENT_PROVIDER=mock` (never the default in production). It may simulate pending/success/failure only for automated tests/demo data, but every response and persisted row must retain `provider=mock` and `environment=development`. Prevent this adapter from running when `NODE_ENV=production`.

For maps/geocoding, support manual latitude/longitude entry and use PostGIS nearby search when Geoapify key is absent. Do not invent geocoding results.

Add tests proving the mock cannot be enabled in production. Update the single root README with what is simulated and what was not connected. Report the exact missing credential/account approval required for the real provider.
```

---

# Team execution checklist (use across separate Codex sessions)

## Before each developer starts a prompt

- [ ] Pull latest remote branch list and inspect working tree; preserve local changes.
- [ ] Read root backend `README.md` and current schema.
- [ ] Confirm feature branch exists and is based on latest `develop`.
- [ ] Confirm task ownership and module boundaries in team chat.
- [ ] Confirm no other developer is editing the same files/migrations.
- [ ] Use own local `.env`; do not send secrets to Codex prompts or commit them.

## Before opening each PR

- [ ] Scope is limited to assigned module.
- [ ] Tests added/updated and actually run.
- [ ] Typecheck/lint/build run where available.
- [ ] `git diff --check` clean.
- [ ] No secret or generated binary/database dump staged.
- [ ] Any schema requirement is coordinated with Ibrahim, the schema owner.
- [ ] Root README updated only if shared contract/setup changed.
- [ ] PR target is `develop`, not `main`.
- [ ] PR description includes changed files, endpoints, migration needs, env vars, test evidence and remaining limitations.

## Final team principle

A new Codex session starts from the repository, not from memory. The committed root README + schema + tests + merged code are the shared context. Keep interfaces stable, communicate schema changes, merge continuously, and never label a sandbox/demo feature as a production integration.
