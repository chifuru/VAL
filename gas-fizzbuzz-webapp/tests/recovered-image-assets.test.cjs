'use strict';
// Asset checks exercise recovered GitHub binaries, not only HTML text matches.
const test = require('node:test');
const assert = require('node:assert/strict');
test('68 recovered standalone image sources match the exact GAS inline bytes', () => {
 const checked = require('../tools/verify-composite-assets.cjs');
 assert.equal(checked.recovered,68);
 assert.equal(checked.png,35);
 assert.equal(checked.webp,24);
 assert.equal(checked.jpeg,9);
 assert.ok(checked.bytes > 2_000_000);
});
