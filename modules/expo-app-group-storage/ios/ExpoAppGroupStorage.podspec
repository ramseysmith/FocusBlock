require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoAppGroupStorage'
  s.version        = package['version']
  s.summary        = package['description']
  s.license        = { :type => 'MIT' }
  s.homepage       = 'https://github.com/focusblock/expo-app-group-storage'
  s.authors        = 'FocusBlock'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'

  s.source       = { :path => '.' }
  s.source_files = '*.{h,m,mm,swift}'

  s.dependency 'ExpoModulesCore'
  # WidgetKit is available from iOS 14.0; no weak linking needed for 15.1+ target.
  s.frameworks = 'WidgetKit'
end
