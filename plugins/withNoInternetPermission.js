const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Removes the android.permission.INTERNET permission from the Android
 * manifest. This app is 100% offline; granting no network permission is a
 * hard guarantee that no data can be transmitted and simplifies the Google
 * Play "Data safety" declaration.
 */
module.exports = function withNoInternetPermission(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const usesPermissions = manifest.manifest['uses-permission'];

    if (Array.isArray(usesPermissions)) {
      manifest.manifest['uses-permission'] = usesPermissions.filter(
        (permission) => permission.$['android:name'] !== 'android.permission.INTERNET',
      );
    }

    return config;
  });
};
