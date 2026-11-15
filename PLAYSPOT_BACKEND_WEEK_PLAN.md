# PlaySpot PK — Backend/API Week Plan

**Project:** PlaySpot PK — Smart Sports Venue Booking and Player Matchmaking Platform  
**Backend:** Node.js + Express.js + TypeScript + PostgreSQL/PostGIS  
**Frontend:** Existing React Native app in `mustansar-dev/FYP_PlaySpot_React_Native_FE`  
**Deadline:** **11:59 pm, Saturday, November 14, 2026 (Pakistan time, Asia/Karachi)**  
**Planning window:** Tuesday, November 10 through Saturday, November 14, 2026  
**Team:** Ibrahim Sattar (BSSE23004), Mustansar (BSSE23027), Hasham (BSSE23053)

---

## 1. Project objective

Build a real, integrated backend/API for the completed PlaySpot React Native frontend. The backend must replace the frontend's mock/dummy data with persistent database records and real API responses. The completed application supports two main roles:

- **Player/User:** discover venues, filter by sport and location, view facilities and reviews, book courts, rent equipment, join or create games, contribute to split payments, chat, join tournaments, and view leaderboards.
- **Venue Provider/Vendor:** register and manage a provider profile, create venues and courts/playing grounds, define facilities and venue conditions, upload photographs/videos, publish equipment/add-ons, manage availability and bookings, add walk-in bookings, communicate with customers, and view booking/revenue/occupancy analytics.

This is a time-boxed academic project. Deliver a reliable, demonstrable end-to-end MVP rather than a broad collection of untested endpoints. Every frontend flow included in the final presentation must have a functioning API and persistent behavior, or be clearly labelled as a deliberately limited demo flow.

## 2. Deadline and delivery definition

The final deadline is **Saturday, November 14, 2026 at 11:59 pm PKT**. The team should aim to freeze feature work by 7:00 pm on November 14, leaving the remaining time for integration, smoke tests, bug fixes, deployment checks and submission.

“Complete” means:

1. The backend starts from a clean clone using the documented commands.
2. Database migrations and seed scripts work against the shared development database.
3. The React Native app can authenticate and use the backend base URL without relying on mock data for the main flows.
4. Authorization is enforced on the server, not only by hiding frontend buttons.
5. Booking availability prevents overlapping confirmed/held bookings, including vendor-entered walk-ins.
6. Payment states are set from verified server-side provider/webhook results, never solely from a client redirect.
7. At least one complete happy-path test exists for every major feature group.
8. Secrets, real customer credentials and payment credentials are not committed.
9. The backend repository has **one and only one README file: the root `README.md`**. All setup, architecture, API contract, schema overview, commands, integration notes and team workflow belong in that root file. Do not create nested README files or separate documentation Markdown files inside the backend repository.

## 3. Decisions and recommended technology stack

### 3.1 Backend framework

| Area | Decision | Reason |
|---|---|---|
| Runtime | Node.js 22 LTS or the compatible LTS already used by the project | Stable ecosystem and compatibility. Do not upgrade an existing toolchain without a concrete reason. |
| Language | TypeScript | Shared contracts, safer refactoring across three developers, clearer request/response types. |
| HTTP framework | Express 5 (or the compatible Express version already present) | Familiar REST API framework; keep the codebase simple and modular. |
| Database | PostgreSQL | Relational integrity, transactions, constraints and robust querying suit booking/payment data. |
| Spatial database | PostGIS extension | Efficient radius and nearest-venue searches using geographic coordinates and spatial indexes. |
| ORM | Prisma | Productive typed CRUD, schema and migrations. Use parameterized `$queryRaw`/`$executeRaw` for PostGIS operations because Prisma does not natively model PostGIS geometry/geography fields. |
| Validation | Zod | Validate request bodies, query parameters and environment variables at the boundary. |
| Authentication | JWT access token + rotating refresh token; bcrypt/bcryptjs password hashing | Works with a React Native client. Keep refresh tokens hashed in the database and revoke/rotate them. |
| Realtime | Socket.IO for authenticated chat events, backed by persisted messages | Chat needs server-mediated realtime delivery; REST remains the source of truth and fallback. |
| File storage | Supabase Storage using server-issued signed upload URLs | Keep large photos/videos outside PostgreSQL; store paths/metadata in database. |
| API contract | REST JSON under `/api/v1`; document the contract in root README and expose Swagger/OpenAPI only if time permits | Easy to consume from React Native. |
| Tests | Jest or Vitest + Supertest, depending on the starter setup | Exercise routes and business rules without a mobile UI. |

**Important Prisma/PostGIS caveat:** Prisma's official documentation says it does not directly support PostGIS geographic types. The schema can declare the column as `Unsupported("geography(Point,4326)")`, but reads/writes involving that field must use carefully parameterized raw SQL. Keep ordinary venue CRUD in Prisma and isolate all spatial SQL in one location repository/service. Do not interpolate user-provided SQL strings. See the Prisma note in the references section.

### 3.2 Database hosting: Supabase Free PostgreSQL + PostGIS

**Recommendation:** Use a Supabase Free project as the shared development database, with PostGIS enabled. Use a local PostgreSQL/PostGIS Docker container as the optional local fallback if anyone cannot access the shared instance.

Why:

