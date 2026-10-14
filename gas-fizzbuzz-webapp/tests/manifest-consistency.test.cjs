'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Manifest uniquely registers every Node, keeps parent IDs in its layer and maintains specification approval boundaries',()=>{
 const manifest=read('valis/summary/gas-fizzbuzz-webapp.summary.md'),ids=new Set(),counts={};let approved=0;
 for(const layer of ['A','B','C','D','E'])for(const name of fs.readdirSync(path.join(root,'valis/nodes',layer))){if(!name.endsWith('.md'))continue;const id=name.slice(0,-3),p='valis/nodes/'+layer+'/'+name,s=read(p);assert.ok(!ids.has(id));ids.add(id);counts[layer]=(counts[layer]||0)+1;assert.match(s,new RegExp('^# '+id.replaceAll('.','\\.')+':'));assert.equal((manifest.match(new RegExp('^\\s*'+id.replaceAll('.','\\.')+':','gm'))||[]).length,1,'index '+id);assert.ok(manifest.includes('Node File: '+p),'path '+id);const status=s.match(/［([^］]+)］/)[1];if(status==='承認済み')approved++;assert.equal(status,'草案');const parent=s.match(/parent_id:\s*([A-E]\d+(?:\.\d+)*)/);if(parent){assert.equal(parent[1][0],layer);assert.equal(id.slice(0,id.lastIndexOf('.')),parent[1]);assert.ok(fs.existsSync(path.join(root,'valis/nodes',layer,parent[1]+'.md')));}const refs=[...s.matchAll(/\b([A-E]\d+(?:\.\d+)*)\b/g)].map(m=>m[1]);for(const ref of refs)assert.ok(fs.existsSync(path.join(root,'valis/nodes',ref[0],ref+'.md')),'missing '+ref+' from '+id);}
 assert.deepEqual({A:counts.A,B:counts.B,C:counts.C,D:counts.D},{A:9,B:11,C:17,D:10});assert.ok(counts.E>=21);assert.equal(approved,0);assert.equal(ids.size,47+counts.E);assert.ok(manifest.includes('全'+ids.size+'ノード')); assert.match(manifest,/initial_registration_this_change:.*E23/);
});
test('historical A/B version remains archived exactly; current definitions are all drafts',()=>{
 const proof=JSON.parse(read('operations/evidence/desktop-ab-approval/reflection.json'));assert.equal(proof.approved_nodes.length,20);for(const item of proof.approved_nodes){assert.equal(crypto.createHash('sha256').update(read(item.canonical_path.replace('valis/nodes/','operations/archive/pre-input-evolution-valis/nodes/'))).digest('hex'),item.approved_sha256,item.id);}
});
test('all core definitions and original root PNG mocks remain byte-identical to the pre-migration baseline',()=>{
 const baseline=JSON.parse(read('design/assets/desktop-baseline.json'));assert.ok(Object.keys(baseline.files).length>=12);for(const [p,sha]of Object.entries(baseline.files)){const bytes=fs.readFileSync(path.join(root,p));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sha,p);}
});
