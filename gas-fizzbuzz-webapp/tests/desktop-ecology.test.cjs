'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{PNG}=require('pngjs');
const E=require('../src/composite/creature-engine'),F=require('../src/composite/food-scene'),H=require('../src/composite/environment-scene'),config=require('../src/assets/creatures/config.json'),root=path.resolve(__dirname,'..');
test('only count milestones trigger gestures; numeric rows never create one',()=>{
 let previous=E.initial(1000),events=[],created={fizz:[],buzz:[],fizzbuzz:[],number:[]};
 for(let row=1;row<=1000;row++){
  const next=E.step(previous,E.fmtFizzBuzz(row)),time=row*200,saved=JSON.stringify(next);events=F.advanceEvents(events,previous,next,time);
  for(const event of events.filter(e=>e.sequence===row))created[event.kind].push(event.count);
  assert.ok(events.length<=3);assert.equal(new Set(events.map(e=>e.kind)).size,events.length);assert.deepEqual(F.advanceEvents(events,previous,next,time),events,'same row cannot replay a milestone');assert.equal(JSON.stringify(next),saved);previous=next;
 }
 assert.deepEqual(Object.fromEntries(Object.entries(created).map(([k,v])=>[k,v.length])),{fizz:67,buzz:67,fizzbuzz:66,number:0});
 assert.deepEqual(created.fizz.slice(0,4),[1,5,9,13]);assert.deepEqual(created.buzz.slice(0,4),[1,3,5,7]);assert.equal(created.fizzbuzz[0],1);
 assert.deepEqual(F.advanceEvents(events,previous,E.initial(927),200001),[],'new input cannot inherit gestures');
});
test('gestures last their fixed duration across following rows and cannot duplicate or anticipate output',()=>{
 const events=[{kind:'fizz',count:1,sequence:3,time:100},{kind:'buzz',count:1,sequence:5,time:300},{kind:'fizzbuzz',count:1,sequence:15,time:500}];
 assert.equal(F.reactions([...events,...events],600,16).length,3);assert.equal(F.reactions(events,99,16).length,0);assert.equal(F.reactions(events,600,2).length,0);
 assert.deepEqual(F.reactions(events,1100,18).map(e=>e.kind),['buzz','fizzbuzz']);assert.equal(F.reactions(events,1900,20).length,0);
 assert.deepEqual(F.reactions([{kind:'number',count:1,sequence:1,time:100}],300,3),[]);
 assert.deepEqual(F.reactions([{kind:'fizz',count:2,sequence:6,time:100}],300,6),[]);
 assert.deepEqual(F.reactions(events,600,99).map(e=>e.duration),[900,1100,1400]);
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
test('all65 atlas requests succeed under a four-loader resource limit',async()=>{
 const vm=require('node:vm');let active=0,peak=0,decoded=0;
 class LimitedImage{set src(value){active++;peak=Math.max(peak,active);if(active>4){active--;queueMicrotask(()=>this.onerror(Error('loader resource limit')));return;}setTimeout(()=>{active--;decoded++;this.onload();},1);}}
 const sandbox={window:{CreatureEngine:E},Image:LimitedImage,URL,document:{baseURI:'http://127.0.0.1/Index.html'}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'src/composite/renderer.js'),'utf8'),sandbox);
 const renderer=sandbox.window.CreatureRenderer.create({getContext:()=>({})},{files:Array.from({length:65},(_,i)=>({file:'assets/'+i+'.png'})),sprites:{}});
 await renderer.prepare();assert.equal(decoded,65);assert.ok(peak<=4);assert.equal(renderer.missingAssets().length,0);
});
test('all four habitat layers accumulate monotonically, survive time and JSON restoration, and have upper bounds',()=>{
 let s=E.initial(1000),levels=H.levelsFor(s);assert.deepEqual(levels,[0,0,0,0]);
 for(const line of E.linesFor(1000)){const previous=levels;s=E.step(s,line);levels=H.levelsFor(s);assert.ok(levels.every((v,i)=>v>=previous[i]&&v<=1));}
 assert.deepEqual(levels,[1,1,1,1]);assert.deepEqual(H.levelsFor(JSON.parse(JSON.stringify(s))),levels);
 assert.deepEqual(H.levelsFor({...s,foods:{fizz:1e9,buzz:1e9,fizzbuzz:1e9,number:1e9}}),[1,1,1,1]);
 assert.ok(H.levelsFor(E.step(E.initial(1000),'1'))[3]>0,'first numeric row changes scenery');
});
test('reaction profiles keep minerals on the ground, information localized, and numbers off the creature',()=>{
 const sites=new Set();for(const bodyPlan of [...new Set(E.LINEAGES.map(l=>l.bodyPlan))]){
  assert.equal(F.profileFor(bodyPlan,'fizz').site,'mouth');assert.equal(F.profileFor(bodyPlan,'buzz').site,'ground');const p=F.profileFor(bodyPlan,'fizzbuzz');assert.ok(['head','dorsal'].includes(p.site));sites.add(p.site);assert.equal(F.profileFor(bodyPlan,'number'),null);
 }
 assert.equal(sites.size,2);
 const g=new Proxy({createRadialGradient:()=>({addColorStop:()=>{}})},{get:(o,key)=>o[key]||(key==='drawImage'||key==='fillText'?()=>assert.fail('no food sprite or glyph may travel into the animal'):()=>{})}),b={motion:{mode:'aquatic'},bw:400,bh:200,sockets:{forelimb:[-60,60],hindlimb:[80,60]}};
 const events=[{kind:'fizz',count:1,sequence:3,time:0},{kind:'buzz',count:1,sequence:5,time:0},{kind:'fizzbuzz',count:1,sequence:15,time:0}];const state={current:20};
 assert.equal(F.draw(g,b,state,config,new Map(),300,false,events).length,3);assert.deepEqual(F.draw(g,b,state,config,new Map(),300,true,events),[]);assert.deepEqual(F.draw(g,b,state,config,new Map(),300,false,[{kind:'number',count:1,sequence:1,time:0}]),[]);
});
