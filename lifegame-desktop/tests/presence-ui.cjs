"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "artifacts/presence",
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
    await page.selectOption("#size", "40,28");
    await page.click("#load");
    check(
      await page.locator("#emphasis").isChecked(),
      "organism emphasis is enabled by default",
    );
    const before = await page.evaluate(() => __LIFE_TEST__.fingerprint());
    await page.uncheck("#emphasis");
    await page.waitForTimeout(150);
    await page
      .locator("#board")
      .screenshot({ path: path.join(out, "far-off.png") });
    const off = await page.evaluate(() =>
      document.getElementById("board").toDataURL(),
    );
    await page.check("#emphasis");
    await page.waitForTimeout(150);
    await page
      .locator("#board")
      .screenshot({ path: path.join(out, "far-on.png") });
    check(
      off !==
        (await page.evaluate(() =>
          document.getElementById("board").toDataURL(),
        )),
      "overview emphasis changes pixels without changing terrain materials",
    );
    check(
      await page.evaluate(
        () =>
          __LIFE_TEST__.snapshot().render.drawn ===
          __LIFE_TEST__.snapshot().world.organisms.length,
      ),
      "overview retains every real organism position",
    );
    // Explicit artwork fixture, not a natural evolution or survival claim.
    await page.evaluate(() => {
      const t = __LIFE_TEST__,
        w = t.prepare({
          seed: "presence-review",
          width: 40,
          height: 28,
          initial: 80,
          mapId: "river",
        });
      const main = w.organisms
        .filter((o) => o.slot === "main")
        .sort((a, b) => Math.abs(a.cell - 580) - Math.abs(b.cell - 580));
      for (const o of main.slice(0, 6)) {
        o.phase = 3;
        o.age = 50;
        o.birthLife = 240;
      }
      const a = main[0];
      a.infection = EcoState.infection(w, "leafparasite", a.id);
      a.infection.q = EcoState.hyper(w, a.infection.id);
      w.stats = EcoEngine.summarize(w);
      t.select(a.cell);
      t.refresh();
    });
    await page.click("#detail-view");
    await page.waitForTimeout(150);
    const fixture = await page.evaluate(() => __LIFE_TEST__.fingerprint());
    await page.uncheck("#emphasis");
    await page.waitForTimeout(150);
    await page
      .locator("#board")
      .screenshot({ path: path.join(out, "near-off.png") });
    await page.check("#emphasis");
    await page.waitForTimeout(150);
    await page
      .locator("#board")
      .screenshot({ path: path.join(out, "near-on.png") });
    check(
      await page.evaluate(() => EcoArt.outlineMetrics.builds > 0),
      "close view uses cached alpha-shaped outlines for organisms",
    );
    const cache = await page.evaluate(() => {
      const t = __LIFE_TEST__;
      t.draw();
      const builds = EcoArt.outlineMetrics.builds,
        hits = EcoArt.outlineMetrics.hits;
      t.draw();
      t.draw();
      return {
        builds,
        after: EcoArt.outlineMetrics.builds,
        reused: EcoArt.outlineMetrics.hits > hits,
      };
    });
    check(
      cache.builds === cache.after && cache.reused,
      "repeated draws reuse the silhouette cache",
    );
    check(
      (await page.evaluate(() => __LIFE_TEST__.fingerprint())) === fixture,
      "outline, emphasis and camera never alter biological state",
    );
    check(
      await page.evaluate(
        () =>
          __LIFE_TEST__.snapshot().render.infectedHosts > 0 &&
          __LIFE_TEST__.snapshot().render.highParasites > 0,
      ),
      "host P and Q remain visible with emphasis",
    );
    const idle = await page.evaluate(() => {
      const t = __LIFE_TEST__;
      t.stop();
      t.drawIfChanged();
      const n = t.snapshot().render.frames;
      for (let i = 0; i < 200; i++) t.drawIfChanged();
      return t.snapshot().render.frames - n;
    });
    check(
      idle === 0,
      "emphasis preserves zero additional redraws for 200 idle updates",
    );
    await page.setViewportSize({ width: 640, height: 1000 });
    await page.waitForTimeout(150);
    check(
      await page.locator("#emphasis").isVisible(),
      "emphasis control remains reachable on narrow screens",
    );
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "narrow viewport does not overflow",
    );
    await page.evaluate(() => __LIFE_TEST__.openGuide("parasite"));
    check(
      (await page.textContent("#guide-content")).includes(
        "繰り返し接触による分散",
      ),
      "in-game explanation connects contact dispersal to real conditions",
    );
    await page.evaluate(() => __LIFE_TEST__.showSheet("system"));
    check(
      (await page.textContent("#guide-content")).includes("通常生活と生存競争"),
      "in-game system sheet explains ordinary survival and competition",
    );
    check(errors.length === 0, "no browser exceptions");
    await fs.writeFile(
      path.join(out, "report.json"),
      JSON.stringify(
        {
          ok: true,
          checks,
          cache,
          idle,
          errors,
          fixture: "explicit phase III and host P/Q artwork fixture",
          initialFingerprint: before,
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ ok: true, checks, cache, idle }, null, 2));
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
