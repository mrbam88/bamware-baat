require_relative "../lib/android_versions"

desc "Validate local tooling and environment"
lane :doctor do
  # Required for the EAS rail (cloud builds) — hard failures
  ensure_cli!("node",       install_hint: "https://nodejs.org/")
  ensure_cli!("yarn",       install_hint: "https://yarnpkg.com/")
  ensure_cli!("eas",        install_hint: "npm i -g eas-cli")
  ensure_cli!("ruby",       install_hint: "https://www.ruby-lang.org/")
  ensure_cli!("bundle",     install_hint: "gem install bundler")

  # Only needed for the native rail (local gym/gradle builds) — warn only
  { "xcodebuild" => "Install Xcode via App Store",
    "gradle"     => "Use the Gradle wrapper via ./gradlew" }.each do |cli, hint|
    unless system("which #{cli} > /dev/null 2>&1")
      UI.important("doctor: '#{cli}' not found — native-rail lanes unavailable (#{hint}). EAS rail unaffected.")
    end
  end

  UI.success("doctor: required CLIs found")
end

desc "iOS ONLY: bump marketing version (major|minor|patch) and build number"
lane :version_bump_ios do |opts|
  bump_type   = (opts[:bump] || "patch").to_s
  bump_builds = opts.key?(:bump_build) ? !!opts[:bump_build] : true

  UI.header("iOS: Bumping marketing version (CFBundleShortVersionString)")
  increment_version_number(xcodeproj: IOS_XCODEPROJ, bump_type: bump_type)
  new_ios_version = get_version_number(xcodeproj: IOS_XCODEPROJ)
  UI.success("iOS marketing version -> #{new_ios_version}")

  if bump_builds
    UI.message("iOS: Incrementing build number (CFBundleVersion)")
    increment_build_number(xcodeproj: IOS_XCODEPROJ)
    new_ios_build = get_build_number(xcodeproj: IOS_XCODEPROJ)
    UI.success("iOS build number -> #{new_ios_build}")
  else
    UI.message("iOS: Skipping build number bump (bump_build=false)")
  end
end

desc "Bump MARKETING version on iOS & Android and optionally increment build numbers (iOS build == Android versionCode)"
lane :version_bump do |opts|
  bump_type   = (opts[:bump] || "patch").to_s
  bump_builds = opts.key?(:bump_build) ? !!opts[:bump_build] : true

  version_bump_ios(bump: bump_type, bump_build: bump_builds)
  ios_version = get_version_number(xcodeproj: IOS_XCODEPROJ)
  ios_build   = get_build_number(xcodeproj: IOS_XCODEPROJ)

  if bump_builds
    write_android_versions(ANDROID_GRADLE, new_version_name: ios_version, new_version_code: ios_build.to_i)
    UI.success("Android versionName -> #{ios_version}, versionCode -> #{ios_build}")
  else
    write_android_versions(ANDROID_GRADLE, new_version_name: ios_version)
    android_code = read_android_version_code(ANDROID_GRADLE)
    UI.success("Android versionName -> #{ios_version} (versionCode stays #{android_code})")
  end

  UI.important("version_bump: iOS and Android marketing versions synced.")
end

desc "Bump BUILD number only on iOS & Android (iOS build == Android versionCode)"
lane :bump_build do |_opts|
  UI.header("iOS: Bumping build number only")
  ios_version_before = get_version_number(xcodeproj: IOS_XCODEPROJ)
  ios_build_before   = get_build_number(xcodeproj: IOS_XCODEPROJ)

  increment_build_number(xcodeproj: IOS_XCODEPROJ)
  ios_build_after = get_build_number(xcodeproj: IOS_XCODEPROJ)
  UI.success("iOS -> version #{ios_version_before} (build #{ios_build_before} → #{ios_build_after})")

  UI.header("Android: Aligning versionCode to iOS build (versionName unchanged)")
  android_version = read_android_version_name(ANDROID_GRADLE)
  write_android_versions(ANDROID_GRADLE, new_version_name: android_version, new_version_code: ios_build_after.to_i)
  UI.success("Android -> versionCode set to #{ios_build_after}")

  UI.important("bump_build: iOS build and Android versionCode now both #{ios_build_after}.")
end

desc "Bump MARKETING version (patch) only on iOS & Android (build numbers unchanged)"
lane :bump_version_only do |_opts|
  UI.header("iOS: Bumping marketing version (patch), build unchanged")
  ios_version_before = get_version_number(xcodeproj: IOS_XCODEPROJ)
  ios_build          = get_build_number(xcodeproj: IOS_XCODEPROJ)
  ios_version_after  = Semver.bump(ios_version_before, "patch")

  increment_version_number(xcodeproj: IOS_XCODEPROJ, version_number: ios_version_after)
  UI.success("iOS -> #{ios_version_before} → #{ios_version_after} (build #{ios_build} unchanged)")

  UI.header("Android: Bumping versionName (patch), versionCode unchanged")
  android_version_before = read_android_version_name(ANDROID_GRADLE)
  android_code           = read_android_version_code(ANDROID_GRADLE)
  android_version_after  = Semver.bump(android_version_before, "patch")

  write_android_versions(ANDROID_GRADLE, new_version_name: android_version_after, new_version_code: android_code)
  UI.success("Android -> #{android_version_before} → #{android_version_after} (versionCode #{android_code} unchanged)")

  UI.important("bump_version_only complete. Builds unchanged.")
end

desc "Show current marketing versions and build numbers for iOS and Android"
lane :show_versions do
  UI.header("Current Versions")

  ios_version = get_version_number(xcodeproj: IOS_XCODEPROJ)
  ios_build   = get_build_number(xcodeproj: IOS_XCODEPROJ)

  android_version = read_android_version_name(ANDROID_GRADLE)
  android_code    = read_android_version_code(ANDROID_GRADLE)

  UI.message("")
  UI.message("iOS     #{ios_version} (build #{ios_build})")
  UI.message("Android #{android_version} (versionCode #{android_code})")
  UI.important("Summary => iOS #{ios_version} (#{ios_build}) | Android #{android_version} (#{android_code})")
end

desc "Set explicit marketing version and build number for iOS & Android (iOS build == Android versionCode)"
lane :set_version do |opts|
  version = opts[:version] || UI.user_error!("Pass version: x.y.z")
  build   = opts[:build]   || UI.user_error!("Pass build: number")

  UI.header("iOS: Setting version/build explicitly")
  increment_version_number(xcodeproj: IOS_XCODEPROJ, version_number: version)
  increment_build_number(xcodeproj: IOS_XCODEPROJ, build_number: build.to_s)
  ios_version = get_version_number(xcodeproj: IOS_XCODEPROJ)
  ios_build   = get_build_number(xcodeproj: IOS_XCODEPROJ)
  UI.success("iOS set to #{ios_version} (#{ios_build})")

  UI.header("Android: Setting version/build to match iOS")
  write_android_versions(ANDROID_GRADLE, new_version_name: version, new_version_code: ios_build.to_i)
  android_version = read_android_version_name(ANDROID_GRADLE)
  android_code    = read_android_version_code(ANDROID_GRADLE)
  UI.success("Android set to #{android_version} (#{android_code})")

  UI.important("Summary => iOS #{ios_version} (#{ios_build}) | Android #{android_version} (#{android_code})")
end
