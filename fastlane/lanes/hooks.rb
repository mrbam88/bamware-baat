require "fileutils"

before_all do |lane, _options|
  UI.message("Fastlane starting (lane=#{lane}). Repo root: #{REPO_ROOT}")
  FileUtils.mkdir_p(ARTIFACTS_DIR)
end

after_all do |lane|
  UI.success("Fastlane finished successfully (lane=#{lane}).")
end

error do |lane, exception|
  UI.error("Fastlane failed (lane=#{lane}): #{exception.message}")
  UI.error(exception.backtrace.join("\n")) if exception.backtrace
end
