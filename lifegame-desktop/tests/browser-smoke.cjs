'use strict';
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const http = require('node:http');
async function main() {
  const out = path.resolve(process.env.LIFEGAME_EVIDENCE || 'artifacts/browser'); await fs.mkdir(out, {recursive: true});
  const server = http.createServer(async (req, res) => {
    try {
      const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve('src', '.' + relative);
      if (!file.startsWith(path.resolve('src') + path.sep)) { res.writeHead(403).end(); return; }
      const type = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
      res.setHeader('Content-Type', type + '; charset=utf-8'); res.end(await fs.readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {}), args: ['--no-sandbox']});
  const page = await browser.newPage({viewport: {width: 1480, height: 1120}}), errors = [], requests = [], checks = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(origin + '/')) requests.push(r.url()); });
  const check = (v, label) => { assert.ok(v, label); checks.push(label); };
  try {
    await page.goto(origin + '/Index.html?smoke=1');
    await page.waitForFunction(() => window.__LIFE_TEST__);
    check(await page.locator('#start').isDisabled(), 'unprepared world cannot start');
    await page.locator('#seed').fill('ecosystem-smoke'); await page.locator('#load').click();
    let s = await page.evaluate(() => __LIFE_TEST__.snapshot());
    check(s.world.turn === 0 && s.world.stats.population === 90 && !s.running, 'load creates exactly 90 organisms without advancing');
    await page.waitForTimeout(250); check(await page.locator('#turn').textContent() === '000', 'loaded world stays still');
    const c = s.world.cells[0], box = await page.locator('#board').boundingBox();
    const geometry = await page.evaluate(() => { const b = document.getElementById('board'), r = b.getBoundingClientRect(), scale = Math.min(r.width / b.width, r.height / b.height); return {scale, left: r.left + (r.width - b.width * scale) / 2, top: r.top + (r.height - b.height * scale) / 2}; });
    await page.mouse.click(geometry.left + (c.x * 28 + 14) * geometry.scale, geometry.top + (c.y * 28 + 14) * geometry.scale);
    check((await page.locator('#individual').textContent()).includes('#' + c.id), 'canvas selects organism and displays traits');
    await page.screenshot({path: path.join(out, 'prepared-desktop.png'), fullPage: true});
    await page.locator('#speed').selectOption('30'); await page.locator('#start').click();
    await page.waitForFunction(() => __LIFE_TEST__.snapshot().world.turn >= 3);
    await page.locator('#start').click(); s = await page.evaluate(() => __LIFE_TEST__.snapshot());
    check(!s.running, 'pause stops scheduling'); const paused = s.world.turn;
    await page.waitForTimeout(180); check((await page.evaluate(() => __LIFE_TEST__.snapshot())).world.turn === paused, 'paused simulation stays at same turn');
    await page.locator('#step').click(); check((await page.evaluate(() => __LIFE_TEST__.snapshot())).world.turn === paused + 1, 'single step advances exactly once');
    await page.locator('#start').click(); await page.waitForFunction(t => __LIFE_TEST__.snapshot().world.turn > t, paused + 1); await page.locator('#start').click();
    checks.push('resume advances again');
    await page.locator('#seed').fill('changed-seed'); check(await page.locator('#start').isDisabled(), 'editing config requires reload');
    await page.locator('#reset').click(); check((await page.locator('#seed').inputValue()) === 'ecosystem-smoke' && (await page.locator('#turn').textContent()) === '000', 'reset restores loaded settings and initial world');
    const first = await page.evaluate(() => __LIFE_TEST__.snapshot().world); await page.locator('#load').click(); check(JSON.stringify(first) === JSON.stringify(await page.evaluate(() => __LIFE_TEST__.snapshot().world)), 'same setup reproduces exact initial state');
    await page.locator('#mode').selectOption('faction'); check(await page.locator('#faction-field').isVisible(), 'faction field appears');
    await page.locator('#load').click(); await page.locator('#step').click(); check((await page.evaluate(() => __LIFE_TEST__.snapshot())).world.config.mode === 'faction', 'faction mode steps');
    await page.locator('#mode').selectOption('brawl'); await page.locator('#load').click(); await page.locator('#step').click(); check((await page.evaluate(() => __LIFE_TEST__.snapshot())).world.config.mode === 'brawl', 'lineage brawl steps');
    await page.locator('#mode').selectOption('species'); await page.locator('#maxTurns').fill('1'); await page.locator('#load').click(); await page.locator('#step').click();
    check(await page.locator('#result').isVisible() && await page.locator('#start').isDisabled(), 'terminal result displays and cannot run further');
    check((await page.evaluate(() => __LIFE_TEST__.snapshot())).world.result.reason === 'coexist', 'turn limit reports coexistence');
    await page.screenshot({path: path.join(out, 'result-desktop.png'), fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'narrow screen has no page overflow');
    await page.screenshot({path: path.join(out, 'narrow.png'), fullPage: true});
    check(errors.length === 0, 'no renderer errors'); check(requests.length === 0, 'no external requests');
    const report = {ok: true, checks, errors, requests, browser: await browser.version()};
    await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
