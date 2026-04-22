const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Removes Agora screen-sharing components from the Android manifest.
 * These are injected by the Agora SDK AAR but are not needed since
 * this app does not use screen sharing — and they trigger the
 * FOREGROUND_SERVICE_MEDIA_PROJECTION permission which Google Play rejects.
 */
module.exports = function removeAgoraScreenShare(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return mod;

    const AGORA_SERVICE = 'io.agora.rtc2.extensions.MediaProjectionMgr$LocalScreenSharingService';
    const AGORA_ACTIVITY = 'io.agora.rtc2.extensions.MediaProjectionMgr$LocalScreenCaptureAssistantActivity';
    const MEDIA_PROJECTION_PERMISSION = 'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION';

    // Remove Agora screen-sharing service
    if (app.service) {
      app.service = app.service.filter(
        (s) => s.$?.['android:name'] !== AGORA_SERVICE
      );
    }

    // Remove Agora screen-sharing activity
    if (app.activity) {
      app.activity = app.activity.filter(
        (a) => a.$?.['android:name'] !== AGORA_ACTIVITY
      );
    }

    // Remove the permission declaration itself
    if (manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'].filter(
        (p) => p.$?.['android:name'] !== MEDIA_PROJECTION_PERMISSION
      );
    }

    return mod;
  });
};
