require "fastlane_core/ui/ui"

# The android/ project is generated (CNG) and gitignored. Guard every
# version read/write so a missing project fails with instructions instead
# of a raw ENOENT.
def ensure_android_project!(gradle_path = ANDROID_GRADLE)
  return if File.exist?(gradle_path)
  FastlaneCore::UI.user_error!(
    "Android project not found (#{gradle_path}). " \
    "Generate it first: npx expo prebuild -p android " \
    "(EAS-rail lanes don't need this — EAS prebuilds in the cloud.)"
  )
end

def read_android_version_name(gradle_path = ANDROID_GRADLE)
  ensure_android_project!(gradle_path)
  txt = File.read(gradle_path)
  m = txt.match(/versionName\s+["']([^"']+)["']/)
  FastlaneCore::UI.user_error!("Couldn't parse versionName from #{gradle_path}") unless m
  m[1]
end

def read_android_version_code(gradle_path = ANDROID_GRADLE)
  ensure_android_project!(gradle_path)
  txt = File.read(gradle_path)
  m = txt.match(/versionCode\s+(\d+)/)
  FastlaneCore::UI.user_error!("Couldn't parse versionCode from #{gradle_path}") unless m
  m[1].to_i
end

def write_android_versions(gradle_path = ANDROID_GRADLE, new_version_name:, new_version_code: nil)
  ensure_android_project!(gradle_path)
  txt      = File.read(gradle_path)
  original = txt.dup

  if txt.match?(/versionName\s+["'][^"']+["']/)
    txt.gsub!(/versionName\s+["'][^"']+["']/, "versionName \"#{new_version_name}\"")
  else
    inserted = txt.gsub!(/defaultConfig\s*\{/, "defaultConfig {\n        versionName \"#{new_version_name}\"")
    FastlaneCore::UI.user_error!("Could not insert versionName; no defaultConfig block in #{gradle_path}") unless inserted
  end

  if new_version_code
    if txt.match?(/versionCode\s+\d+/)
      txt.gsub!(/versionCode\s+\d+/, "versionCode #{new_version_code}")
    else
      inserted = txt.gsub!(/defaultConfig\s*\{/, "defaultConfig {\n        versionCode #{new_version_code}")
      FastlaneCore::UI.user_error!("Could not insert versionCode; no defaultConfig block in #{gradle_path}") unless inserted
    end
  end

  if txt != original
    File.write(gradle_path, txt)
    FastlaneCore::UI.success("Wrote Android versions -> versionName=#{new_version_name}#{", versionCode=#{new_version_code}" if new_version_code}")
  else
    FastlaneCore::UI.important("Android gradle unchanged (#{gradle_path})")
  end
end
