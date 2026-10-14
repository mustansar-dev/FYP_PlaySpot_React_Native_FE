# PlaySpot PK — Audit and dependency decisions

**Audit date:** 12 October 2026  
**Repository branch:** `main` (`6e0438b`, `Initial commit`)

This log records the initial repository audit and decisions that must be made before Day 1 implementation can be built and verified. No app scaffold, framework, dependencies, or native configuration have been added.

## Repository baseline

- The tracked repository contains only `README.md` and `LICENSE`. The README is a single project heading.
- There is no `package.json`, lockfile, React Native or Expo configuration, app entry point, source tree, screen/navigation code, assets, tests, or build scripts. The repository does not currently identify Expo or React Native CLI, nor a package manager.
- Node.js `v22.17.0`, npm `10.9.2`, Java `17.0.20`, and Android Debug Bridge `1.0.41` are available. Expo CLI, Yarn, pnpm, and Gradle are not available globally. No project run, test, lint, or build command exists to run.
- `.gitignore` and `.vscode/` are already untracked user files. They have been inspected and must be preserved.

## Decisions and blockers

### 1. Establishing the React Native app baseline — pending user direction

- **Concept:** Choose and create the app runtime, package manager, and native project structure.
- **Why it is required:** There is no app to launch or extend; Day 1 screens cannot be implemented as a runnable app without first establishing this baseline.
- **Why the current repository is insufficient:** No framework, package manager, versions, entry point, scripts, or native configuration exist to preserve or check compatibility against.
- **Options considered:** Create a new Expo managed app using npm; create a bare React Native CLI app using npm; or provide/restore the intended app scaffold before implementation.
- **Choice and scope:** Pending clarification. No setup has been selected or generated. Choosing Expo or bare React Native without confirmation would establish a framework and package manager where none currently exists, despite the instruction to preserve the repository's actual setup and avoid migrations.
- **Verification:** Once selected, inspect the generated package scripts and dependency versions, install only compatible Day 1 dependencies, and run the available app start/build check.
- **Limitations:** Network access and Android emulator/device availability have not been verified. `adb` and Java are present, but there is no globally installed Gradle or Expo CLI.

### 2. PlaySpot design tokens from Figma — blocked by Figma MCP quota

- **Concept:** Read the PlaySpot global colors, typography, spacing, and the welcome/auth screen design before implementing UI.
- **Why it is required:** The request explicitly requires the Day 1 UI to use the linked Figma global theme.
- **What was available:** The Figma MCP returned page metadata for node `0:1`, including screen/layer names and geometry. `get_design_context` on that page reported that no layer was selected. Before a frame-level design context or screenshot could be retrieved, the Figma MCP reported that the Starter-plan tool-call limit had been reached. The account response identifies a Starter plan and View seat.
- **Options considered:** Restore/upgrade Figma MCP call access; provide the theme tokens or a screenshot of the global design system and relevant auth frames; or explicitly authorize a provisional theme.
- **Choice and scope:** No colors, type styles, or assets will be guessed. The Figma context is not yet sufficient for faithful implementation.
- **Verification:** After access is restored or reference material is supplied, inspect the global design system and the relevant Welcome/Login/Registration frame contexts and screenshots, then map the returned values into app theme tokens.
- **Limitations:** The Figma tool currently prevents further design-context, screenshot, and asset reads.

### 3. Day 1 app dependencies and local demo credentials — pending framework selection

- **Concept:** Shared authentication state, navigation, local persistence, and non-plaintext demo credential handling.
- **Why it is required:** The Day 1 exit gate requires role-aware navigation, hydrated local accounts/session state, and persistence across restarts.
- **Why the current stack is insufficient:** There are no existing Redux, React Navigation, AsyncStorage, or compatible credential-handling dependencies because there is no app package manifest.
- **Options considered:** Use the smallest versions compatible with the framework selected above; retain a frontend-only local demo auth model; avoid storing plaintext passwords; document that local credential handling is not production authentication. Media selection can remain optional, and video is optional by the product plan.
- **Choice and scope:** No package is installed until the framework is selected and peer/native compatibility can be checked. If an existing compatible hashing or secure-storage option is not present in the chosen baseline, record the classroom-demo limitation and approach here before adding a dependency or choosing mock login behavior.
- **Verification:** Check the selected framework's compatibility guidance and peer dependencies, then validate install/start/build with the actual scripts created for the app.
- **Limitations:** No backend authentication, email/OTP service, or production credential security is planned. No API key is required for the Day 1 scope.

