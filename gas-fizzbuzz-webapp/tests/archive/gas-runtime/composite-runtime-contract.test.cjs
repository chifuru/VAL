'use strict';
// D1.3.1/D1.3.2: every defined part is backed by a real embedded image or a labeled SVG draft.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'src/Index.html'),'utf8');
const blocks=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const sandbox={window:{},module:{exports:{}},console};
vm.runInNewContext(blocks[0],sandbox,{timeout:10000});
vm.runInNewContext(blocks[1],sandbox,{timeout:10000});
const engine=sandbox.module.exports,assets=sandbox.window.ASSET_CONFIG;

test('every lineage has an image for every declared organ level (without provisional SVG fallback)',()=>{
 assert.equal(engine.LINEAGES.length,14);
 let organs=0,tiers=0,drafts=0;
 for(const lineage of engine.LINEAGES){
  const definitions=engine.PART_DEFINITIONS[lineage.id];
  assert.ok(definitions?.length,'no organs for '+lineage.id);
  for(const def of definitions){
   organs++;
   const key=lineage.id+':'+def[0],atlas=assets.authoredOrgans&&assets.authoredOrgans[lineage.id];
   if(atlas){
    assert.equal(atlas.regions.length,3,'missing PNG Lv regions '+key);
    assert.ok(atlas.uri.startsWith('data:image/png;base64,'));
    assert.equal(assets.partImages[key],undefined,'authored lineage still installs fallback SVG');
    tiers+=3;
   }else{
    const urls=assets.partImages[key];
    assert.equal(urls?.length,3,'missing Lv1–Lv3 '+key);
    assert.equal(new Set(urls).size,3,'duplicated tier '+key);
    for(const url of urls){
     tiers++;
     assert.ok(assets.sources[url]?.startsWith('data:image/png;base64,'),'original PNG lost: '+key);
    }
   }
  }

 }
 assert.equal(organs,23);
 assert.equal(tiers,69);
 assert.equal(drafts,0);
 assert.equal(assets.draftOrganLineages,undefined);
});

test('N contract and lineage-crossing use the real bundled evolution engine',()=>{
 const lines=Array.from(engine.linesFor(1000));
 assert.equal(lines.length,1000);
 assert.equal(lines[14],'FizzBuzz');
 assert.equal(lines[999],'Buzz');
 const evolved=engine.runAll(480,'signal');
 assert.equal(evolved.current,480);
 assert.equal(evolved.stage,2);
 assert.equal(evolved.history.length,2);
 assert.equal(engine.LINEAGES.filter(x=>!['valis','antimeme'].includes(x.id)).length,12);
});