- Supabase provides a normal PostgreSQL connection, so Express + Prisma can connect to it.
- PostGIS can be enabled from the Supabase Dashboard under Database → Extensions. Install it in the `extensions` schema, not `public`, as the current Supabase guide recommends.
- The current published Free plan includes a 500 MB database, 1 GB file storage and 5 GB egress. This is adequate for a small academic MVP if test media are compressed and usage is controlled.
- Important limitation: Free projects can pause after seven days of low activity. The owner must monitor the project and reactivate it before the presentation if needed. Free plan does not provide production-grade backups/SLA.

**Database rules:**

- Use one shared development database/project for integration. Each developer uses their own local `.env` and never commits secrets.
- Store monetary amounts as integer minor units (PKR paisa), not floating-point values. Use a consistent currency field (`PKR`).
- Store timestamps as UTC `timestamptz`; format local time at the frontend boundary.
- Use UUID primary keys, foreign keys, unique constraints, check constraints and indexes.
- Put a GIST index on venue location. Use `ST_DWithin` to filter a radius and sort by `ST_Distance` for nearby venues.
- Use transactions for booking creation, payment allocation, room membership and other multi-record workflows.
- The schema/migration owner is the only person who edits Prisma schema and creates/edits migrations during the short delivery window. Other developers submit schema-change requests through their PRs to avoid migration collisions.

### 3.3 Location/maps: MapLibre + OpenFreeMap + Geoapify

A map renderer, map tile source and geocoding/routing API are different things; do not treat them as one service.

| Layer | Recommended choice | Use in PlaySpot | Cost/limits and caveats |
|---|---|---|---|
| React Native map renderer | `@maplibre/maplibre-react-native` **only if compatible with the existing frontend's React Native version/new architecture** | Native interactive map, camera, markers and user-location view | Open-source. Current v11 docs require React Native 0.80+ and New Architecture; it is not supported in Expo Go. Inspect the existing frontend before adding it. Do not force a risky RN upgrade during this deadline. |
| Basemap/style/tile service | OpenFreeMap public style (OpenStreetMap-derived) | Display Lahore/Pakistan roads and map background | Public service is advertised as free with no API key or request/view cap. It is community-operated; do not promise an SLA. Use attribution, cache responsibly, and make style URL configurable so the provider can be changed. |
| Geocoding + routing | Geoapify | Convert vendor-entered addresses to coordinates, search addresses, optionally fetch directions/route data | Current Free plan: 3,000 credits/day, no card required, up to 5 requests/second. Pricing page says free plan has limited commercial use; acceptable for an academic demo subject to terms, quota and attribution. Proxy key-bearing calls through Express if practical; do not place a secret API key in a committed source file. |
| Nearby venue search | Our own PostGIS query | Return venues within a selected distance of the player's coordinates | No third-party nearby search is needed. PostGIS is the authoritative distance/filter source for our own venues. |

**Implementation approach:**

1. A vendor submits an address and a map pin (latitude/longitude). Geocode only when necessary; do not geocode every venue on every request.
2. Persist the canonical venue point in PostGIS `geography(Point,4326)` and expose numeric `latitude`/`longitude` to the frontend DTO.
3. The app sends `lat`, `lng`, `radiusKm`, sport and other filters to `GET /api/v1/venues/nearby`.
4. Express validates coordinates and invokes a parameterized PostGIS `ST_DWithin` query; results include distance in metres/kilometres and are sorted nearest-first.
5. The map displays returned venues as markers. Search by text/address and routing can use Geoapify behind backend endpoints.
6. Always display the correct map/data attribution required by OpenFreeMap/its style and Geoapify.

**Do not use the public `tile.openstreetmap.org` raster endpoint as an unrestricted production tile CDN.** Its published policy warns that the tile servers are capacity-limited, have no SLA and can block harmful usage; use an OSM-derived provider instead. Do not bulk-download tiles.

### 3.4 Payment gateway: Safepay Sandbox first; JazzCash as alternative

**Primary recommendation: Safepay.** Use Safepay as the selected payment-provider family, but keep its products/flows separate behind a payment adapter. Implement the standard Safepay Sandbox hosted-checkout flow first; evaluate the newer Safepay Raastwire aggregator sandbox for vendor-level collections/payouts only if Safepay grants aggregator access in time.

Why Safepay:

- It is a Pakistan-based provider regulated by the State Bank of Pakistan (as stated in its official terms).
- Its official API documentation offers a free sandbox; sandbox transactions do not have financial impact and test credentials are available.
- Its standard payment API documents REST APIs, sandbox/test cards, hosted checkout and webhook support. Hosted checkout keeps card entry on the provider page; Express creates the checkout/session and returns the provider URL to the React Native app.
- Safepay also publishes **Raastwire**, a separate Raast aggregator API. Its official documentation describes aggregator merchants, payment collection, ledgers and payouts, including linking aggregator merchants to Raast merchants. This could eventually support vendor-specific collections/payouts more naturally than a single platform merchant account. However, aggregator access requires an application and Safepay compliance review; it is not instant self-service access. Treat it as optional until approved credentials are actually supplied.
- For Raastwire webhooks, Safepay documents signature verification over `timestamp + '.' + raw_body`, using the base64-decoded webhook secret as the HMAC-SHA256 key and constant-time signature comparison. Use the exact current product docs and do not reuse the legacy standard-checkout webhook algorithm for Raastwire.

