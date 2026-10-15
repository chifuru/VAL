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
test('all configured atlas requests succeed under a four-loader resource limit',async()=>{
 const vm=require('node:vm');let active=0,peak=0,decoded=0;
 class LimitedImage{set src(value){active++;peak=Math.max(peak,active);if(active>4){active--;queueMicrotask(()=>this.onerror(Error('loader resource limit')));return;}setTimeout(()=>{active--;decoded++;this.onload();},1);}}
 const sandbox={window:{CreatureEngine:E},Image:LimitedImage,URL,document:{baseURI:'http://127.0.0.1/Index.html'}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'src/composite/renderer.js'),'utf8'),sandbox);
 const renderer=sandbox.window.CreatureRenderer.create({getContext:()=>({})},{files:Array.from({length:config.files.length},(_,i)=>({file:'assets/'+i+'.png'})),sprites:{}});
 await renderer.prepare();assert.equal(decoded,config.files.length);assert.ok(peak<=4);assert.equal(renderer.missingAssets().length,0);
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
 const g=new Proxy({createRadialGradient:()=>({addColorStop:()=>{}})},{get:(o,key)=>o[key]||(key==='fillText'?()=>assert.fail('no food glyph may be painted'):()=>{})}),b={motion:{mode:'aquatic'},bw:400,bh:200,sockets:{forelimb:[-60,60],hindlimb:[80,60],head:[0,-50],dorsal:[20,-50],mouth:[-60,-20]},surface:(...point)=>({point})};
 const events=[{kind:'fizz',count:1,sequence:3,time:0},{kind:'buzz',count:1,sequence:5,time:0},{kind:'fizzbuzz',count:1,sequence:15,time:0}];const state={seed:1000,current:20};
 assert.equal(F.draw(g,b,state,config,new Map(),300,false,events).length,3);assert.deepEqual(F.draw(g,b,state,config,new Map(),300,true,events),[]);assert.deepEqual(F.draw(g,b,state,config,new Map(),300,false,[{kind:'number',count:1,sequence:1,time:0}]),[]);
});

test('all160 facial landmarks match their PNG cells and define a lower jaw below the protected eye',()=>{
 const rasters=new Map();let count=0;for(const l of E.LINEAGES)for(const s of config.sprites['eco-'+l.id+':body']){
  if(!rasters.has(s.file))rasters.set(s.file,PNG.sync.read(fs.readFileSync(path.join(root,'src',s.file))));const png=rasters.get(s.file),[x,y,w,h]=s.region,a=s.anatomy,[mx,my]=a.joints.mouth,[ex,ey]=a.joints.eye;
  assert.ok(a.oral&&a.oral.radius.every(v=>v>=.03&&v<=.10));assert.ok(mx<ex&&my>ey,'jaw must sit in front of and below the iris '+l.id);assert.ok(png.data[((y+Math.round(my*h))*png.width+x+Math.round(mx*w))*4+3]>=160,'mouth is off the body '+l.id);count++;
 }assert.equal(count,160);
});
test('young and mature colony atlas has eight isolated transparent regions and retained generator provenance',()=>{
 const p=JSON.parse(fs.readFileSync(path.join(root,'design/assets/ecology/growth.json'))),bytes=fs.readFileSync(path.join(root,p.file)),png=PNG.sync.read(bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),p.sha256);assert.ok(p.method.includes('image_gen'));assert.equal(p.regions.length,8);
 for(const [x,y,w,h]of p.regions){assert.ok(w>100&&h>100);assert.ok(x>=0&&y>=0&&x+w<=png.width&&y+h<=png.height);}
 let transparent=0;for(let i=3;i<png.data.length;i+=4)if(png.data[i]<8)transparent++;assert.ok(transparent>png.width*png.height*.30,'colony atlas needs real transparent space');
 // Bilinear sampling needs a clear texel border; eight source pixels leave
 // ample room around the hand-painted glow without trimming the source art.
 for(const row of [0,1])for(let col=0;col<3;col++){const a=p.regions[row*4+col],b=p.regions[row*4+col+1];assert.ok(b[0]-a[0]-a[2]>=8,'neighboring colony sampling gutters overlap');}
 assert.ok(Math.min(...p.regions.slice(4).map(r=>r[1]))-Math.max(...p.regions.slice(0,4).map(r=>r[1]+r[3]))>=20,'growth rows overlap');
 for(let i=0;i<4;i++)assert.ok(p.regions[i+4][3]>p.regions[i][3]*1.4,'mature colony really grows');
 const plan=H.bedPlan(E.runAll(1000));assert.equal(plan.length,8);assert.equal(new Set(plan.map(p=>p.x+':'+p.y)).size,8);assert.ok(plan.every(p=>p.y>=.8));
});