### 4. Location/map requirements and initial media audit

- **Concept:** Device location, a map renderer, and venue photo selection.
- **Why it may be required:** Map/location support later discovery features. Vendor media is optional in the Day 1 registration step and can be skipped.
- **Options considered:** Reuse existing packages if a scaffold later provides them; otherwise select the smallest framework-compatible location/map/photo-picker implementation and document its permissions, native configuration, API-key, network, and fallback requirements before installation.
- **Choice and scope at initial audit:** Defer map/location package selection because those features are later-week work. Check the lab6 picker before deciding on optional Day 1 media; decision 8 below records the compatible picker reuse.
- **Verification:** Compatibility and device permission flows must be checked when the relevant feature is implemented.
- **Limitations at initial FYP audit:** The empty FYP had no map, location, or media packages. The Day 1 picker addition is recorded in decision 8; no map service, location provider, video player, or audio library was added.

## Day 1 audit update — 12 October 2026

The earlier baseline entry above described the repository before the user pointed to the lab6 project. This update records the resulting setup decision without removing that original audit history.

### 5. React Native baseline — resolved using the lab6 setup

- **Observed FYP state:** The checked-out `main` branch (`6e0438b`, `Initial commit`) contains only `README.md` and `LICENSE` as tracked files. There is no FYP package manifest, lockfile, source tree, native project, entry point, asset, navigation, persistence, state, or test configuration. The supplied plan and prompt pack are local project documents; the existing `.gitignore`, `.vscode/`, and this decision log are untracked user files and are being preserved.
- **Reference inspected:** `../2026fall-se411l-b-lab-lab6-bsse23004` is a JavaScript React Native CLI project managed by npm. It uses React Native `0.86.2`, React `19.2.3`, Node `>=22.11.0`, React Navigation `7.3.18` / native stack `7.18.10`, AsyncStorage `3.1.1`, React Redux `9.3.0`, Redux `5.0.1`, and `react-native-image-picker` `8.2.1`. Its Android native project and scripts (`npm run start`, `npm run android`, `npm test`) provide the setup pattern. It has no iOS project. Its sample auth flow sends and stores passwords in plaintext against a live class API; that flow is not being reused.
- **Choice and scope:** The user explicitly directed us to use lab6 as setup guidance. Since FYP has no existing runtime or package manager, establish a JavaScript React Native CLI project at the lab6 React Native version using npm, and target the available Android setup. This is a new baseline in an empty app repository, not a migration or upgrade of an existing FYP app. Keep the FYP's existing documents and untracked files intact.
- **Alternatives:** Wait for a scaffold or pick Expo independently. The lab6 CLI/npm baseline is the smallest evidence-based option and follows the user's direction.
- **Verification:** Inspect generated scripts and dependency versions, run npm tests with the discovered Jest setup, run the Android Gradle build/start command if the environment allows it, and manually review the single-container role-gated navigation tree. An emulator/device is not currently available; an in-sandbox ADB probe failed because the sandbox could not create the ADB daemon socket.
- **Limitations:** The CLI probe reported `EPERM` when executing its environment setup script in the sandbox. Native launch requires Android SDK tooling; an actual emulator run may remain unavailable here.

### 6. Redux Toolkit — added to the Day 1 setup

- **Concept:** Redux Toolkit provides reducer/action helpers and a predictable shared store for auth/session state.
- **Why needed:** The week plan assigns cross-screen auth state to Redux, and Prompt 1 specifically requests Redux Toolkit with React Redux.
- **Why the FYP baseline is insufficient:** The lab6 sample includes Redux `5.0.1` and React Redux `9.3.0`, but not Redux Toolkit.
- **Options:** Use plain Redux already present in lab6, or add Toolkit. Toolkit is the requested pattern and its 2.x line supports Redux 5 and React Redux 9; it is JavaScript-only and adds no native configuration.
- **Choice and scope:** Add `@reduxjs/toolkit` `2.8.2` alongside the lab6 versions of Redux and React Redux; the auth slice owns the session/user/role. React Context will be used only for a separate theme concern.
- **Verification:** Confirm the installed package peer ranges and run the project's Jest/build checks.
- **Limitations:** Redux is local UI state management and does not provide server authentication.

