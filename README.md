# FYP_PlaySpot_React_Native_FE

PlaySpot PK is a frontend-only sports venue discovery, booking, and player matchmaking demo. This repository had no app scaffold at the start of Day 1; the Android React Native CLI setup follows the team's lab6 project.

## Day 1 status

The following routes are implemented:

- **Welcome** — PlaySpot PK branding, a built-in scrolling sports hero for futsal/football, cricket, padel, and badminton, and Login/Sign Up actions.
- **Role Selection** — choose Player or Venue Provider.
- **Login** — controlled email/password fields, validation, local loading/errors, and role-based session restore.
- **Player Registration** — profile, phone, preferred sports, and password validation.
- **Vendor Registration** — one route with seven draft-preserving steps: account/business, venue/address, sports/grounds, facilities/parking, equipment, optional photos/video, and review/submit.
- **Forgot Password** — explains that recovery is not connected and no email or OTP is sent.
- **Registration Success** — role-specific continue action.
- **Player Home** and **Vendor Dashboard** — separate authenticated role landings; each includes local profile details and demo logout.

Discovery, maps, booking, matchmaking, vendor operations, and the later-week screens are not implemented in Day 1.

## Day 2 status: vendor venue setup and local demo data

- Vendor registration keeps its seven-step draft while moving back and forward. It captures business and venue details, a manual address fallback with optional vendor-entered coordinates, sports and multiple grounds, dimensions, indoor/outdoor, surface, condition, hourly price, slot duration, facilities, parking, inventory, photos, optional video, and a review/submit step.
- Submission creates normalized vendor, venue, ground, inventory, and seven-day slot records. The local venue set includes eight fictional Lahore examples, twelve sample reviews, and available/unavailable time slots. Names, addresses, reviews, and coordinates are demo fixtures; they are not authoritative listings.
- Existing Day 1 vendor accounts with nested venue profiles are migrated into normalized records at startup using their account ID, so previously saved registrations remain available to manage.
- Venue records live in Redux and persist through `playspot-pk.venue-data.v1`. Auth accounts and sessions remain on the existing `playspot-pk.auth.v1` key. Both stores hydrate before authenticated navigation is selected. Invalid venue JSON is reseeded safely.
- Vendors can edit their venue, grounds, and equipment from the dashboard, save changes locally, and publish/unpublish their venue in the local discovery selector. The management route is visible only to the vendor role.
- Selectors in `src/store/selectors/venueSelectors.js` provide all/published venues, venue by ID, grounds and equipment by venue ID, vendor profiles, and a vendor's venues by owner ID. Screens select Redux records rather than importing fixture arrays.
- The existing React Native CLI project already has `react-native-image-picker` `8.2.1`; it is reused for optional photos/video. Picker cancel/error leaves the form usable. Media stays in device-local URIs. `VenueArtwork` draws a local placeholder when a photo is absent.

The app still has no map, GPS permission flow, player discovery screen, booking service, backend verification, or remote media upload. Coordinates are optional; when omitted, the manually entered address and area remain the location fallback. `demo-approved` and `pending-demo` describe local fixture/onboarding state only.

## Day 3 status: player discovery, venue details and reviews

- Player Home includes sport shortcuts, local search, nearby published venues, map entry, and connected room/tournament shortcuts. Day 4 adds an upcoming booking card when a confirmed player reservation exists.
- Venue Search filters the persisted published venues by text, sport, maximum hourly price, minimum review rating, approximate distance from the selected Lahore center, indoor/outdoor type, and nearest/rating/price sort. Empty results include reset actions.
- Venue Details reads current venue, ground, inventory and review records from Redux. It shows venue photos when local URIs exist and uses the existing offline `VenueArtwork` otherwise. Review aggregates are calculated from the actual review list.
- Players can submit a 1–5 star rating and an 8-character minimum comment. Reviews update Redux and are written by the existing `playspot-pk.venue-data.v1` persistence listener.
- Venue Map is an offline schematic with approximate demo markers and manually selectable Lahore, Gulberg, DHA and Johar Town map centers. It does not use GPS, native map tiles or a map API key; the UI labels this clearly. Distances use a pure haversine helper.
- The shared theme now follows the supplied `figma_design` export's green, pale gray, white, slate and orange tokens. The exported nearby/search/details layouts informed the screen hierarchy and card/filter styling.

At the Day 3 checkpoint, booking and community flows were future work. Day 4 and Day 5 below connect them using local demo state. GPS and map-provider integration remain future work.

