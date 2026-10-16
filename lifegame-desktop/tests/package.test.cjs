'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const {checksums, sha} = require('../tools/package-windows.cjs');
test('D4: generated checksums include nested assets, normalize paths and exclude the manifest itself', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'lifegame-check-'));
  try {
    await fs.mkdir(path.join(tmp, 'resources')); await fs.writeFile(path.join(tmp, 'resources', 'app.asar'), 'test payload'); await fs.writeFile(path.join(tmp, 'LifeGame.exe'), 'fixture');
    const first = await checksums(tmp), second = await checksums(tmp); assert.deepEqual(first, second); assert.equal(first.length, 2);
    assert.ok(first.includes(await sha(path.join(tmp, 'resources', 'app.asar')) + '  resources/app.asar'));
    await fs.writeFile(path.join(tmp, 'resources', 'app.asar'), 'changed'); assert.notDeepEqual(await checksums(tmp), first);
  } finally { await fs.rm(tmp, {recursive: true, force: true}); }
});
