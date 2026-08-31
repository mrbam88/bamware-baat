require "fileutils"
require "shellwords"

# ---------------------------------------------------------------------------
# iOS — Clean / Build / Submit
# ---------------------------------------------------------------------------

desc "iOS Native: clean Xcode build artifacts (Release)"
lane :ios_native_clean do |opts|
  workspace     = (opts[:workspace] || IOS_WORKSPACE).to_s
  scheme        = (opts[:scheme] || IOS_SCHEME).to_s

  UI.header("iOS: Cleaning Xcode build (#{scheme}, Release)")
  sh([
    "xcodebuild",
    "-workspace", Shellwords.escape(workspace),
    "-scheme",    Shellwords.escape(scheme),
    "-configuration", "Release",
    "clean",
  ].join(" "))
  UI.success("iOS clean complete")
end

desc "iOS Native: build IPA with Xcode (Automatic signing, with clean step)"
lane :ios_native_build do |opts|
  workspace = (opts[:workspace] || IOS_WORKSPACE).to_s
  scheme    = (opts[:scheme] || IOS_SCHEME).to_s
  output    = (opts[:output] || timestamped_path(IOS_IPA_ABS, ".ipa")).to_s

  ios_native_clean(workspace: workspace, scheme: scheme)
  FileUtils.mkdir_p(File.dirname(output))
  UI.message("Building iOS IPA to: #{output}")

  gym(
    workspace:          workspace,
    scheme:             scheme,
    configuration:      "Release",
    clean:              false,
    export_method:      "app-store",
    export_options:     { signingStyle: "automatic", teamID: IOS_TEAM_ID },
    xcargs:             "DEVELOPMENT_TEAM=#{IOS_TEAM_ID}",
    output_directory:   File.dirname(output),
    output_name:        File.basename(output),
    include_symbols:    true,
    include_bitcode:    false,
    silent:             false,
    disable_xcpretty:   true,
    xcodebuild_formatter: "",
  )

  UI.success("Built IPA at #{output}")
  Actions.lane_context[:IOS_IPA_PATH] = output
end

# App Store Connect API key from env — the only supported auth path for
# store uploads (app-specific passwords are retired; see SECURITY.md).
#   ASC_KEY_ID      key id from App Store Connect → Integrations
#   ASC_ISSUER_ID   issuer id from the same page
#   ASC_KEY_P8_B64  base64 of the .p8 file:  base64 < AuthKey_XXXX.p8
def _asc_api_key
  missing = %w[ASC_KEY_ID ASC_ISSUER_ID ASC_KEY_P8_B64].select { |k| ENV[k].to_s.strip.empty? }
  unless missing.empty?
    UI.user_error!(
      "Store upload requires App Store Connect API key envs (missing: #{missing.join(', ')}). " \
      "See docs/RELEASING.md → Secrets."
    )
  end
  app_store_connect_api_key(
    key_id:                 ENV["ASC_KEY_ID"],
    issuer_id:              ENV["ASC_ISSUER_ID"],
    key_content:            ENV["ASC_KEY_P8_B64"],
    is_key_content_base64:  true,
    in_house:               false,
  )
end

desc "iOS Native: upload IPA to TestFlight (auth: ASC API key from env)"
lane :ios_native_submit do |opts|
  ipa = (opts[:ipa] || Actions.lane_context[:IOS_IPA_PATH] || IOS_IPA_ABS).to_s
  UI.user_error!("IPA not found at #{ipa}") unless File.exist?(ipa)
  pilot(ipa: ipa, api_key: _asc_api_key, skip_waiting_for_build_processing: true)
end

desc "iOS Native: clean + build + submit to TestFlight"
lane :ios_native_ship do |opts|
  workspace = (opts[:workspace] || IOS_WORKSPACE).to_s
  scheme    = (opts[:scheme] || IOS_SCHEME).to_s
  ipa_out   = (opts[:ipa] || timestamped_path(IOS_IPA_ABS, ".ipa")).to_s

  ios_native_build(workspace: workspace, scheme: scheme, output: ipa_out)
  ios_native_submit(ipa: ipa_out)
end

# ---------------------------------------------------------------------------
# Android — Clean / Build / Submit
# ---------------------------------------------------------------------------

desc "Android Native: clean Gradle build"
lane :android_native_clean do |_opts|
  UI.header("Android: Gradle clean")
  Dir.chdir(File.join(REPO_ROOT, "android")) do
    sh "./gradlew clean --no-daemon"
  end
  UI.success("Android Gradle clean complete")
end

desc "Android Native: deep clean Gradle, CMake, and ReactAndroid caches"
lane :android_native_deep_clean do |_opts|
  UI.header("Android: Deep Gradle + CMake + ReactAndroid clean")

  android_dir = File.join(REPO_ROOT, "android")
  home_dir    = File.expand_path("~")

  [
    File.join(android_dir, "app", ".cxx"),
    File.join(android_dir, ".gradle"),
    File.join(home_dir, ".gradle", "caches", "modules-2", "files-2.1", "com.facebook.react", "react-android"),
  ].each { |p| FileUtils.rm_rf(p); UI.message("Removed: #{p}") }

  Dir.glob(File.join(home_dir, ".gradle", "caches", "transforms-*", "transformed", "*react-android*")).each do |p|
    FileUtils.rm_rf(p); UI.message("Removed transform cache: #{p}")
  end

  Dir.glob(File.join(home_dir, ".gradle", "caches", "build-cache-*")).each do |p|
    FileUtils.rm_rf(p); UI.message("Removed build cache: #{p}")
  end

  Dir.chdir(android_dir) { sh "./gradlew clean --no-daemon" }
  UI.success("Android deep clean complete")
