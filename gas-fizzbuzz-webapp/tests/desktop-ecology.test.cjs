'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{PNG}=require('pngjs');
const E=require('../src/composite/creature-engine'),F=require('../src/composite/food-scene'),H=require('../src/composite/environment-scene'),config=require('../src/assets/creatures/config.json'),root=path.resolve(__dirname,'..');
test('ambient encounters cycle through three ecologies and four variants with bounded lifetime, without awarding food',()=>{
 const s=E.runAll(750),before=JSON.stringify(s),variants={life:new Set(),mineral:new Set(),information:new Set()},ids=new Set();
 for(let time=0;time<24000;time+=100){const pool=F.encounters(s.seed,time);assert.ok(pool.length<=9);for(const e of pool){assert.ok(e.age>=0&&e.age<3500);assert.ok(e.opacity>=0&&e.opacity<=1);variants[e.type].add(e.variant);ids.add(e.id);}assert.deepEqual(pool,F.encounters(s.seed,time));}
 for(const v of Object.values(variants))assert.equal(v.size,4);assert.ok(ids.size>9);assert.equal(JSON.stringify(s),before);
 const events=[{kind:'fizz',time:100},{kind:'buzz',time:200},{kind:'fizzbuzz',time:300},{kind:'number',time:400},{kind:'fizz',time:1001},{kind:'fizz',time:-1000}];
 assert.deepEqual(F.consumption(events,500).map(e=>e.type),['life','mineral','information',null]);assert.equal(F.consumption(events,2000).length,0);
});
test('habitat rendering uses stable precomputed mixture, normalized weights and smooth phase transition',()=>{
 let s=E.initial(1000),maxJump=0,previous=H.weightsFor(s);
 for(const line of E.linesFor(1000)){s=E.step(s,line);const weights=H.weightsFor(s);assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-9);assert.ok(weights.every(v=>v>=0&&v<=1));maxJump=Math.max(maxJump,...weights.map((v,i)=>Math.abs(v-previous[i])));assert.deepEqual(H.weightsFor({...s,currentEnvironment:'void'}),weights);previous=weights;}
 assert.ok(maxJump<.06,'no whole-background flash at phase boundary');
});
test('new integrated lineages have eight distinct real PNG regions, and ecology images retain checked provenance',()=>{
 for(const l of E.LINEAGES){const regions=config.sprites['eco-'+l.id+':body'];assert.equal(regions.length,8);const image=PNG.sync.read(fs.readFileSync(path.join(root,'src',regions[0].file))),hashes=new Set();
  for(const s of regions){const [x,y,w,h]=s.region;const hash=crypto.createHash('sha256');let solid=0,clear=0;for(let yy=y;yy<y+h;yy++){hash.update(image.data.subarray((yy*image.width+x)*4,(yy*image.width+x+w)*4));for(let xx=x;xx<x+w;xx++){const a=image.data[(yy*image.width+xx)*4+3];if(a>160)solid++;if(a<8)clear++;}}assert.ok(solid>1000&&clear>100);hashes.add(hash.digest('hex'));}assert.equal(hashes.size,8,l.id);
 }
 for(const [folder,names]of [['food',['life','mineral','information']],['environments',['tide','heat','signal','void']]])for(const id of names){const p=JSON.parse(fs.readFileSync(path.join(root,'design/assets/ecology',id+'.json'))),bytes=fs.readFileSync(path.join(root,p.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),p.sha256);assert.ok(p.method.includes('image_gen'));assert.equal(p.regions.length,folder==='food'?8:1);}
});
test('neighbor-only exclusion rectangles stay inside their source cell and do not erase the integrated body',()=>{
 let excluded=0;for(const [key,list]of Object.entries(config.sprites)){if(!key.startsWith('eco-'))continue;for(const s of list){const [,,w,h]=s.region;let area=0;for(const [x,y,rw,rh]of s.exclusions){assert.ok(x>=0&&y>=0&&rw>0&&rh>0&&x+rw<=w&&y+rh<=h);area+=rw*rh;}assert.ok(area<w*h*.08,'isolation removes too much body '+key);excluded+=area;}}
 assert.ok(excluded>100,'overlapping neighbor tentacles have explicit source geometry');
});
test('all65 atlas requests succeed under a four-decoder resource limit',async()=>{
 const vm=require('node:vm');let active=0,peak=0,decoded=0;
 class LimitedImage{async decode(){active++;peak=Math.max(peak,active);if(active>4){active--;throw Error('decoder resource limit');}await new Promise(r=>setTimeout(r,1));active--;decoded++;}}
 const sandbox={window:{CreatureEngine:E},Image:LimitedImage,URL,document:{baseURI:'http://127.0.0.1/Index.html'}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'src/composite/renderer.js'),'utf8'),sandbox);
 const renderer=sandbox.window.CreatureRenderer.create({getContext:()=>({})},{files:Array.from({length:65},(_,i)=>({file:'assets/'+i+'.png'})),sprites:{}});
 await renderer.prepare();assert.equal(decoded,65);assert.ok(peak<=4);assert.equal(renderer.missingAssets().length,0);
});
