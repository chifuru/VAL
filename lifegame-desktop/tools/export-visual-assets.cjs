/* Validate checked-in production atlases. Never regenerate from obsolete runtime art. */
"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const dir = path.resolve(__dirname, "../src/assets"),
  m = JSON.parse(fs.readFileSync(path.join(dir, "visual-manifest.json")));
for (const [key, v] of Object.entries(m.sheets)) {
  const b = fs.readFileSync(path.join(dir, v.file));
  assert.equal(
    crypto.createHash("sha256").update(b).digest("hex"),
    v.sha256,
    key,
  );
  assert.equal(b.readUInt32BE(16), v.width, key);
  assert.equal(b.readUInt32BE(20), v.height, key);
}
function frames(key, items) {
  const sheet = m.sheets[key];
  for (const [x, y, w, h] of items)
    assert(
      x >= 0 &&
        y >= 0 &&
        w > 0 &&
        h > 0 &&
        x + w <= sheet.width &&
        y + h <= sheet.height,
      key + " frame outside image",
    );
}
for (const [id, f] of Object.entries(m.creatures.regions))
  frames(m.creatures.sheetBySpecies[id], f);
for (const f of Object.values(m.food.regions)) frames("food-atlas", f);
frames("habitat-props", m.props.regions);
for (const b of Object.values(m.branches)) frames(b.sheet, b.regions);
for (const [name, v] of Object.entries(m.terrain || {}))
  assert.ok(
    m.sheets[v.sheet] && m.sheets[v.sheet].width >= 1024,
    name + " missing high-resolution habitat material",
  );
const context = { globalThis: {} };
require("node:vm").runInNewContext(
  fs.readFileSync(path.join(dir, "visual-manifest.js"), "utf8"),
  context,
);
assert.equal(
  JSON.stringify(context.globalThis.EcoVisualManifest),
  JSON.stringify(m),
);
console.log(
  JSON.stringify({
    ok: true,
    sheets: Object.keys(m.sheets).length,
    organismFamilies:
      Object.keys(m.creatures.regions).length +
      Object.keys(m.food.regions).length,
    phaseFrames: Object.values(m.creatures.regions).reduce(
      (n, a) => n + a.length,
      0,
    ),
    representativeBranches: 18,
    paintedTerrainMaterials: Object.keys(m.terrain || {}).length,
  }),
);