### Day 3 checks

- `npm.cmd test -- --runInBand` — passed: 5 suites / 20 tests. Coverage includes haversine distance and ordering, changed search filters and empty/reset states, marker selection and details navigation, manual location fallback, review submission and AsyncStorage round-trip, plus the existing vendor registration/edit/reload flow.
- `node_modules\.bin\react-native.cmd bundle --platform android --dev false --entry-file index.js --bundle-output "%TEMP%\playspot-day3.bundle" --assets-dest "%TEMP%\playspot-day3-assets"` — passed; wrote the Android JavaScript bundle and copied 19 assets.
- `git diff --check` — passed. No Android device/OS location permission flow was exercised. This build has no GPS provider, so location-denied behavior is covered through the clearly labeled manual-location fallback; there is no OS permission prompt to deny.

## Day 4 status: booking, equipment and vendor walk-ins

- Players can select a ground/court and a date from today through the next seven days, choose an available future slot, add optional equipment, review integer PKR totals, and finish with pay-at-venue or clearly simulated payment.
- My Bookings and Booking Details show confirmed, completed and cancelled records. Cancelling an active reservation releases its slot and add-on stock in local state.
- Vendors can view the same slot records, manage availability, list player bookings and walk-ins together, and record a manual walk-in with customer name, optional contact and a local paid/unpaid marker.
- Player checkout and vendor walk-ins go through the same `reserveBooking` operation. It rechecks ground/date/overlapping time and stock immediately before saving, so an active walk-in blocks player checkout for that interval.
- Booking and slot data use Redux and the existing `playspot-pk.venue-data.v1` persistence adapter. Legacy venue-only snapshots are upgraded with booking/community collections, and generated availability covers eight local calendar dates.

## Day 5 status: matchmaking, local chat, split totals and tournaments

- Players can filter public/private game rooms by sport, time and location, create rooms, join/leave, and see full-capacity and private-code errors.
- Chat Inbox and Conversation support saved local messages, timestamps and unread counts. The screen says messages do not sync across devices.
- Split Payment supports equal or edited whole-PKR shares, verifies that shares exactly equal the total, and stores local paid/unpaid demo status. It never moves money.
- Players can list, create and join/leave tournaments with capacity checks. The leaderboard shows deterministic seeded demo points and wins; joining a tournament does not change those standings.
- Community records share the local persistence snapshot with venues and bookings. The Figma CSS export informed the frame spacing, rounded white cards, green actions and neutral text/surface palette. Existing theme tokens were reused; no Figma assets, new dependencies, native configuration or API keys were needed.
- Navigation registers 35 unique screen names including the startup boot screen, for 34 reachable guest/player/vendor feature routes.

### Day 4–5 checks

- `npm test -- --runInBand` — passed: 8 suites / 36 tests, including shared booking conflicts, walk-in/player cross-role flow, add-on stock and totals, local chat reopen, private room codes, split rounding, tournament joins and storage migration.
- `./node_modules/.bin/react-native bundle --platform android --dev false --entry-file index.js --bundle-output /tmp/playspot-prompt45-final.bundle --assets-dest /tmp/playspot-prompt45-final-assets` — passed; wrote the Android JavaScript bundle and copied 19 assets.
- `./gradlew :app:assembleDebug` (from `android/`) — passed. Gradle emitted an existing Gradle 10 deprecation notice.
- Editor diagnostics and `git diff --check` — passed. `adb devices -l` returned no connected device, so a live emulator/device walkthrough was unavailable in this run; interactive paths were exercised with React Native Testing Library.

## Course concepts used in the Day 4 and Day 5 flows

- Controlled fields, inline validation and keyboard handling: [CommunityScreens.js](./src/screens/CommunityScreens.js) and [FormField.js](./src/components/FormField.js).
- `FlatList`, stable keys and empty states: room, chat, tournament, leaderboard and booking lists in [CommunityScreens.js](./src/screens/CommunityScreens.js) and [BookingScreens.js](./src/screens/BookingScreens.js).
- Redux Toolkit and selectors: booking state in [venueSlice.js](./src/store/venueSlice.js), community state in [communitySlice.js](./src/store/communitySlice.js), and vendor/player booking selectors in [bookingSelectors.js](./src/store/selectors/bookingSelectors.js).
- AsyncStorage persistence and migration: [venueStorage.js](./src/services/venueStorage.js), coordinated by [App.js](./src/App.js).
- Reusable props, Flexbox, `StyleSheet`, accessibility labels and `testID`: [DesignPrimitives.js](./src/components/DesignPrimitives.js), [BookingScreens.js](./src/screens/BookingScreens.js), and [CommunityScreens.js](./src/screens/CommunityScreens.js).
- Pure pricing, availability, room-capacity and split-rounding functions: [booking.js](./src/utils/booking.js) and [community.js](./src/utils/community.js).