**Alternative: JazzCash Sandbox.** JazzCash publishes official v4.2 sandbox docs with merchant self-registration, test credentials, card/mobile-wallet/OTC options, transaction status inquiries, refunds and webhook/ITN topics. It is a good Pakistan-specific alternative if the supervisor expects JazzCash/mobile-wallet checkout. Do not start Safepay and JazzCash integrations simultaneously under this deadline; implement one working provider end-to-end and leave the second behind the provider interface.

**Stripe:** Do not design the MVP around Stripe. Stripe's current official global availability list does not list Pakistan as a supported account country. Do not attempt to bypass regional eligibility through false addresses or another person's account. A legitimate foreign company setup is a separate legal/business decision, not a free technical workaround.

**Payment cost distinction:** A free sandbox is not free live payment processing. Real transactions require provider merchant onboarding and are subject to that provider's current fees, eligibility, settlement rules and terms. Do not hardcode a fee percentage from an old pricing page; confirm the current merchant offer with the provider before any real-money launch.

**Split-payment / vendor-payout design:**

- Implement player split payment as an application ledger: a booking has a total amount and multiple participant contribution records. Each participant can create/pay their own contribution; the backend sums verified paid contributions and updates the booking only when the required total is reached.
- For the standard hosted-checkout sandbox, participant payments are individual transactions under the configured project merchant account, if the sandbox supports the required scenario. Do not infer separate vendor settlement from separate contributions.
- If Safepay approves a Raastwire aggregator account, investigate merchant onboarding/linking and payout APIs for vendor settlement. The official Raastwire docs state that an aggregator account is required before creating merchants, payments or payouts and that Safepay reviews the application before provisioning credentials. Keep this behind an optional adapter until the team has approved access, merchant/KYC requirements and sandbox credentials.
- Do **not** describe the in-app contribution ledger as escrow, regulated custody or an actual bank ledger. Do not pay a vendor through an unapproved workaround. Real marketplace collections/payouts require provider approval, vendor onboarding/KYC and agreement to provider/legal terms.
- Client redirects are not proof of payment. A verified webhook or server-side provider status check is required.
- Build `PaymentGateway` interface first so provider-specific code is isolated under `integrations/payments/`.

### 3.5 Media storage

Use Supabase Storage for venue/court photos, optional videos and profile images if a shared bucket is available. The Express backend authenticates the vendor, checks ownership, creates an allowlisted storage path and returns a signed upload URL. Save the resulting object path, media type, size and URL/reference in PostgreSQL. Never expose the Supabase `service_role` key to the mobile app. Apply file-size/type limits and use public read only for public venue media; private chat media should use signed read URLs.

---

## 4. Architecture and code organization

Use a modular monolith. Do not create microservices for this academic deadline.