test('meal reactions rise and settle as one continuous cycle without rapid double flashes',()=>{
 for(const kind of ['fizz','buzz','fizzbuzz']){const samples=Array.from({length:101},(_,i)=>F.reactions([{kind,count:1,sequence:1,time:0}],F.durations[kind]*i/100,1)[0]?.strength||0);assert.equal(samples[0],0);assert.equal(samples.at(-1),0);assert.ok(samples[50]>.99);for(let i=1;i<=50;i++)assert.ok(samples[i]>=samples[i-1]);for(let i=51;i<samples.length;i++)assert.ok(samples[i]<=samples[i-1]);assert.ok(Math.max(...samples.slice(1).map((v,i)=>Math.abs(v-samples[i])))<.04);}
});

test('habitat flora preserves generator bytes and provides four different tall and ground silhouettes',()=>{
 const meta=JSON.parse(fs.readFileSync(path.join(root,'design/assets/ecology/habitat-flora.json'))),bytes=fs.readFileSync(path.join(root,meta.file)),png=PNG.sync.read(bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);assert.ok(meta.method.includes('image_gen'));assert.equal(meta.regions.length,8);const hashes=new Set();let clear=0;for(let i=3;i<png.data.length;i+=4)if(png.data[i]<8)clear++;assert.ok(clear>png.width*png.height*.35);
 for(const [i,[x,y,w,h]]of meta.regions.entries()){assert.ok(x>=0&&y>=0&&x+w<=png.width&&y+h<=png.height);assert.ok(i<4?h>w*1.4:w>h*1.5);const digest=crypto.createHash('sha256');let opaque=0;for(let yy=y;yy<y+h;yy++){digest.update(png.data.subarray((yy*png.width+x)*4,(yy*png.width+x+w)*4));for(let xx=x;xx<x+w;xx++)if(png.data[(yy*png.width+xx)*4+3]>160)opaque++;}assert.ok(opaque>1000);hashes.add(digest.digest('hex'));for(const other of meta.regions.slice(i+1)){assert.ok(x+w<=other[0]||other[0]+other[2]<=x||y+h<=other[1]||other[1]+other[3]<=y,'sampling regions overlap');}}
 assert.equal(hashes.size,8);assert.equal(config.files.length,68);
});
test('life ecology uses all24 habitat poses and continuous turns',()=>{
 const state=E.runAll(1000),saved=JSON.stringify(state),first=H.lifePlan(state,1000);assert.equal(first.length,24);assert.equal(new Set(first.map(f=>f.region)).size,24);assert.equal(new Set(first.map(f=>f.group)).size,3);
 for(let t=0;t<=20000;t+=71){const a=H.lifePlan(state,t),b=H.lifePlan(state,t+1);for(let i=0;i<a.length;i++){assert.ok(Math.abs(a[i].yaw-b[i].yaw)<.005,'turn must not flip instantly');assert.ok(Math.hypot(a[i].x-b[i].x,a[i].y-b[i].y)<.001);assert.ok(a[i].x>=0&&a[i].x<=1&&a[i].y>=0&&a[i].y<=1);assert.ok(a[i].alpha>=0&&a[i].alpha<=1);}}
 for(let kind=0;kind<4;kind++)assert.equal(first.filter(f=>f.kind===kind).length,6);assert.deepEqual(H.lifePlan(JSON.parse(saved),1000),first);assert.equal(JSON.stringify(state),saved);assert.ok(H.lifePlan(E.initial(1000),1000).every(f=>f.alpha===0));
});
test('habitat plants and key/fill illumination blend continuously with the planned ecology',()=>{
 const base=E.runAll(1000),keys=new Set();for(let k=0;k<4;k++){const w=[0,0,0,0];w[k]=1;const state={...base,environmentPlan:{...base.environmentPlan,weights:[w,w]}},plan=H.floraPlan(state),light=H.lightingFor(state);assert.equal(plan.filter(p=>p.alpha>0).length,2);assert.ok(plan.filter(p=>p.alpha>0).every(p=>p.kind===k));assert.notDeepEqual(light.key,light.fill);keys.add(light.key.join(','));}
 assert.equal(keys.size,4);const a=H.floraPlan({...base,environmentPlan:{...base.environmentPlan,weights:[[.6,.4,0,0],[.6,.4,0,0]]}}),b=H.floraPlan({...base,environmentPlan:{...base.environmentPlan,weights:[[.6001,.3999,0,0],[.6001,.3999,0,0]]}});assert.ok(a.every((p,i)=>Math.abs(p.alpha-b[i].alpha)<.001));
});
test('twenty source lineages have bounded distinct materials while historical versions bypass the style',()=>{
 const vm=require('node:vm'),sandbox={window:{CreatureEngine:E,FoodScene:F,EnvironmentScene:H}};vm.runInNewContext(fs.readFileSync(path.join(root,'src/composite/renderer.js'),'utf8'),sandbox);const fn=sandbox.window.CreatureRenderer.materialFor,state=E.runAll(1000),styles=new Set();for(const l of E.LINEAGES){const m=fn({version:5,bodyLineage:l.id},state);assert.equal(m.id,l.id);assert.ok(m.contrast>=1&&m.contrast<=1.2&&m.saturation>=1&&m.saturation<=1.2&&m.emission>0&&m.emission<=1&&m.wave>=.6&&m.wave<=1.2);styles.add([m.contrast,m.saturation,m.rim,m.wave,m.lag].join(','));}assert.equal(styles.size,20);for(const version of [1,2,3,4])assert.equal(fn({version},state),null);
});

