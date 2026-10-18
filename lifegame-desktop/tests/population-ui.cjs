"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "artifacts/population-ui",
  );
  await fs.mkdir(out, { recursive: true });
  const server = http.createServer(async (req, res) => {
    try {
      const file = path.resolve(
        "src",
        "." + new URL(req.url, "http://localhost").pathname,
      );
      if (!file.startsWith(path.resolve("src") + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "application/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".png")
              ? "image/png"
              : "text/html",
      );
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    ...(process.platform === "linux"
      ? { executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" }
      : {}),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
      viewport: { width: 1600, height: 1100 },
    }),
    errors = [],
    external = [],
    checks = [];
  const origin = "http://127.0.0.1:" + server.address().port;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("request", (r) => {
    if (!r.url().startsWith(origin)) external.push(r.url());
  });
  function check(value, label) {
    assert(value, label);
    checks.push(label);
  }
  try {
    await page.goto(origin + "/Index.html?smoke=1");
    await page.evaluate(() => EcoArt.ready);
    check(await page.locator('#lineages').isVisible(), 'lineage composition is visible without advanced settings');
    await page.selectOption('#size','40,28');
    await page.selectOption('#map-id','river');
    await page.selectOption('#lineages','few');
    check((await page.locator('#cohort-hint').textContent()).includes('5系統 / 主生物80体'), 'cohort hint explains current allocation');
    await page.click('#load');
    check(await page.locator('#main-count').textContent()==='80','instrument bar matches actual main population');
    check((await page.locator('#main-balance').textContent()).includes('出生 0 / 死亡 0'), 'main birth and death counters start at zero');
    check(await page.locator('#cells-table tr').count()===0,'closed individual list is not built');
    check(await page.locator('#ranking').textContent()==='', 'closed ranking is not built');
    check(await page.locator('#budget-content').textContent()==='', 'closed budget is not built');
    await page.evaluate(() => {
      window.lazyChanges=0;const observer=new MutationObserver(rows=>lazyChanges+=rows.length);
      for(const id of ['cells-table','ranking','budget-content'])observer.observe(document.getElementById(id),{childList:true,subtree:true,characterData:true});
      for(let n=0;n<12;n++)__LIFE_TEST__.step();
    });
    check(await page.evaluate(()=>lazyChanges===0),'closed panels receive no biological-turn DOM writes');
    check((await page.locator('#trend-range').textContent()).startsWith('0–12 T'), 'trend records actual biological time');
    check(await page.evaluate(()=>{
      const w=__LIFE_TEST__.snapshot().world,b=EcoData.main.reduce((n,a)=>n+w.tallies.births[a.id],0),d=EcoData.main.reduce((n,a)=>n+w.tallies.deaths[a.id],0);
      return document.getElementById('main-balance').textContent===`出生 ${b} / 死亡 ${d}（累計）`;
    }),'population balance counts main organisms rather than all prey deaths');
    for (const id of ['individual-list','rank-panel','budget-panel']) await page.locator(`#${id} > summary`).click();
    await page.waitForFunction(()=>document.querySelector('#cells-table tr')&&document.getElementById('budget-content').textContent.length>0);
    check(await page.locator('#ranking .rank').count()===30,'opening ranking shows current thirty lineages');
    check(await page.locator('#cells-table tr').count()===100,'opening list creates current first hundred organisms');
    await page.evaluate(()=>__LIFE_TEST__.step());
    check(await page.evaluate(()=>['individual-list','rank-panel','budget-panel'].every(id=>document.getElementById(id).open)), 'running a turn preserves every expanded panel');
    check(await page.evaluate(()=>document.querySelector('#cells-table tr').dataset.id===__LIFE_TEST__.snapshot().world.organisms[0].id), 'expanded individual list stays current');
    check((await page.locator('#budget-content').textContent()).includes('現存E'),'expanded budget retains finite resource information');
    const before=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
    await page.evaluate(()=>{for(const id of ['individual-list','rank-panel','budget-panel'])document.getElementById(id).open=false;});
    await page.click('#detail-view');await page.check('#simplified');await page.uncheck('#simplified');await page.click('#fit');
    check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===before,'panels and view controls never change biological state');
    await page.waitForTimeout(150);
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({type:'jpeg',quality:92,path:path.join(out,'overview.jpg')});
    await page.click('#detail-view');await page.waitForTimeout(150);
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({type:'jpeg',quality:92,path:path.join(out,'detail.jpg')});
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().assets.loaded),'original painted atlases are loaded');
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.mode==='detail'),'near view keeps detailed rendering');
    await page.evaluate(()=>{for(let n=0;n<125;n++)__LIFE_TEST__.refresh();});
    check(await page.evaluate(()=>document.getElementById('trend-range').textContent.startsWith('0–13 T')),'UI refresh does not fabricate trend samples');
    await page.click('#reset');
    check((await page.locator('#trend-range').textContent()).startsWith('0–0 T'),'new world resets trend history');
    await page.setViewportSize({width:390,height:844});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone width has no horizontal page overflow');
    await page.screenshot({type:'jpeg',quality:92,path:path.join(out,'narrow.jpg'),fullPage:true});
    check(errors.length===0,'no browser errors: '+errors.join(';'));
    check(external.length===0,'no external HTTP requests');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,app:require('../package.json').version,checks,errors,external,browser:browser.version()},null,2));
    console.log(JSON.stringify({ok:true,checks:checks.length}));
  } finally {
    await browser.close();await new Promise(r=>server.close(r));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
