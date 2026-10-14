'use strict';
// D1.3.2 stage-4 draft inventory checks. Does not certify mock fidelity or Chromium image decoding.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/composite/draft-organ-sprites.js'), 'utf8');
const sandbox = {window: {}};
vm.runInNewContext(source, sandbox, {timeout: 10000});
const generator = sandbox.window.CompositeDraftOrgans;
const ids = ['abyss','myth','recursive','sail','gravity','crystal','manyeyes','abyssshell','parallel','memory','serpent','solar'];

test('exactly twelve older lineage draft organ families; no modern PNG replacement', () => {
 assert.deepEqual(Array.from(generator.ids), ids);
 const cfg = {partImages:{'valis:lightKernel':['original-1','original-2','original-3']}};
 generator.install(cfg);
 assert.deepEqual(Array.from(cfg.partImages['valis:lightKernel']), ['original-1','original-2','original-3']);
 assert.equal(Object.keys(cfg.partImages).length, 13);
 assert.equal(cfg.draftOrganLineages.length, 12);
});

test('all 36 provisional organ images decode to transparent SVG with different level geometry', () => {
 const cfg={partImages:{}};
 generator.install(cfg);
 const all=[];
 for (const id of ids) {
  const key=id+':'+id+'Heritage',images=cfg.partImages[key];
  assert.equal(images.length,3,key);
  const decoded=images.map(uri=>{
   assert.ok(uri.startsWith('data:image/svg+xml;charset=utf-8,'),id);
   const svg=decodeURIComponent(uri.slice(uri.indexOf(',')+1));
   assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
   assert.match(svg,/viewBox="0 0 256 192"/);
   assert.ok(!/<image[\s>]/.test(svg),'no external sprite dependencies');
   assert.ok(!/fill="#fff"\s*\/>/.test(svg),'opaque rectangular background must not be inserted');
   assert.match(svg,/<\/svg>$/);
   return svg;
  });
  assert.equal(new Set(decoded).size,3,'no duplicate tier art for '+id);
  all.push(...images);
 }
 assert.equal(new Set(all).size,36);
});
test('draft fallback never overwrites an authored replacement', () => {
 const key='abyss:abyssHeritage';
 const cfg={partImages:{[key]:['real-1','real-2','real-3']}};
 generator.install(cfg);
 assert.deepEqual(Array.from(cfg.partImages[key]), ['real-1','real-2','real-3']);
});

test('authored PNG atlas families do not install provisional SVG fallback', () => {
 const cfg={partImages:{},authoredOrgans:Object.fromEntries(ids.map(id=>[id,{uri:'retained-png-atlas'}]))};
 generator.install(cfg);
 assert.equal(Object.keys(cfg.partImages).length,0);
 assert.equal(cfg.draftOrganLineages.length,0);
});
