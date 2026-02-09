#!/usr/bin/env node
/**
 * Post-install patches for Next.js and dependencies
 *
 * This script fixes several known issues:
 * 1. Next.js generateBuildId undefined config issue
 * 2. Missing next-response export file
 * 3. @solid-primitives packages malformed exports (required by @novu/react)
 */

const fs = require('fs');
const path = require('path');

console.log('Running post-install patches...');

// =============================================================================
// Patch 1: Fix generateBuildId for undefined config
// =============================================================================
const generateBuildIdPath = path.join(__dirname, '../node_modules/next/dist/build/generate-build-id.js');

if (fs.existsSync(generateBuildIdPath)) {
  let content = fs.readFileSync(generateBuildIdPath, 'utf8');

  const oldCode = 'let buildId = await generate();';
  const newCode = `if (typeof generate !== 'function') {
        generate = () => null;
    }
    let buildId = await generate();`;

  if (content.includes(oldCode) && !content.includes("typeof generate !== 'function'")) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(generateBuildIdPath, content, 'utf8');
    console.log('✓ Patched Next.js generateBuildId function');
  } else if (content.includes("typeof generate !== 'function'")) {
    console.log('✓ Next.js generateBuildId already patched');
  }
} else {
  console.log('⚠ Next.js generate-build-id.js not found (Next.js may not be installed yet)');
}

// =============================================================================
// Patch 2: Create missing next-response export file
// =============================================================================
const exportsDir = path.join(__dirname, '../node_modules/next/dist/server/web/exports');
const nextResponsePath = path.join(exportsDir, 'next-response.js');
const nextResponseDtsPath = path.join(exportsDir, 'next-response.d.ts');

if (fs.existsSync(exportsDir) && !fs.existsSync(nextResponsePath)) {
  fs.writeFileSync(nextResponsePath, `// Workaround for module resolution issue
module.exports = require('./index').NextResponse;
`);
  fs.writeFileSync(nextResponseDtsPath, `export { NextResponse } from './index';
`);
  console.log('✓ Created next-response export workaround');
} else if (fs.existsSync(nextResponsePath)) {
  console.log('✓ next-response export already exists');
} else {
  console.log('⚠ Next.js exports directory not found');
}

// =============================================================================
// Patch 3: Fix @solid-primitives packages exports
// These packages are dependencies of @novu/react -> solid-motionone
// They have malformed exports that don't include the "." entry
// =============================================================================
const solidPackages = ['props', 'refs', 'transition-group'];

for (const pkg of solidPackages) {
  const pkgJsonPath = path.join(__dirname, `../node_modules/@solid-primitives/${pkg}/package.json`);

  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      // Check if exports needs fixing (doesn't have "." with require/import)
      const needsFix = !pkgJson.exports ||
                       !pkgJson.exports['.'] ||
                       typeof pkgJson.exports['.'] !== 'object' ||
                       !pkgJson.exports['.'].require;

      if (needsFix) {
        pkgJson.exports = {
          '.': {
            require: './dist/index.js',
            import: './dist/index.js',
            default: './dist/index.js'
          }
        };
        pkgJson.main = './dist/index.js';
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
        console.log(`✓ Fixed @solid-primitives/${pkg} exports`);
      } else {
        console.log(`✓ @solid-primitives/${pkg} exports already correct`);
      }
    } catch (err) {
      console.error(`⚠ Failed to patch @solid-primitives/${pkg}:`, err.message);
    }
  }
}

console.log('Post-install patches complete!');
