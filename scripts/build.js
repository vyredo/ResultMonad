#!/usr/bin/env node

const { build } = require('esbuild');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');

// Clean dist directory
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true });
}
fs.mkdirSync(distPath);

// Shared build options
const baseOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  target: 'es2020',
  external: Object.keys(pkg.dependencies || {}),
};

// Build ESM
console.log('Building ESM...');
build({
  ...baseOptions,
  format: 'esm',
  outfile: 'dist/index.esm.js',
  minify: true,
}).catch(() => process.exit(1));

// Build CJS
console.log('Building CJS...');
build({
  ...baseOptions,
  format: 'cjs',
  outfile: 'dist/index.js',
  minify: true,
}).catch(() => process.exit(1));

// Build unminified versions for debugging
console.log('Building unminified versions...');
build({
  ...baseOptions,
  format: 'esm',
  outfile: 'dist/index.esm.dev.js',
  minify: false,
}).catch(() => process.exit(1));

build({
  ...baseOptions,
  format: 'cjs',
  outfile: 'dist/index.dev.js',
  minify: false,
}).catch(() => process.exit(1));

// Generate TypeScript declarations
console.log('Generating TypeScript declarations...');
try {
  execSync('tsc --emitDeclarationOnly --declaration --declarationMap', {
    stdio: 'inherit',
  });
} catch (error) {
  console.error('Failed to generate TypeScript declarations');
  process.exit(1);
}

// Report bundle sizes
console.log('\nBundle sizes:');
const files = ['dist/index.esm.js', 'dist/index.js'];
files.forEach((file) => {
  const stats = fs.statSync(file);
  const size = (stats.size / 1024).toFixed(2);
  console.log(`${file}: ${size} KB`);
});

console.log('\n✅ Build completed successfully!');