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

  # CocoaPods/Xcodeproj sometimes stores a multi-value build setting like
  # OTHER_CFLAGS as a native Ruby Array instead of a pre-joined String,
  # depending on the pod graph and Xcodeproj gem version. This has been
  # observed to differ between a local machine and the EAS Build servers
  # for the exact same target. Blindly string-interpolating an Array calls
  # Ruby's Array#to_s (== #inspect), producing literal bracket/quote/comma
  # text like '["-Da", "-Db"]' that Xcode then tries to use as a single
  # broken path -> "no such file or directory: '[ ... ]'". Always coerce
  # through this helper before treating a build setting as a plain string.
  def coerce_flags_str(val)
    case val
    when Array then val.join(' ')
    when String then val
    else '$(inherited)'
    end
  end

  # Fix 1: Scan ALL xcconfig files in Pods/ and remove problematic flags.
  # - ALL -fmodule-map-file= flags: Xcode 16.x Clang concatenates multiple flags
  #   on one OTHER_CFLAGS line into a single broken path argument.
  # - -Xcc -enable-bare-slash-regex: removed in Swift 6 (Xcode 16+), causes build error.
  #   Must strip the whole "-Xcc -enable-bare-slash-regex" pair, not just the
  #   trailing text: leaving a dangling argument-less -Xcc behind causes the
  #   Swift driver to swallow the NEXT unrelated flag in the full build command
  #   (e.g. Xcode's own separately-appended -enable-bare-slash-regex default) as
  #   if it were -Xcc's argument, which just reintroduces the same failure.
  # - -Xcc -import-underlying-module (-Xcc): CocoaPods sometimes wraps this
  #   native Swift-frontend flag in a bogus -Xcc pair, turning it into an
  #   (invalid) Clang argument -> "unknown argument: '-import-underlying-module'".
  #   The trailing -Xcc here isn't always at the true end of the resolved
  #   string (config-specific lines like OTHER_SWIFT_FLAGS[config=*Debug*] get
  #   appended after it), so it can't rely on an end-of-string anchor.
  # - Duplicated "-Xcc -Xcc" pairs: happens whenever two xcconfig fragments
  #   that each end/start their own -Xcc get concatenated (e.g. a pod's base
  #   "-import-underlying-module -Xcc" merged with a VFS-overlay fragment
  #   "-Xcc -ivfsoverlay -Xcc <path>"), leaving "-Xcc -Xcc -ivfsoverlay ...".
  #   The first -Xcc then swallows the second literal "-Xcc" as its Clang
  #   argument, so "-ivfsoverlay" is left dangling as an unrecognized
  #   Swift-level argument -> "Driver threw unknown argument: '-ivfsoverlay'".
  #   Collapsing any run of repeated -Xcc tokens down to one fixes this
  #   regardless of what follows.
  pods_root = installer.sandbox.root.to_s
  Find.find(pods_root) do |path|
    next unless path.end_with?('.xcconfig') && File.file?(path)
    content = File.read(path)
    patched = content
      .gsub(/ -fmodule-map-file=[^[:space:]]+/, '')
      .gsub(/ -Xcc -enable-bare-slash-regex/, '')
      .gsub(/-enable-bare-slash-regex/, '')
      .gsub(/-Xcc -import-underlying-module(?: -Xcc)?/, '-import-underlying-module')
      .gsub(/-Xcc(?: +-Xcc)+/, '-Xcc')
      .gsub(/ -Xcc(?=\\s*$)/, '')
    File.write(path, patched) if patched != content
  end

  # Fix 2: Also patch pbxproj build settings directly (overrides xcconfigs).
  # Some pods set flags inline in the project file, not only in xcconfigs.
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      %w[OTHER_SWIFT_FLAGS OTHER_CFLAGS].each do |key|
        val = config.build_settings[key]
        next unless val.is_a?(String) && val.match?(/(-fmodule-map-file=|-enable-bare-slash-regex|-Xcc -import-underlying-module|-Xcc(?: +-Xcc)+|-Xcc\\s*\\z)/)
        config.build_settings[key] = val
          .gsub(/ -fmodule-map-file=[^[:space:]]+/, '')
          .gsub(/ -Xcc -enable-bare-slash-regex/, '')
          .gsub(/-enable-bare-slash-regex/, '')
          .gsub(/-Xcc -import-underlying-module(?: -Xcc)?/, '-import-underlying-module')
          .gsub(/-Xcc(?: +-Xcc)+/, '-Xcc')
          .gsub(/ -Xcc\\z/, '')
      end
    end
  end

  # Fix 3: Xcode 26 fails to auto-translate a static-library pod's
  # MODULEMAP_FILE setting into an actual "-fmodule-map-file=" Clang argument,
  # so any Swift pod using -import-underlying-module (CocoaPods' standard way
  # of exposing a Swift pod to Objective-C) fails with
  # "underlying Objective-C module 'X' not found". Add the flag explicitly
  # wherever a MODULEMAP_FILE is set and its file actually exists on disk.
  # Collect every such modulemap path along the way: Fix 4 below needs the
  # same list applied to the main app target too.
  all_modulemaps = []
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      modulemap = config.build_settings['MODULEMAP_FILE']
      next unless modulemap.is_a?(String) && !modulemap.empty?
      abs_modulemap = File.expand_path(modulemap, installer.sandbox.root.to_s)
      next unless File.exist?(abs_modulemap)
      all_modulemaps << abs_modulemap

      # Quote the path: Target Support Files paths contain spaces, and an
      # unquoted -fmodule-map-file= gets split into multiple broken tokens.
      swift_flag = "-Xcc -fmodule-map-file=\\"#{abs_modulemap}\\""
      current_swift = coerce_flags_str(config.build_settings['OTHER_SWIFT_FLAGS'])
      unless current_swift.include?(abs_modulemap)
        config.build_settings['OTHER_SWIFT_FLAGS'] = "#{current_swift} #{swift_flag}"
      end

      cflag = "-fmodule-map-file=\\"#{abs_modulemap}\\""
      current_cflags = coerce_flags_str(config.build_settings['OTHER_CFLAGS'])
      unless current_cflags.include?(cflag)
        config.build_settings['OTHER_CFLAGS'] = "#{current_cflags} #{cflag}"
      end
    end
  end
  installer.pods_project.save

  # Fix 4: The same MODULEMAP_FILE auto-translation gap also breaks the MAIN
  # APP target (a separate Xcodeproj from Pods.xcodeproj) whenever app code
  # directly imports one of these "-import-underlying-module" pods (e.g.
  # \`import Expo\` in AppDelegate.swift) -> "cannot load underlying module
  # for 'Expo'". Apply the same explicit flags there too.
  all_modulemaps.uniq!
  installer.aggregate_targets.each do |aggregate_target|
    user_project = aggregate_target.user_project
    user_project.native_targets.each do |native_target|
      native_target.build_configurations.each do |config|
        all_modulemaps.each do |abs_modulemap|
          swift_flag = "-Xcc -fmodule-map-file=\\"#{abs_modulemap}\\""
          current_swift = coerce_flags_str(config.build_settings['OTHER_SWIFT_FLAGS'])
          unless current_swift.include?(abs_modulemap)
            config.build_settings['OTHER_SWIFT_FLAGS'] = "#{current_swift} #{swift_flag}"
          end
        end
      end
    end
    user_project.save
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

      // Insert at END of the post_install block's body (before ITS closing 'end'),
      // matched non-greedily so we don't overshoot to the outer target block's 'end'.
      if (!podfile.includes('Scan ALL xcconfig files in Pods/ and remove problematic flags')) {
        if (podfile.includes('post_install do |installer|')) {
          podfile = podfile.replace(
            /(post_install do \|installer\|[\s\S]*?\n)(\s*)end\b/,
            (_match, block, indent) => `${block}${GRPC_POST_INSTALL_FIX}\n${indent}end`
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