```text
playspot-backend/
├── README.md                    # The only README in the backend repository
├── package.json
├── tsconfig.json
├── .env.example                 # Names/placeholders only; no real secrets
├── .gitignore
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app.ts                   # Express app composition
│   ├── server.ts                # HTTP + Socket.IO startup/shutdown
│   ├── config/                  # env validation, constants
│   ├── common/                  # errors, response helpers, pagination, types
│   ├── middleware/              # auth, role guard, validation, rate limit, errors
│   ├── database/                # Prisma client, transactions, spatial query wrapper
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── vendors/
│   │   ├── venues/
│   │   ├── courts/
│   │   ├── equipment/
│   │   ├── availability/
│   │   ├── bookings/
│   │   ├── reviews/
│   │   ├── payments/
│   │   ├── rooms/
│   │   ├── chat/
│   │   ├── tournaments/
│   │   ├── leaderboards/
│   │   ├── analytics/
│   │   ├── media/
│   │   └── notifications/
│   ├── integrations/
│   │   ├── maps/                 # Geoapify client/provider adapter
│   │   ├── payments/             # PaymentGateway + Safepay adapter
│   │   └── storage/              # Supabase Storage adapter
│   ├── realtime/                 # Socket.IO auth, rooms, events
│   └── routes/                   # `/api/v1` router composition
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

Each feature module should separate `routes`, `controller`, `service`, `repository` (where needed), `schemas` and `types`. Avoid one giant controller, duplicated business logic, circular imports and routes that directly issue database queries.

### Request lifecycle

`React Native → Express route → validation middleware (Zod) → authentication/role middleware → controller → service/business rules → Prisma/repository → PostgreSQL/PostGIS → consistent JSON response`

Use `src/integrations` for external providers; never call Safepay, Geoapify or Storage directly from controllers.

## 5. Database design — entity inventory

The final schema must be designed **after inspecting the real frontend routes/screens/forms/types/API calls**. The following is the expected baseline, not permission to blindly create every possible field. Map each selected table/relationship to a real frontend feature and note any frontend gaps in the root README.

| Domain | Core tables/models | Key rules |
|---|---|---|
| Identity | `User`, `RefreshToken`, `VendorProfile` | Email/phone uniqueness as appropriate; hashed password; `PLAYER`/`VENDOR` roles; vendor account status. One user may have one primary role for MVP unless frontend explicitly supports multiple roles. |
| Sports/catalog | `Sport`, `Amenity` | Controlled reference data; seed football, cricket, badminton, padel, basketball, table tennis, etc. |
| Venue | `Venue`, `VenueMedia`, `VenueAmenity`, `Court`, `CourtMedia`, `OperatingHour` | Vendor ownership; address; city/area; point; dimensions; surface type (real grass/turf/wood/etc.); condition; photos/videos; capacity; opening hours; facilities/parking. |
| Equipment/add-ons | `EquipmentItem` (or `VenueAddon`) | Belongs to venue; price, rental/sale type, stock/quantity, active status. Booking item snapshots price and quantity at purchase time. |
| Availability | `AvailabilityRule` or `OperatingHour`, optional `BlockedSlot` | Slots are calculated from court hours and booking/blocked records. Time zone policy must be explicit. |
| Booking | `Booking`, `BookingItem`, optional `BookingParticipant` | APP and WALK_IN sources; court; start/end; status; amount snapshot; creator; optional walk-in customer name/phone; equipment lines. |
| Reviews | `Review`, optional `ReviewMedia` | Only a completed/eligible booking can be reviewed; unique review per booking/player; compute aggregate rating from reviews. |
| Game rooms | `GameRoom`, `GameRoomMember` | Public/private, invite code, sport/venue/time, capacity, creator, membership status. Do not expose private rooms in public queries. |
| Chat | `Conversation`, `ConversationMember`, `Message` | Persist messages; verify sender is a member before read/write/socket join. |
| Tournaments | `Tournament`, `TournamentParticipant`, optional `TournamentMatch` | Host/vendor, sport, venue, dates, capacity/status; basic participant list and simple leaderboard/ranking. |
| Payments | `Payment`, `PaymentContribution`/`PaymentAllocation`, `WebhookEvent`, optional `Refund` | Provider ID unique; PKR integer minor units; idempotency; state machine; verified webhooks; contributions sum toward booking total. |
| Media | `MediaAsset` (optional; otherwise media columns in owning tables) | Database stores metadata/path, not binary file content. |
| Notifications | `Notification` | In-app notification records for booking/payment/room/chat events if frontend requires them. |

### Essential relational constraints

- Every venue belongs to a vendor profile/user; vendors can only edit their own venue, courts, equipment, bookings and analytics.
- Every court belongs to one venue and has a sport or supported sport relation.
- `VenueAmenity` must be unique on `(venueId, amenityId)`.
- A booking belongs to one user (or a guest/walk-in contact) and one court; booking items are separate child records.
- Walk-in bookings must use the **same court/date/time availability and collision rules** as app bookings. Do not create a separate manual-booking calendar.
- Prevent overlapping active bookings for the same court. Prefer a database exclusion constraint on `(court_id, tstzrange(starts_at, ends_at, '[)'))` for statuses that hold/occupy a slot, using Postgres `btree_gist` as needed. If compatibility prevents that approach, use transaction isolation/locking and prove the race-condition behavior with an integration test. A simple preflight query without a transaction is insufficient.
- `Review` uniqueness should prevent duplicate review for the same booking/user.
- `Payment.providerReference` and `WebhookEvent.providerEventId` should be unique where supplied.
- `GameRoomMember` unique on `(roomId, userId)`.
- Persist UTC time instants; venue timezone should be `Asia/Karachi` initially unless a venue explicitly has another timezone.

## 6. API contract baseline

The actual final contract must be checked against the frontend source. Use `/api/v1` and REST naming. All endpoints should return consistent JSON and standard HTTP status codes. Use pagination for collection routes.

| Group | Expected endpoints | Authorization |
|---|---|---|
| Health | `GET /health`, `GET /api/v1/health` | Public |
| Auth | `POST /auth/register/player`, `POST /auth/register/vendor`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | Public/authenticated as appropriate |
| User | `GET /users/me`, `PATCH /users/me`, profile/avatar endpoints | Authenticated user |
| Vendor | `GET/PATCH /vendors/me`, onboarding/status endpoints | Vendor |
| Venue discovery | `GET /venues`, `GET /venues/:venueId`, `GET /venues/nearby`, `GET /venues/:venueId/reviews`, `GET /venues/:venueId/courts` | Public/read; sensitive details protected |
| Venue management | `POST /venues`, `PATCH /venues/:venueId`, `DELETE /venues/:venueId` (soft-delete preferred), venue media and amenities endpoints | Owning vendor |
| Courts/facilities | `POST/PATCH/DELETE /venues/:venueId/courts`, operating hours, blocked periods, facilities | Owning vendor |
| Equipment | `GET /venues/:venueId/equipment`, vendor CRUD for equipment/add-ons | Public read; owning vendor writes |
| Availability | `GET /courts/:courtId/availability?date=...` | Public/read; details may require auth |
| Bookings | `POST /bookings`, `GET /bookings/me`, `GET /bookings/:id`, `POST /bookings/:id/cancel` | Player/owner rules |
| Vendor booking manager | `GET /vendors/me/bookings`, `POST /vendors/me/bookings/walk-in`, status/update endpoints | Owning vendor |
| Reviews | `POST /bookings/:bookingId/review`, `PATCH/DELETE /reviews/:reviewId` (within policy) | Eligible booking owner |
| Rooms | create/list/get room, join/leave, invite/private join endpoints | Authenticated; room-specific authorization |
| Chat | list conversations/messages, send message; Socket.IO events | Conversation member |
| Tournaments | create/list/get, join/leave, participants, matches/results | Authenticated; host controls write actions |
| Leaderboard | `GET /leaderboards?scope=...` | Public or authenticated based on frontend |
| Payments | create payment/contribution, get status, refund request (if authorized), provider webhook | Authenticated; webhook verified separately |
| Analytics | `GET /vendors/me/analytics?from=...&to=...` | Owning vendor |
| Media | signed upload URL, confirm asset, delete media | Authenticated + owner check |
| Notifications | list/read notification | Authenticated user |

### Consistent API response shape

Success:

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 0 }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": []
  }
}
```

