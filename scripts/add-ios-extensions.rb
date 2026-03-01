#!/usr/bin/env ruby
# frozen_string_literal: true
#
# add-ios-extensions.rb
#
# Adds the FocusBlockWidgetExtension target to the Xcode project so that
# the Live Activity, lock-screen widgets, and Dynamic Island work correctly.
#
# Usage (run from the project root once, then pod install):
#   cd ios && bundle exec ruby ../scripts/add-ios-extensions.rb
#   # or if xcodeproj is globally installed:
#   ruby scripts/add-ios-extensions.rb
#
# The script is idempotent — running it a second time is safe.

begin
  require 'xcodeproj'
rescue LoadError
  abort "xcodeproj gem not found.\nRun: gem install xcodeproj\n  or: cd ios && bundle install"
end

# ── Paths ─────────────────────────────────────────────────────────────────────

SCRIPT_DIR    = __dir__
PROJECT_ROOT  = File.expand_path('..', SCRIPT_DIR)
PROJECT_PATH  = File.join(PROJECT_ROOT, 'ios', 'FocusBlock.xcodeproj')
EXTENSION_DIR = File.join(PROJECT_ROOT, 'ios', 'FocusBlockWidgetExtension')

APP_BUNDLE_ID = 'com.ramseysmith.focusblock'
EXT_BUNDLE_ID = "#{APP_BUNDLE_ID}.widgets"
EXT_NAME      = 'FocusBlockWidgetExtension'

# ── Open project ──────────────────────────────────────────────────────────────

abort "Xcode project not found at #{PROJECT_PATH}" unless File.exist?(PROJECT_PATH)
project = Xcodeproj::Project.open(PROJECT_PATH)

# ── Idempotency check ─────────────────────────────────────────────────────────

if project.targets.any? { |t| t.name == EXT_NAME }
  puts "✓ #{EXT_NAME} target already exists — nothing to do."
  exit 0
end

puts "Adding #{EXT_NAME} target…"

# ── Create the extension target ───────────────────────────────────────────────

ext_target = project.new_target(:app_extension, EXT_NAME, :ios, '16.2')

ext_target.build_configuration_list.build_configurations.each do |config|
  config.build_settings.merge!(
    'PRODUCT_BUNDLE_IDENTIFIER'  => EXT_BUNDLE_ID,
    'IPHONEOS_DEPLOYMENT_TARGET' => '16.2',
    'SWIFT_VERSION'              => '5.9',
    'SKIP_INSTALL'               => 'YES',
    'CODE_SIGN_ENTITLEMENTS'     => "#{EXT_NAME}/#{EXT_NAME}.entitlements",
    'INFOPLIST_FILE'             => "#{EXT_NAME}/Info.plist",
    'LD_RUNPATH_SEARCH_PATHS'    => '$(inherited) @executable_path/../../Frameworks',
    'TARGETED_DEVICE_FAMILY'     => '1,2',
    'SUPPORTS_MACCATALYST'       => 'NO',
    'ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES' => 'NO',
  )
end

# ── Create a group and add Swift source files ─────────────────────────────────

ext_group = project.main_group.new_group(EXT_NAME, EXT_NAME)

swift_files = Dir[File.join(EXTENSION_DIR, '*.swift')].sort
swift_files.each do |path|
  ref = ext_group.new_file(File.basename(path))
  ext_target.source_build_phase.add_file_reference(ref)
  puts "  + #{File.basename(path)}"
end

# Non-compiled resources (Info.plist + entitlements)
['Info.plist', "#{EXT_NAME}.entitlements"].each do |name|
  ext_group.new_file(name) unless ext_group.files.any? { |f| f.display_name == name }
end

# ── Add system frameworks ─────────────────────────────────────────────────────
# WidgetKit, SwiftUI — strong-linked (available since iOS 14 / 13 respectively)
# ActivityKit — weak-linked so the extension still loads on iOS < 16.2 if ever
# backported, though deployment target already enforces 16.2.

fw_group = project.frameworks_group

[
  { name: 'WidgetKit',   weak: false },
  { name: 'ActivityKit', weak: true  },
  { name: 'SwiftUI',     weak: false },
].each do |fw|
  fw_path = "System/Library/Frameworks/#{fw[:name]}.framework"
  fw_ref  = fw_group.files.find { |f| f.path == fw_path } ||
            fw_group.new_reference(fw_path)
  fw_ref.source_tree = 'SDKROOT'
  build_file = ext_target.frameworks_build_phase.add_file_reference(fw_ref)
  build_file.settings = { 'ATTRIBUTES' => ['Weak'] } if fw[:weak]
end

# ── Embed extension in the main app target ────────────────────────────────────

main_target = project.targets.find { |t| t.name == 'FocusBlock' }

if main_target
  # Find or create an "Embed Foundation Extensions" CopyFiles phase
  embed_phase = main_target.copy_files_build_phases.find { |p|
    p.name == 'Embed Foundation Extensions'
  }
  unless embed_phase
    embed_phase = main_target.new_copy_files_build_phase('Embed Foundation Extensions')
    embed_phase.dst_subfolder_spec = '13'   # PlugIns (App Extensions)
    embed_phase.dst_path           = ''
  end

  # Embed the extension product
  ext_product    = ext_target.product_reference
  embed_file     = embed_phase.add_file_reference(ext_product)
  embed_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

  # Declare build dependency so Xcode compiles the extension before the app
  main_target.add_dependency(ext_target)
  puts "  ✓ Extension embedded into FocusBlock target"
else
  puts "  ⚠ Could not find FocusBlock target — embed the extension manually in Xcode"
end

# ── Save ──────────────────────────────────────────────────────────────────────

project.save
puts "\n✓ #{EXT_NAME} added to #{PROJECT_PATH}"
puts "\nNext steps:"
puts "  1. Open ios/FocusBlock.xcworkspace in Xcode"
puts "  2. Select the FocusBlockWidgetExtension target → Signing & Capabilities"
puts "  3. Set your Team and verify bundle ID: #{EXT_BUNDLE_ID}"
puts "  4. Add the 'App Groups' capability to BOTH targets with group.com.ramseysmith.focusblock"
puts "  5. Run: cd ios && pod install"
puts "  6. Build and run on device"
