require "fileutils"
require "shellwords"
require "open3"
require "fastlane_core/ui/ui"

module Semver
  module_function
  def bump(version, type = "patch")
    parts = version.to_s.split(".").map!(&:to_i)
    parts[0] ||= 0
    parts[1] ||= 0
    parts[2] ||= 0
    case type
    when "major" then parts[0] += 1; parts[1] = 0; parts[2] = 0
    when "minor" then parts[1] += 1; parts[2] = 0
    else              parts[2] += 1
    end
    parts.join(".")
  end
end

def ensure_cli!(cmd, install_hint: nil)
  FastlaneCore::UI.message("Validating CLI availability: #{cmd}")
  return if system("which #{Shellwords.escape(cmd)} > /dev/null 2>&1")
  hint = install_hint ? " Install hint: #{install_hint}" : ""
  FastlaneCore::UI.user_error!("Required CLI '#{cmd}' not found in PATH.#{hint}")
end

def mkdir_p(path)
  FileUtils.mkdir_p(path) unless File.directory?(path)
end

def timestamped_path(base_abs, extension)
  dirname  = File.dirname(base_abs)
  basename = File.basename(base_abs, ".*")
  mkdir_p(dirname)
  File.join(dirname, "#{basename}-#{TIMESTAMP_TOKEN}#{extension}")
end

def run_cmd!(cmd)
  FastlaneCore::UI.message("Running: #{cmd}")
  stdout, stderr, status = Open3.capture3(cmd)
  FastlaneCore::UI.command_output(stdout) if stdout&.strip&.length&.positive?
  unless status.success?
    FastlaneCore::UI.error(stderr) if stderr&.strip&.length&.positive?
    FastlaneCore::UI.user_error!("Command failed: #{cmd}")
  end
  true
end
