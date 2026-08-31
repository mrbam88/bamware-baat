# Releasing Baat — CI/CD architecture & recipes

One page to understand how code reaches phones. Read this before touching
`eas.json`, `fastlane/`, or `.github/workflows/`.

## The architecture

Two rails, three kinds of change:

```
PR             → ci.yml           typecheck + jest + secrets tripwire
merge to main  → ota-update.yml   eas update → "preview" channel   (JS-only, ~1 min, free)
tag v*         → release.yml      EAS native builds (production)
                                  → eas submit → TestFlight + Play internal
                                  (gated by GitHub Environment "production")
```

- **Rail A — EAS cloud (primary).** EAS builds and signs in the cloud and
  holds all store credentials. Fastlane lanes (`ios_deploy` etc.) are the
  human CLI for the same rail; GitHub Actions is the automation.
- **Rail B — native escape hatch.** `ios_native_*` / `android_native_*`
  lanes build locally with `gym`/Gradle and upload with `pilot`/`supply`.
  Use when the EAS queue/quota is in the way. Requires local Xcode
  (and `npx expo prebuild -p android` for Android).

### Which rail handles my change?

| Change | What to do | What happens |
|---|---|---|
| JS/TS, styles, assets | merge to `main` | OTA update to `preview` channel in ~1 min |
| New native module, SDK bump, `app.json` native config | bump `version` in app.json, tag `v*` | full builds + store submission |
| Emergency local build | `bundle exec fastlane ios_native_ship` | local IPA → TestFlight |

**OTA rule of thumb:** `runtimeVersion.policy = "appVersion"` means an OTA
update only reaches builds whose `app.json` `version` matches the one the
update was published against. Changed anything native? Bump `version`,
cut a tag — old builds stop receiving updates automatically (safe).

## Recipes

```bash
# Ship a JS fix to internal testers' installed builds
git checkout main && git merge --ff-only my-fix && git push   # that's it (OTA)

# Cut a store release
git tag v1.0.3 && git push --tags     # builds + submits, approve in GH UI if env-gated

# Manual/preview builds without a tag
gh workflow run release.yml -f platform=ios -f profile=preview -f submit=false

# Local one-offs (Rail A via fastlane)
bundle exec fastlane ios_preview_build
bundle exec fastlane ios_deploy                # production build + TestFlight submit

# Version status (native rail only — EAS rail auto-increments remotely)
bundle exec fastlane show_versions
```

## Version policy

- **EAS rail:** `appVersionSource: "remote"` + `autoIncrement: true` —
  EAS owns build numbers; you only edit `app.json` `version` (marketing)
  when cutting a release with native changes. Do NOT run `version_bump`
  for EAS releases.
- **Native rail:** fastlane `version_bump` / `bump_build` / `set_version`
  edit the local Xcode/Gradle projects directly. Keep the two rails'
  versions from drifting by preferring the EAS rail.

## Secrets — who holds what

| Secret | Lives in | Used by |
|---|---|---|
| `EXPO_TOKEN` | GitHub Actions secret | every EAS step in workflows |
| iOS signing certs/profiles | EAS credentials service | `eas build` |
| ASC API key (post-rotation) | `eas credentials` (submit) **and** `ASC_KEY_ID`/`ASC_ISSUER_ID`/`ASC_KEY_P8_B64` in your shell for Rail B | `eas submit -p ios` / `pilot` |
| Android keystore | EAS credentials service (generated) | `eas build -p android` |
| Play service-account JSON | `eas credentials` (submit) **and** `SUPPLY_JSON_KEY` path for Rail B | `eas submit -p android` / `supply` |
| `EXPO_PUBLIC_SENTRY_DSN` | GitHub secret + EAS env | builds |
| `MAESTRO_TEST_EMAIL/PASSWORD` | GitHub secrets + local shell | Maestro flows |

Rules: values never in git (CI tripwire enforces the file kinds); names
documented in `.env.example`; rotation procedure in `SECURITY.md`.

## One-time setup still pending

1. **iOS:** fill `submit.production.ios.ascAppId` in `eas.json` — the
   numeric id from your app's App Store Connect URL
   (`appstoreconnect.apple.com/apps/<THIS NUMBER>/...`). Then run
   `eas credentials -p ios` once to attach the (new, post-rotation) ASC
   API key for submissions.
2. **Android Play bootstrap** (~30 min + Google review):
   1. Play Console → Create app — name **Baat**, package `com.example.baat`.
   2. `eas credentials -p android` → let EAS generate the keystore.
   3. `eas build -p android --profile production` → download the AAB →
      **manual first upload** to the internal track (Google requires it).
   4. Google Cloud → create service account → invite it in Play Console
      (Users & permissions, Release-manager perms) → download JSON key →
      register with `eas credentials -p android` (submissions) and keep a
      copy outside the repo for `SUPPLY_JSON_KEY` (Rail B).
   5. From then on the tag rail submits Android automatically.
3. **GitHub Environment `production`:** repo Settings → Environments →
   `production` → (optional) add yourself as required reviewer to make
   store submission a one-click manual gate.
4. **First OTA-capable builds:** expo-updates is a native module — the
   first tag after this lands rebuilds everything; OTA works from then on.