test('growth gestures follow actual stage and part level increases and remain bounded/idempotent',()=>{
 let s=E.initial(1000),events=[],stages=[],organs=0;
 for(let row=1;row<=1000;row++){const previous=s,before=E.appearanceFor(s);s=E.step(s,E.fmtFizzBuzz(row));const after=E.appearanceFor(s),saved=JSON.stringify(s);events=F.advanceGrowth(events,previous,s,before,after,row*100);assert.ok(events.length<=2);const current=events.filter(e=>e.sequence===row);for(const e of current){if(e.type==='evolution'){assert.ok(s.stage>previous.stage);stages.push(e.to);}else{assert.ok(e.sites.length>0&&e.sites.length<=4);organs++;}}assert.deepEqual(F.advanceGrowth(events,previous,s,before,after,row*100),events);assert.equal(JSON.stringify(s),saved);}
 assert.deepEqual(stages,[1,2,3]);assert.ok(organs>15);assert.deepEqual(F.advanceGrowth(events,s,E.initial(927),E.appearanceFor(s),E.appearanceFor(E.initial(927)),1e6),[]);
});
test('growth presentation rejects future/expired events and has one smooth cycle',()=>{
 for(const type of ['evolution','organ']){const duration=type==='evolution'?1800:1100,event={type,sites:['dorsal'],sequence:600,time:100};assert.deepEqual(F.growthReactions([event],99,600),[]);assert.deepEqual(F.growthReactions([event],300,599),[]);assert.deepEqual(F.growthReactions([event],100+duration,600),[]);assert.equal(F.growthReactions([event,event],100+duration/2,600).length,1);const peak=F.growthReactions([event],100+duration/2,600)[0];assert.equal(peak.strength,1);assert.equal(peak.duration,duration);}
 assert.deepEqual(F.growthReactions([{type:'number',sequence:1,time:0}],1,1),[]);
});

