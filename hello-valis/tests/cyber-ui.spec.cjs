const assert = require('node:assert/strict');
const { readFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { chromium } = require('playwright');

const html = readFileSync(join(__dirname, '../src/Index.html'), 'utf8');
const artifacts = join(__dirname, '../operations/logs/cyber-ui');

async function withPage(options, check) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',
  });
  try {
    const page = await browser.newPage(options);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(html, { waitUntil: 'load' });
    await check(page);
    assert.deepEqual(errors, [], 'Page JavaScript must not fail');
  } finally { await browser.close(); }
}

test('desktop greeting, magenta theme, animation, pause and resume', async () => {
  await withPage({ viewport: { width: 1440, height: 1000 } }, async page => {
    assert.equal((await page.locator('h1').innerText()).replace(/\s+/g, ' ').trim(), 'Hello, VALIS');
    assert.equal(await page.locator('.neon').evaluate(el => getComputedStyle(el).color), 'rgb(255, 71, 200)');
    const animationTime = () => page.locator('.grid').evaluate(el => el.getAnimations()[0].currentTime);
    const start = await animationTime();
    await page.waitForTimeout(150);
    assert.ok(await animationTime() > start, 'Grid animation must advance');
    const button = page.locator('#motion-toggle');
    assert.equal(await button.getAttribute('aria-label'), 'アニメーションを停止');
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    await page.waitForTimeout(60);
    const stopped = await animationTime();
    await page.waitForTimeout(150);
    assert.equal(await animationTime(), stopped, 'Paused animation must stay still');
    await page.getByRole('button', { name: 'アニメーションを再開' }).click();
    await page.waitForTimeout(150);
    assert.ok(await animationTime() > stopped, 'Animation must resume');
    mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: join(artifacts, 'desktop.png'), fullPage: true });
  });
});

test('mobile layout has no horizontal overflow and keeps controls visible', async () => {
  await withPage({ viewport: { width: 390, height: 844 } }, async page => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    for (const locator of [page.locator('h1'), page.getByRole('button')]) {
      const box = await locator.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844);
    }
    mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: join(artifacts, 'mobile.png'), fullPage: true });
  });
});

test('reduced-motion preference disables animations, including after preference changes', async () => {
  await withPage({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } }, async page => {
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    assert.equal(await page.getByRole('button').isDisabled(), true);
    assert.equal(await page.getByRole('button').getAttribute('aria-pressed'), 'true');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => !document.getElementById('motion-toggle').disabled);
    assert.ok(await page.evaluate(() => document.getAnimations().length) > 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.getElementById('motion-toggle').disabled);
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
  });
});
