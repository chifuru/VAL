'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
function readNodes() {
  return ['A', 'B', 'C', 'D', 'E'].flatMap(layer => {
    const dir = path.join(root, 'valis/nodes', layer);
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => ({file: 'valis/nodes/' + layer + '/' + f, ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').split('---')[1])})) : [];
  });
}
test('VALIS: every node has valid hierarchy, references, manifest entry and real source/test paths', () => {
  const nodes = readNodes(), ids = new Set(nodes.map(n => n.id));
  const summary = fs.readFileSync(path.join(root, 'valis/summary/lifegame-desktop.summary.md'), 'utf8');
  for (const n of nodes) {
    assert.equal(n.status, '草案'); assert.ok(summary.includes(n.file), n.file);
    const parent = n.id.includes('.') ? n.id.slice(0, n.id.lastIndexOf('.')) : null;
    assert.equal(n.parent_id, parent); if (parent) assert.ok(ids.has(parent));
    for (const field of ['derived_from', 'implements', 'verifies', 'evidence_for', 'related_to']) for (const id of n[field] || []) assert.ok(ids.has(id), n.id + ' -> ' + id);
    for (const file of [...n.files || [], ...n.tests || [], ...n.logs || []]) assert.ok(fs.existsSync(path.join(root, file)), n.id + ': missing ' + file);
    if (n.layer === 'E') assert.ok(n.evidence_for.length && n.version, 'Evidence identifies a plan and version');
  }
  const hashes = {'VALIS Operation Definition.md':'30174a1cf1a4c2d46911db0be7a975651390d6f0bc51d64eb7391560f6ca3b50','VALIS Summary Manifest.md':'8d786bfe106c1a479ae03d7da4c44e1df593d41794bc9315e91a181889f6271f','VALIS Flow Definition.md':'911ae9f4a09ebfc6a886970eb73a1f72789047f04a28f2e83e2ea1cc584637da'};
  for (const [name, expected] of Object.entries(hashes)) assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'valis/core', name))).digest('hex'), expected);
});
