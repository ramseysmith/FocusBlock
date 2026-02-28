/**
 * Expo Config Plugin — withUnityAds
 *
 * Injects the Unity Ads 4.x Maven repository into the Android project-level
 * build.gradle so Gradle can resolve `com.unity3d.ads:unity-ads:4.x`.
 *
 * This plugin is required because the local `expo-unity-ads` module declares
 * the Maven URL in its own build.gradle, but Android requires repository
 * declarations to also appear in the *project-level* build.gradle.
 */

import { ConfigPlugin, withProjectBuildGradle } from '@expo/config-plugins';

const UNITY_MAVEN_URL =
  'https://storage.googleapis.com/download.unity3d.com/maven-proxy';

const UNITY_MAVEN_BLOCK = `        maven { url "${UNITY_MAVEN_URL}" }`;

export const withUnityAds: ConfigPlugin = (config) =>
  withProjectBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents;

    // Idempotent — skip if already injected
    if (contents.includes(UNITY_MAVEN_URL)) {
      return mod;
    }

    // Insert after the first `google()` inside the allprojects.repositories block.
    // The generated project build.gradle always has at least one `google()` call.
    mod.modResults.contents = contents.replace(
      /(\s*google\(\))/,
      `$1\n${UNITY_MAVEN_BLOCK}`
    );

    return mod;
  });

export default withUnityAds;
