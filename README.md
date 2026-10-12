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

## Checks run for Day 1

- `npm install` — completed; npm reported 53 dependency audit findings (8 moderate, 45 high) and a deprecation notice for `crypto-js`. No automatic dependency upgrades were applied.
- `npm test -- --runInBand src/services/authRepository.test.js` — passed, 1 suite / 5 tests.
- `./node_modules/.bin/react-native bundle --platform android --dev false --entry-file index.js --bundle-output /tmp/vscode-agent-codex-sandbox-3sBD5N/playspot-check.bundle --assets-dest /tmp/vscode-agent-codex-sandbox-3sBD5N/playspot-assets` — passed.
- Editor diagnostics — no errors found.
- `npm run android` — passed after configuring the ignored `android/local.properties` with the SDK path supplied from lab6. Gradle built the debug APK and installed it on `emulator-5554` (`rn_lab` AVD). The foreground activity was `com.playspotpk/.MainActivity`; the filtered React Native log query returned no entries. Before install, the emulator had `com.rn_lab_workspace` but not `com.playspotpk`, confirming the registration error came from launching the old lab app.

Tested tool versions: Node.js `22.17.0`, npm `10.9.2`, and Java `17.0.20.1`. There is no lint script in this Day 1 package manifest.