test('overlapping fast food milestones carry the visible light level instead of cutting to black',()=>{
 let previous=E.initial(1000),events=[],overlaps=0;for(let row=1;row<=1000;row++){const next=E.step(previous,E.fmtFizzBuzz(row)),time=row*50,old=F.reactions(events,time,row),updated=F.advanceEvents(events,previous,next,time);for(const e of updated.filter(e=>e.sequence===row)){const before=old.find(v=>v.kind===e.kind)?.strength||0,after=F.reactions(updated,time,row).find(v=>v.kind===e.kind).strength;assert.ok(Math.abs(before-after)<1e-9);if(before>0)overlaps++;}events=updated;previous=next;}assert.ok(overlaps>10);
});

test('shared habitat currents are bounded, continuous and distinct for all four habitats',()=>{
 const base=E.runAll(1000),seen=new Set();for(let k=0;k<4;k++){const w=[0,0,0,0];w[k]=1;const state={...base,environmentPlan:{...base.environmentPlan,weights:[w,w]}};seen.add(JSON.stringify(H.flowFor(state,1234)));for(let t=0;t<20000;t+=137){const a=H.flowFor(state,t),b=H.flowFor(state,t+1);assert.ok(Math.abs(a.x)<=1.3&&Math.abs(a.y)<=.5&&Math.abs(a.wind)<=.018);assert.ok(Math.abs(a.x-b.x)<.001&&Math.abs(a.wind-b.wind)<.00001);assert.deepEqual(H.flowFor(JSON.parse(JSON.stringify(state)),t),a);}}assert.equal(seen.size,4);
});
test('native habitat plants sway at a fixed root and have a stable still pose',()=>{
 const s=E.runAll(1000);for(const p of H.floraPlan(s)){const poses=[0,500,1400].map(t=>H.floraPoseFor(s,p,t,false));assert.ok(new Set(poses.map(p=>p.angle)).size===3);for(const pose of poses){assert.equal(pose.x,p.x);assert.equal(pose.y,p.y);assert.ok(Math.abs(pose.angle)<.025&&Math.abs(pose.stretch-1)<.003);}assert.deepEqual(H.floraPoseFor(s,p,0,true),H.floraPoseFor(s,p,100000,true));}
});
test('mineral and information ecology use all eight real regions with fixed bounded placement',()=>{
 const s=E.runAll(1000),saved=JSON.stringify(s),plan=H.resourcePlan(s,1000);assert.equal(plan.length,16);for(const kind of [1,2]){const group=plan.filter(p=>p.kind===kind);assert.equal(new Set(group.map(p=>p.region)).size,8);assert.ok(group.every(p=>p.alpha>=0&&p.alpha<=.42&&p.size<=47));}for(let t=0;t<10000;t+=113){const a=H.resourcePlan(s,t),b=H.resourcePlan(s,t+1);for(let i=0;i<a.length;i++){assert.ok(Math.hypot(a[i].x-b[i].x,a[i].y-b[i].y)<.0001);if(a[i].kind===1)assert.deepEqual(a[i],b[i]);}}assert.deepEqual(H.resourcePlan(s,0,true),H.resourcePlan(s,10000,true));assert.ok(H.resourcePlan(E.initial(1000),0).every(p=>p.alpha===0));assert.equal(JSON.stringify(s),saved);
});
test('twenty lineage kinetics and body-specific feeding profiles stay distinct and restrained',()=>{
 const vm=require('node:vm'),sandbox={window:{CreatureEngine:E}};vm.runInNewContext(fs.readFileSync(path.join(root,'src/composite/renderer.js'),'utf8'),sandbox);const profiles=new Set();for(const l of E.LINEAGES){const a={version:5,bodyLineage:l.id,bodyPlan:l.bodyPlan},p=sandbox.window.CreatureRenderer.kineticsFor(a);profiles.add(JSON.stringify(p));assert.ok(p.tempo>=.6&&p.tempo<=1.2&&p.sway>=.4&&p.sway<=1.2);for(const kind of ['fizz','buzz','fizzbuzz']){const motion=F.motionProfileFor(l.bodyPlan,kind);assert.ok(Math.abs(motion.squeeze)<=.031&&Math.abs(motion.bend)<=.015);}}assert.equal(profiles.size,20);assert.equal(F.motionProfileFor('avian','number'),null);assert.equal(sandbox.window.CreatureRenderer.kineticsFor({version:4}),null);
});
test('overlapping real part-growth events continue the visible envelope without restarting at zero',()=>{
 let s=E.initial(1000),events=[],overlaps=0;for(let row=1;row<=1000;row++){const prev=s;s=E.step(s,E.fmtFizzBuzz(row));const time=row*20,old=F.growthReactions(events,time,row),next=F.advanceGrowth(events,prev,s,E.appearanceFor(prev),E.appearanceFor(s),time);for(const e of next.filter(e=>e.sequence===row)){const before=old.find(v=>v.type===e.type)?.strength||0,after=F.growthReactions(next,time,row).find(v=>v.type===e.type).strength;assert.ok(Math.abs(before-after)<1e-9);if(before>0)overlaps++;}events=next;}assert.ok(overlaps>0);
});

