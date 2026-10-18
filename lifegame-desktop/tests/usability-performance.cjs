"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "artifacts/usability-performance",
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
    await page.goto(origin + "/Index.html?smoke=1");
    await page.evaluate(() => EcoArt.ready);
    check(
      await page.locator("#setup-help").isVisible(),
      "initial setup help is visible",
    );
    check(
      await page.locator(".setup-steps").isVisible(),
      "three-step loading instructions are visible",
    );
    await page.selectOption("#size", "40,28");
    await page.selectOption("#map-id", "river");
    await page.click("#load");
    check(
      await page.locator("#change-world").isVisible(),
      "world editor remains reachable in observation mode",
    );
    check(
      await page.evaluate(() => __LIFE_TEST__.snapshot().world.turn === 0),
      "loading does not advance biological time",
    );
    await page.click("#start");
    await page.waitForFunction(() => __LIFE_TEST__.snapshot().world.turn >= 1);
    await page.click("#change-world");
    check(
      await page.locator("#map-id").isVisible(),
      "change-world opens map selection and pauses observation",
    );
    check(
      await page.evaluate(() => !__LIFE_TEST__.snapshot().running && !__LIFE_TEST__.snapshot().pending),
      "return to setup stops playback until explicit observation restart",
    );
    const original = await page.evaluate(() => __LIFE_TEST__.fingerprint());
    await page.waitForTimeout(1250);
    check(await page.evaluate(() => __LIFE_TEST__.fingerprint()) === original,"editing longer than a turn never advances the ecosystem");
    await page.selectOption("#map-id", "lake");
    check(
      (await page.evaluate(() => __LIFE_TEST__.fingerprint())) === original,
      "editing has no biological side effects",
    );
    await page.fill("#initial", "-1");
    await page
      .locator("#setup")
      .evaluate((e) =>
        e.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
      );
    check(
      (await page.evaluate(() => __LIFE_TEST__.fingerprint())) === original,
      "failed reloading preserves previous world",
    );
    await page.fill("#initial", "80");
    check(
      await page.locator("#setup-help").isVisible(),
      "replacement and save guidance remains visible",
    );
    await page.screenshot({
      path: path.join(out, "reload-settings.png"),
      fullPage: true,
    });
    await page.click("#load");
    check(
      await page.evaluate(
        () =>
          __LIFE_TEST__.snapshot().world.config.mapResolved.id === "lake" &&
          __LIFE_TEST__.snapshot().world.turn === 0,
      ),
      "second load switches map and resets time",
    );
    await page.click("#change-world");
    await page.selectOption("#map-id", "woodland");
    await page.click("#load");
    check(
      await page.evaluate(
        () =>
          __LIFE_TEST__.snapshot().world.config.mapResolved.id === "woodland",
      ),
      "third load remains available",
    );
    await page.click("#detail-view");
    await page.waitForTimeout(300);
    const perf = await page.evaluate(() => {
      const t = __LIFE_TEST__;
      t.stop();
      t.drawIfChanged();
      const before = document.getElementById("board").toDataURL(),
        fingerprint = t.fingerprint();
      const frames = t.snapshot().render.frames;
      let at = performance.now();
      for (let i = 0; i < 200; i++) t.drawIfChanged();
      const cachedMs = performance.now() - at;
      const idleFrames = t.snapshot().render.frames - frames;
      at = performance.now();
      for (let i = 0; i < 8; i++) t.draw();
      const forcedMs = (performance.now() - at) / 8;
      return {
        idleFrames,
        cachedCallMs: cachedMs / 200,
        forcedDrawMs: forcedMs,
        pixelsIdentical:
          before === document.getElementById("board").toDataURL(),
        biologyIdentical: fingerprint === t.fingerprint(),
      };
    });
    check(
      perf.idleFrames === 0,
      "200 identical idle frames require zero full redraws",
    );
    check(
      perf.pixelsIdentical && perf.biologyIdentical,
      "optimized and forced rendering are pixel-identical and read-only",
    );
    const count = await page.evaluate(
      () => __LIFE_TEST__.snapshot().render.frames,
    );
    await page.click("#zoom-in");
    await page.waitForTimeout(150);
    check(
      (await page.evaluate(() => __LIFE_TEST__.snapshot().render.frames)) >
        count,
      "zoom invalidates the frame cache",
    );
    await page.screenshot({ path: path.join(out, "near.png"), fullPage: true });
    await page.click("#fit");
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, "far.png"), fullPage: true });
    await page.click("#step");
    check(
      await page.evaluate(() => __LIFE_TEST__.snapshot().world.turn === 1),
      "stepping works after repeated loading",
    );
    await page.evaluate(() => __LIFE_TEST__.openGuide("food"));
    check(
      (await page.textContent("#guide-content")).includes("六つの食性"),
      "food guide explains all six feeding niches",
    );
    await page.click("#close-guide");
    await page.setViewportSize({ width: 640, height: 1000 });
    await page.waitForTimeout(150);
    check(
      await page.locator("#change-world").isVisible(),
      "reload entry remains reachable on a narrow screen",
    );
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "narrow screen has no horizontal overflow",
    );
    check(errors.length === 0, "no browser exceptions");
    await fs.writeFile(
      path.join(out, "report.json"),
      JSON.stringify({ ok: true, checks, perf, errors }, null, 2),
    );
    console.log(JSON.stringify({ ok: true, checks, perf }, null, 2));
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
