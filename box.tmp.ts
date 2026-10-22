import { chromium } from 'playwright-core';

const SHOTS = process.argv[2]!;
const BASE = 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'msedge' });
const errors: string[] = [];
try {
  // Splash timing on a fresh load.
  const p0 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const t0 = Date.now();
  await p0.goto(`${BASE}/`, { waitUntil: 'commit' });
  await p0.waitForSelector('#splash img.in');
  const shownAt = Date.now() - t0;
  await p0.waitForSelector('#splash.hide', { timeout: 10000 });
  const hideAt = Date.now() - t0;
  await p0.waitForSelector('#splash', { state: 'detached' });
  console.log(`splash: logo starts at ${shownAt} ms, fade-out starts at ${hideAt} ms, gone at ${Date.now() - t0} ms`);
  await p0.close();

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/signup`);
  await page.locator('#splash').click().catch(() => {});
  console.log(`brand on sign-up: ${await page.getByRole('link', { name: 'Mess Happens' }).count()}`);
  await page.getByLabel('Name').fill('Box Tester');
  await page.getByLabel('Email').fill(`box-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector('#splash', { state: 'detached' });
  await page.getByRole('heading', { name: 'breakfast' }).waitFor();
  console.log(`"Pick one" text on page: ${await page.getByText(/pick one/i).count()}`);
  await page.getByRole('button', { name: 'Add one Banana' }).click().catch(() => {});
  await page.getByRole('button', { name: 'Add one Seasonal Cut Fruits' }).click().catch(() => {});
  await page.getByRole('button', { name: 'Add one Boiled Egg' }).click();
  await page.getByRole('button', { name: 'Add one Poha' }).click();
  await page.waitForTimeout(500);
  const total = page.locator('[aria-label="breakfast total"]');
  console.log(`total box border: ${await total.evaluate((el) => getComputedStyle(el).borderColor)}`);
  await total.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -260));
  await page.screenshot({ path: `${SHOTS}/60-box.png` });

  const desk = await browser.newPage({ viewport: { width: 1280, height: 600 } });
  await desk.goto(`${BASE}/`);
  await desk.waitForSelector('#splash', { state: 'detached', timeout: 10000 });
  console.log(`desktop sidebar brand: ${await desk.locator('aside p').first().innerText()}`);
} catch (err) {
  console.log(`FAILED: ${err instanceof Error ? err.message : err}`);
} finally {
  console.log(`page errors: ${errors.length}`);
  await browser.close();
}
