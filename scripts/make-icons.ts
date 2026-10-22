/**
 * Renders the PWA icons (public/icons/*.png) from one HTML/SVG design, using an installed
 * Chrome or Edge via playwright-core (no browser download). Run: npx tsx scripts/make-icons.ts
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const OUT = resolve(import.meta.dirname, '../public/icons');

/** Black square, white "M". `pad` shrinks the mark into the maskable safe zone. */
function iconHtml(size: number, pad: number): string {
  const font = Math.round((size - pad * 2) * 0.62);
  return `<!doctype html><html><body style="margin:0">
    <div style="width:${size}px;height:${size}px;background:#000;display:flex;align-items:center;justify-content:center;
      font:800 ${font}px/1 'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#fff;letter-spacing:-0.04em">M</div>
  </body></html>`;
}

const ICONS = [
  { name: 'icon-192.png', size: 192, pad: 0 },
  { name: 'icon-512.png', size: 512, pad: 0 },
  { name: 'maskable-512.png', size: 512, pad: 80 },
  { name: 'apple-touch-icon.png', size: 180, pad: 0 },
];

async function launch() {
  for (const channel of ['msedge', 'chrome'] as const) {
    try {
      return await chromium.launch({ channel });
    } catch {
      /* try the next one */
    }
  }
  throw new Error('Needs Microsoft Edge or Google Chrome installed.');
}

const browser = await launch();
mkdirSync(OUT, { recursive: true });
for (const icon of ICONS) {
  const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size } });
  await page.setContent(iconHtml(icon.size, icon.pad));
  await page.screenshot({ path: resolve(OUT, icon.name), omitBackground: false });
  await page.close();
  console.log(`wrote public/icons/${icon.name}`);
}
await browser.close();
