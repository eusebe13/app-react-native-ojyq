/**
 * Patches @expo/image-utils to use node_modules/.cache instead of .expo/web for cache.
 * Fixes EACCES: permission denied, mkdir '.expo/web' on EAS Build servers.
 */
const fs = require('fs');
const path = require('path');

const TARGET = "node_modules/.cache/expo-image-utils";
const cacheFile = path.join(__dirname, '..', 'node_modules', '@expo', 'image-utils', 'build', 'Cache.js');

if (!fs.existsSync(cacheFile)) {
  console.log('patch-image-utils: Cache.js not found, skipping.');
  process.exit(0);
}

let content = fs.readFileSync(cacheFile, 'utf8');

if (content.includes(TARGET)) {
  console.log('patch-image-utils: already patched, skipping.');
  process.exit(0);
}

// Replace any variant of the CACHE_LOCATION line
content = content.replace(
  /const CACHE_LOCATION = [^;]+;/,
  `const CACHE_LOCATION = '${TARGET}';`
);

fs.writeFileSync(cacheFile, content, 'utf8');
console.log('patch-image-utils: patched Cache.js to use', TARGET);
