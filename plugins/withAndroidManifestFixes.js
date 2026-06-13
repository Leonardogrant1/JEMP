const { withAndroidManifest, withAndroidColors, withAndroidStyles } = require('expo/config-plugins');

const DARK_BACKGROUND = '#000000';

/**
 * Fix 1: Manifest merge conflicts
 *   - expo-secure-store vs appsflyer: tools:replace for fullBackupContent and dataExtractionRules
 *   - Remove audio permissions injected by expo-audio
 * Fix 2: Dark window background
 *   - Adds appBackground color and android:windowBackground to AppTheme
 */
const withAndroidManifestFixes = (config) => {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application?.[0];

    if (app) {
      const existing = app.$?.['tools:replace'] ?? '';
      const toAdd = ['android:fullBackupContent', 'android:dataExtractionRules'];
      const current = existing ? existing.split(',').map((s) => s.trim()) : [];
      const merged = [...new Set([...current, ...toAdd])].join(',');
      app.$ = { ...app.$, 'tools:replace': merged };
    }

    const permissions = manifest.manifest['uses-permission'] ?? [];
    const audioPerms = new Set([
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
    ]);
    manifest.manifest['uses-permission'] = permissions.filter(
      (p) => !audioPerms.has(p.$?.['android:name'])
    );

    return config;
  });

  config = withAndroidColors(config, (config) => {
    const colors = config.modResults.resources;
    const existing = colors.color ?? [];
    const already = existing.some((c) => c.$?.name === 'appBackground');
    if (!already) {
      colors.color = [...existing, { $: { name: 'appBackground' }, _: DARK_BACKGROUND }];
    }
    return config;
  });

  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults.resources.style ?? [];
    const appTheme = styles.find((s) => s.$?.name === 'AppTheme');
    if (appTheme) {
      const items = appTheme.item ?? [];
      const already = items.some((i) => i.$?.name === 'android:windowBackground');
      if (!already) {
        appTheme.item = [...items, { $: { name: 'android:windowBackground' }, _: '@color/appBackground' }];
      }
    }
    return config;
  });

  return config;
};

module.exports = withAndroidManifestFixes;
