"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs/promises");
const http = require("node:http");
async function main() {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "artifacts/browser",
  );
  await fs.mkdir(out, { recursive: true });
  const localChrome =
    process.env.CHROMIUM_PATH ||
    (process.platform === "linux" ? "/usr/bin/chromium" : null);
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
        (file.endsWith(".js")
          ? "application/javascript"
          : file.endsWith(".png")
            ? "image/png"
            : file.endsWith(".css")
              ? "text/css"
              : "text/html") + "; charset=utf-8",
      );
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
    headless: true,
    ...(localChrome ? { executablePath: localChrome } : {}),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
      viewport: { width: 1520, height: 1200 },
    }),
    errors = [],
    network = [],
    checks = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url()) && !r.url().startsWith(origin + "/"))
      network.push(r.url());
  });
  const check = (value, label) => {
    assert.ok(value, label);
    checks.push(label);
  };
  async function loadWorld(){
    await page.locator("#load").click();
    if(await page.locator('#world-confirm').evaluate(e=>e.open))
      await page.locator('#world-confirm button[value="proceed"]').click();
    await page.waitForFunction(()=>!document.querySelector('#load').disabled);
  }
  try {
    page.on("dialog", d=>d.accept());
    await page.goto(origin + "/Index.html?smoke=1");
    await page.waitForFunction(() => window.__LIFE_TEST__);
    await page.waitForFunction(() => __LIFE_TEST__.snapshot().assets.loaded);
    check(
      (await page.evaluate(
        () => __LIFE_TEST__.snapshot().assets.errors.length,
      )) === 0,
      "all local creature, food and terrain atlases decode",
    );
    check(
      await page.evaluate(
        () =>
          Object.keys(EcoArt.manifest.creatures.regions).filter(
            (id) => EcoState.D.byId[id].group === "main",
          ).length === 21 &&
          Object.values(EcoArt.manifest.creatures.regions).every(
            (a) => a.length === 4 || a.length === 3,
          ),
      ),
      "production artwork covers 21 main families, four phases and three-phase precocial",
    );
    check(
      await page.locator("#start").isDisabled(),
      "unprepared world cannot advance",
    );
    await page.locator("#size").selectOption("40,28");
    check(await page.locator("#seed").isHidden(), "internal seed is not a normal user setting");
    await loadWorld();
    await page.waitForFunction(() => __LIFE_TEST__.snapshot().world);
    let s = await page.evaluate(() => __LIFE_TEST__.snapshot());
    check(
      (await page.locator("#focus-view").getAttribute("aria-pressed")) ===
        "true",
      "loading through the form opens the observation stage",
    );
    check(
      s.world.turn === 0 && s.world.stats.main === 80,
      "load creates phase-I world without advancing",
    );
    check(
      typeof s.world.config.seed === "string" && s.world.config.seed.length > 0,
      "creation generates an internal reproducible seed",
    );
    check(
      s.world.stats.counts && Object.keys(s.world.stats.counts).length === 31,
      "all thirty-one species including phytoplankton are present in observation catalogue",
    );
    const initial = await page.evaluate(() => __LIFE_TEST__.fingerprint());
    // Current observation starts with graphs; portraits appear after selection.
    check(await page.locator("#graphs-panel").isVisible(), "observation initially shows all-period graphs");
    await page.evaluate(() => {
      const o=__LIFE_TEST__.snapshot().world.organisms.find(o=>o.slot==="main");
      __LIFE_TEST__.select(o.cell,o.id);
    });
    check(
      await page.evaluate(
        () =>
          new Set(
            [...document.querySelectorAll(".phase-strip canvas")].map((c) =>
              c.toDataURL(),
            ),
          ).size === 4,
      ),
      "four phase previews display different artwork for the selected lineage",
    );
    check(
      (await page.locator(".specimen-hero .portrait").boundingBox()).width >
        250,
      "selected individual has a large portrait rather than a small icon",
    );
    check(
      await page.evaluate(() => {
        const b = document.querySelector("#board").getBoundingClientRect(),
          i = document.querySelector(".inspector").getBoundingClientRect();
        return b.width > innerWidth * 0.6 && i.x > b.x + b.width;
      }),
      "wide screen prioritizes map with inspector on the right",
    );
    check(
      await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const g = c.getContext("2d"),
          o = __LIFE_TEST__
            .snapshot()
            .world.organisms.find((o) => o.slot === "main"),
          images = [];
        for (const species of Object.keys(
          EcoArt.manifest.creatures.regions,
        ).filter((id) => EcoState.D.byId[id].group === "main")) {
          g.clearRect(0, 0, 128, 128);
          EcoRenderer.creature(
            g,
            { ...o, species, phase: EcoState.D.byId[species].phases.length },
            64,
            64,
            40,
            true,
          );
          images.push(c.toDataURL());
        }
        return new Set(images).size === 21;
      }),
      "mature lineage artwork is distinct across all 21 families",
    );
    check(
      (await page.evaluate(() => __LIFE_TEST__.fingerprint())) === initial,
      "artwork preparation and phenotype previews never change the ecosystem",
    );
    await page.locator("#open-guide").click();
    check(
      await page.locator("#guide").isVisible(),
      "in-game explanation opens",
    );
    check(
      (await page.locator("#tree-select option").count()) === 31,
      "tree references every species including food and parasites",
    );
    for (const id of [
      "abyss",
      "precocial",
      "algae",
      "tideparasite",
      "hyperparasite",
    ]) {
      await page.locator("#tree-select").selectOption(id);
      check(
        (await page.locator("#guide-content").textContent()).length > 100,
        "tree explains " + id,
      );
      if (id === "abyss")
        check(
          (await page.locator(".tree-node-art").count()) === 11,
          "four-phase tree illustrates I/II, three III branches and six IV endpoints",
        );
    }
    for (const name of [
      "system",
      "food",
      "action",
      "birth",
      "parasite",
      "info",
    ]) {
      await page.locator(`[data-sheet="${name}"]`).click();
      const text = await page.locator("#guide-content").textContent();
      check(text.length > 300, "sheet content: " + name);
      if (name === "system")
        check(
          text.includes("外部入力") &&
            text.includes("土壌M") &&
            text.includes("吸収率0.5"),
          "system explains finite root uptake and separately recorded external inputs",
        );
      if (name === "food")
        check(
          text.includes("満腹・全快") && text.includes("部分取得"),
          "food sheet explains demand-limited harvesting",
        );
      if (name === "birth")
        check(
          text.includes("近傍主生物2〜3体") && text.includes("二段階予約"),
          "birth sheet explains local two-parent competition",
        );
    }
    await page.locator("#close-guide").click();
    check(
      (await page.evaluate(() => __LIFE_TEST__.fingerprint())) === initial,
      "guide and all trees do not change biological state",
    );
    await page.locator("#step").click();
    s = await page.evaluate(() => __LIFE_TEST__.snapshot());
    check(
      s.world.turn === 1,
      "single step advances exactly one synchronous turn",
    );
    check(
      (await page.evaluate(
        () => EcoEngine.invariants(__LIFE_TEST__.snapshot().world).length,
      )) === 0,
      "browser world respects slots and finite budgets",
    );
    await page.evaluate(() => {
      const w = __LIFE_TEST__.snapshot().world;
      const main = w.organisms.find((a) => a.slot === "main");
      __LIFE_TEST__.select(main.cell, main.id);
    });
    await page.locator("#step").click();
    check(
      (await page.locator("#selection").textContent()).includes("基礎DNA"),
      "individual observation exposes DNA and current weights",
    );
    check(
      (await page.locator("#selection").textContent()).includes("候補上位3"),
      "only selected individual exposes candidate diagnostics",
    );
    await page.evaluate(() => {
      const w = __LIFE_TEST__.snapshot().world;
      const plant = w.organisms.find(
        (o) => EcoEngine.S.spec(o).group === "plant",
      );
      __LIFE_TEST__.select(plant.cell, plant.id);
    });
    check(
      (await page.locator("#selection").textContent()).includes("可食葉B") &&
        (await page.locator("#selection").textContent()).includes("土壌M"),
      "plant observer distinguishes edible leaves, living base and soil",
    );
    const beforeView = await page.evaluate(() => __LIFE_TEST__.fingerprint());
    for (const id of ["resources", "motion", "grid"])
      await page.locator("#" + id).click();
    await page.locator("#zoom-in").click();
    check(
      (await page.evaluate(() => __LIFE_TEST__.fingerprint())) === beforeView,
      "view toggles and zoom do not affect simulation",
    );
    await page.locator("#fit").click();
    await page.locator("#restart-world").click();
    await page.locator('#world-confirm[open] button[value="proceed"]').click();
    await page.waitForFunction(()=>!document.querySelector('#world-confirm').open && __LIFE_TEST__.snapshot().world.turn===0);
    check(
      (await page.evaluate(() => __LIFE_TEST__.fingerprint())) === initial,
      "reset exactly replays original world",
    );
    await page.locator("#start").click();
    await page.waitForFunction(
      () => __LIFE_TEST__.snapshot().world.turn >= 2,
      {},
      { timeout: 30000 },
    );
    await page.locator("#start").click();
    const paused = await page.evaluate(
      () => __LIFE_TEST__.snapshot().world.turn,
    );
    await page.waitForTimeout(1100);
    check(
      (await page.evaluate(() => __LIFE_TEST__.snapshot().world.turn)) ===
        paused,
      "pause stops biological time",
    );
    if (
      (await page.locator("#focus-view").getAttribute("aria-pressed")) ===
      "true"
    )
      await page.click("#focus-view");
    await page.locator("#change-world").click();
    await page.locator("#advanced-settings").evaluate(e=>e.open=true);
    await page.locator("#lineages").selectOption("few");
    await page.locator("#placement").selectOption("cluster");
    await page.locator("#distribution").selectOption("weighted");
    await loadWorld();
    s = await page.evaluate(() => __LIFE_TEST__.snapshot());
    check(
      Object.values(s.world.stats.counts).filter((n, i) => i < 20 && n > 0)
        .length === 5,
      "few-lineage clustered weighted mode creates five main lineages",
    );
    if (
      (await page.locator("#focus-view").getAttribute("aria-pressed")) ===
      "true"
    )
      await page.click("#focus-view");
    await page.locator("#change-world").click();
    for (const id of ["main", "plant", "fungus", "prey", "P", "Q"])
      await page.locator("#group-" + id).uncheck();
    await loadWorld();
    check(
      (await page.locator("#setup-message").textContent()).includes(
        "生物群を一つ以上",
      ),
      "invalid settings show reason and retain previous world",
    );
    check(
      (await page.evaluate(() => __LIFE_TEST__.snapshot().world.turn)) === 0,
      "failed setup leaves old world intact",
    );
    await page.locator("#group-plant").check();
    await loadWorld();
    s = await page.evaluate(() => __LIFE_TEST__.snapshot());
    check(
      s.world.stats.main === 0 && s.world.stats.food > 0 && !s.world.stopReason,
      "main-off mode is not misreported as extinction",
    );
    await page.evaluate(() =>
      __LIFE_TEST__.prepare({
        seed: "browser-evidence",
        width: 80,
        height: 56,
        initial: 320,
      }),
    );
    await page.locator("#advanced-settings").evaluate((e) => (e.open = false));
    await page.waitForTimeout(150);
    await page.screenshot({
      path: path.join(out, "ecosystem-overview.png"),
      fullPage: true,
    });
    await page.locator("#zoom-in").click();
    await page.locator("#zoom-in").click();
    await page.waitForTimeout(150);
    await page.screenshot({
      path: path.join(out, "ecosystem-detail.png"),
      fullPage: true,
    });
    await page.locator("#fit").click();
    await page.evaluate(() => {
      const w = __LIFE_TEST__.snapshot().world;
      __LIFE_TEST__.select(w.organisms.find((a) => a.slot === "main").cell);
    });
    await page.locator("#open-guide").click();
    await page.locator("#tree-select").selectOption("cephalopod");
    await page.screenshot({
      path: path.join(out, "lineage-tree.png"),
      fullPage: true,
    });
    await page.locator('[data-sheet="parasite"]').click();
    await page.screenshot({
      path: path.join(out, "parasite-sheet.png"),
      fullPage: true,
    });
    await page.locator("#close-guide").click();
    await page.evaluate(async () => {
      __LIFE_TEST__.prepare({
        seed: "extended-observation",
        width: 40,
        height: 28,
        initial: 80,
      });
      for (let i = 0; i < 100; i++) {
        __LIFE_TEST__.step();
        if (i % 10 === 0)
          await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const w = __LIFE_TEST__.snapshot().world;
      const mature =
        w.organisms.find((o) => o.species === "solar" && EcoState.ageInfo(o).stage !== "juvenile") ||
        w.organisms.find((o) => o.slot === "main" && EcoState.ageInfo(o).stage !== "juvenile");
      if (!mature)
        throw Error("No naturally matured specimen for visual observation");
      __LIFE_TEST__.select(mature.cell, mature.id);
    });
    check(
      (await page.evaluate(() => __LIFE_TEST__.snapshot().world.turn)) === 100,
      "actual simulation reaches age maturity without fabricated phase changes",
    );
    await page.waitForTimeout(150);
    await page.screenshot({
      path: path.join(out, "ecosystem-grown.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 640, height: 1000 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "narrow viewport does not overflow horizontally",
    );
    check(
      errors.length === 0,
      "no JavaScript page errors: " + errors.join("; "),
    );
    check(network.length === 0, "local app makes no external HTTP requests");
    const report = {
      ok: true,
      artwork: await page.evaluate(() => EcoVisualManifest.version),
      app: require("../package.json").version,
      version: "ecology-ab/1.5",
      platform: process.platform,
      browser: await browser.version(),
      checks,
      errors,
      network,
      serving: "HTTP loopback (managed Chromium blocks file URLs)",
    };
    await fs.writeFile(
      path.join(out, "report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
