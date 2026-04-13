const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds `use_modular_headers!` to the Podfile.
 * Required for Firebase Swift pods (FirebaseAuth, FirebaseCoreInternal, FirebaseFirestore).
 *
 * Post-install nuclear fix for Xcode xcconfig -fmodule-map-file= concatenation bug:
 *
 * Both Xcode 16.x and Xcode 26 treat multiple -fmodule-map-file= flags on one
 * OTHER_CFLAGS line as a SINGLE path argument, causing "module map file not found"
 * errors for any pod that has more than one such flag (gRPC-Core, FirebaseFirestoreInternal,
 * and many others).
 *
 * Fix: remove ALL -fmodule-map-file= flags from ALL pod xcconfigs, and also strip
 * -enable-bare-slash-regex which was removed in Swift 6 (Xcode 16+).
 * With use_modular_headers!, CocoaPods sets HEADER_SEARCH_PATHS so Xcode can resolve
 * modules through its implicit build dependency graph without explicit flags.
 */

const GRPC_POST_INSTALL_FIX = `
  require 'find'

  # Fix 1: Scan ALL xcconfig files in Pods/ and remove problematic flags.
  # - ALL -fmodule-map-file= flags: Xcode 16.x Clang concatenates multiple flags
  #   on one OTHER_CFLAGS line into a single broken path argument.
  # - -enable-bare-slash-regex: removed in Swift 6 (Xcode 16+), causes build error.
  pods_root = installer.sandbox.root.to_s
  Find.find(pods_root) do |path|
    next unless path.end_with?('.xcconfig') && File.file?(path)
    content = File.read(path)
    patched = content
      .gsub(/ -fmodule-map-file=[^[:space:]]+/, '')
      .gsub(/-enable-bare-slash-regex/, '')
    File.write(path, patched) if patched != content
  end

  # Fix 2: Also patch pbxproj build settings directly (overrides xcconfigs).
  # Some pods set flags inline in the project file, not only in xcconfigs.
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      %w[OTHER_SWIFT_FLAGS OTHER_CFLAGS].each do |key|
        val = config.build_settings[key]
        next unless val.is_a?(String) && val.match?(/(-fmodule-map-file=|-enable-bare-slash-regex)/)
        config.build_settings[key] = val
          .gsub(/ -fmodule-map-file=[^[:space:]]+/, '')
          .gsub(/-enable-bare-slash-regex/, '')
      end
    end
  end
  installer.pods_project.save`;

function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Add use_modular_headers! if not present
      if (!podfile.includes('use_modular_headers!')) {
        podfile = podfile.replace(
          /(platform :ios[^\n]*\n)/,
          `$1\nuse_modular_headers!\n`
        );
      }

      // Add gRPC post_install fix if not already present
      if (!podfile.includes('Scan ALL xcconfig files in Pods/ and remove problematic flags')) {
        if (podfile.includes('post_install do |installer|')) {
          podfile = podfile.replace(
            /post_install do \|installer\|/,
            `post_install do |installer|\n${GRPC_POST_INSTALL_FIX}`
          );
        } else {
          podfile += `\npost_install do |installer|\n${GRPC_POST_INSTALL_FIX}\nend\n`;
        }
      }

      fs.writeFileSync(podfilePath, podfile, 'utf8');
      return config;
    },
  ]);
}

module.exports = withModularHeaders;