test('habitat wildlife has 24 complete independent source poses and continuous habitat membership',()=>{
 const meta=require('../design/assets/ecology/habitat-life.json'),bytes=fs.readFileSync(path.join(root,meta.file)),p=PNG.sync.read(bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);assert.equal(meta.regions.length,24);assert.equal(config.food['habitat-life'].regions.length,24);
 for(let i=0;i<24;i++){const [x,y,w,h]=meta.regions[i];assert.ok(w>100&&h>100&&x>=0&&y>=0&&x+w<=p.width&&y+h<=p.height);assert.ok(meta.solidComponents[i]>10000);for(let j=i+1;j<24;j++){const [a,b,c,d]=meta.regions[j];assert.ok(x+w<=a||a+c<=x||y+h<=b||b+d<=y,'no overlapping wildlife sampling rectangles');}}
 const base=E.runAll(1000);for(let k=0;k<4;k++){const w=[0,0,0,0];w[k]=1;const s={...base,environmentPlan:{...base.environmentPlan,weights:[w,w]}},visible=H.lifePlan(s,1000).filter(p=>p.alpha>0);assert.equal(visible.length,6);assert.ok(visible.every(p=>p.kind===k));assert.equal(new Set(visible.map(p=>p.region)).size,6);const change=w.map(v=>v*.999);change[(k+1)%4]+=.001;const next=H.lifePlan({...s,environmentPlan:{...s.environmentPlan,weights:[change,change]}},1000),old=H.lifePlan(s,1000);assert.ok(next.every((p,i)=>Math.abs(p.alpha-old[i].alpha)<.001));}
});
test('ambient loops fade before wrapping and remain deterministic and bounded',()=>{
 const s=E.runAll(1000),saved=JSON.stringify(s);for(let t=0;t<250000;t+=347){const a=H.particlePlan(s,t),b=H.particlePlan(s,t+1);assert.equal(a.length,48);assert.deepEqual(H.particlePlan(JSON.parse(saved),t),a);for(let i=0;i<48;i++){assert.ok(a[i].x>=0&&a[i].x<=1&&a[i].y>=0&&a[i].y<=1);assert.ok(a[i].alpha>=0&&a[i].alpha<=.28);assert.ok(Math.abs(a[i].alpha-b[i].alpha)<.001);if(Math.abs(a[i].y-b[i].y)>.9)assert.ok(a[i].alpha+b[i].alpha<.00001,'wrap occurs invisibly');}}assert.equal(JSON.stringify(s),saved);
});
