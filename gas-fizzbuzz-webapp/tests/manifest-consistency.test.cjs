'use strict';
// FLOW-05 stage 6: check the canonical Manifest index against live Node Files.
// This test does not attest visual fidelity or GAS deployment.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const manifest=read('valis/summary/gas-fizzbuzz-webapp.summary.md');
function nodeFiles(){
 const all=[];
 for(const layer of ['A','B','C','D','E']){
  const dir=path.join(root,'valis/nodes',layer);
  for(const file of fs.readdirSync(dir).filter(x=>/^[A-E]\d+(?:\.\d+)*\.md$/.test(x))){
   const id=file.slice(0,-3),src=fs.readFileSync(path.join(dir,file),'utf8');
   const header=src.split(/\r?\n/,1)[0];
   const parsed=header.match(/^# ([A-E]\d+(?:\.\d+)*):（.*［(承認済み|草案)］/);
   assert.ok(parsed,'Node header missing ID/status: '+id);
   assert.equal(parsed[1],id,'Node header/path mismatch');
   assert.equal(id[0],layer,'Node file in wrong layer');
   all.push({id,status:parsed[2],src});
  }
 }
 return all;
}
const inventory=nodeFiles();
const entries=[...manifest.matchAll(/^[ \t]*([A-E]\d+(?:\.\d+)*):（[^\r\n]*［(承認済み|草案)］/gm)].map(m=>({id:m[1],status:m[2]}));
test('all 53 Node Files occur once in the Manifest structural index',()=>{
 assert.equal(inventory.length,53);
 assert.equal(entries.length,53);
 assert.equal(new Set(entries.map(x=>x.id)).size,53,'duplicate Manifest IDs');
 assert.deepEqual(entries.map(x=>x.id).sort(),inventory.map(x=>x.id).sort(),'missing/orphan Node IDs');
 const counts=Object.fromEntries(['A','B','C','D','E'].map(l=>[l,inventory.filter(x=>x.id.startsWith(l)).length]));
 assert.deepEqual(counts,{A:7,B:9,C:13,D:8,E:16});
});
test('all statuses match and the 36 approved Node Files stay approved',()=>{
 const m=new Map(entries.map(x=>[x.id,x.status]));
 for(const node of inventory)assert.equal(m.get(node.id),node.status,'status mismatch '+node.id);
 const draft=new Set(['C1.5.1','C1.5.2','C1.5.3','D1.3.1','D1.3.2','D1.3.3',...Array.from({length:11},(_,i)=>'E'+(i+6))]);
 assert.deepEqual(new Set(inventory.filter(x=>x.status==='草案').map(x=>x.id)),draft);
 assert.equal(inventory.filter(x=>x.status==='承認済み').length,36);
 assert.equal(inventory.filter(x=>x.status==='草案').length,17);
});
test('A/B/C/D hierarchy retains same-layer parent_id',()=>{
 for(const node of inventory){
  const dot=node.id.lastIndexOf('.');
  if(dot<0)continue;
  const expected=node.id.slice(0,dot);
  assert.ok(inventory.some(x=>x.id===expected),'parent file missing '+node.id);
  const match=node.src.match(/parent_id:\s*([A-D]\d+(?:\.\d+)*)/);
  assert.ok(match,'parent_id missing '+node.id);
  assert.equal(match[1],expected,'wrong parent '+node.id);
 }
 assert.match(read('valis/nodes/E/E15.md'),/parent_idなし/);
});
test('E15 is structurally indexed, not newly registered or promoted in stage 6',()=>{
 assert.match(manifest,/^initial_registration_stage5:\s*E15/m);
 assert.match(manifest,/^initial_registration_stage6:\s*なし/m);
 assert.match(manifest,/^manifest_reflection_stage6:/m);
 assert.match(manifest,/^E15:（.*［草案］$/m);
 for(const rel of [
  'operations/plans/2026-10-14-stage5-verification-plan.md',
  'operations/plans/2026-10-14-stage6-manifest-reconciliation.md',
  'operations/evidence/stage5-ci-node-chromium.md',
  'src/composite/draft-organ-sprites.js',
  'tests/browser-smoke.cjs',
  'tests/composite-runtime-contract.test.cjs',
  'assets/composite-asset-ledger.v42-draft.json'
 ]) assert.ok(fs.existsSync(path.join(root,rel)),'documented artifact absent: '+rel);
 assert.match(read('valis/nodes/E/E15.md'),/224802aa7511d26bd5036c2b600021ed556f7b85/);
});
test('three core definitions, Code.gs and pixel legacy HTML match protected Git blob SHA-1',()=>{
 const locked={
  'valis/core/VALIS Flow Definition.md':'62fc62ecb12807a130c450b6f242b8e9e674d862',
  'valis/core/VALIS Operation Definition.md':'735bd9e9f90a84f980c935520ffba2ee08335452',
  'valis/core/VALIS Summary Manifest.md':'10de55a462abcc254ce4579abf6337517eb0a94c',
  'src/Code.gs':'8741bbbb690082fa60c82a2a2bbc38fc8811882d',
  'src/Index.pixel-legacy.html':'ef7cd1222b469c2c3c24a2953adaea30a7bed1b5'
 };
 for(const [rel,expected] of Object.entries(locked)){
  const b=fs.readFileSync(path.join(root,rel));
  const got=crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
  assert.equal(got,expected,'protected baseline changed: '+rel);
 }
});
test('E15 evidence names both successful final-head CI runs and actual main merge',()=>{
 const evidence=read('operations/evidence/stage5-ci-node-chromium.md');
 for(const needle of ['38486209105','38486213825','1ded76c1109e6b0f59fd70fe04f3429294d20b9a'])assert.ok(evidence.includes(needle),needle);
 assert.match(manifest,/36承認済み/);
 assert.match(manifest,/17草案/);
 assert.match(manifest,/未完/);
});

test('E16 is a separate draft record of C01/C02 browser PNG cutouts',()=>{
 assert.match(manifest,/^initial_registration_stage7:\s*E16/m);
 assert.match(manifest,/^E16:（.*［草案］$/m);
 assert.match(read('valis/nodes/E/E16.md'),/parent_idなし/);
 assert.match(read('valis/nodes/E/E16.md'),/38491952107/);
 assert.match(read('operations/evidence/stage7-mock-cutout-browser.md'),/45\/45/);
 assert.ok(fs.existsSync(path.join(root,'src/composite/mock-atlas-sprites.js')));
});
