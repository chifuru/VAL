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
for (const [id,p] of Object.entries(m.producers||{})) {
  assert.equal(p.regions.length,11,id+' independent form count');
  assert.equal(p.references.length,11,id+' adopted reference count');
  frames(p.sheet,p.regions);
  for(const reference of p.references)frames(reference.sheet,[reference.region]);
}
if(m.ryouki){
  assert.equal(m.ryouki.regions.length,13,'ryouki normal11 and mutated2');
  assert.equal(m.ryouki.references.length,13,'ryouki adopted reference13');
  frames(m.ryouki.sheet,m.ryouki.regions);
  for(const reference of m.ryouki.references)frames(reference.sheet,[reference.region]);
}
for(const [id,p]of Object.entries(m.parasites||{})){
  const count=id==='hyperparasite'?4:9;
  assert.equal(p.regions.length,count,id+' adopted parasite form count');
  assert.equal(p.references.length,count,id+' original reference count');
  assert.equal(p.panels.length,count,id+' saved form/phase order');
  frames(p.sheet,p.regions);
  for(const reference of p.references)frames(reference.sheet,[reference.region]);
}
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
      Object.keys(m.food.regions).length + Object.keys(m.producers||{}).length + (m.ryouki?1:0),
    phaseFrames: Object.values(m.creatures.regions).reduce(
      (n, a) => n + a.length,
      0,
    ),
    dedicatedBranchFamilies: Object.keys(m.branches).length,
    dedicatedBranchFrames: Object.values(m.branches).reduce((n,b)=>n+b.regions.length,0),
    paintedTerrainMaterials: Object.keys(m.terrain || {}).length,
    independentProducerFamilies: Object.keys(m.producers||{}).length,
    independentProducerFrames: Object.values(m.producers||{}).reduce((n,p)=>n+p.regions.length,0),
    ryoukiFrames:m.ryouki?.regions.length||0,
    adoptedParasiteFrames:Object.values(m.parasites||{}).reduce((n,p)=>n+p.regions.length,0),
  }),
);
