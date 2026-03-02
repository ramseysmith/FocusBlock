import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Inserts expo-av 16.x / expo-modules-core 55.x compatibility shims into the
 * existing post_install block of the generated Podfile.
 *
 * expo-av 16.x still imports legacy unimodule headers (EXEventEmitter.h, etc.)
 * that were removed from expo-modules-core 55.x. We inject stub headers at
 * pod-install time so Xcode can find them when compiling EXAV.
 *
 * Insertion strategy: find the closing ) of react_native_post_install() via
 * paren-matching, then insert the compat body immediately after that line.
 * Idempotent: skipped if the marker comment is already present.
 *
 * TS escaping inside template literals:
 *   \\n  → \n  in Podfile → Ruby double-quoted-string newline
 *   \\"  → \"  in Podfile → Ruby escaped double-quote inside "..."
 *   #{}  is NOT TS interpolation — Ruby string interpolation ✓
 */

const MARKER = 'expo-av 16.x / expo-modules-core 55.x compat shims';

// Ruby code to inject inside post_install do |installer| ... end.
// 4-space indent matches the standard Expo-generated Podfile.
const COMPAT_BODY = `
    # ─── ${MARKER} ─────────────────────
    require 'fileutils'
    stub_dir = "#{installer.sandbox.root}/Headers/Public/ExpoModulesCore/ExpoModulesCore"
    FileUtils.mkdir_p(stub_dir) unless Dir.exist?(stub_dir)

    {
      "EXEventEmitter.h" => "#pragma once\\n@protocol EXEventEmitter <NSObject>\\n- (NSArray<NSString *> *)supportedEvents;\\n- (void)startObserving;\\n- (void)stopObserving;\\n@end\\n",
      "EXEventEmitterService.h" => "#pragma once\\n@protocol EXEventEmitterService <NSObject>\\n- (void)sendEventWithName:(NSString *)eventName body:(id)body;\\n@end\\n",
      "EXLegacyExpoViewProtocol.h" => "#pragma once\\n@protocol EXLegacyExpoViewProtocol <NSObject>\\n@end\\n",
    }.each do |filename, content|
      fpath = File.join(stub_dir, filename)
      File.write(fpath, content) unless File.exist?(fpath)
    end

    defines_path = File.join(stub_dir, "EXDefines.h")
    if File.exist?(defines_path) && !File.read(defines_path).include?("EXLogInfo")
      File.open(defines_path, "a") do |f|
        f.write("#ifndef EXErrorWithMessage\\n#define EXErrorWithMessage(message) [NSError errorWithDomain:@\\"EXError\\" code:0 userInfo:@{ NSLocalizedDescriptionKey: (message) }]\\n#endif\\n")
        f.write("#ifndef EXFatal\\nstatic inline void EXFatal(NSError *__unused error) { NSLog(@\\"[EXFatal] %@\\", error.localizedDescription); }\\n#endif\\n")
        f.write("#ifndef EXLogInfo\\n#define EXLogInfo(fmt, ...)  NSLog(@\\"[ExpoInfo] \\"  fmt, ##__VA_ARGS__)\\n#endif\\n")
        f.write("#ifndef EXLogWarn\\n#define EXLogWarn(fmt, ...)  NSLog(@\\"[ExpoWarn] \\"  fmt, ##__VA_ARGS__)\\n#endif\\n")
        f.write("#ifndef EXLogError\\n#define EXLogError(fmt, ...) NSLog(@\\"[ExpoError] \\" fmt, ##__VA_ARGS__)\\n#endif\\n")
        f.write("#ifndef UMPromiseResolveBlock\\ntypedef EXPromiseResolveBlock UMPromiseResolveBlock;\\n#endif\\n")
        f.write("#ifndef UMPromiseRejectBlock\\ntypedef EXPromiseRejectBlock UMPromiseRejectBlock;\\n#endif\\n")
      end
    end
    # ─── end expo-av compat ──────────────────────────────────────────────────────
`;

export const withExpoAvCompat: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'ios',
    (mod) => {
      const podfilePath = path.join(mod.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // Idempotent: don't insert twice
      if (contents.includes(MARKER)) return mod;

      // Find react_native_post_install( and match its closing )
      const callStart = contents.indexOf('react_native_post_install(');
      if (callStart === -1) {
        console.warn('[withExpoAvCompat] react_native_post_install not found in Podfile — skipping compat shims.');
        return mod;
      }

      let depth = 0;
      let closeIdx = -1;
      for (let i = callStart; i < contents.length; i++) {
        if (contents[i] === '(') depth++;
        else if (contents[i] === ')') {
          if (--depth === 0) { closeIdx = i; break; }
        }
      }

      if (closeIdx === -1) {
        console.warn('[withExpoAvCompat] Could not find closing ) of react_native_post_install — skipping.');
        return mod;
      }

      // Insert COMPAT_BODY after the line that contains the closing )
      const lineEnd = contents.indexOf('\n', closeIdx);
      const insertAt = lineEnd === -1 ? contents.length : lineEnd + 1;
      contents = contents.slice(0, insertAt) + COMPAT_BODY + contents.slice(insertAt);
      fs.writeFileSync(podfilePath, contents);
      return mod;
    },
  ]);

export default withExpoAvCompat;
