'use strict';
/**
 * Expo Config Plugin — withUnityAds
 *
 * Injects the Unity Ads 4.x Maven repository into the Android project-level
 * build.gradle so Gradle can resolve `com.unity3d.ads:unity-ads:4.x`.
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const UNITY_MAVEN_URL =
  'https://storage.googleapis.com/download.unity3d.com/maven-proxy';

const UNITY_MAVEN_BLOCK = `        maven { url "${UNITY_MAVEN_URL}" }`;

const withUnityAds = (config) =>
  withProjectBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents;

    // Idempotent — skip if already injected
    if (contents.includes(UNITY_MAVEN_URL)) {
      return mod;
    }

    // Insert after the first `google()` inside the allprojects.repositories block.
    mod.modResults.contents = contents.replace(
      /(\s*google\(\))/,
      `$1\n${UNITY_MAVEN_BLOCK}`
    );

    return mod;
  });

exports.withUnityAds = withUnityAds;
exports.default = withUnityAds;