Do not leak stack traces, SQL errors, secrets, hashed passwords or provider credentials in API responses.

## 7. Business rules that must be enforced in the backend

### Authentication and roles

- Hash passwords using bcrypt/bcryptjs with an appropriate work factor; never store plaintext passwords.
- Use short-lived access tokens and longer-lived refresh tokens. Store refresh-token hashes; rotate on refresh; revoke on logout; handle expiry/reuse defensively.
- Validate role and identity on every protected action. A player must not create/edit vendor venues or read another vendor's analytics. A vendor must not create a booking on a venue they do not own.
- Registration should validate normalized email/phone, required profile fields and password policy. Email/phone OTP can be a development-only code if no SMTP/SMS credentials are available; do not pretend it was delivered by a real provider.
- Never store tokens/passwords in logs.

### Venue and location

- Only active/approved venues are public.
- Validate latitude `[-90, 90]`, longitude `[-180, 180]`, positive dimensions, supported sport, price and capacity.
- Venue list endpoints must filter safely by sport, city, facilities, rating and distance.
- Distance filtering must happen in PostGIS, not by downloading all venues into Node.js and calculating distance in a loop.

### Booking and walk-in bookings

- Compute final totals server-side from current court price, duration, add-ons/equipment and discounts. Ignore client-submitted total amounts.
- Use a transaction and unique/exclusion/locking strategy to stop double booking.
- Booking status example: `PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `EXPIRED`; define exact transitions once in code.
- A pending unpaid hold expires after a documented short period; a scheduled cleanup can be a simple endpoint/periodic job only if the deployment supports it. Without a scheduler, expire stale holds during availability/booking operations.
- Walk-in booking records `source = WALK_IN`, creator vendor/manager, optional customer contact, amount/payment method/status and the same court/time range as all other bookings.

### Payments and split contributions

- Use a provider abstraction, e.g. `createCheckout`, `verifyWebhook`, `getPaymentStatus`, `refund` (only if provider flow is approved).
- Use idempotency keys for payment initiation and webhook event processing.
- Store all provider raw event payloads safely after stripping/securing sensitive values; store event ID and processing result for deduplication.
- Verify Safepay HMAC webhook signatures using the exact documented signature procedure and raw request bytes. Follow the latest official Safepay docs, not an unverified blog/sample.
- A return URL is only a user experience signal. Confirm payment through webhook/server-side status check.
- Participant contributions cannot overpay the booking total; use a database transaction/locking to prevent concurrent over-allocation. The sum of verified contributions controls paid amount/status.
- Do not expose any secret API key to the React Native bundle.

### Reviews, chat and rooms

- Only users who completed/are eligible for a venue booking may review that venue, unless the existing frontend explicitly models a different policy.
- Average rating and count must be derived from persisted reviews; don't hard-code a rating.
- Socket.IO connections must authenticate via access token. Joining a conversation room requires checking membership in the database. Persist a message before broadcasting it.
- For private rooms, validate invite code/access; capacity cannot be exceeded in concurrent joins.

### Vendor analytics

- Report counts/revenue/occupancy from database records for a date range; do not simply return static chart values.
- Define metric semantics: bookings counted by start time or created time; revenue counted only from verified paid transactions; occupancy = booked court minutes / available court minutes in range, excluding closed/blocked periods consistently.
- Use PKR minor units internally and format for the frontend.

## 8. Four-day implementation and integration schedule

### Day 1 — Tuesday, November 10: frontend discovery, API contract, database schema and backend skeleton

**Owner:** Ibrahim leads the foundation; Mustansar and Hasham review the frontend mapping and schema from their own local clones.

1. Clone/open the exact frontend repository locally and inspect the actual project before designing endpoints. Read package manifest, navigation trees, every relevant screen/form, existing types/interfaces, API service utilities, mock/dummy data, Redux/context stores and navigation params. Search for all use cases in the frontend.
2. Create a screen-to-API matrix in the root backend README: screen/flow, required fields, calls, response fields, role, errors/loading states and frontend gaps.
3. Agree on the database model and relationships using the entity inventory above, adapting it to actual frontend forms and routes. Identify which flows cannot be supported because the frontend does not currently collect a required field.
4. Create backend repository skeleton, TypeScript/Express app, environment validation, Prisma setup, Supabase PostgreSQL connection, PostGIS extension migration and initial schema migration.
5. Implement only a minimal health route and database connectivity check. Seed sports/amenities and development accounts only if safe and documented.
6. Write all onboarding/setup/architecture/endpoint/schema/team details into **root `README.md` only**.
7. Review schema and API naming with all three members and freeze the first database contract before parallel feature work.

**Day 1 acceptance:** clean install/start; `GET /health` responds; DB connection is verified; PostGIS extension and initial migration succeed; schema is committed; root README contains the real frontend mapping; no second README exists; no feature endpoint is falsely marked complete.

### Day 2 — Wednesday, November 11: authentication, vendor onboarding, venue/catalog APIs

- Implement player and vendor registration/login, refresh/logout/me, profile, role guards and ownership checks.
- Implement vendor onboarding/profile and venue CRUD; courts, dimensions, surface/condition, facilities/parking, opening hours, media metadata and equipment/add-ons.
- Wire signed media uploads if bucket credentials are ready; otherwise use a local/dev storage adapter only for development and keep interface stable.
- Add validation and integration tests for auth, registration uniqueness, vendor ownership and CRUD.
- Connect frontend authentication and core vendor onboarding/venue forms; remove the corresponding mocks.

**Day 2 acceptance:** player and vendor can register/login; tokens persist/refresh/logout; protected routes reject wrong roles; vendor can create/update/list own venue and courts; public venue list is sourced from DB.

### Day 3 — Thursday, November 12: maps, availability, bookings, walk-ins, reviews and payments foundation

- Finish PostGIS nearby venue search and Geoapify geocode/address/routing adapter if frontend uses it.
- Implement court availability, slot booking, booking item price snapshots and concurrency-safe conflict prevention.
- Implement vendor walk-in booking in the same booking table and slot conflict rules.
- Implement reviews and aggregate venue ratings.
- Build payment tables/provider adapter and Safepay sandbox checkout initiation + webhook verification path. Focus on one tested payment method first.
- Add unit/integration tests for nearest search, double booking (including simultaneous requests), walk-in conflicts, review eligibility and provider webhook idempotency.
- Connect corresponding frontend screens.

**Day 3 acceptance:** nearby query returns correct distance sorted; app and walk-in bookings cannot overlap; review appears in venue rating; a sandbox payment can be initiated and verified server-side; the frontend reads actual status.

### Day 4 — Friday, November 13: split contributions, rooms/chat, tournaments, analytics and broad frontend integration

- Add group booking participants and payment contribution ledger; prevent overpayment and reconcile completion.
- Implement public/private rooms, membership/capacity, persisted chat and authenticated Socket.IO events.
- Implement basic tournament creation/joining and leaderboard calculation based on a documented simple scoring/ranking rule.
- Implement vendor analytics aggregates for bookings, paid revenue and occupancy.
- Connect remaining frontend feature flows; add loading, empty, error and permission states.
- Run a full team integration session and resolve contract mismatches.

**Day 4 acceptance:** all core UI sections call backend; chat persists and broadcasts; room capacity/private access are enforced; split contribution totals reconcile; tournament/leaderboard and analytics use persisted data.

### Final day — Saturday, November 14: integration freeze, QA, release and submission

**Morning:**
- Freeze feature additions; pull the latest `develop`; resolve integration conflicts; run all migrations and seed scripts from a clean clone.
- Verify staging/demo environment variables, CORS, API base URL, network connectivity from Android emulator/device and Socket.IO transport.

**Afternoon:**
- Execute end-to-end flows: player register/login → search nearby → venue detail/review → choose court/time → booking → sandbox payment → booking status; group booking → participant contribution; vendor login → venue management → equipment → walk-in booking → analytics; game room → chat; tournament → leaderboard.
- Run regression tests, inspect logs, validate unauthorized access, test malformed payloads and ensure no credentials are committed.
- Update the one root README with actual commands, environment variable names, API contract, test results, sandbox limitations and known issues.

**Target freeze:** 7:00 pm PKT. **Hard deadline:** 11:59 pm PKT.

## 9. Team responsibilities and branch model

### Responsibility split

| Member | Primary ownership | Required outputs |
|---|---|---|
| **Ibrahim Sattar (BSSE23004)** | Backend lead, frontend contract/schema owner, DB migrations, auth/users, booking/availability/walk-in integration, final integration/release | Day 1 canonical schema/migrations and root README; auth + booking services; migration conflict resolution; release checklist. |
| **Mustansar (BSSE23027)** | Vendor profile, venue/court/facility/equipment APIs, media upload, map/geospatial venue discovery, reviews | Vendor/venue module, ownership tests, Geoapify/PostGIS integration tests, review module. |
| **Hasham (BSSE23053)** | Payment integration/Safepay, split contribution ledger, chat/Socket.IO, game rooms, tournaments/leaderboards, analytics | Provider adapter + webhook tests, contribution module, realtime/community modules, vendor analytics tests. |

This is ownership, not a reason to code incompatible interfaces. All members must read the canonical root README and current merged `develop` branch before starting a task. The schema owner coordinates required changes.

### Branch model

```text
main       = submission/release only; no direct pushes
 develop   = integration branch; PR target for all feature work
