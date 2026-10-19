"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "artifacts/staged-observation",
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
    page.on("dialog",d=>d.accept());
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'fast-ui40',width:40,height:28,initial:80,lineages:'few'});document.getElementById('focus-view').click();});
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.blockEnd===500),'new observation uses 500-turn blocks');
    const initial=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
    await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().pending?.phase===1);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().compute.initialized&&__LIFE_TEST__.snapshot().compute.ready),'actual local Worker prepares the future');
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn===0&&__LIFE_TEST__.records().length===0),'prepared future is absent from committed counters and archive');
    const cacheBeforeWheel=await page.evaluate(()=>__LIFE_TEST__.snapshot().compute.metadata.cache.key);
    const wheelStart=performance.now();
    await page.dispatchEvent('#board','wheel',{deltaY:-50,clientX:700,clientY:500});
    const held=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);
    check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().holds.length&&__LIFE_TEST__.snapshot().running),'wheel preserves running playback');
    check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===initial,'partial preview never leaks when operating the map');
    await page.waitForTimeout(650);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().running),'map interaction never inserts a quiet-period pause');
    await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=1,{},{timeout:15000});
    check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().holds.length),'observation resumes after the quiet period');
    check(performance.now()-wheelStart<5000,'map operation reuses prepared work without repeating startup');
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().compute.metadata.cache.key)===cacheBeforeWheel,'map operation retains the same prepared geometry');
    // Keep a pointer held longer than the resume delay.
    const box=await page.locator('#board').boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+15,box.y+box.height/2+8);
    const dragging=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);await page.waitForTimeout(1300);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn)>dragging,'ecology continues while the pointer is held');
    await page.mouse.up();await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,dragging);
    // Observe a complete steady playback span, excluding preparation and interaction.
    const start=await page.evaluate(()=>({t:performance.now(),turn:__LIFE_TEST__.snapshot().world.turn}));
    await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>=t+5,start.turn,{timeout:20000});
    const span=await page.evaluate(()=>performance.now())-start.t;
    check(span>=3900&&span<20000,'five committed turns preserve the reference cadence without skipping (may start between commits)');
    await page.evaluate(()=>{const a=__LIFE_TEST__.snapshot().world.organisms.find(o=>o.slot==='main');__LIFE_TEST__.select(a.cell,a.id);});
    await page.click('#detail-hold');const detailTurn=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);
    await page.waitForTimeout(1400);
    check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().running&&__LIFE_TEST__.snapshot().world.turn)===detailTurn,'detail remains paused until explicitly released');
    await page.click('#open-guide');await page.click('#close-guide');
    check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().running),'closing one reader does not release another reader');
    await page.click('#detail-hold');await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,detailTurn);
    await page.click('#open-guide');const guideTurn=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);
    await page.waitForTimeout(1200);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().running&&__LIFE_TEST__.snapshot().world.turn)>guideTurn,'guide reading keeps observation running');
    await page.click('#close-guide');await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,guideTurn);
    await page.click('#open-results');const resultTurn=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);
    await page.waitForTimeout(1200);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn)>resultTurn,'archive reading keeps observation running');
    await page.click('#close-results');await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,resultTurn);
    await page.click('#change-world');
    check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().running),'editing initial conditions holds the current world');
    await page.click('#cancel-settings');await page.click('#start');await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,resultTurn);
    // Manual pause overrides any pending automatic resume.
    await page.dispatchEvent('#board','wheel',{deltaY:30,clientX:700,clientY:500});await page.click('#start');
    const manual=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);
    await page.waitForTimeout(2200);
    check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().running&&__LIFE_TEST__.snapshot().world.turn)===manual,'manual stop prevents automatic restart');
    await page.click('#start');await page.waitForFunction(()=>!!__LIFE_TEST__.snapshot().pending);
    await page.click('#restart-world');
    if(await page.locator('#world-confirm').evaluate(e=>e.open))await page.locator('#world-confirm button[value="proceed"]').click();
    await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn===0);await page.waitForTimeout(1500);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn===0&&!__LIFE_TEST__.snapshot().pending&&!__LIFE_TEST__.snapshot().running),'reset rejects all outstanding Worker results');
    await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=2);
    await page.evaluate(()=>__LIFE_TEST__.stop());
    const snapshot=await page.evaluate(()=>__LIFE_TEST__.snapshot()),fp=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
    check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();let w=EcoEngine.create(s.world.config);for(let i=0;i<s.world.turn;i++)w=EcoEngine.step(w);return EcoEngine.fingerprint(w)===__LIFE_TEST__.fingerprint();}),'Worker playback equals an independent atomic recomputation');
    await page.evaluate(()=>{document.getElementById('fit').click();scrollTo(0,0);});
    await page.screenshot({path:path.join(out,'overview.jpg'),type:'jpeg',quality:92});
    await page.click('#detail-view');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'detail.jpg'),type:'jpeg',quality:92});
    await page.click('#finish-run');await page.waitForFunction(()=>document.querySelector('#finish-run').textContent==='図鑑に保存済み');check(await page.evaluate(()=>__LIFE_TEST__.records().length===1),'only final committed result is saved');
    await page.click('#open-results');await page.locator('[data-replay]').click();await page.click('#start');
    await page.waitForFunction(()=>__LIFE_TEST__.snapshot().ended,{},{timeout:20000});
    check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fp,'recorded initial conditions replay to the exact final result');
    check(await page.evaluate(()=>__LIFE_TEST__.records().length===1),'replay creates no new record');
    await page.setViewportSize({width:390,height:844});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'new pause controls fit narrow screens');
    check(errors.length===0,'no browser errors: '+errors.join(';'));check(external.length===0,'all Worker and image requests stay local');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,app:require('../package.json').version,checks,errors,external,browser:browser.version(),cadenceMs:1000,fiveTurnMs:span,preparationMs:snapshot.compute.preparationMs},null,2));
    console.log(JSON.stringify({ok:true,checks:checks.length,fiveTurnMs:span,preparationMs:snapshot.compute.preparationMs}));
  } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
