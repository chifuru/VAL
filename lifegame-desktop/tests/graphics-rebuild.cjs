"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "artifacts/graphics-rebuild",
  );
  await fs.mkdir(out, { recursive: true });
  const server = http.createServer(async (req, res) => {
    try {
      const f = path.resolve(
        "src",
        "." + new URL(req.url, "http://localhost").pathname,
      );
      if (!f.startsWith(path.resolve("src") + path.sep))
        return res.writeHead(403).end();
      res.setHeader(
        "Content-Type",
        f.endsWith(".js")
          ? "application/javascript"
          : f.endsWith(".css")
            ? "text/css"
            : f.endsWith(".png")
              ? "image/png"
              : "text/html",
      );
      res.end(await fs.readFile(f));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
      executablePath:
        process.platform === "linux"
          ? process.env.CHROMIUM_PATH || "/usr/bin/chromium"
          : undefined,
      headless: true,
      args: ["--no-sandbox"],
    }),
    page = await browser.newPage({ viewport: { width: 1800, height: 1100 } }),
    errors = [],
    checks = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const check = (v, n) => {
    assert(v, n);
    checks.push(n);
  };
  try {
    await page.goto(
      "http://127.0.0.1:" + server.address().port + "/Index.html?smoke=1",
    );
    await page.evaluate(() => EcoArt.ready);
    check(
      await page.evaluate(
        () => EcoArt.loaded && Object.keys(EcoArt.images).length === 21,
      ),
      "all twenty-one creature and habitat production images decode",
    );
    check(
      await page.evaluate(() =>
        EcoState.D.species.every((s) =>
          s.group === "main"
            ? EcoVisualManifest.creatures.regions[s.id]?.length ===
              (s.id === "precocial" ? 3 : 4)
            : ["P", "Q"].includes(s.group)
              ? EcoVisualManifest.creatures.regions[s.id]?.length === 3
              : EcoVisualManifest.food.regions[s.id]?.length === 2,
        ),
      ),
      "every one of the 30 registered biological families has its own art",
    );
    const coverage = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 180;
      const g = c.getContext("2d");
      let frames = 0;
      const hashes = new Set();
      for (const s of EcoState.D.main)
        for (let phase = 1; phase <= (s.id === "precocial" ? 3 : 4); phase++) {
          g.clearRect(0, 0, 180, 180);
          EcoArt.creature(
            g,
            { species: s.id, phase, age: 30, sex: "female", dna: {} },
            90,
            90,
            52,
          );
          hashes.add(c.toDataURL());
          frames++;
        }
      return { frames, distinct: hashes.size };
    });
    check(
      coverage.frames === 83 && coverage.distinct === 83,
      "all 83 main-family phase renders are distinct",
    );
    check(
      await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 180;
        const g = c.getContext("2d");
        return ["solar", "jelly"].every((species) => {
          const a = [];
          for (let branch3 = 0; branch3 < 3; branch3++)
            for (let branch4 = 0; branch4 < 2; branch4++) {
              g.clearRect(0, 0, 180, 180);
              EcoArt.creature(
                g,
                { species, phase: 4, age: 30, branch3, branch4, dna: {} },
                90,
                90,
                52,
              );
              a.push(c.toDataURL());
            }
          return new Set(a).size === 6;
        });
      }),
      "solar and jelly each render six distinct final branches",
    );
    await page.evaluate(() =>
      __LIFE_TEST__.prepare({
        seed: "painterly-habitat-2026",
        width: 40,
        height: 28,
        initial: 100,
        lineages: "few",
        mapId: "river",
      }),
    );
    check(
      await page.evaluate(() => {
        const w = __LIFE_TEST__.snapshot().world,
          scene = EcoScenery.build(w, EcoProjection.build(w));
        return (
          scene.objects.every(
            (o) =>
              o.wall === undefined || w.tiles[o.cell].walls.includes(o.wall),
          ) &&
          w.tiles.every((t, p) =>
            t.walls
              .filter((q) => q === p + 1 || q === p + w.config.width)
              .every((q) =>
                scene.objects.some((o) => o.cell === p && o.wall === q),
              ),
          )
        );
      }),
      "cliff markers retain every actual blocking edge without adding a wall",
    );
    const natural = await page.evaluate(() => __LIFE_TEST__.fingerprint());
    await page.click("#focus-view");
    await page.waitForTimeout(200);
    check(
      await page.evaluate(() => {
        const s = __LIFE_TEST__.snapshot();
        return (
          s.render.drawn === s.world.organisms.length &&
          s.render.resources === s.world.resources.length
        );
      }),
      "natural overview draws every individual and resource",
    );
    await page.screenshot({ path: path.join(out, "natural-far.png") });
    await page
      .locator("#board")
      .screenshot({ path: path.join(out, "natural-far-board.png") });
    await page.click("#detail-view");
    await page.waitForTimeout(150);
    check(
      await page.evaluate(() => __LIFE_TEST__.snapshot().view.scale === 240),
      "near view shows a small area at 240 pixels per real cell",
    );
    await page.screenshot({ path: path.join(out, "natural-near.png") });
    await page
      .locator("#board")
      .screenshot({ path: path.join(out, "natural-near-board.png") });
    check(
      (await page.evaluate(() => __LIFE_TEST__.fingerprint())) === natural,
      "new terrain, camera and art do not change biology",
    );
    // Test the actual pointer handler at projected positions, including relief.
    check(
      await page.evaluate(() => {
        const w = __LIFE_TEST__.snapshot().world,
          p = EcoProjection.build(w);
        return w.tiles.every(
          (_, i) =>
            p.pick(...p.point((i % 40) + 0.5, Math.floor(i / 40) + 0.5)) === i,
        );
      }),
      "every real-map cell centre round-trips through relief picking",
    );
    await page.click("#fit");
    const pick = await page.evaluate(() => {
      const w = __LIFE_TEST__.snapshot().world,
        cell = w.tiles.findIndex((t) => t.terrain === "rock"),
        p = __LIFE_TEST__.screenForCell(cell);
      return { cell, p };
    });
    const box = await page.locator("#board").boundingBox();
    await page.mouse.click(box.x + pick.p[0], box.y + pick.p[1]);
    check(
      (await page.evaluate(() => __LIFE_TEST__.snapshot().view.selected)) ===
        pick.cell,
      "pointer selects the actual projected rock cell",
    );
    await page.evaluate(async () => {
      __LIFE_TEST__.prepare({
        seed: "browser-natural-maturity",
        width: 40,
        height: 28,
        initial: 80,
      });
      for (let i = 0; i < 100; i++) {
        __LIFE_TEST__.step();
        if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      const w = __LIFE_TEST__.snapshot().world;
      const o =
        w.organisms.find((o) => o.species === "solar" && o.phase >= 3) ||
        w.organisms.find((o) => o.slot === "main" && o.phase >= 3);
      if (!o) throw Error("No naturally grown specimen");
      __LIFE_TEST__.select(o.cell, o.id);
    });
    check(
      await page.evaluate(
        () => EcoEngine.invariants(__LIFE_TEST__.snapshot().world).length === 0,
      ),
      "naturally evolved 100-turn scene obeys ecosystem invariants",
    );
    const grown = await page.evaluate(() => __LIFE_TEST__.fingerprint());
    await page.click("#fit");
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(out, "grown-far.png") });
    await page.click("#detail-view");
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, "grown-near.png") });
    await page
      .locator("#board")
      .screenshot({ path: path.join(out, "grown-near-board.png") });
    check(
      (await page.evaluate(() => __LIFE_TEST__.fingerprint())) === grown,
      "naturally grown far and near scenes preserve identical state",
    );
    check(
      await page.evaluate(() => {
        const w = __LIFE_TEST__.snapshot().world,
          actors = w.organisms.slice(0, 180),
          last = actors.at(-1);
        w.events = actors.map((o) => ({
          id: o.id,
          cell: o.cell,
          type: "defend",
        }));
        const before = JSON.stringify(w),
          c = document.createElement("canvas");
        c.style.cssText =
          "position:fixed;left:-9999px;width:1200px;height:700px";
        document.body.append(c);
        const r = EcoRenderer.create(c);
        r.setWorld(w);
        r.fit();
        r.view.selected = last.cell;
        r.view.animate = true;
        r.view.duration = 1000000;
        r.draw();
        const ok =
          r.diagnostics.motionActors <= 128 &&
          r.diagnostics.selectedMotion &&
          JSON.stringify(w) === before;
        c.remove();
        return ok;
      }),
      "motion cap prioritizes the selected visible actor and never writes to world state",
    );
    // Explicit art-review fixture. It is not a claim about natural survival or evolution.
    await page.evaluate(() => {
      const w = __LIFE_TEST__.prepare({
          seed: "shore-art-review",
          width: 40,
          height: 28,
          initial: 80,
          mapId: "river",
        }),
        candidates = w.tiles
          .map((t, p) => p)
          .filter(
            (p) =>
              p % 40 > 7 &&
              p % 40 < 32 &&
              p > 280 &&
              p < 840 &&
              w.tiles[p].terrain === "plain" &&
              !w.tiles[p].blocked &&
              EcoState.nearby(w, p).some(
                (q) => w.tiles[q].terrain === "shallow",
              ),
          );
      const land = candidates.sort(
        (a, b) =>
          EcoState.nearby(w, b, 3).filter(
            (q) => w.tiles[q].cover === "bush" || w.tiles[q].terrain === "rock",
          ).length -
          EcoState.nearby(w, a, 3).filter(
            (q) => w.tiles[q].cover === "bush" || w.tiles[q].terrain === "rock",
          ).length,
      )[0];
      const cells = [land, ...EcoState.nearby(w, land, 2)].filter(
          (p) => !w.tiles[p].blocked,
        ),
        ids = [
          "solar",
          "jelly",
          "serpent",
          "cephalopod",
          "kelp",
          "swarm",
          "precocial",
        ];
      w.organisms = ids.map((id, i) =>
        EcoState.organism(
          w,
          EcoState.D.byId[id],
          cells[i * 2],
          "review-" + id,
          {
            phase: 3,
            age: 60,
            branch3: i % 3,
            dna: Object.fromEntries(EcoState.DNA.map((k) => [k, 0.5])),
          },
        ),
      );
      const host = w.organisms[0];
      w.organisms.push(
        EcoState.organism(w, EcoState.D.byId.fungus, land, "review-fungus", {
          phase: 2,
        }),
      );
      host.infection = EcoState.infection(w, "leafparasite", host.id, 0);
      host.infection.q = EcoState.hyper(w, host.infection.id, 0);
      w.resources = [
        {
          id: "review-info",
          kind: "info",
          cell: land,
          q: 3,
          E: 1,
          M: 0,
          G: 0,
          created: 0,
          expires: null,
        },
      ];
      w.carcasses = [];
      w.events = [];
      w.stats = EcoEngine.summarize(w);
      __LIFE_TEST__.refresh();
      __LIFE_TEST__.select(land, host.id);
    });
    const fixture = await page.evaluate(() => __LIFE_TEST__.fingerprint());
    await page.click("#fit");
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(out, "review-far.png") });
    await page.click("#detail-view");
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, "review-near.png") });
    await page
      .locator("#board")
      .screenshot({ path: path.join(out, "review-near-board.png") });
    check(
      await page.evaluate(() => {
        const r = __LIFE_TEST__.snapshot().render;
        return r.infectedHosts === 1 && r.highParasites === 1;
      }),
      "parasites and hyperparasites stay attached to a visible host",
    );
    check(
      (await page.locator("#selection [data-observe]").count()) === 2,
      "main organism and edible organism remain separately selectable",
    );
    check(
      (await page.evaluate(() => __LIFE_TEST__.fingerprint())) === fixture,
      "review fixture is unchanged by far/near rendering",
    );
    const gallery = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 1600;
      c.height = 2160;
      const g = c.getContext("2d");
      g.fillStyle = "#081d27";
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#e9d7a1";
      g.font = "32px serif";
      g.fillText("LIFE LAB · Production artwork / display review", 35, 48);
      const w = __LIFE_TEST__.snapshot().world;
      EcoState.D.main.forEach((s, i) => {
        const x = 200 + (i % 4) * 400,
          y = 190 + Math.floor(i / 4) * 350;
        const o = EcoState.organism(w, s, 0, "gallery-" + s.id, {
          phase: s.id === "precocial" ? 3 : 4,
          branch3: 1,
          branch4: 0,
          age: 60,
        });
        EcoArt.creature(g, o, x, y, 90);
        g.fillStyle = "#e9d7a1";
        g.font = "18px sans-serif";
        g.textAlign = "center";
        g.fillText(s.name, x, y + 150);
      });
      return c.toDataURL().split(",")[1];
    });
    await fs.writeFile(
      path.join(out, "production-families.png"),
      Buffer.from(gallery, "base64"),
    );
    await page.setViewportSize({ width: 640, height: 1000 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "rebuilt observation screen fits a narrow viewport",
    );
    check(errors.length === 0, "no browser exceptions");
    await fs.writeFile(
      path.join(out, "report.json"),
      JSON.stringify(
        {
          ok: true,
          checks,
          coverage,
          errors,
          naturalFingerprint: natural,
          fixtureFingerprint: fixture,
          fixture:
            "Seven explicitly placed third-phase main organisms, a fungus, host P/Q and information. Display fixture only; not a survival result.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify({ ok: true, checks, coverage }));
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
