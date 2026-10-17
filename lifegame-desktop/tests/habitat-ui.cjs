"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "artifacts/habitat",
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
    checks = [],
    errors = [];
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
        () =>
          EcoArt.loaded &&
          Object.keys(EcoVisualManifest.terrain).length === 11 &&
          Object.values(EcoVisualManifest.terrain).every(
            (v) => EcoArt.images[v.sheet].naturalWidth >= 1024,
          ),
      ),
      "eleven painted habitat materials decode at production resolution",
    );
    check(
      await page.evaluate(() => {
        const a = [...document.querySelectorAll(".habitat-chip i")].map(
          (e) => getComputedStyle(e).backgroundImage,
        );
        return (
          a.length === 8 &&
          new Set(a).size === 8 &&
          a.every((v) => v.includes("habitat-") && v.includes(".png"))
        );
      }),
      "environment previews use the actual painted materials instead of placeholder gradients",
    );
    const started = Date.now();
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
    await page.click("#focus-view");
    await page.waitForTimeout(120);
    const fingerprint = await page.evaluate(() => __LIFE_TEST__.fingerprint()),
      old = JSON.parse(
        await fs.readFile(
          "operations/evidence/graphics-rebuild-v3/graphics/report.json",
          "utf8",
        ),
      );
    check(
      fingerprint === old.naturalFingerprint,
      "same natural world and seed as the previous 3.0 screenshot",
    );
    check(
      await page.evaluate(() => {
        const s = __LIFE_TEST__.snapshot();
        return (
          s.render.drawn === s.world.organisms.length &&
          s.render.resources === s.world.resources.length
        );
      }),
      "far view retains every real organism and resource",
    );
    check(
      await page.evaluate(() => {
        const c = document.querySelector("#board"),
          d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        let painted = 0,
          n = 0;
        for (let i = 0; i < d.length; i += 64) {
          n++;
          if (d[i] + d[i + 1] + d[i + 2] > 105) painted++;
        }
        return painted / n > 0.2;
      }),
      "far terrain remains visibly painted after cartographic colour grading",
    );
    await page.screenshot({ path: path.join(out, "natural-far.png") });
    await page
      .locator("#board")
      .screenshot({ path: path.join(out, "natural-far-board.png") });
    await page.click("#detail-view");
    await page.waitForTimeout(150);
    check(
      await page.evaluate(() => {
        const r = __LIFE_TEST__.snapshot().render;
        return r.paintedMaterials === 11 && r.materialPixelsPerCell >= 128;
      }),
      "close surface uses all eleven materials and at least 128 texels per real cell",
    );
    await page.screenshot({ path: path.join(out, "natural-near.png") });
    await page
      .locator("#board")
      .screenshot({ path: path.join(out, "natural-near-board.png") });
    check(
      (await page.evaluate(() => __LIFE_TEST__.fingerprint())) === fingerprint,
      "painted terrain, new shadows and camera do not alter biology",
    );
    const material = await page.evaluate(() => {
      const w = __LIFE_TEST__.snapshot().world,
        before = JSON.stringify(w),
        p = EcoProjection.build(w),
        m = EcoHabitat.create(w, p, EcoArt),
        a = m.make({ x: 12, y: 10, w: 4, h: 4 }, 192),
        builds = m.metrics.builds,
        b = m.make({ x: 12, y: 10, w: 4, h: 4 }, 192);
      const g = a.canvas.getContext("2d"),
        d = g.getImageData(0, 0, a.canvas.width, a.canvas.height).data,
        colors = new Set();
      for (let i = 0; i < d.length; i += 64)
        colors.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
      return {
        unchanged: JSON.stringify(w) === before,
        reused: a === b && m.metrics.builds === builds,
        colors: colors.size,
        pixels: a.canvas.width * a.canvas.height,
        centres: w.tiles.every((t, i) => {
          const s = m.sample((i % 40) + 0.5, Math.floor(i / 40) + 0.5);
          return Math.abs(s.wet - (p.water(t) ? 1 : 0)) < 1e-9;
        }),
      };
    });
    check(
      material.unchanged && material.reused,
      "material quilting is read-only and reuses identical patch requests",
    );
    check(
      material.colors > 5000 && material.pixels === 768 * 768,
      "ground retains detailed colour variation at close resolution",
    );
    check(
      material.centres,
      "shore interpolation preserves water/land at every real cell centre",
    );
    check(
      await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 200;
        const g = c.getContext("2d");
        g.scale(100, 100);
        EcoArt.propShadow(g, 9, 1, 1, 1);
        return !c
          .getContext("2d")
          .getImageData(0, 0, 200, 200)
          .data.some((v, i) => i % 4 === 3 && v > 0);
      }),
      "water foam never casts a floating object shadow",
    );
    check(
      await page.evaluate(() => {
        const draw = (holes) => {
          const c = document.createElement("canvas");
          c.width = c.height = 300;
          const g = c.getContext("2d");
          g.scale(150, 150);
          EcoArt.prop(g, 0, 1, 1.8, 1.5, 1, holes);
          return g.getImageData(0, 0, 300, 300).data;
        };
        const a = draw([]),
          b = draw([{ x: 0, y: -0.6, radius: 0.25, selected: true }]);
        let changed = 0,
          unchangedSolid = 0;
        for (let i = 3; i < a.length; i += 4) {
          if (a[i] - b[i] > 15) changed++;
          if (a[i] > 200 && a[i] === b[i]) unchangedSolid++;
        }
        return changed > 100 && unchangedSolid > 1000;
      }),
      "occlusion reveals locally while retaining opaque foliage elsewhere",
    );
    await page.click("#zoom-in");
    await page.waitForTimeout(100);
    check(
      await page.evaluate(
        () => __LIFE_TEST__.snapshot().render.materialPixelsPerCell === 256,
      ),
      "higher magnification keeps a bounded high-resolution surface",
    );
    await page.click("#fit");
    const environmental = await page.evaluate(() => {
      const source = __LIFE_TEST__.snapshot().world,
        plain = source.tiles.find((t) => t.terrain === "plain"),
        sheet = document.createElement("canvas");
      sheet.width = 1536;
      sheet.height = 848;
      const g = sheet.getContext("2d");
      g.fillStyle = "#081d26";
      g.fillRect(0, 0, 1536, 848);
      const signatures = [];
      for (let env = 0; env < 8; env++) {
        const w = {
            config: { width: 3, height: 3 },
            tiles: Array.from({ length: 9 }, () => ({
              ...plain,
              env,
              terrain: "plain",
              cover: "none",
              walls: [],
            })),
          },
          p = EcoProjection.build(w),
          m = EcoHabitat.create(w, p, EcoArt),
          im = m.make({ x: 0, y: 0, w: 3, h: 3 }, 128).canvas;
        signatures.push(im.toDataURL());
        const x = (env % 4) * 384,
          y = Math.floor(env / 4) * 424;
        g.drawImage(im, x, y, 384, 384);
        g.fillStyle = "#f0daa5";
        g.font = "17px sans-serif";
        g.textAlign = "center";
        g.fillText(
          EcoState.D.environments[env].name + " / 平地",
          x + 192,
          y + 410,
        );
      }
      const c = document.createElement("canvas");
      c.width = c.height = 2;
      const cg = c.getContext("2d");
      cg.fillStyle = "#ff00ff";
      cg.fillRect(0, 0, 2, 2);
      const w = {
          config: { width: 3, height: 3 },
          tiles: Array.from({ length: 9 }, () => ({
            ...plain,
            env: 0,
            terrain: "deep",
            cover: "none",
            walls: [],
          })),
        },
        p = EcoProjection.build(w),
        m = EcoHabitat.create(w, p, {
          loaded: true,
          images: { ...EcoArt.images, "habitat-deep": c },
        }),
        im = m.make({ x: 0, y: 0, w: 3, h: 3 }, 64).canvas,
        d = im.getContext("2d").getImageData(96, 96, 1, 1).data;
      return {
        distinct: new Set(signatures).size,
        png: sheet.toDataURL().split(",")[1],
        deepOpaque: d[0] > 120 && d[1] < 90 && d[2] > 120,
      };
    });
    check(
      environmental.distinct === 8,
      "all eight fixed environments have distinct painted ground without changing terrain",
    );
    check(
      environmental.deepOpaque,
      "deep-water artwork fully covers the stream bed at deep cell centres",
    );
    await fs.writeFile(
      path.join(out, "environment-surfaces.png"),
      Buffer.from(environmental.png, "base64"),
    );
    // Same explicit third-phase comparison fixture as 3.0; no natural-growth claim.
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
              (q) =>
                w.tiles[q].cover === "bush" || w.tiles[q].terrain === "rock",
            ).length -
            EcoState.nearby(w, a, 3).filter(
              (q) =>
                w.tiles[q].cover === "bush" || w.tiles[q].terrain === "rock",
            ).length,
        )[0],
        cells = [land, ...EcoState.nearby(w, land, 2)].filter(
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
    check(
      fixture === old.fixtureFingerprint,
      "comparison fixture is exactly the same biological state as 3.0",
    );
    await page.click("#detail-view");
    await page.waitForTimeout(180);
    await page.screenshot({ path: path.join(out, "review-near.png") });
    await page
      .locator("#board")
      .screenshot({ path: path.join(out, "review-near-board.png") });
    check(
      await page.evaluate(() => {
        const r = __LIFE_TEST__.snapshot().render;
        return r.infectedHosts === 1 && r.highParasites === 1;
      }),
      "foreground reveal retains the host and its P/Q indicators",
    );
    // Background-only view uses a copy and hides biological bodies for visual inspection.
    const terrain = await page.evaluate(() => {
      const w = __LIFE_TEST__.snapshot().world;
      w.organisms = [];
      w.resources = [];
      w.carcasses = [];
      w.events = [];
      const c = document.createElement("canvas");
      c.style.cssText = "position:fixed;left:-9999px;width:1600px;height:900px";
      document.body.append(c);
      const r = EcoRenderer.create(c);
      r.setWorld(w);
      r.focus(__LIFE_TEST__.snapshot().view.selected);
      r.view.selected = null;
      r.draw();
      const data = c.toDataURL().split(",")[1];
      c.remove();
      return data;
    });
    await fs.writeFile(
      path.join(out, "terrain-only.png"),
      Buffer.from(terrain, "base64"),
    );
    // Actual rocky river location, selected by geography rather than modified terrain.
    await page.evaluate(() => {
      const w = __LIFE_TEST__.prepare({
        seed: "rocky-habitat-review",
        width: 40,
        height: 28,
        initial: 100,
        lineages: "few",
        mapId: "river",
      });
      const candidates = w.tiles
        .map((t, p) => p)
        .filter(
          (p) =>
            p % 40 > 5 &&
            p % 40 < 34 &&
            p > 240 &&
            p < 880 &&
            !w.tiles[p].blocked &&
            EcoState.nearby(w, p, 2).some(
              (q) => w.tiles[q].terrain === "shallow",
            ),
        );
      const score = (p) =>
        EcoState.nearby(w, p, 3).reduce(
          (n, q) =>
            n +
            (w.tiles[q].terrain === "rock" ? 5 : 0) +
            (w.tiles[q].cover === "boulder" ? 8 : 0) +
            (w.tiles[q].cover === "bush" ? 1 : 0),
          0,
        );
      const p = candidates.sort((a, b) => score(b) - score(a))[0];
      __LIFE_TEST__.select(p);
    });
    await page.click("#detail-view");
    await page.waitForTimeout(160);
    await page.screenshot({ path: path.join(out, "rocky-near.png") });
    await page
      .locator("#board")
      .screenshot({ path: path.join(out, "rocky-near-board.png") });
    check(
      await page.evaluate(
        () => EcoEngine.invariants(__LIFE_TEST__.snapshot().world).length === 0,
      ),
      "rocky view uses a valid unchanged authored map",
    );
    await page.setViewportSize({ width: 640, height: 1000 });
    await page.waitForTimeout(120);
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "habitat view retains narrow-screen layout",
    );
    check(errors.length === 0, "no browser exceptions");
    await fs.writeFile(
      path.join(out, "report.json"),
      JSON.stringify(
        {
          ok: true,
          checks,
          errors,
          material,
          naturalFingerprint: fingerprint,
          fixtureFingerprint: fixture,
          elapsedMs: Date.now() - started,
          visual:
            "Natural state and explicit art-review fixture are identical to app3.0. The terrain-only image hides biology in a copied display state. Rocky view selects an actual natural location without editing terrain.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify({ ok: true, checks, material }));
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