### 7. Local password verifier — classroom-only hashing implemented

- **Concept:** A salted password hash lets a local demo compare login credentials without writing plaintext passwords into AsyncStorage.
- **Why needed:** Registration and login must persist locally, and the FYP plan explicitly prohibits plaintext password storage.
- **Why the baseline is insufficient:** Neither the empty FYP repository nor lab6 provides a credential hashing library. The lab6 sample explicitly stores plaintext and is unsuitable for this flow.
- **Options:** Add a pure-JavaScript hash package; add native secure-crypto modules with platform setup; or avoid storing passwords and lose local login for newly registered accounts.
- **Choice and scope:** Add `crypto-js` `4.2.0` (pure JavaScript, no native module) and store only a per-account salt and SHA-256 verifier. Salt generation in this local demo is not backed by a platform cryptographic random source. This is a classroom mock, not production-grade credential security; never use real passwords.
- **Verification:** Inspect persisted demo JSON for verifier fields and confirm the app code never serializes a password field. Exercise correct and incorrect local login.
- **Limitations:** A client-side fast hash and locally stored verifier can be extracted or brute-forced. Production auth requires a backend, password KDF, secure transport, and short-lived server-issued session tokens.

### 8. Vendor registration media — reuse the lab6-compatible picker

- **Concept:** `react-native-image-picker` opens the device media library and returns local URIs for optional venue photos/video.
- **Why needed:** Vendor registration includes an optional media step; registration must still finish if the user cancels or skips it.
- **Compatibility evidence:** The lab6 React Native CLI project uses `react-native-image-picker` `8.2.1` with React Native `0.86.2`, and its installed peer declaration accepts React Native. No FYP media package existed.
- **Options:** Reuse that compatible picker; make the fields manual text only; or defer media entirely. Video remains optional.
- **Choice and scope:** Include the lab6 package/version in the new npm app baseline and autolink it; handle picker cancellation/errors and allow a no-media submission. Do not add a camera/video player or media service.
- **Verification:** Check the Android build and run the picker on a device if available. The current sandbox has no usable ADB daemon/device, so a real picker interaction may remain unverified.
- **Limitations:** Selected URIs are device-local and may not survive moving the demo to another device. No upload, remote storage, or server media processing exists.

### 9. Day 1 features intentionally using core APIs

- Welcome motion uses React Native's built-in `Animated` API; no animation package is needed.
- Photos/video are optional, so map, GPS/location, maps API keys, payments, chat services, audio, video playback and push notifications are deferred. They are not needed for Day 1 auth.
- The existing Figma quota note above is retained as historical context. The current supplied Day 1 prompt pack and week plan do not include a Figma URL or token source; any Day 1 styling therefore uses local app theme tokens and does not claim to match a Figma file.

### Day 1 verification results

