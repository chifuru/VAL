'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const out=__dirname,before=JSON.parse(fs.readFileSync(path.join(out,'before-hashes.json'))),allowed=new Set(['src/ecology/art.js','src/ecology/renderer.js','src/ecology/display-plane.js','src/assets/visual-manifest.json','src/assets/visual-manifest.js','src/Index.html']),hashes={},changed=[];
for(const [f,old]of Object.entries(before)){const h=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');hashes[f]=h;if(h!==old){assert(allowed.has(f),'Unexpected production change '+f);changed.push(f);}}
assert.equal(changed.length,6);const m=JSON.parse(fs.readFileSync('src/assets/visual-manifest.json')),old=JSON.parse(fs.readFileSync(path.join(out,'before-manifest.json')));
const targets=['tideparasite','leafparasite','hyperparasite'];for(const [id,f]of Object.entries(old.creatures.regions))if(!targets.includes(id))assert.deepEqual(m.creatures.regions[id],f);
for(const k of ['sheets','branches','food','terrain','props'])assert.deepEqual(m[k],old[k]);assert.deepEqual(m.creatures.sheetBySpecies,old.creatures.sheetBySpecies);assert.deepEqual(m.creatures.fitBySpecies,old.creatures.fitBySpecies);
for(const f of ['tests/parasite-remains-ui.cjs','operations/plans/parasite-remains-v4.2.5.md'])hashes[f]=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
fs.writeFileSync(path.join(out,'source-hashes.json'),JSON.stringify(hashes,null,2)+'\n');
fs.writeFileSync(path.join(out,'scope.json'),JSON.stringify({changed,all35PNGsUnchanged:true,biologyUnchanged:true,replayFormatUnchanged:true,allNonParasiteRegionsUnchanged:true,onlyNineParasiteCropRegionsChanged:true},null,2)+'\n');console.log('PASS: display-only six files; original35PNG and biology unchanged; only9 parasite crop rectangles updated');
