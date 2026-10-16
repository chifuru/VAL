/* Manufacture four-phase artwork from the original visual mock; never runs in the ecosystem. */
"use strict";
const fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http"),
  crypto = require("node:crypto");
const { chromium } = require("playwright");
const project = path.resolve(__dirname, ".."),
  root = path.resolve(project, ".."),
  out = path.join(project, "src/assets");
async function main() {
  await fs.mkdir(out, { recursive: true });
  const mock = "/lifegame-desktop/design/ecosystem-mock/";
  const original = await fs.readFile(
    path.join(project, "design/ecosystem-mock/index.html"),
    "utf8",
  );
  const scripts = [...original.matchAll(/<script src="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((s) => s !== "src/app.js");
  const html =
    '<!doctype html><meta charset="utf-8"><base href="' +
    mock +
    '"><canvas id="stage" width="320" height="320"></canvas>' +
    scripts.map((s) => '<script src="' + s + '"></script>').join("");
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url === "/export.html")
        return res
          .setHeader("Content-Type", "text/html; charset=utf-8")
          .end(html);
      const file = path.resolve(
        root,
        "." + new URL(req.url, "http://localhost").pathname,
      );
      if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
      res.setHeader(
        "Content-Type",
        file.endsWith(".png") ? "image/png" : "application/javascript",
      );
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROMIUM_PATH ||
      (process.platform === "linux" ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(
      "http://127.0.0.1:" + server.address().port + "/export.html",
    );
    const result = await page.evaluate(async () => {
      const E = CreatureEngine,
        R = CreatureRenderer.create(
          document.getElementById("stage"),
          VALIS_ASSETS,
        );
      await R.prepare();
      if (R.missingAssets().length)
        throw Error("Missing source assets: " + R.missingAssets().join(","));
      const atlas = document.createElement("canvas");
      atlas.width = 1024;
      atlas.height = E.LINEAGES.length * 256;
      const g = atlas.getContext("2d"),
        entries = {};
      for (let row = 0; row < E.LINEAGES.length; row++) {
        const id = E.LINEAGES[row].id,
          initial = E.initial(row + 1);
        entries[id] = [];
        for (let phase = 1; phase <= 4; phase++) {
          const state = MockPresentation.project({
            seed: row + 1,
            dna: initial.dna,
            lineage: id,
            stage: phase - 1,
            meals: 0,
          });
          const image = new Image();
          image.src = R.portrait(state, 320, 320);
          await image.decode();
          const temp = document.createElement("canvas");
          temp.width = temp.height = 320;
          const t = temp.getContext("2d");
          t.drawImage(image, 0, 0);
          const pixels = t.getImageData(0, 0, 320, 320).data;
          let x0 = 320,
            y0 = 320,
            x1 = 0,
            y1 = 0;
          for (let y = 0; y < 320; y++)
            for (let x = 0; x < 320; x++)
              if (pixels[(y * 320 + x) * 4 + 3] > 16) {
                x0 = Math.min(x0, x);
                y0 = Math.min(y0, y);
                x1 = Math.max(x1, x);
                y1 = Math.max(y1, y);
              }
          const w = x1 - x0 + 1,
            h = y1 - y0 + 1,
            scale = 234 / Math.max(w, h),
            cx = (phase - 1) * 256,
            cy = row * 256;
          g.drawImage(
            temp,
            x0,
            y0,
            w,
            h,
            cx + (256 - w * scale) / 2,
            cy + (256 - h * scale) / 2,
            w * scale,
            h * scale,
          );
          entries[id].push([cx, cy, 256, 256]);
        }
      }
      const food = document.createElement("canvas");
      food.width = 1024;
      food.height = 384;
      const f = food.getContext("2d"),
        foodRegions = {};
      for (const [row, key] of ["life", "mineral", "information"].entries()) {
        const source = VALIS_ASSETS.food[key],
          image = new Image();
        image.src = source.file;
        await image.decode();
        foodRegions[key] = source.regions.map(([x, y, w, h], col) => {
          const scale = 116 / Math.max(w, h);
          f.drawImage(
            image,
            x,
            y,
            w,
            h,
            col * 128 + (128 - w * scale) / 2,
            row * 128 + (128 - h * scale) / 2,
            w * scale,
            h * scale,
          );
          return [col * 128, row * 128, 128, 128];
        });
      }
      return {
        data: atlas.toDataURL("image/png"),
        food: food.toDataURL("image/png"),
        foodRegions,
        entries,
        sourceVersion: R.assetVersion,
      };
    });
    const png = Buffer.from(result.data.split(",")[1], "base64");
    await fs.writeFile(path.join(out, "creatures.png"), png);
    const food = Buffer.from(result.food.split(",")[1], "base64");
    await fs.writeFile(path.join(out, "food.png"), food);
    const manifest = {
      version: "mock-art/1",
      source:
        "design/ecosystem-mock + original creature renderer and assets (read-only)",
      sourceVersion: result.sourceVersion,
      creatures: {
        file: "creatures.png",
        sha256: crypto.createHash("sha256").update(png).digest("hex"),
        cell: 256,
        regions: result.entries,
      },
      food: { file: "food.png", regions: result.foodRegions },
      terrain: { file: "terrain.png", columns: 4, rows: 2 },
      note: "Manufacturing templates only. Runtime phase/branches/DNA/sex remain the ecosystem's settled state; no old biology is imported.",
    };
    await fs.writeFile(
      path.join(out, "visual-manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
    await fs.writeFile(
      path.join(out, "visual-manifest.js"),
      "globalThis.EcoVisualManifest = " + JSON.stringify(manifest) + ";\n",
    );
    console.log(
      JSON.stringify({
        ok: true,
        species: Object.keys(result.entries).length,
        phases: 4,
        bytes: png.length,
        sourceVersion: result.sourceVersion,
      }),
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
