require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoUnityAds'
  s.version        = package['version']
  s.summary        = package['description']
  s.license        = { :type => 'MIT' }
  s.homepage       = 'https://github.com/focusblock/expo-unity-ads'
  s.authors        = 'FocusBlock'
  s.platforms      = { :ios => '14.0' }
  s.swift_version  = '5.9'

  s.source       = { :path => '.' }
  s.source_files = '*.{h,m,mm,swift}'

  # Unity Ads SDK 4.x — https://github.com/Unity-Technologies/unity-ads-ios
  # static_framework is required because UnityAds ships as a static XCFramework
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'UnityAds', '~> 4.12'
end
