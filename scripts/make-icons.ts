/// <reference lib="dom" />
/**
 * Renders every icon (favicon + PWA icons in public/) from scripts/assets/logo.png, and the
 * splash wordmark (public/brand/mess-happens.webp) from scripts/assets/wordmark.png, using an
 * installed Chrome or Edge via playwright-core (no browser download).
 * Run after replacing the logo: npx tsx scripts/make-icons.ts
 *
 * The logo's white mark is located automatically, centred, and scaled to `fill` of the icon
 * on a black square — so the source image can have any size or margins.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE = resolve(import.meta.dirname, 'assets/logo.png');

const ICONS = [
  // Tiny sizes: let the mark fill more of the square so it stays legible in a browser tab.
  { file: 'public/favicon-16.png', size: 16, fill: 0.94 },
  { file: 'public/favicon-32.png', size: 32, fill: 0.92 },
  { file: 'public/favicon-48.png', size: 48, fill: 0.9 },
  { file: 'public/icons/icon-192.png', size: 192, fill: 0.8 },
  { file: 'public/icons/icon-512.png', size: 512, fill: 0.8 },
  // Android crops maskable icons to a circle: keep the mark inside the central safe zone.
  { file: 'public/icons/maskable-512.png', size: 512, fill: 0.6 },
  { file: 'public/icons/apple-touch-icon.png', size: 180, fill: 0.78 },
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

const dataUrl = `data:image/png;base64,${readFileSync(SOURCE).toString('base64')}`;
const browser = await launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');

const rendered = await page.evaluate(
  async ({ dataUrl, icons }) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();

    // Bounding box of the light (logo) pixels.
    const probe = document.createElement('canvas');
    probe.width = img.width;
    probe.height = img.height;
    const pctx = probe.getContext('2d')!;
    pctx.drawImage(img, 0, 0);
    const { data } = pctx.getImageData(0, 0, img.width, img.height);
    let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4;
        if (data[i]! + data[i + 1]! + data[i + 2]! > 384) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    return icons.map(({ size, fill }) => {
      const out = document.createElement('canvas');
      out.width = out.height = size;
      const ctx = out.getContext('2d')!;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const scale = (size * fill) / Math.max(w, h);
      ctx.drawImage(img, minX, minY, w, h, (size - w * scale) / 2, (size - h * scale) / 2, w * scale, h * scale);
      return out.toDataURL('image/png');
    });
  },
  { dataUrl, icons: ICONS.map(({ size, fill }) => ({ size, fill })) },
);
// Splash wordmark: trim to the dark ink, keep transparency, 960px wide WebP (≈2× its display size).
const WORDMARK = resolve(import.meta.dirname, 'assets/wordmark.png');
const wordmarkUrl = `data:image/png;base64,${readFileSync(WORDMARK).toString('base64')}`;
const wordmark = await page.evaluate(async (src) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const probe = document.createElement('canvas');
  probe.width = img.width;
  probe.height = img.height;
  const pctx = probe.getContext('2d')!;
  pctx.drawImage(img, 0, 0);
  const { data } = pctx.getImageData(0, 0, img.width, img.height);
  let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (data[i + 3]! > 128 && data[i]! + data[i + 1]! + data[i + 2]! < 384) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const width = 960;
  const height = Math.round((h / w) * width);
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, minX, minY, w, h, 0, 0, width, height);
  return { url: out.toDataURL('image/webp', 0.92), width, height };
}, wordmarkUrl);
// Browser-tab favicon: the mark alone on a transparent background — white for dark tabs,
// black for light tabs. (The source is white-on-black, so brightness becomes the alpha.)
const FAVICON_SIZE = 64;
const renderMarks = (size: number) => page.evaluate(
  async ({ src, size }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const probe = document.createElement('canvas');
    probe.width = img.width;
    probe.height = img.height;
    const pctx = probe.getContext('2d')!;
    pctx.drawImage(img, 0, 0);
    const full = pctx.getImageData(0, 0, img.width, img.height).data;
    let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4;
        if (full[i]! + full[i + 1]! + full[i + 2]! > 384) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const out = document.createElement('canvas');
    out.width = out.height = size;
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    const scale = (size * 0.96) / Math.max(w, h);
    ctx.drawImage(img, minX, minY, w, h, (size - w * scale) / 2, (size - h * scale) / 2, w * scale, h * scale);
    const pixels = ctx.getImageData(0, 0, size, size);
    // (No named inner functions here: tsx's helpers don't exist inside the browser.)
    const urls: string[] = [];
    for (const value of [255, 0]) {
      const copy = new ImageData(new Uint8ClampedArray(pixels.data), size, size);
      for (let i = 0; i < copy.data.length; i += 4) {
        const alpha = Math.max(copy.data[i]!, copy.data[i + 1]!, copy.data[i + 2]!);
        copy.data[i] = copy.data[i + 1] = copy.data[i + 2] = value;
        copy.data[i + 3] = alpha;
      }
      ctx.clearRect(0, 0, size, size);
      ctx.putImageData(copy, 0, 0);
      urls.push(out.toDataURL('image/png'));
    }
    return { white: urls[0]!, black: urls[1]! };
  },
  { src: dataUrl, size },
);
const tabMarks = await renderMarks(FAVICON_SIZE);
// Black hat for the in-app brand (sidebar, sign-in), 2× its display size.
const brandMark = await renderMarks(96);
await browser.close();

// One SVG holds both and picks by the browser's colour scheme.
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FAVICON_SIZE} ${FAVICON_SIZE}">
<style>.dark{display:none}@media (prefers-color-scheme:dark){.light{display:none}.dark{display:inline}}</style>
<image class="light" width="${FAVICON_SIZE}" height="${FAVICON_SIZE}" href="${tabMarks.black}"/>
<image class="dark" width="${FAVICON_SIZE}" height="${FAVICON_SIZE}" href="${tabMarks.white}"/>
</svg>
`;
writeFileSync(resolve(ROOT, 'public/favicon.svg'), faviconSvg);
mkdirSync(resolve(ROOT, 'public/brand'), { recursive: true });
writeFileSync(resolve(ROOT, 'public/brand/hat.png'), Buffer.from(brandMark.black.split(',')[1]!, 'base64'));
console.log('wrote public/brand/hat.png');
console.log('wrote public/favicon.svg (black mark on light tabs, white on dark tabs)');

const wordmarkPath = resolve(ROOT, 'public/brand/mess-happens.webp');
mkdirSync(dirname(wordmarkPath), { recursive: true });
writeFileSync(wordmarkPath, Buffer.from(wordmark.url.split(',')[1]!, 'base64'));
console.log(`wrote public/brand/mess-happens.webp (${wordmark.width}×${wordmark.height})`);

ICONS.forEach((icon, i) => {
  const path = resolve(ROOT, icon.file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(rendered[i]!.split(',')[1]!, 'base64'));
  console.log(`wrote ${icon.file} (${icon.size}px)`);
});
