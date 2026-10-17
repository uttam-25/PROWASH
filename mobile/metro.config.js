// https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

/**
 * Several React Native packages (react-native-gesture-handler,
 * react-native-screens, react-native-reanimated, react-native-safe-area-context)
 * ship with "react-native": "src/index.ts(x)" in their package.json but
 * do NOT include the TypeScript source files in the npm tarball.
 * Metro resolves "react-native" before "main", so it hits a missing file.
 *
 * This resolver intercepts those modules and redirects to the precompiled
 * commonjs build that is actually present in the package.
 */

// Build a map of module name → absolute path to its compiled entry.
function resolvedMain(packageName, ...relPath) {
  return path.resolve(__dirname, 'node_modules', packageName, ...relPath);
}

const FALLBACK_MAP = {
  'react-native-gesture-handler': resolvedMain(
    'react-native-gesture-handler',
    'lib',
    'commonjs',
    'index.js'
  ),
  'react-native-screens': resolvedMain(
    'react-native-screens',
    'lib',
    'commonjs',
    'index.js'
  ),
  'react-native-safe-area-context': resolvedMain(
    'react-native-safe-area-context',
    'lib',
    'commonjs',
    'index.js'
  ),
  'react-native-reanimated': resolvedMain(
    'react-native-reanimated',
    'lib',
    'module',
    'index.js'
  ),
};

// Verify each path exists at startup; warn if not.
for (const [name, filePath] of Object.entries(FALLBACK_MAP)) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[metro.config] WARNING: fallback path not found for ${name}: ${filePath}`);
    delete FALLBACK_MAP[name];
  }
}

const originalResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (Object.prototype.hasOwnProperty.call(FALLBACK_MAP, moduleName)) {
    return {
      filePath: FALLBACK_MAP[moduleName],
      type: 'sourceFile',
    };
  }
  if (typeof originalResolver === 'function') {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
