/**
 * Regenerates public/og-image.png from dist/og-image.svg (catalog counts already injected
 * by the Vite build). Renders with headless Chrome so the project fonts (Plus Jakarta Sans,
 * Inter, JetBrains Mono) load from Google Fonts exactly as on the site.
 *
 * Usage: npm run build && npm run og:render
 * Chrome path: CHROME_PATH env var, or the default macOS/Linux/Windows install locations.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const svgPath = join(root, 'dist', 'og-image.svg');
const outPath = join(root, 'public', 'og-image.png');

if (!existsSync(svgPath)) {
  console.error('dist/og-image.svg not found. Run `npm run build` first.');
  process.exit(1);
}
const svg = readFileSync(svgPath, 'utf8');
if (svg.includes('__CARTOGRAPH_')) {
  console.error('dist/og-image.svg still has unreplaced catalog tokens.');
  process.exit(1);
}

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);
const chrome = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chrome) {
  console.error('Chrome not found. Set CHROME_PATH.');
  process.exit(1);
}

const workDir = mkdtempSync(join(tmpdir(), 'cartograph-og-'));
try {
  const htmlPath = join(workDir, 'render.html');
  writeFileSync(
    htmlPath,
    `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=block" rel="stylesheet">
<style>html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#090D16}</style>
</head><body>${svg}</body></html>`
  );
  const result = spawnSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1200,630',
      '--virtual-time-budget=8000',
      `--user-data-dir=${join(workDir, 'profile')}`,
      `--screenshot=${outPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: 'inherit' }
  );
  process.exitCode = result.status ?? 1;
  if (result.status === 0) console.log(`Wrote ${outPath}`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