- `npm install` completed after network access was allowed. `npm ls --depth=0` showed the planned direct versions, including RN `0.86.2`, React `19.2.3`, React Navigation `7.3.18` / native stack `7.18.10`, Redux Toolkit `2.8.2`, React Redux `9.3.0`, AsyncStorage `3.1.1`, and Image Picker `8.2.1`. npm emitted peer override warnings, a discontinued-package warning for `crypto-js` `4.2.0`, and reported 53 audit findings (8 moderate, 45 high). No audit fix or framework upgrade was run.
- `npm test -- --runInBand src/services/authRepository.test.js` passed: 1 suite and 5 tests covering seeded credentials without plaintext storage, local player/vendor registration and role/session restore, optional vendor video, corrupt JSON recovery, and required-field validation.
- `./node_modules/.bin/react-native bundle --platform android --dev false --entry-file index.js --bundle-output /tmp/vscode-agent-codex-sandbox-3sBD5N/playspot-check.bundle --assets-dest /tmp/vscode-agent-codex-sandbox-3sBD5N/playspot-assets` passed and wrote the Android JS bundle. The first attempt targeted read-only `/tmp` and failed at the final file write; rerunning in the permitted temporary directory passed.
- Workspace editor diagnostics reported no errors. The navigation source has one `NavigationContainer`; after hydration it exposes guest screens, only the player landing route for a player, or only the vendor landing route for a vendor.
- The initial `./gradlew :app:assembleDebug` and `npm run android -- --no-packager` attempts failed because the default sandbox could not see an Android SDK path. The user then confirmed the lab6 SDK at `/home/ibrahim/.rn_lab/android-sdk`; FYP's ignored `android/local.properties` was set to that path.
- `npm run android` then passed: Gradle built the debug APK and installed it on `emulator-5554` (`rn_lab` AVD). The foreground activity was `com.playspotpk/.MainActivity`. The filtered `ReactNativeJS` / `ReactNative` log query returned no entries. Before installation, the emulator package list contained the stale `com.rn_lab_workspace` app and no `com.playspotpk`; after installation, FYP launched under the expected package/component name. This confirms the `rn_lab_workspace has not been registered` message was from launching the old lab app against the FYP Metro bundle. The old app was left installed.
- Tool environment observed: Node.js `22.17.0`, npm `10.9.2`, Java `17.0.20.1`. The app manifest provides `start`, `android`, and `test`; it has no lint script. No map/location, Figma API key, video player, backend, or email service was added for Day 1.

## Day 2 update — 14 October 2026

### 10. Normalized local venue data and persistence

- **Concept:** Venue discovery needs stable vendor, venue, ground, inventory, slot, and review records that can be selected and changed across screens.
- **Why needed:** Vendor-created and edited venues must be eligible for future player discovery and survive app restarts.
- **Current-stack fit:** Redux Toolkit is already configured, and AsyncStorage is already part of the app. No server or persistence package is needed.
- **Choice and scope:** Added JSDoc model definitions and eight fictional Lahore demo venues, vendor profiles, grounds, inventory, slots, and twelve sample reviews. `src/services/venueStorage.js` persists the domain snapshot in `playspot-pk.venue-data.v1`; the existing auth adapter/key remains in place. Redux selectors expose all/published venues, venue-by-ID, grounds/equipment-by-venue, and vendor-owned venues. New registration creates normalized records using stable owner-derived IDs; existing Day 1 nested vendor profiles are migrated at startup by account ID; ground and equipment draft IDs are retained.
- **Verification:** `npm.cmd test -- --runInBand` passed 3 suites / 13 tests, including fixture relationships/counts, selectors, factory links and slot durations, malformed-storage recovery, and a React Native Testing Library journey through vendor registration, editing, and AsyncStorage reload. The Android JavaScript bundle passed and copied 19 assets. `npm.cmd run android -- --no-packager` could not install/launch because `adb`, an emulator, Android SDK environment paths, and a discoverable `gradlew.bat` were unavailable. A physical-device interaction remains unverified.
- **Limitations:** These are fictional local records. Seed coordinates and addresses are approximate, reviews are invented, and approval is demo-only.

### 11. Location and venue imagery for Day 2

- **Concept:** Vendor setup can save a location and show a useful visual when no venue photo is selected.
- **Why needed:** Player discovery will need a fallback location and media-independent venue cards.
- **Current-stack fit:** The registration flow collects address/area and optional coordinates without location permission. The installed `react-native-image-picker` `8.2.1` is reused; no package was added. A code-drawn `VenueArtwork` placeholder works offline without image assets.
- **Choice and scope:** Require a manually entered address and city; accept latitude/longitude only as a valid pair and allow both to be omitted. Photos/video remain optional local URIs; picker cancellation/errors do not block registration.
- **Verification:** Form validation covers coordinate pairing/ranges; picker errors and cancellation are handled. The real picker UI still needs a device/emulator interaction.
- **Limitations:** No GPS permission, map renderer, geocoding, map API key, remote media upload, or authoritative location is included. Coordinates are vendor-supplied or fictional approximate fixtures.

### 12. Demo approval label

- **Concept:** Sample vendor records may show an approval-like state for demonstration.
- **Choice and scope:** Seeded records use `demo-approved`; newly registered vendors use `pending-demo`. Both are local labels only. No verification service or identity review exists.
