require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoNowPlaying'
  s.version        = package['version']
  s.summary        = package['description']
  s.license        = { :type => 'MIT' }
  s.homepage       = 'https://github.com/focusblock/expo-now-playing'
  s.authors        = 'FocusBlock'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'

  s.source       = { :path => '.' }
  s.source_files = '*.{h,m,mm,swift}'

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'MediaPlayer', 'AVFoundation'
end
