# DEKUWEC Android app

The portal is a server-rendered Next.js app (Clerk auth, MongoDB and M-Pesa API routes), so it
cannot be bundled as static assets. The Android build is therefore a [Capacitor](https://capacitorjs.com)
wrapper that loads the live portal at <https://www.dekuwec.app> and ships a branded offline shell
that Capacitor shows whenever the site cannot be reached.

## Layout

| Path | Purpose |
| --- | --- |
| `capacitor.config.ts` | App id, name, live URL, allowed in-app domains, splash config |
| `www/` | Web assets bundled into the APK (`offline.html` is Capacitor's `server.errorPath`) |
| `resources/` | Master icon and splash sources consumed by `capacitor-assets` |
| `android/` | Generated Gradle project (app code, manifest, theme, signing) |

## Prerequisites

- JDK 21
- Android SDK with `platforms;android-35` and `build-tools;35.0.0`

Point Gradle at the SDK with an `ANDROID_HOME` environment variable or `android/local.properties`
(both are gitignored when local).

## Build

```bash
npm install
npm run apk:release   # cap sync + gradlew assembleRelease -> APK for sideloading
npm run apk:debug     # cap sync + gradlew assembleDebug
npm run aab:release   # cap sync + gradlew bundleRelease -> AAB for Google Play
```

Outputs:

| Target | Path |
| --- | --- |
| APK | `android/app/build/outputs/apk/release/app-release.apk` |
| AAB | `android/app/build/outputs/bundle/release/app-release.aab` |

Regenerate launcher icons and splash screens after changing the logo:

```bash
npm run icons
```

Do not call `npx capacitor-assets generate --android` on its own — the script does that and then
corrects two things it gets wrong for this artwork (the safe-zone inset, and adaptive layers written
at legacy sizes instead of the 108dp Android expects).

## Signing

`android/keystore.properties` (gitignored) points at `android/keystore/dekuwec-release.keystore`.
Both files must be backed up: the same key has to sign every future update or Android will refuse
to install it over an existing copy. Without `keystore.properties` the release build is simply left
unsigned.

## Publishing to Google Play

1. Bump `versionCode` and `versionName` in `android/app/build.gradle`, then run `npm run aab:release`.
2. Upload `app-release.aab` in Play Console. Enrol in **Play App Signing** so Google holds the real
   app signing key; the local keystore then acts as the upload key.
3. Store listing assets still needed: a 1024x500 feature graphic, at least two phone screenshots,
   and a public **privacy policy URL** (the app handles member data, so this is mandatory).
4. Complete the Data safety and Content rating forms.

Be aware that Play's *minimum functionality* policy rejects apps that are only a website in a
WebView. This shell ships a real offline experience, but adding native value (for example push
notifications for admin broadcasts) makes review far safer.

## Runtime behaviour

- **Launch** — the app opens `https://www.dekuwec.app/dashboard`. Clerk keeps the session in the
  WebView cookie store, so a signed-in member lands straight on the dashboard and stays signed in
  across restarts; anyone without a session is redirected to `/login`.
- **Navigation** — anything on `dekuwec.app` or the Clerk/Google/Apple auth domains stays inside the
  app; every other link opens in the device browser.
- **Offline** — when the portal cannot be reached, Capacitor serves the bundled `offline.html`, which
  probes the network and returns to the portal automatically once it is reachable again.
- **Sessions** — third-party cookies are enabled (Capacitor default) so Clerk sessions persist.
- **System bars** — `adjustMarginsForEdgeToEdge: 'auto'` insets the WebView on Android 15+, where the
  OS otherwise draws apps behind the status bar.
