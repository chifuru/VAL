#!/usr/bin/env node
'use strict';

// VALIS C1.5.1 / D1.3.1: rebuild both GAS entrypoints from editable modules.
// This project currently preserves the 44 active optimized images inside
// the existing bundled HTML. The first script block is the canonical packed
// asset data until the originals and build pipeline are restored separately.
// Never replace those original pixels with generated/guessed substitutes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const modules = path.join(src, 'composite');
const read = p => fs.readFileSync(p, 'utf8');
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
const scriptPattern = /<script>([\s\S]*?)<\/script>/g;

function embeddedConfig(html) {
  const scripts = [...html.matchAll(scriptPattern)];
  if (scripts.length !== 3) throw new Error('Expected three inline script blocks: CONFIG / ENGINE / APP');
  const cfg = scripts[0][1];
  if (!cfg.startsWith('window.ASSET_CONFIG=')) throw new Error('First script must be bundled asset config');
  if (!scripts[1][1].includes('CreatureEngine')) throw new Error('Second script must be engine');
  if (!scripts[2][1].includes('var E=window.CreatureEngine')) throw new Error('Third script must be app');
  const parsed = JSON.parse(cfg.slice('window.ASSET_CONFIG='.length, -1));
  if (![44,68].includes(Object.keys(parsed.sources).length)) throw new Error('Active image registry incomplete');
  return cfg;
}

function sourceBundle(existingHtml) {
  const template = read(path.join(modules, 'Index.template.html'));
  const originalConfig = embeddedConfig(existingHtml);
  const packed = JSON.parse(originalConfig.slice('window.ASSET_CONFIG='.length, -1));
  delete packed.lineageImages;
  const active = [...Object.values(packed.core), ...Object.values(packed.partImages).flat(), ...packed.references.map(r=>r.file)];
  packed.sources = Object.fromEntries(active.map(rel=>{if(!packed.sources[rel])throw Error('Missing active source '+rel);return [rel,packed.sources[rel]];}));
  const ledger = JSON.parse(read(path.join(root, 'src/assets/organs/config.json')));
  const provenance = JSON.parse(read(path.join(root, 'design/assets/organ-provenance.json')));
  packed.authoredOrgans = Object.fromEntries(Object.entries(ledger).map(([id, item]) => {
    const bytes = fs.readFileSync(path.join(root, item.path));
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== provenance[id].sha256) throw new Error('Atlas checksum mismatch: '+id);
    return [id, { uri: 'data:image/png;base64,'+bytes.toString('base64'), regions: item.regions, roots: item.roots, displayAnchor: item.display_anchor, displayLayer: item.display_layer }];
  }));
  const config = 'window.ASSET_CONFIG='+JSON.stringify(packed)+';';
  const values = {
    __STYLES__: read(path.join(modules, 'styles.css')),
    __CONFIG__: config,
    __ENGINE__: read(path.join(modules, 'creature-engine.js')),
    __APP__: read(path.join(modules, 'app.js')),
  };
  let output = template;
  for (const [placeholder, replacement] of Object.entries(values)) {
    if (output.split(placeholder).length !== 2) throw new Error('Missing/repeated template marker: ' + placeholder);
    output = output.replace(placeholder, replacement);
  }
  if (/__(?:STYLES|CONFIG|ENGINE|APP)__/.test(output)) throw new Error('Unexpanded template marker');
  if ((output.match(/<script>/g) || []).length !== 3) throw new Error('Unexpected script count');
  if ((output.match(/data:image\//g) || []).length !== 44 + Object.keys(ledger).length) throw new Error('Missing original images');
  return output;
}

function run() {
  const target = path.join(src, 'Index.html');
  const variant = path.join(root, 'design/previews/Index.composite-v4.html');
  const input = read(target);
  const expected = sourceBundle(input);
  if (process.argv.includes('--check')) {
    if (input !== expected) throw new Error('Index.html differs from the canonical editable modules');
    if (read(variant) !== expected) throw new Error('Index.composite-v4.html differs from Index.html');
    process.stdout.write('PASS: two synchronized HTML files / 44 active original images + ' + Object.keys(JSON.parse(read(path.join(root,'src/assets/organs/config.json')))).length + ' draft organ atlases / SHA-256 ' + sha256(expected) + '\n');
    return;
  }
  fs.writeFileSync(target, expected, 'utf8');
  fs.writeFileSync(variant, expected, 'utf8');
  process.stdout.write('Updated both HTML entrypoints: 44 active originals + ' + Object.keys(JSON.parse(read(path.join(root,'src/assets/organs/config.json')))).length + ' draft organ atlases / SHA-256 ' + sha256(expected) + '\n');
}

if (require.main === module) run();
module.exports = { embeddedConfig, sourceBundle };