## Setup and run

Requirements from the lab6 baseline: Node.js `>=22.11`, npm, JDK 17, Android SDK/platform tools, and an Android emulator or connected device.

```sh
npm install
npm start
# In another terminal, with an Android emulator/device available:
npm run android
```

The app uses React Native CLI `0.86.2`, React `19.2.3`, npm, React Navigation 7, Redux Toolkit `2.8.2`, React Redux `9.3.0`, and AsyncStorage `3.1.1`. The checked-in Android project uses application ID `com.playspotpk`. No FYP iOS project or iOS launch check was created in this Linux setup.

## Fictional demo accounts

- Player: `player@playspot.pk` / `FieldDay2026`
- Venue Provider: `vendor@playspot.pk` / `VenueDay2026`

These are fictional local-demo credentials. Do not use a real password.

## Local auth and storage limits

The versioned AsyncStorage key `playspot-pk.auth.v1` stores the demo account records and current session user ID. New account records store a password salt and SHA-256 verifier, not a plaintext password. This is classroom-demo handling only: the hash is fast, local data can be extracted, and the salt source is not a cryptographic random generator. There is no server authentication, email/OTP delivery, account recovery, or secure production session. The Forgot Password screen explicitly says no email or OTP was sent.

Vendor media is optional. Selected photos/video remain device-local URIs; there is no upload service. GPS/location is not requested during Day 1 registration; address and area are entered manually. The welcome marquee uses bundled-in-code sport illustrations and does not depend on a remote image URL.

The local domain persistence key stores demo profiles, venues, grounds, inventory, slots, reviews, bookings, game rooms, chat messages, split plans, tournaments and seeded leaderboard rows. It does not contain passwords. Existing venue-only snapshots are upgraded with empty bookings and seeded community examples. New vendor profiles use `pending-demo`; seeded profiles use `demo-approved` only to illustrate local state, not real verification.

## Checks run for Day 1

- `npm install` — completed; npm reported 53 dependency audit findings (8 moderate, 45 high) and a deprecation notice for `crypto-js`. No automatic dependency upgrades were applied.
- `npm test -- --runInBand src/services/authRepository.test.js` — passed, 1 suite / 5 tests.
- `./node_modules/.bin/react-native bundle --platform android --dev false --entry-file index.js --bundle-output /tmp/vscode-agent-codex-sandbox-3sBD5N/playspot-check.bundle --assets-dest /tmp/vscode-agent-codex-sandbox-3sBD5N/playspot-assets` — passed.
- Editor diagnostics — no errors found.
- `npm run android` — passed after configuring the ignored `android/local.properties` with the SDK path supplied from lab6. Gradle built the debug APK and installed it on `emulator-5554` (`rn_lab` AVD). The foreground activity was `com.playspotpk/.MainActivity`; the filtered React Native log query returned no entries. Before install, the emulator had `com.rn_lab_workspace` but not `com.playspotpk`, confirming the registration error came from launching the old lab app.

Tested tool versions: Node.js `22.17.0`, npm `10.9.2`, and Java `17.0.20.1`. There is no lint script in this Day 1 package manifest.

## Day 2 check results

- `npm.cmd test -- --runInBand` — passed: 3 suites / 13 tests, including an automated seven-step vendor form → venue management edit → AsyncStorage reload flow.
- `node_modules\\.bin\\react-native.cmd bundle --platform android --dev false --entry-file index.js --bundle-output %TEMP%\\playspot-day2-final.bundle --assets-dest %TEMP%\\playspot-day2-final-assets` — passed; wrote the JavaScript bundle and copied 19 asset files.
- `npm.cmd run android -- --no-packager` — blocked: `adb` is unavailable, no emulator is listed, and the CLI could not invoke `gradlew.bat`. `ANDROID_HOME`/`ANDROID_SDK_ROOT` and `android/local.properties` are absent in this Windows environment.
- The registration/edit/restart path was exercised through React Native Testing Library. A physical-device interaction could not be performed in this environment because no Android SDK/emulator is available; the media picker itself was left skipped as optional in that UI flow.
