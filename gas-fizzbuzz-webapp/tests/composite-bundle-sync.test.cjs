'use strict';
// VALIS D1.3.1: a distribution assertion, not only a test of editable app.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { sourceBundle } = require('../tools/build-composite-html.cjs');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const main = read('src/Index.html');
const variant = read('src/Index.composite-v4.html');
const scripts = [...main.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

test('both distributable HTML files are identical and reproducible from editable source', () => {
  assert.equal(main, variant, 'GAS default entrypoint differs from alternate preview');
  assert.equal(main, sourceBundle(main), 'source changes were not bundled into GAS entrypoint');
  assert.equal(scripts.length, 3);
  for (const placeholder of ['__STYLES__', '__CONFIG__', '__ENGINE__', '__APP__']) {
    assert.ok(!main.includes(placeholder), placeholder + ' was not replaced');
  }
});

test('all 68 embedded images and nine reference thumbnails survive without substitution', () => {
  assert.equal((main.match(/data:image\//g) || []).length, 80);
  const context = vm.createContext({ window: {} });
  vm.runInContext(scripts[0], context, { timeout: 10000 });
  const cfg = context.window.ASSET_CONFIG;
  assert.equal(Object.keys(cfg.core).length, 2);
  assert.equal(Object.keys(cfg.partImages).length, 11);
  assert.equal(Object.keys(cfg.lineageImages).length, 12);
  assert.equal(cfg.references.length, 9);
  const filePaths = [
    ...Object.values(cfg.core),
    ...Object.values(cfg.partImages).flat(),
    ...Object.values(cfg.lineageImages).flat(),
    ...cfg.references.map(ref => ref.file),
  ];
  assert.equal(filePaths.length, 68);
  assert.equal(new Set(filePaths).size, 68);
  assert.equal(Object.keys(cfg.sources).length, 68);
  for (const file of filePaths) {
    assert.ok(file in cfg.sources, 'missing asset source: ' + file);
    assert.match(cfg.sources[file], /^data:image\//);
  }
});

test('bundled v4.2 compositor matches app.js and keeps the two rendering modes distinct', () => {
  const source = read('src/composite/app.js');
  assert.equal(scripts[2], read('src/composite/draft-organ-sprites.js') + '\n' + source, 'GAS HTML is missing draft organ generator or running older app.js code');
  assert.match(source, /if\(portrait\)\s*\{/);
  assert.match(source, /\}else\s*\{\s*\/\/ Phase I/);
  assert.match(source, /MOCK PORTRAIT/);
  assert.match(source, /LAYER COMPOSITE/);
  assert.match(source, /const core=img\(C\.core\[stageCore\(s\)\]\)/);
  assert.match(source, /front\.forEach\(p=>drawPart\(p\)\)/);
});

test('bundled evolution engine, style, FizzBuzz UI, and legacy archive stay consistent', () => {
  assert.equal(scripts[1], read('src/composite/creature-engine.js'));
  const style = main.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(style);
  assert.equal(style[1], read('src/composite/styles.css'));
  for (const id of ['creatureCanvas', 'fizzbuzzLog', 'runButton', 'evolutionHistory', 'partList', 'references']) {
    assert.ok(main.includes('id="' + id + '"'), 'missing UI landmark: ' + id);
  }
  assert.ok(fs.existsSync(path.join(root, 'src/Index.pixel-legacy.html')));
});