feature/backend-foundation       = Day 1 schema/architecture (Ibrahim)
feature/auth-booking              = auth + booking modules (Ibrahim, after foundation merge)
feature/vendor-venue-maps         = vendor/venue/media/maps/reviews (Mustansar)
feature/payments-community        = payment/chat/rooms/tournaments/analytics (Hasham)
```

Use the actual repository's branch names if it already has a defined strategy; do not recreate a branch blindly. Before work: `git status`, `git fetch origin`, checkout the assigned feature branch, pull/rebase from latest `develop`. Commit only scoped work. Open a PR to `develop`, not directly to `main`. Only release lead merges `develop` into `main` after QA.

### Collaboration rules for separate Codex sessions and different computers/accounts

- Codex cannot rely on this conversation or another developer's session. Treat committed `README.md`, `prisma/schema.prisma`, migrations and merged source code as the only shared project truth.
- Every task prompt must instruct Codex to inspect the current working tree and root README first, then run `git status` and check the active branch.
- Do not assume another developer's unmerged local work exists. Never import, overwrite or regenerate their files from memory.
- Work only inside the assigned feature/module. Do not reset, force push, delete unrecognized files or rewrite unrelated modules.
- Use stable endpoint names, DTOs and enums from root README. If a contract is missing, pause that feature and request an explicit decision in the PR rather than inventing a different contract.
- Only Ibrahim (schema owner) edits `prisma/schema.prisma` and `prisma/migrations` during the time-boxed project. Other developers propose schema changes in their PR description; once approved, the owner merges them and updates the README contract. If the team deliberately reassigns ownership, record that decision in root README first.
- Never run destructive migrations, `prisma migrate reset`, `db push --force-reset`, truncate or delete shared data on the shared Supabase instance. Use local test database for destructive testing.
- Each feature PR includes tests, changed file list, migration requirement (yes/no), environment variable names, frontend integration notes and any known limitations.
- No secrets in Git, commits, screenshots or logs. Each person creates their own `.env` from `.env.example`; credentials are shared only through a secure team-approved channel.

## 10. Environment variables

Keep `.env.example` in Git with placeholder values only. Expected names (Codex may adjust to the selected SDKs, then update root README):

```dotenv
NODE_ENV=development
PORT=4000
API_PREFIX=/api/v1
APP_ORIGINS=http://localhost:8081
DATABASE_URL=
DIRECT_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=venue-media
GEOAPIFY_API_KEY=
SAFEPAY_ENV=sandbox
SAFEPAY_SECRET_KEY=
SAFEPAY_API_KEY=
SAFEPAY_WEBHOOK_SECRET=
SAFEPAY_RETURN_URL=
SAFEPAY_CANCEL_URL=
```

Only keep `DIRECT_URL` if required by Prisma/Supabase connection mode. Do not invent valid secrets. Document which keys are optional for local-only work and which features stay disabled without them. Add `SOCKET_CORS_ORIGINS` only if Socket.IO requires a separate allowed-origin setting.

## 11. Security and reliability checklist

- HTTPS in any shared deployment; strict CORS allowlist; Helmet; request body size limits; safe error handler; rate limit login/OTP/payment-initiation endpoints.
- Zod validation for body, params and query; normalize email/phone; parameterized database queries.
- Password hashes only; JWT secrets from environment; refresh token rotation/revocation; role + ownership authorization.
- Do not expose Supabase service key, Safepay secret, Geoapify server key, provider webhook secret or database URL to the frontend.
- Verify webhooks with raw bytes/signature; deduplicate event IDs; acknowledge only after safe persistence/processing rules.
- Idempotency for booking creation/payment initiation where retry could duplicate an operation.
- Database transactions for slot booking, contribution totals, room capacity and multi-row workflows.
- Logs must avoid passwords, tokens, full card/payment credentials, private messages and personal identifiers not needed for debugging.
- Avoid trusting client prices, ratings, vendor IDs, role claims or payment success flags.
- Add indexes for common joins/filtering, including venue status/city/sport and PostGIS location.

## 12. Testing and final acceptance checklist

### Backend baseline

- [ ] Clean clone installs with documented Node/package manager versions.
- [ ] `.env.example` covers all required config; missing required env causes a clear startup error.
- [ ] Prisma migrations apply in order; PostGIS extension and spatial index exist.
- [ ] `GET /health` and database health check succeed.
- [ ] One root `README.md` only.

### Auth / role permissions

- [ ] Register player, register vendor, login, refresh, logout, me.
- [ ] Duplicate account and invalid credentials fail safely.
- [ ] Expired/revoked refresh token cannot be reused.
- [ ] Player cannot access vendor route; vendor A cannot mutate vendor B's venue.

### Venues and maps

- [ ] Vendor can create venue, courts, operating hours, facilities, surface/dimensions, photos and add-ons.
- [ ] Public listing filters correctly; nearby uses PostGIS and correct lat/lng order.
- [ ] Map/geocoding provider keys are configured only where needed and attribution is visible.

### Booking and reviews

- [ ] Valid player booking creates a booking with server-calculated totals.
- [ ] Simultaneous requests for overlapping slots cannot both succeed.
- [ ] Walk-in booking blocks the same slot and conflicts with app bookings.
- [ ] Cancellation follows defined policy and frees slot correctly.
- [ ] Only eligible user can review; duplicate reviews rejected; aggregate updates.

### Payment and split payment

- [ ] Sandbox checkout/session can be created; secret never reaches frontend.
- [ ] Success redirect without webhook does not mark payment paid.
- [ ] Valid webhook signature updates payment once; invalid signature rejected; duplicate event is idempotent.
- [ ] Individual contributions cannot exceed amount due; booking becomes paid/confirmed only at correct threshold.
- [ ] README states no live payment/merchant onboarding was completed unless it actually was.

### Community and analytics

- [ ] Room membership and capacity rules work; private room is not discoverable publicly.
- [ ] Chat requires conversation membership, persists message and emits realtime event.
- [ ] Tournament participant/host rules and leaderboard calculation are deterministic.
- [ ] Vendor analytics return database-backed bookings, verified revenue and occupancy.

### Final integration

- [ ] React Native auth and all high-priority flows use configured API base URL, not stale mock services.
- [ ] Correct base URL works on Android emulator and physical device (if tested).
- [ ] Loading, empty, validation and server error states are handled.
- [ ] Demo data is seeded safely; no real secret/user data in repo.
- [ ] `npm test`, lint/typecheck and build/start commands pass (or documented known failures are honestly listed).
- [ ] Final PRs merged to `develop`; release merged to `main` only after acceptance.

## 13. Scope control — must-have vs defer

**Must-have before deadline:** auth/roles, vendor onboarding, venue/court/equipment CRUD, map coordinates/nearby search, availability and collision-safe app + walk-in bookings, reviews, at least one Safepay sandbox flow or clearly tested payment-provider simulation if merchant sandbox onboarding is blocked, split contribution ledger, persistent chat/rooms if shown as working, tournament/leaderboard basics, vendor analytics, frontend integration and README.

**Defer unless everything above is stable:** multi-provider live payment, actual vendor payouts/escrow, production SMS/email OTP, push notifications, advanced tournament brackets, complex recurring scheduling, recommendations/AI, production moderation, video transcoding, offline maps, complex routing/ETA, distributed microservices, Kubernetes and event streaming.

A deferred feature must not appear as fully functional in the presentation. If a feature requires a third-party account, fee, approval, hardware permission, native rebuild or legal/compliance step, state that clearly in the root README and presentation notes.

## 14. Research references (official documentation / provider pages)

These links were checked while preparing this plan. Re-check provider terms, quotas and versions before production use because plans can change.

### Database and geospatial

- [Supabase Free plan pricing and quotas](https://supabase.com/pricing) — current Free plan database/storage/egress quotas and inactivity pause note.
- [Supabase Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing) — low-activity pause behavior.
- [Supabase PostGIS extension guide](https://supabase.com/docs/guides/database/extensions/postgis) — enable PostGIS and use `extensions` schema; geography point and GIST index examples.
- [PostGIS: use ST_DWithin for radius queries](https://postgis.net/documentation/tips/st-dwithin/) — indexed distance/radius filtering recommendation.
- [Prisma: geographic data/PostGIS limitation](https://docs.prisma.io/docs/orm/prisma-client/using-raw-sql/safeql) — use `Unsupported` plus raw SQL for PostGIS fields.

### Maps

- [MapLibre React Native getting started](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/) — React Native compatibility and native setup requirements.
- [MapLibre React Native Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/) — does not run in Expo Go; requires a development build/config plugin.
- [OpenFreeMap](https://openfreemap.org/) — public OSM-derived map styles advertised as free/no key.
- [Geoapify pricing](https://www.geoapify.com/pricing/) — free plan currently advertises 3,000 credits/day, no card, 5 req/s and limited commercial use.
- [Geoapify geocoding API](https://apidocs.geoapify.com/docs/geocoding/) — geocoding API and key requirement.
- [OpenStreetMap standard tile usage policy](https://operations.osmfoundation.org/policies/tiles/) — do not treat OSM standard tile server as unrestricted production map hosting.
- [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) — public Nominatim max 1 request/second and usage restrictions; do not build bulk geocoding around it.

### Payments

- [Safepay standard API reference](https://apidocs.getsafepay.com/) — standard API sandbox, test payment methods, merchant authentication and payment APIs.
- [Safepay official Pakistan website](https://safepay.com.pk/) and [Services Agreement](https://safepay.com.pk/legal/content/services-agreement) — provider/company and merchant terms.
- [Safepay Raastwire introduction](https://safepay.mintlify.app/overview/introduction) — Raast payment types, aggregator model and separate sandbox/production endpoints.
- [Safepay Raastwire aggregator access](https://safepay.mintlify.app/overview/create-aggregator) — access request, business details and compliance review required before aggregator credentials are issued.
- [Safepay Raastwire webhook signature verification](https://safepay.mintlify.app/concepts/webhooks) — raw body, timestamp, base64 webhook secret and HMAC-SHA256 procedure.
- [Safepay Raastwire payout lifecycle](https://safepay.mintlify.app/guides/payout-lifecycle) — beneficiary validation, idempotent payout request and asynchronous webhook status handling.
- [Safepay Raast general availability announcement](https://safepay.com.pk/blog/content/safepay-raast) — Raast collection and payout/merchant capabilities announced by Safepay.
- [JazzCash official sandbox documentation v4.2](https://sandbox.jazzcash.com.pk/SandboxDocumentation/v4.2/index.html) — sandbox signup, API tests, payment modes and webhooks.
- [Stripe global availability](https://stripe.com/global) — supported account-country list; Pakistan is not listed in the current supported-country set.

---

## 15. Final instruction to the team

The first day's output is a verified frontend-to-backend contract plus database schema and backend skeleton—not an unreviewed rush into feature endpoints. After the schema is merged and frozen, each developer works on a clearly owned module against the same committed contract. Keep the app runnable every day, integrate continuously, and reserve the final day for end-to-end testing rather than new architecture.