end

desc "Android Native: build AAB via Gradle with RN New Arch codegen pre-steps"
lane :android_native_build do |opts|
  aab_out = (opts[:aab] || timestamped_path(ANDROID_AAB_ABS, ".aab")).to_s
  FileUtils.mkdir_p(File.dirname(aab_out))

  android_native_clean({})

  Dir.chdir(File.join(REPO_ROOT, "android")) do
    sh "./gradlew generateCodegenSchemaFromJava generateCodegenArtifactsFromSchema --no-daemon"
    sh "./gradlew " \
       ":react-native-reanimated:assembleRelease " \
       ":react-native-gesture-handler:assembleRelease " \
       "--continue --no-daemon || true"
    sh "./gradlew bundleRelease --no-daemon"
  end

  aab_src = File.join(REPO_ROOT, "android/app/build/outputs/bundle/release/app-release.aab")
  UI.user_error!("AAB not found at #{aab_src}") unless File.exist?(aab_src)
  FileUtils.cp(aab_src, aab_out)
  UI.success("Built AAB at #{aab_out}")
  Actions.lane_context[:ANDROID_AAB_PATH] = aab_out
end

desc "Android Native: upload AAB to Google Play (supply). Requires SUPPLY_JSON_KEY env var."
lane :android_native_submit do |opts|
  aab   = (opts[:aab] || Actions.lane_context[:ANDROID_AAB_PATH] || ANDROID_AAB_ABS).to_s
  track = (opts[:track] || "internal").to_s

  UI.user_error!("AAB not found at #{aab}") unless File.exist?(aab)
  json = ENV["SUPPLY_JSON_KEY"].to_s
  UI.user_error!("Set SUPPLY_JSON_KEY=/path/to/service-account.json") if json.strip.empty?
  UI.user_error!("SUPPLY_JSON_KEY points to a missing file: #{json}") unless File.exist?(json)

  params = {
    aab:                          aab,
    track:                        track,
    json_key:                     json,
    release_status:               "draft",
    changes_not_sent_for_review:  true,
    skip_upload_apk:              true,
    skip_upload_aab:              false,
    skip_upload_metadata:         true,
    skip_upload_images:           true,
    skip_upload_screenshots:      true,
    timeout:                      300,
  }
  package_name = opts[:package_name] || ENV["ANDROID_PACKAGE_NAME"]
  params[:package_name] = package_name if package_name && !package_name.to_s.empty?

  supply(**params)
end

desc "Android Native: deep clean + build + submit to Google Play"
lane :android_native_ship do |opts|
  aab   = (opts[:aab] || timestamped_path(ANDROID_AAB_ABS, ".aab")).to_s
  track = (opts[:track] || "internal").to_s

  android_native_deep_clean({})
  android_native_build(aab: aab)
  android_native_submit(aab: aab, track: track)
end

# ---------------------------------------------------------------------------
# Workspace utilities
# ---------------------------------------------------------------------------

desc "Nuke node_modules, iOS Pods, and Android local build artifacts (NO version changes)"
lane :nuke_workdir do |_opts|
  UI.header("Nuke workdir: JS deps + iOS Pods + Android local build")

  android_dir = File.join(REPO_ROOT, "android")
  ios_dir     = File.join(REPO_ROOT, "ios")

  {
    "node_modules"      => File.join(REPO_ROOT, "node_modules"),
    "ios/Pods"          => File.join(ios_dir, "Pods"),
    "ios/Podfile.lock"  => File.join(ios_dir, "Podfile.lock"),
    "ios/build"         => File.join(ios_dir, "build"),
    "android/app/build" => File.join(android_dir, "app", "build"),
    "android/app/.cxx"  => File.join(android_dir, "app", ".cxx"),
    "android/.gradle"   => File.join(android_dir, ".gradle"),
  }.each { |label, path| FileUtils.rm_rf(path); UI.message("Removed #{label}") }

  UI.success("Workspace nuked. Next: yarn install && (cd ios && pod install)")
end

desc "Nuke ONLY global Gradle caches (~/.gradle). Does NOT modify project files."
lane :gradle_nuke do
  UI.header("Gradle nuke: wiping global Gradle caches")

  home_dir    = File.expand_path("~")
  android_dir = File.join(REPO_ROOT, "android")

  Dir.glob(File.join(home_dir, ".gradle", "caches", "transforms-*", "transformed", "*react-android*")).each do |p|
    FileUtils.rm_rf(p); UI.message("Removed transform cache: #{p}")
  end

  react_mod_cache = File.join(home_dir, ".gradle", "caches", "modules-2", "files-2.1", "com.facebook.react", "react-android")
  FileUtils.rm_rf(react_mod_cache)
  UI.message("Removed react-android module cache")

  Dir.glob(File.join(home_dir, ".gradle", "caches", "build-cache-*")).each do |p|
    FileUtils.rm_rf(p); UI.message("Removed build-cache: #{p}")
  end

  begin
    Dir.chdir(android_dir) { sh "./gradlew clean --no-daemon" }
  rescue => e
    UI.important("gradle_nuke: ./gradlew clean failed (ignored): #{e.message}")
  end

  UI.success("Gradle nuke complete. Rebuild fresh.")
end
