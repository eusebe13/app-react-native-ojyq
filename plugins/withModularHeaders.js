const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds `use_modular_headers!` to the Podfile.
 * Required for Firebase Swift pods (FirebaseAuth, FirebaseCoreInternal, FirebaseFirestore)
 * which depend on pods that don't define modules (GoogleUtilities, RecaptchaInterop, etc.).
 * Less invasive than `use_frameworks! :linkage => :static`.
 *
 * Also injects a post_install fix for the gRPC-Core.modulemap not found error
 * that occurs with gRPC-C++ when use_modular_headers! is enabled globally.
 */

const GRPC_POST_INSTALL_FIX = `
  # Fix: gRPC-Core.modulemap not found in gRPC-C++ target
  # Caused by use_modular_headers! generating module maps that gRPC doesn't expect
  grpc_targets = ['gRPC-Core', 'gRPC-C++', 'gRPC-RxLibrary', 'gRPC', 'gRPCCertificates-Cpp']
  installer.pods_project.targets.each do |target|
    if grpc_targets.include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['SWIFT_INCLUDE_PATHS'] = '$(inherited)'
        config.build_settings['HEADER_SEARCH_PATHS'] = '$(inherited) $(PODS_ROOT)/Headers/Private/grpc $(PODS_ROOT)/Headers/Public/grpc'
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
      if (!podfile.includes('gRPC-Core.modulemap not found')) {
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
