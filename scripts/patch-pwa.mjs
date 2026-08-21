import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Copy icon to dist root so it's served at /apple-touch-icon.png
copyFileSync(
  resolve(root, 'assets', 'icon.png'),
  resolve(root, 'dist', 'apple-touch-icon.png'),
);

// Inject apple-touch-icon + manifest tags into dist/index.html
const htmlPath = resolve(root, 'dist', 'index.html');
let html = readFileSync(htmlPath, 'utf8');

const inject = [
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="קרוב" />',
].join('\n');

if (!html.includes('apple-touch-icon')) {
  html = html.replace('</head>', `${inject}\n</head>`);
  writeFileSync(htmlPath, html, 'utf8');
  console.log('✓ PWA tags injected into dist/index.html');
} else {
  console.log('✓ apple-touch-icon already present, skipping');
}
