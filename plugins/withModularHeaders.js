const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds `use_modular_headers!` to the Podfile.
 * Required for Firebase Swift pods (FirebaseAuth, FirebaseCoreInternal, FirebaseFirestore)
 * which depend on pods that don't define modules (GoogleUtilities, RecaptchaInterop, etc.).
 *
 * Also injects a post_install fix for gRPC module map errors with newer Xcode versions.
 * When use_modular_headers! is active, CocoaPods adds -fmodule-map-file flags to gRPC-related
 * pods' xcconfig files (gRPC-Core.modulemap, abseil.modulemap, BoringSSL-GRPC.modulemap, etc.)
 * but these files are either missing or the flags get misinterpreted by Xcode 26+.
 * The fix removes ALL -fmodule-map-file flags from gRPC/abseil/BoringSSL xcconfig files.
 */

const GRPC_POST_INSTALL_FIX = `
  # Fix: Remove all -fmodule-map-file flags from gRPC/abseil/BoringSSL xcconfigs
  # With use_modular_headers!, CocoaPods adds -fmodule-map-file flags for gRPC dependencies,
  # but these module map files are missing or cause Xcode 26+ parse errors.
  require 'set'
  grpc_pod_names = %w[gRPC-Core gRPC-C++ gRPC-RxLibrary gRPC abseil BoringSSL-GRPC openssl_grpc]
  patched_xcconfigs = Set.new

  installer.pods_project.targets.each do |target|
    next unless grpc_pod_names.any? { |pod| target.name == pod || target.name.start_with?(pod + '-') }
    target.build_configurations.each do |config|
      xcconfig_ref = config.base_configuration_reference
      next unless xcconfig_ref
      xcconfig_path = xcconfig_ref.real_path.to_s
      next if patched_xcconfigs.include?(xcconfig_path)
      next unless File.exist?(xcconfig_path)
      content = File.read(xcconfig_path)
      # Remove every -fmodule-map-file=<path> flag (preceded by a space)
      patched = content.gsub(/ -fmodule-map-file=[^[:space:]]+/, '')
      if patched != content
        File.write(xcconfig_path, patched)
        patched_xcconfigs.add(xcconfig_path)
        puts "gRPC xcconfig patched: #{File.basename(xcconfig_path)}"
      end
    end
  end`;

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
      if (!podfile.includes('gRPC xcconfig patched')) {
        if (podfile.includes('post_install do |installer|')) {
          // Inject inside the existing post_install block
          podfile = podfile.replace(
            /post_install do \|installer\|/,
            `post_install do |installer|\n${GRPC_POST_INSTALL_FIX}`
          );
        } else {
          // No existing post_install block — add one at end
          podfile += `\npost_install do |installer|\n${GRPC_POST_INSTALL_FIX}\nend\n`;
        }
      }

      fs.writeFileSync(podfilePath, podfile, 'utf8');
      return config;
    },
  ]);
}

module.exports = withModularHeaders;
