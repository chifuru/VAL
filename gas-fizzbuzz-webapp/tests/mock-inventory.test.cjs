'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('Git mock inventory retains each PNG and reports provenance from actual source hashes',()=>{
 const inventory=JSON.parse(fs.readFileSync(path.join(root,'design/mockups/git-assets-inventory.json')));
 assert.ok(inventory.files.length>0,'empty mock inventory');
 const paths=new Set();
 for(const row of inventory.files){
  assert.ok(row.path.startsWith('design/')&&!row.path.split('/').includes('..'));
  assert.ok(!paths.has(row.path),'duplicate path');paths.add(row.path);
  const bytes=fs.readFileSync(path.join(root,row.path));
  assert.equal(hash(bytes),row.sha256,'changed mock '+row.path);
  assert.equal(bytes.length,row.bytes);
  assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],row.dimensions);
 }
 for(const cut of inventory.cutout_provenance){
  const matches=inventory.files.filter(row=>row.sha256===cut.source_sha256).map(row=>row.path);
  assert.deepEqual(cut.matching_uploaded_sources,matches,'source verification mismatch');
  assert.equal(cut.source_verification,matches.length?'matched':'unresolved: recorded source hash not present in design');
  const bytes=fs.readFileSync(path.join(root,'design/mock-stage7-parts-draft/assets/mock-origin',cut.path));
  assert.equal(hash(bytes),cut.sha256,'cutout changed '+cut.path);
 }
 assert.ok(!fs.existsSync(path.join(root,'../mock-stage7-parts-draft')),'external duplicate checkout placement');
});
