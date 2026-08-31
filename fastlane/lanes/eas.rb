private_lane :_eas_build do |opts|
  platform = opts[:platform].to_s
  profile  = (opts[:profile] || "production").to_s
  ensure_cli!("eas", install_hint: "npm i -g eas-cli")
  run_cmd!("eas build --platform #{platform} --profile #{profile} --non-interactive")
end

private_lane :_eas_submit do |opts|
  platform = opts[:platform].to_s
  ensure_cli!("eas", install_hint: "npm i -g eas-cli")
  run_cmd!("eas submit -p #{platform} --latest --non-interactive")
end

# ---------------------------------------------------------------------------
# Development builds — internal distribution, no store submit
# ---------------------------------------------------------------------------

desc "iOS: development build (simulator)"
lane :ios_dev_build do
  _eas_build(platform: "ios", profile: "development")
end

desc "Android: development build (internal)"
lane :android_dev_build do
  _eas_build(platform: "android", profile: "development")
end

# ---------------------------------------------------------------------------
# Preview builds — internal distribution, real device, no store submit
# ---------------------------------------------------------------------------

desc "iOS: preview build (real device, internal distribution)"
lane :ios_preview_build do
  _eas_build(platform: "ios", profile: "preview")
end

desc "Android: preview build (internal distribution)"
lane :android_preview_build do
  _eas_build(platform: "android", profile: "preview")
end

# ---------------------------------------------------------------------------
# Production — build + submit to store
# ---------------------------------------------------------------------------

desc "iOS: production build -> submit to TestFlight"
lane :ios_deploy do |opts|
  profile = (opts[:profile] || "production").to_s
  _eas_build(platform: "ios", profile: profile)
  _eas_submit(platform: "ios")
end

desc "Android: production build -> submit to Play Store (internal track)"
lane :android_deploy do |opts|
  profile = (opts[:profile] || "production").to_s
  _eas_build(platform: "android", profile: profile)
  _eas_submit(platform: "android")
end

# ---------------------------------------------------------------------------
# App Store metadata (deliver) — pushes fastlane/metadata + screenshots to
# App Store Connect. Auth: ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_P8_B64 envs
# (see docs/RELEASING.md → Secrets). Does NOT touch builds or submit.
# ---------------------------------------------------------------------------
desc "Push App Store metadata + screenshots to ASC (no binary, no submit)"
lane :ios_metadata do
  deliver(
    api_key: _asc_api_key,
    app_identifier: "com.example.baat",
    skip_binary_upload: true,
    skip_app_version_update: false,
    force: true, # no interactive HTML preview
    overwrite_screenshots: true,
    precheck_include_in_app_purchases: false,
    submit_for_review: false,
    app_review_information: {
      demo_user: "appreview@bamware.io",
      demo_password: ENV["ASC_DEMO_PASSWORD"] || "SET_ME",
      notes: "Dating app for the South Asian diaspora (18+). Demo account is pre-registered with matches and chats. Safety: every chat has a menu (...) with Block and Report; Profile tab -> Safety & privacy links Terms and Privacy Policy. No purchases in this version.",
    },
  )
end
