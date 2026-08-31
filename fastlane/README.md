fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

### ios_dev_build

```sh
[bundle exec] fastlane ios_dev_build
```

iOS: development build (simulator)

### android_dev_build

```sh
[bundle exec] fastlane android_dev_build
```

Android: development build (internal)

### ios_preview_build

```sh
[bundle exec] fastlane ios_preview_build
```

iOS: preview build (real device, internal distribution)

### android_preview_build

```sh
[bundle exec] fastlane android_preview_build
```

Android: preview build (internal distribution)

### ios_deploy

```sh
[bundle exec] fastlane ios_deploy
```

iOS: production build -> submit to TestFlight

### android_deploy

```sh
[bundle exec] fastlane android_deploy
```

Android: production build -> submit to Play Store (internal track)

### doctor

```sh
[bundle exec] fastlane doctor
```

Validate local tooling and environment

### version_bump_ios

```sh
[bundle exec] fastlane version_bump_ios
```

iOS ONLY: bump marketing version (major|minor|patch) and build number

### version_bump

```sh
[bundle exec] fastlane version_bump
```

Bump MARKETING version on iOS & Android and optionally increment build numbers (iOS build == Android versionCode)

### bump_build

```sh
[bundle exec] fastlane bump_build
```

Bump BUILD number only on iOS & Android (iOS build == Android versionCode)

### bump_version_only

```sh
[bundle exec] fastlane bump_version_only
```

Bump MARKETING version (patch) only on iOS & Android (build numbers unchanged)

### show_versions

```sh
[bundle exec] fastlane show_versions
```

Show current marketing versions and build numbers for iOS and Android

### set_version

```sh
[bundle exec] fastlane set_version
```

Set explicit marketing version and build number for iOS & Android (iOS build == Android versionCode)

### ios_native_clean

```sh
[bundle exec] fastlane ios_native_clean
```

iOS Native: clean Xcode build artifacts (Release)

### ios_native_build

```sh
[bundle exec] fastlane ios_native_build
```

iOS Native: build IPA with Xcode (Automatic signing, with clean step)

### ios_native_submit

```sh
[bundle exec] fastlane ios_native_submit
```

iOS Native: upload IPA to TestFlight

### ios_native_ship

```sh
[bundle exec] fastlane ios_native_ship
```

iOS Native: clean + build + submit to TestFlight

### android_native_clean

```sh
[bundle exec] fastlane android_native_clean
```

Android Native: clean Gradle build

### android_native_deep_clean

```sh
[bundle exec] fastlane android_native_deep_clean
```

Android Native: deep clean Gradle, CMake, and ReactAndroid caches

### android_native_build

```sh
[bundle exec] fastlane android_native_build
```

Android Native: build AAB via Gradle with RN New Arch codegen pre-steps

### android_native_submit

```sh
[bundle exec] fastlane android_native_submit
```

Android Native: upload AAB to Google Play (supply). Requires SUPPLY_JSON_KEY env var.

### android_native_ship

```sh
[bundle exec] fastlane android_native_ship
```

Android Native: deep clean + build + submit to Google Play

### nuke_workdir

```sh
[bundle exec] fastlane nuke_workdir
```

Nuke node_modules, iOS Pods, and Android local build artifacts (NO version changes)

### gradle_nuke

```sh
[bundle exec] fastlane gradle_nuke
```

Nuke ONLY global Gradle caches (~/.gradle). Does NOT modify project files.

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
