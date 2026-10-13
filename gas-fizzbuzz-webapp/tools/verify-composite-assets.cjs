#!/usr/bin/env node
'use strict';
// D1.3.2 -- strict provenance check of the 68 existing v4.1 images recovered
// from v4.2's unchanged embedded data URIs. This is NOT a visual quality test.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src/Index.html'), 'utf8');
const backup = fs.readFileSync(path.join(root, 'src/Index.composite-v4.html'), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1];
assert.ok(script?.startsWith('window.ASSET_CONFIG='), 'Missing embedded source registry');
const config = JSON.parse(script.slice('window.ASSET_CONFIG='.length, -1));
const ledger = JSON.parse(fs.readFileSync(path.join(root, 'assets/composite-asset-ledger.v42-draft.json'), 'utf8'));
const byPath = new Map(ledger.assets.map(item => [item.path, item]));
assert.equal(ledger.assets.length, 68, 'Recovered 68-item ledger incomplete');
assert.equal(byPath.size, 68, 'Duplicate ledger path');
assert.equal(Object.keys(config.sources).length, 68, 'Original packed sources modified');
assert.equal(html, backup, 'GAS entrypoints disagree');
const expected = [
 ...Object.values(config.core),
 ...Object.values(config.partImages).flat(),
 ...Object.values(config.lineageImages).flat(),
 ...config.references.map(item => item.file)
];
assert.equal(expected.length, 68, 'Expected 68 original referenced images');
assert.equal(new Set(expected).size, 68, 'Duplicate mapped source path');
let total = 0, png = 0, webp = 0, jpeg = 0, alphaPng = 0;
for (const rel of expected) {
 const item = byPath.get(rel);
 assert.ok(item, 'Ledger missing ' + rel);
 assert.equal(config.sources[rel]?.startsWith('data:' + item.mime + ';base64,'), true, 'MIME/source mismatch ' + rel);
 const packed = Buffer.from(config.sources[rel].split(',')[1], 'base64');
 const extracted = fs.readFileSync(path.join(root, rel));
 assert.deepEqual(extracted, packed, 'Byte mismatch (never re-encode source art): ' + rel);
 assert.equal(extracted.length, item.bytes, 'Length mismatch ' + rel);
 const blobSha = crypto.createHash('sha1').update('blob ' + extracted.length + '\0').update(extracted).digest('hex');
 assert.equal(blobSha, item.git_blob_sha, 'Git content SHA mismatch ' + rel);
 if (item.mime === 'image/png') {
   png++;
   assert.equal(extracted.subarray(0,8).toString('hex'), '89504e470d0a1a0a', 'Invalid PNG ' + rel);
   assert.equal(extracted.subarray(12,16).toString('ascii'), 'IHDR', 'No IHDR ' + rel);
   assert.equal(extracted[25], 6, 'Recovered PNG must use RGBA color type ' + rel);
   if (rel.includes('-lv')) alphaPng++;
 } else if (item.mime === 'image/webp') {
   webp++;
   assert.equal(extracted.toString('ascii', 0, 4), 'RIFF', 'Invalid RIFF ' + rel);
   assert.equal(extracted.toString('ascii', 8, 12), 'WEBP', 'Invalid WebP ' + rel);
 } else if (item.mime === 'image/jpeg') {
   jpeg++;
   assert.equal(extracted.subarray(0,2).toString('hex'), 'ffd8', 'Invalid JPEG ' + rel);
   assert.equal(extracted.subarray(-2).toString('hex'), 'ffd9', 'Invalid JPEG ending ' + rel);
 } else throw Error('Unsupported format ' + rel);
 total += extracted.length;
}
assert.equal(png, 35); assert.equal(webp, 24); assert.equal(jpeg, 9);
assert.equal(alphaPng, 33, 'Existing modern Lv images must remain 33');
if (require.main === module) {
 process.stdout.write('PASS: 68 byte-identical standalone assets (' + png + ' RGBA PNG, '
  + webp + ' WebP, ' + jpeg + ' reference JPEG), total ' + total
  + ' bytes. Original C01-C09 PNGs and the improved v4.2 portraits are NOT verified.\n');
}
module.exports = { recovered: expected.length, bytes: total, png, webp, jpeg };
