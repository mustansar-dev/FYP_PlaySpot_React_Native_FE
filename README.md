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

- Player Home now includes sport shortcuts, a local search entry, nearby published venues, map entry, and room/tournament shortcuts. There is no booking data in the current store, so an upcoming booking card is omitted until that flow exists.
- Venue Search filters the persisted published venues by text, sport, maximum hourly price, minimum review rating, approximate distance from the selected Lahore center, indoor/outdoor type, and nearest/rating/price sort. Empty results include reset actions.
- Venue Details reads current venue, ground, inventory and review records from Redux. It shows venue photos when local URIs exist and uses the existing offline `VenueArtwork` otherwise. Review aggregates are calculated from the actual review list.
- Players can submit a 1–5 star rating and an 8-character minimum comment. Reviews update Redux and are written by the existing `playspot-pk.venue-data.v1` persistence listener.
- Venue Map is an offline schematic with approximate demo markers and manually selectable Lahore, Gulberg, DHA and Johar Town map centers. It does not use GPS, native map tiles or a map API key; the UI labels this clearly. Distances use a pure haversine helper.
- The shared theme now follows the supplied `figma_design` export's green, pale gray, white, slate and orange tokens. The exported nearby/search/details layouts informed the screen hierarchy and card/filter styling.

Booking, GPS/map-provider integration, chat, rooms and tournaments remain future work. The venue booking CTA explains that booking is not connected yet instead of creating a fake reservation.

### Day 3 checks

- `npm.cmd test -- --runInBand` — passed: 5 suites / 20 tests. Coverage includes haversine distance and ordering, changed search filters and empty/reset states, marker selection and details navigation, manual location fallback, review submission and AsyncStorage round-trip, plus the existing vendor registration/edit/reload flow.
- `node_modules\.bin\react-native.cmd bundle --platform android --dev false --entry-file index.js --bundle-output "%TEMP%\playspot-day3.bundle" --assets-dest "%TEMP%\playspot-day3-assets"` — passed; wrote the Android JavaScript bundle and copied 19 assets.
- `git diff --check` — passed. No Android device/OS location permission flow was exercised. This build has no GPS provider, so location-denied behavior is covered through the clearly labeled manual-location fallback; there is no OS permission prompt to deny.

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

The venue persistence key stores demo profiles, venues, grounds, inventory, slots, and reviews. It does not contain passwords. New vendor profiles use `pending-demo`; seeded profiles use `demo-approved` only to illustrate local state, not real verification.

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
