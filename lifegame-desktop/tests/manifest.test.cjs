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
  for (const name of ['VALIS Operation Definition.md', 'VALIS Summary Manifest.md', 'VALIS Flow Definition.md']) assert.deepEqual(fs.readFileSync(path.join(root, 'valis/core', name)), fs.readFileSync(path.join(root, '../valis/core', name)));
});
