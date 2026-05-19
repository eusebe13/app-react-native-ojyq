const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES to all pods.
 * Required when using use_frameworks! :linkage => :static with React Native Firebase,
 * which includes Obj-C headers (React-Core) inside Swift framework modules.
 */
function withNonModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        return config;
      }

      const patch = [
        '',
        '  # Fix: non-modular header inside framework module (RNFirebase + use_frameworks! static)',
        '  installer.pods_project.targets.each do |target|',
        '    target.build_configurations.each do |cfg|',
        "      cfg.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'",
        '    end',
        '  end',
      ].join('\n');

      podfile = podfile.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|${patch}`
      );

      fs.writeFileSync(podfilePath, podfile, 'utf8');
      return config;
    },
  ]);
}

module.exports = withNonModularHeaders;
