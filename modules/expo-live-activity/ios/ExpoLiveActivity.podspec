require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoLiveActivity'
  s.version        = package['version']
  s.summary        = package['description']
  s.license        = { :type => 'MIT' }
  s.homepage       = 'https://github.com/focusblock/expo-live-activity'
  s.authors        = 'FocusBlock'
  # Deployment target matches the main app; runtime guarded with @available(iOS 16.2, *)
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'

  s.source       = { :path => '.' }
  s.source_files = '*.{h,m,mm,swift}'

  s.dependency 'ExpoModulesCore'
  # ActivityKit is weak-linked so the binary launches on iOS < 16.2.
  # All usage is guarded at runtime with @available(iOS 16.2, *).
  s.weak_frameworks = 'ActivityKit'
end
