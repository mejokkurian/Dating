const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add support for .cjs files (required for Firebase v10+)
defaultConfig.resolver.sourceExts.push('cjs');

// Disable unstable package exports to fix Firebase module resolution
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;

