const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds `use_modular_headers!` to the Podfile.
 * Required for Firebase Swift pods (FirebaseAuth, FirebaseCoreInternal, FirebaseFirestore)
 * which depend on pods that don't define modules (GoogleUtilities, RecaptchaInterop, etc.).
 * Less invasive than `use_frameworks! :linkage => :static`.
 */
function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes('use_modular_headers!')) {
        return config;
      }

      // Insert use_modular_headers! after the platform line
      podfile = podfile.replace(
        /(platform :ios[^\n]*\n)/,
        `$1\nuse_modular_headers!\n`
      );

      fs.writeFileSync(podfilePath, podfile, 'utf8');
      return config;
    },
  ]);
}

module.exports = withModularHeaders;
