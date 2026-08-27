#!/usr/bin/env node
/**
 * Vendors Leaflet + Leaflet.markercluster into the repo.
 *
 * The map HTML used to <script src> these from unpkg.com. That meant:
 *   • no map at all without a connection, even though every place is bundled;
 *   • third-party JavaScript executing inside a WebView whose originWhitelist
 *     is ['*'], with no subresource integrity;
 *   • a hard dependency on a CDN staying reachable.
 *
 * Output is a generated TypeScript module holding the sources as string
 * literals, which buildLeafletHtml() inlines into a self-contained document.
 * Same bytes on web and native, no asset resolution, no network.
 *
 *   node scripts/vendor-leaflet.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'src/components/map/vendor');

const LEAFLET = '1.9.4';
const CLUSTER = '1.5.3';

const SOURCES = [
  ['leafletCss', `https://unpkg.com/leaflet@${LEAFLET}/dist/leaflet.css`],
  ['leafletJs', `https://unpkg.com/leaflet@${LEAFLET}/dist/leaflet.js`],
  ['clusterCss', `https://unpkg.com/leaflet.markercluster@${CLUSTER}/dist/MarkerCluster.css`],
  ['clusterDefaultCss', `https://unpkg.com/leaflet.markercluster@${CLUSTER}/dist/MarkerCluster.Default.css`],
  ['clusterJs', `https://unpkg.com/leaflet.markercluster@${CLUSTER}/dist/leaflet.markercluster.js`],
];

async function get(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

const parts = {};
let bytes = 0;
for (const [key, url] of SOURCES) {
  const body = await get(url);
  parts[key] = body;
  bytes += body.length;
  console.log(`  ${key.padEnd(18)} ${String(Math.round(body.length / 1024)).padStart(4)} KB  ${url}`);
}

/**
 * Leaflet resolves its marker/layer images relative to the stylesheet URL. With
 * the CSS inlined there is no such URL, and the default icon would 404 — so we
 * strip the image rules; markers are drawn as inline SVG/divIcons anyway.
 */
const stripUrls = (css) => css.replace(/url\((?!data:)[^)]*\)/g, 'none');

mkdirSync(outDir, { recursive: true });

const banner = `/* eslint-disable */
/**
 * GENERATED FILE — do not edit.
 * Produced by scripts/vendor-leaflet.mjs
 *
 *   leaflet                 ${LEAFLET}  (BSD-2-Clause)
 *   leaflet.markercluster   ${CLUSTER}  (MIT)
 *
 * Vendored so the map works offline and no third-party script is fetched into
 * the WebView at runtime. Re-run the script to upgrade.
 */
`;

const body =
  banner +
  Object.entries(parts)
    .map(([key, value]) => {
      const content = key.endsWith('Css') ? stripUrls(value) : value;
      const name = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
      return `export const ${name} = ${JSON.stringify(content)};`;
    })
    .join('\n\n') +
  `\n\nexport const LEAFLET_VERSION = ${JSON.stringify(LEAFLET)};\nexport const CLUSTER_VERSION = ${JSON.stringify(CLUSTER)};\n`;

const outFile = resolve(outDir, 'leaflet-assets.ts');
writeFileSync(outFile, body, 'utf8');

console.log(`\n✓ ${Math.round(bytes / 1024)} KB vendored to src/components/map/vendor/leaflet-assets.ts`);
