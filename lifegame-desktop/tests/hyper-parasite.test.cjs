"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const Factory=require("../design/advantage-switches/model.cjs");
const flags={producer:false,waterbug:false,hyperparasite:false},E=Factory.model(flags),S=E.S;
const base={seed:"hyper-parasite-contract",width:16,height:12,initial:4,lineages:"manual",selected:["ryouki"],ageModel:"life/1",ecologyRevision:"observation/4.1",producerModel:"colony/1",largePlantModel:"independent/1",ryoukiModel:"ryouki/1",primaryParasiteModel:"primary/1",hyperParasiteModel:"hyper/1"};
const dna=()=>Object.fromEntries(S.DNA.map(k=>[k,.5]));
function fixture(){
 const w=E.create({...base,width:8,height:8,initial:0,enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:true}});
 w.tiles=w.tiles.map(t=>({...t,env:3,terrain:"plain",light:1,soilM:5,cover:"none",blocked:false,walls:[]}));
 w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];w.messages=[];w.primaryInocula=[];w.hyperInocula=[];w.searchQ=[];w.turn=0;
 // Isolate lifecycle boundaries from an unrelated stochastic P exclusion.
 w.config.hyperParasiteSettings.exclusionRate=0;
 w.config.enabled={main:true,plant:true,fungus:true,prey:true,P:true,Q:true};return w;
}
function host(w,id="host",options={}){const o=S.organism(w,S.D.byId.solar,S.index(w,3,3),id,{dna:dna(),age:30,E:20,...options});w.organisms.push(o);return o;}
function primary(w,o,options={}){const p=S.infection(w,options.species||"leafparasite",o.id,0,options.origin||o.id);Object.assign(p,{stage:"terminal",counter:8,E:1,matureAt:0,...options});o.infection=p;return p;}
function attached(w,p,options={}){const {hyper,...ordinary}=options,q=S.HyperParasite.create(w,p.id,0,options.origin||p.id);Object.assign(q,ordinary);if(hyper)Object.assign(q.hyper,hyper);p.q=q;return q;}
function adult(w,cell=27,options={}){const q=S.HyperParasite.create(w,null,0,options.origin||"adult");Object.assign(q,{phase:4,age:20,bornAt:-20,B:.03,E:.5,cell,...options});q.hyper.state="adult";q.hyper.settledAt=-1;w.searchQ.push(q);return q;}
function reset(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);return E.context(w);}
function check(w){assert.deepEqual(E.invariants(w),[]);}
function close(a,b){assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);}
function laying(n=0,turn=1,change=null){const w=fixture(),h=host(w),p=primary(w,h),q=adult(w,26,{origin:`laying-parent:${n}`});w.turn=turn;if(change)change(w,h,p,q);const c=reset(w),result=E.P.hyperExpose(w,c,q,h);return {w,h,p,q,c,result};}
function prepared(n=0,options={}){
 const w=fixture(),h=host(w),p=primary(w,h),q=attached(w,p,{origin:`prepared-q:${n}`,phase:3,age:12,bornAt:-11,B:.02,E:.5,...options});
 Object.assign(q.hyper,{state:"preparation",experience:12,development:12,settledAt:-1,pauseUntil:-1});if(options.hyper)Object.assign(q.hyper,options.hyper);assert(S.HyperParasite.is(q));w.turn=1;const c=reset(w);E.P.hyperBegin(w,c);return {w,h,p,q,c};
}
// Upkeep is exercised first; isolate the exact post-upkeep transition balance.
function balance(a,E){a.q.E=E;reset(a.w);}
function flow(c,key){return c.hyperFlow?.bySpecies.hyperparasite[key]||0;}

test("the four-phase Q model is explicit and rejects unsupported or contradictory model settings",()=>{
 const old=E.create({...base,hyperParasiteModel:undefined}),w=E.create(base);
 assert(!old.config.hyperParasiteSettings);assert(!Object.hasOwn(old,"hyperInocula"));assert.equal(w.config.hyperParasiteSettings.version,"hyper-parameters/1");assert.equal(S.activeSpecies(w).length,S.activeSpecies(old).length);
 for(const patch of [{hyperParasiteModel:"hyper/2"},{primaryParasiteModel:undefined},{hyperParasiteSettings:{version:"hyper-parameters/2"}},{hyperParasiteSettings:{unknown:1}}])assert.throws(()=>E.create({...base,...patch}),/SETTINGS_INVALID/);
 const h=host(w),p=primary(w,h),q=attached(w,p);assert(S.HyperParasite.is(q));assert.equal(q.hyper.version,"hyper-state/1");assert.equal(q.phase,1);assert.equal(q.age,0);assert.equal(q.bornAt,0);assert.equal(q.birthLife,80);assert.equal(q.E,0);assert.equal(q.B,.01);assert.equal(q.hostId,p.id);assert(!Object.hasOwn(q,"M"));assert(!Object.hasOwn(q,"sex"));assert.equal(q.hyper.experience,0);assert.equal(q.hyper.development,0);
});

test("the first terminal maturity window gates actual contact at T+1 and T+3, with no route for dead or non-host bodies",()=>{
 for(const turn of [0,4]){const a=laying(0,turn);assert.equal(a.result.reason,"window");assert.equal(a.q.E,.5);assert.equal(a.w.hyperInocula.length,0);assert.equal(flow(a.c,"invasionAttempts"),0);check(a.w);}
 for(const turn of [1,3]){let attempted=false;for(let n=0;n<16&&!attempted;n++){const a=laying(n,turn);assert.equal(a.q.E,.4);assert.equal(flow(a.c,"invasionAttempts"),1);assert.equal(a.p.matureAt,0);assert.equal(a.p.q,null);check(a.w);attempted=true;}assert(attempted);}
 for(const change of [(w,h)=>h.HP=0,(w,h)=>h.infection=null,(w,h,p)=>p.stage="middle",(w,h,p,q)=>q.E=.099,(w,h,p,q)=>q.cell=0]){
  const a=laying(0,1,change);assert.equal(a.result.invaded,false);assert.equal(flow(a.c,"invasionAttempts"),0);assert.equal(a.w.hyperInocula.length,0);assert(!a.p.hyperResistance);check(a.w);
 }
});

test("paid eggs remain finite nonliving reserves until the separate next-turn establishment",()=>{
 let success=false,failed=false;
 for(let n=0;n<128&&(!success||!failed);n++){
  const a=laying(n);if(!a.result.invaded){assert.equal(a.w.hyperInocula.length,0);assert.equal(a.w.ledger.sinks,.1);check(a.w);continue;}
  const i=a.w.hyperInocula[0];assert.equal(i.E,.09);assert.equal(i.establishAt,2);assert.equal(a.q.ready,13);assert.equal(a.w.ledger.sinks,.01);assert.equal(S.HyperParasite.summary(a.w).count,1);assert.equal(a.p.q,null);E.P.hyperEstablish(a.w,a.c);assert.equal(a.p.q,null);check(a.w);
  a.w.turn=2;const c=E.context(a.w);E.P.hyperEstablish(a.w,c);assert.equal(a.w.hyperInocula.length,0);
  if(a.p.q){const child=a.p.q;assert.notEqual(child.id,a.q.id);assert.equal(child.phase,1);assert.equal(child.age,0);assert.equal(child.bornAt,2);assert.equal(child.birthLife,80);assert.equal(child.E,.08);assert.equal(child.B,.01);assert.equal(child.hyper.experience,0);assert.equal(child.hyper.development,0);assert.equal(child.hyper.state,"egg");assert.equal(child.hostId,a.p.id);assert.equal(c.births.filter(s=>s==="hyperparasite").length,1);success=true;}
  else{assert.equal(flow(c,"established"),0);failed=true;}
  const sinks=a.w.ledger.sinks;E.P.hyperEstablish(a.w,c);assert.equal(a.w.ledger.sinks,sinks);check(a.w);
 }
 assert(success);assert(failed);
});

test("a legal last-window invasion may establish after the window closes, while changed maturity or a lost host invalidates its proof",()=>{
 let found=false;
 for(let n=0;n<128&&!found;n++){
  const a=laying(n,3);if(!a.result.invaded)continue;assert.equal(a.w.hyperInocula[0].matureAt,0);a.w.turn=4;E.P.hyperEstablish(a.w,E.context(a.w));if(!a.p.q){check(a.w);continue;}assert.equal(a.p.q.bornAt,4);assert.equal(E.P.windowOpen(a.w,a.p),false);check(a.w);found=true;
 }
 assert(found);
 for(const change of [a=>a.p.matureAt=1,a=>a.h.infection=null,a=>a.h.HP=0]){
  let tested=false;for(let n=0;n<64&&!tested;n++){const a=laying(n);if(!a.result.invaded)continue;change(a);reset(a.w);a.w.turn=2;E.P.hyperEstablish(a.w,E.context(a.w));assert.equal(a.p.q,null);assert.equal(a.w.hyperInocula.length,0);check(a.w);tested=true;}assert(tested);
 }
});

test("one P reserves only one invading Q, and insufficient egg mass cannot create a living colony",()=>{
 let found=false;
 for(let n=0;n<64&&!found;n++){
  const a=laying(n);if(!a.result.invaded)continue;const other=adult(a.w,26,{origin:"other-parent"});reset(a.w);const r=E.P.hyperExpose(a.w,a.c,other,a.h);assert.equal(r.reason,"occupied");assert.equal(other.E,.5);assert.equal(a.w.hyperInocula.length,1);
  a.w.hyperInocula[0].E=.009;reset(a.w);a.w.turn=2;E.P.hyperEstablish(a.w,E.context(a.w));assert.equal(a.p.q,null);assert.equal(a.w.hyperInocula.length,0);check(a.w);found=true;
 }
 assert(found);
});

test("parent traits mutate once with a bounded allocation tradeoff and do not transmit experience or acquired resistance",()=>{
 const w=fixture(),p=primary(w,host(w)),q=attached(w,p,{E:.5}),genes=structuredClone(q.hyper.genes),flat=a=>Object.values(a).flatMap(g=>Object.values(g)),original=flat(genes),sum=original.reduce((n,v)=>n+v,0);q.hyper.experience=30;q.hyper.development=12;S.HyperParasite.acquireResistance(w,p);
 let changed=0,unchanged=0;
 for(let n=0;n<128;n++){
  const id=`child-traits:${n}`,traits=S.HyperParasite.childTraits(w,q,id),values=flat(traits.genes),delta=values.map((v,i)=>S.round(v-original[i])),child=S.HyperParasite.create(w,p.id,0,id,traits);
  assert(values.every(v=>v>=0&&v<=1));close(values.reduce((a,b)=>a+b,0),sum);assert(delta.every(v=>v===0||Math.abs(v)===.05));assert([0,2].includes(delta.filter(Boolean).length));if(delta.some(Boolean))changed++;else unchanged++;
  assert.deepEqual(child.hyper.genes,traits.genes);assert.notEqual(child.hyper.genes,traits.genes);assert.deepEqual(child.hyper.preference,q.hyper.preference);assert.equal(child.hyper.experience,0);assert.equal(child.hyper.development,0);assert(!child.hyperResistance);assert(!child.hyper.resistance);assert.equal(child.phase,1);assert.equal(child.age,0);
 }
 assert(changed);assert(unchanged);assert.deepEqual(q.hyper.genes,genes);
});

test("Q exclusion grants only the direct host P a finite paid resistance that decays independently of H",()=>{
 const w=fixture(),h=host(w),p=primary(w,h),q=attached(w,p,{E:.2}),c=reset(w),hp=h.HP,energy=h.E;assert(E.P.hyperExclude(w,c,h,"immunity"));assert.equal(p.q,null);assert.equal(h.infection,p);assert.equal(p.hyperResistance.value,.4);assert(!h.hyperResistance);assert.equal(h.E,energy);assert.equal(h.HP,hp);assert.equal(w.ledger.sinks,.21);assert.equal(E.P.hyperExclude(w,c,h,"immunity"),false);check(w);
 S.HyperParasite.acquireResistance(w,p);S.HyperParasite.acquireResistance(w,p);assert.equal(p.hyperResistance.value,.8);reset(w);const reserve=p.E;S.HyperParasite.beginResistance(w,p);assert.equal(p.E,S.round(reserve-.004));assert.equal(S.HyperParasite.resistance(w,p),.8);S.HyperParasite.beginResistance(w,p);assert.equal(p.E,S.round(reserve-.004));check(w);
 w.turn=40;S.HyperParasite.beginResistance(w,p);close(p.hyperResistance.value,.4);check(w);w.turn=41;p.E=0;reset(w);S.HyperParasite.beginResistance(w,p);assert.equal(S.HyperParasite.resistance(w,p),0);assert(p.hyperResistance.value>0);check(w);
});

test("Q phase experience, age maturity and host development advance separately from actual paid outcomes",()=>{
 const w=fixture(),p=primary(w,host(w)),q=attached(w,p,{E:.5});q.hyper.prepareUntil=100;reset(w);
 for(let turn=1;turn<=12;turn++){w.turn=turn;const c=E.context(w);E.P.hyperBegin(w,c);E.P.hyperMature(w,c);assert.equal(q.hyper.experience,turn);assert.equal(q.hyper.development,turn);assert.equal(q.phase,turn>=12?3:turn>=4?2:1);assert.equal(q.B,turn>=12?.02:turn>=4?.015:.01);assert.equal(q.age,turn);assert.equal(q.bornAt,0);assert.equal(q.birthLife,80);assert.equal(p.q,q);check(w);}
 assert.equal(q.hyper.state,"preparation");assert.equal(S.HyperParasite.ageInfo(q).stage,"adult");
 const poor=fixture(),pp=primary(poor,host(poor),{E:0}),qq=attached(poor,pp,{E:.005});poor.turn=1;const c=reset(poor);E.P.hyperBegin(poor,c);E.P.hyperMature(poor,c);assert.equal(qq.hyper.last.maintained,true);assert.equal(qq.hyper.last.developed,false);assert.equal(qq.hyper.experience,.25);assert.equal(qq.hyper.development,0);assert.equal(qq.phase,1);check(poor);
});

test("each emergence gate remains independent after real upkeep and the exact post-upkeep reserve must fund both the attempt and extra body",()=>{
 for(const options of [{phase:2,B:.015,hyper:{experience:4}},{age:11,bornAt:-10},{hyper:{development:10}},{hyper:{prepareUntil:5}}]){
  const a=prepared(0,options);E.P.hyperMature(a.w,a.c);assert.equal(flow(a.c,"emergenceAttempts"),0);assert.equal(a.p.q,a.q);assert.equal(a.h.infection,a.p);check(a.w);
 }
 const low=prepared();balance(low,.099999);E.P.hyperMature(low.w,low.c);assert.equal(flow(low.c,"emergenceAttempts"),0);assert.equal(low.q.B,.02);assert.equal(low.q.E,.099999);assert(low.q.hyper.last.blockers.includes("emergence-nutrition"));check(low.w);
 let tried=false;for(let n=0;n<32&&!tried;n++){const a=prepared(n);balance(a,.10);E.P.hyperMature(a.w,a.c);assert.equal(flow(a.c,"emergenceAttempts"),1);assert.equal(flow(a.c,"emergenceE"),.09);assert.equal(a.q.B,a.q.phase===4?.03:.02);assert.equal(a.q.E,a.q.phase===4?0:.01);check(a.w);tried=true;}assert(tried);
});

test("failed emergence spends the attempt once, waits four turns and still requires renewed finite reserves",()=>{
 let found=false;
 for(let n=0;n<64&&!found;n++){
  const a=prepared(n);balance(a,.10);E.P.hyperMature(a.w,a.c);if(flow(a.c,"emergenceFailed")!==1)continue;assert.equal(a.q.phase,3);assert.equal(a.q.B,.02);assert.equal(a.q.E,.01);assert.equal(a.q.hyper.prepareUntil,5);assert.equal(a.w.ledger.sinks,.09);check(a.w);
  for(let turn=2;turn<=5;turn++){a.w.turn=turn;const c=E.context(a.w);E.P.hyperBegin(a.w,c);E.P.hyperMature(a.w,c);assert.equal(flow(c,"emergenceAttempts"),0);assert.equal(a.p.q,a.q);check(a.w);}
  a.w.turn=6;const c=E.context(a.w);E.P.hyperBegin(a.w,c);balance(a,.10);E.P.hyperMature(a.w,c);assert.equal(flow(c,"emergenceAttempts"),1);check(a.w);found=true;
 }
 assert(found);
});

test("successful emergence kills only P once and preserves the same Q ID and lifetime as a next-turn adult",()=>{
 let found=false;
 for(let n=0;n<64&&!found;n++){
  const a=prepared(n),identity={id:a.q.id,bornAt:a.q.bornAt,age:a.q.age,birthLife:a.q.birthLife},hp=a.h.HP,energy=a.h.E;balance(a,.3);const total=S.totals(a.w).E,deaths=structuredClone(a.w.tallies.deaths);E.P.hyperMature(a.w,a.c);if(a.q.phase!==4)continue;
  assert.equal(a.h.infection,null);assert.equal(a.p.q,null);assert.equal(a.w.searchQ.length,1);assert.equal(a.w.searchQ[0],a.q);assert.equal(a.q.hostId,null);assert.equal(a.q.cell,a.h.cell);assert.equal(a.q.hyper.state,"adult");assert.deepEqual({id:a.q.id,bornAt:a.q.bornAt,age:a.q.age,birthLife:a.q.birthLife},identity);assert.equal(a.h.HP,hp);assert.equal(a.h.E,energy);assert.equal(a.w.tallies.deaths[a.p.species]-deaths[a.p.species],1);assert.equal(a.w.tallies.deaths.hyperparasite-deaths.hyperparasite,0);assert.equal(flow(a.c,"emerged"),1);assert.equal(a.c.births.filter(s=>s==="hyperparasite").length,0);close(total-S.totals(a.w).E,a.w.ledger.sinks);check(a.w);
  const before={cell:a.q.cell,E:a.q.E,B:a.q.B};E.P.hyperSearch(a.w,a.c);assert.deepEqual({cell:a.q.cell,E:a.q.E,B:a.q.B},before);assert.equal(flow(a.c,"moved"),0);assert.equal(flow(a.c,"fedE"),0);a.w.turn=2;E.P.hyperSearch(a.w,E.context(a.w));assert(a.q.E<before.E);assert.equal(a.q.bornAt,identity.bornAt);check(a.w);found=true;
 }
 assert(found);
});

test("early H or P death cannot rescue a prepared Q into a free adult",()=>{
 for(const dies of ["H","P"]){const a=prepared();if(dies==="H")a.h.HP=0;else E.P.exclude(a.w,a.c,a.h,"age");E.P.hyperMature(a.w,a.c);assert.equal(a.w.searchQ.length,0);assert.equal(flow(a.c,"emergenceAttempts"),0);assert.notEqual(a.q.phase,4);check(a.w);}
});

test("adult feeding is capped at real local organic energy, absorbs half and never consumes information or mineral energy",()=>{
 const w=fixture(),q=adult(w),organic={id:"food",cell:q.cell,kind:"organic",q:2,E:.4,M:0,G:0,created:0,expires:20},info={id:"info",cell:q.cell,kind:"info",q:2,E:1,M:0,G:0,created:0,expires:20},mineral={id:"mineral",cell:q.cell,kind:"mineral",q:2,E:.2,M:.1,G:0,created:0,expires:null};w.resources.push(organic,info,mineral);w.turn=1;const c=reset(w);E.P.hyperSearch(w,c);assert.equal(organic.E,.3);assert.equal(info.E,1);assert.equal(mineral.E,.2);assert.equal(q.hyper.last.feedingE,.05);assert.equal(flow(c,"fedE"),.05);assert.equal(q.E,S.round(.5-.02+.05-q.hyper.last.movementE));check(w);
 const bare=fixture(),b=adult(bare),resource={...info,cell:b.cell};bare.resources.push(resource);bare.turn=1;const cb=reset(bare);E.P.hyperSearch(bare,cb);assert.equal(resource.E,1);assert.equal(flow(cb,"fedE"),0);assert(b.E<.5);check(bare);
});

test("adult movement pays for one legal neighboring cell and cannot cross blocked terrain or spend an absent step budget",()=>{
 const w=fixture(),q=adult(w,S.index(w,2,3),{E:.03}),h=host(w);h.cell=S.index(w,5,3);w.turn=1;const c=reset(w),start=q.cell;E.P.hyperSearch(w,c);assert.equal(S.distance(w,start,q.cell),1);assert.equal(q.hyper.last.movementE,.002);assert.equal(q.E,.008);check(w);
 for(const blocked of [false,true]){const a=fixture(),b=adult(a,27,{E:blocked?.1:.021});if(blocked)for(const cell of S.nearby(a,b.cell))a.tiles[cell].blocked=true;a.turn=1;const ctx=reset(a),cell=b.cell;E.P.hyperSearch(a,ctx);assert.equal(b.cell,cell);assert.equal(flow(ctx,"moved"),0);check(a);}
});

test("adult carcass feeding removes the same fraction of growth credit and records the actual food cell before movement",()=>{
 const w=fixture(),q=adult(w),a={id:"carcass",species:"grassbug",slot:"prey",cell:q.cell,tag:"animal",q:2,E:.4,M:.1,G:.2,created:0,expires:20};
 w.carcasses.push(a);w.turn=1;const c=reset(w),foodCell=a.cell;E.P.hyperSearch(w,c);
 assert.equal(a.E,.3);assert.equal(a.G,.15);assert.equal(a.M,.1);assert.equal(a.q,2);
 const feed=c.events.get(q.id).find(e=>e.type==='feed');assert.equal(feed.to,foodCell);assert.equal(feed.amount,.1);assert.equal(feed.assimilated,.05);check(w);
});

test("one controlled lineage connects paid emergence to adult oviposition and a new first-phase Q on another P",()=>{
 let completed=false;
 for(let n=0;n<64&&!completed;n++){
  const a=prepared(n),nextHost=host(a.w,'next-host'),nextP=primary(a.w,nextHost,{origin:'next-p',matureAt:1});nextHost.cell=28;reset(a.w);
  E.P.hyperMature(a.w,a.c);if(a.q.phase!==4)continue;
  assert.equal(a.h.infection,null);assert(a.h.HP>0);const parentId=a.q.id,bornAt=a.q.bornAt;check(a.w);
  a.w.turn=2;const layingContext=E.context(a.w),laid=E.P.hyperExpose(a.w,layingContext,a.q,nextHost);if(!laid.invaded)continue;check(a.w);
  a.w.turn=3;E.P.hyperEstablish(a.w,E.context(a.w));if(!nextP.q)continue;
  assert.equal(a.q.id,parentId);assert.equal(a.q.bornAt,bornAt);assert(a.w.searchQ.includes(a.q));
  assert.notEqual(nextP.q.id,parentId);assert.equal(nextP.q.phase,1);assert.equal(nextP.q.age,0);assert.equal(nextP.q.bornAt,3);
  assert.deepEqual(nextP.q.hyper.parents,[parentId]);assert.equal(nextP.matureAt,1);check(a.w);completed=true;
 }
 assert(completed,'a fixed controlled route must complete without forced success probabilities or free nutrition');
});

test("living adult Q is finite prey consumed once without duplicating its body or settling an inoculum as food",()=>{
 const w=fixture(),predator=host(w,"predator",{E:0}),observer=host(w,"observer",{E:10});observer.cell=0;const p=primary(w,observer,{E:.5}),pBefore=structuredClone(p),q=adult(w,predator.cell,{E:.2}),c=reset(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:"stop",cell:o.cell,cost:0,path:[]});E.N.feed(w,c,E.P.transfer);assert.equal(w.searchQ.length,0);assert.equal(q.E,0);assert.equal(q.B,0);assert.equal(flow(c,"preyed"),1);assert.equal(c.deaths.filter(d=>d.species==="hyperparasite").length,1);assert.equal(observer.E,10);assert.equal(observer.infection,p);assert.deepEqual(p,pBefore);const reserve=predator.E;assert(reserve>0);E.P.hyperAdultDeath(w,c,q,"predation");assert.equal(predator.E,reserve);assert.equal(flow(c,"preyed"),1);check(w);
});

test("P pays finite exclusion attempts on either outcome and only a successful removal acquires anti-Q resistance",()=>{
 for(const success of [false,true]){
  const w=fixture(),h=host(w),p=primary(w,h),q=attached(w,p,{E:.2});w.config.hyperParasiteSettings.exclusionRate=success?1:0;w.turn=1;const c=reset(w),reserve=p.E;E.P.hyperBegin(w,c);
  if(success){assert.equal(p.q,null);assert.equal(p.E,S.round(reserve-.01));assert.equal(p.hyperResistance.value,.4);assert.equal(flow(c,"cleared"),1);}
  else{assert.equal(p.q,q);assert.equal(p.E,S.round(reserve-.01-q.hyper.last.taxE));assert(!p.hyperResistance);assert.equal(flow(c,"cleared"),0);}
  assert.equal(h.E,20);check(w);
 }
});

test("the paid Q modulation and trace budgets are bounded by the actual remaining reserve and keep fixed genes unchanged",()=>{
 for(const fullyFunded of [false,true]){
  const w=fixture(),h=host(w),p=primary(w,h,{phase:3,B:.04,E:0}),q=attached(w,p,{phase:3,B:.02,E:fullyFunded?.1:.032});p.primary.last.induction=.3;if(fullyFunded)q.hyper.bias.sign=1;
  const genes=structuredClone(q.hyper.genes);w.turn=1;const c=reset(w);E.P.hyperBegin(w,c);assert.equal(q.hyper.last.maintenanceE,.015);assert.equal(q.hyper.last.developmentE,.015);assert.equal(q.hyper.last.metaE,fullyFunded?.004:.002);close(Math.abs(q.hyper.last.modulation),fullyFunded?.08:.04);close(p.primary.last.induction,.3*(1+q.hyper.last.modulation));assert(p.primary.last.induction<=.324);if(fullyFunded)assert.equal(p.primary.last.induction,.324);assert.deepEqual(q.hyper.genes,genes);
  if(fullyFunded){assert.equal(q.hyper.last.informationE,.008);for(const holder of [h,p]){assert.equal(holder.hyperTraces.length,1);const trace=holder.hyperTraces[0];assert.equal(trace.qId,q.id);assert.equal(trace.pId,p.id);assert.equal(trace.sourceId,h.id);assert.equal(trace.paidE,.008);assert.equal(trace.updatedAt,1);assert.equal(trace.detachedAt,null);assert(trace.promotion<=.1&&trace.distortion<=.2);}assert.notEqual(h.hyperTraces[0],p.hyperTraces[0]);}
  else{assert.equal(q.hyper.last.informationE,0);assert(!h.hyperTraces);assert(!p.hyperTraces);assert.equal(q.E,0);}
  const balance={p:p.E,q:q.E,sinks:w.ledger.sinks};E.P.hyperBegin(w,c);assert.deepEqual({p:p.E,q:q.E,sinks:w.ledger.sinks},balance);check(w);
 }
});

test("initial Q quotas use actual P colonies and past windows without inventing maturity, hosts or emergence successes",()=>{
 const w=fixture();for(let n=0;n<20;n++){const h=host(w,`initial-host:${n}`);h.cell=n;primary(w,h,{origin:`initial-p:${n}`,matureAt:-3});}
 const ids=w.organisms.map(o=>o.id),maturity=w.organisms.map(o=>o.infection.matureAt),report=S.HyperParasite.initial(w);assert.equal(report.compatibleP,20);assert.equal(report.planned,4);assert.equal(report.attached.actual,3);assert.equal(report.free.actual,1);assert.equal(report.shortage,0);assert.equal(S.HyperParasite.summary(w).count,4);
 for(const {q,p}of S.HyperParasite.entries(w))if(p){assert(q.bornAt>=p.matureAt+1&&q.bornAt<=p.matureAt+3);close(q.age,-q.bornAt);assert(q.age<=2);}else{assert.equal(q.phase,4);assert.equal(q.B,.03);assert(q.age>=12);assert.equal(q.hyper.state,"adult");}
 assert.deepEqual(w.organisms.map(o=>o.id),ids);assert.deepEqual(w.organisms.map(o=>o.infection.matureAt),maturity);let c=reset(w);assert.equal(flow(c,"emerged"),0);check(w);
 for(const o of w.organisms)o.infection.q=null;w.config.founderCounts={version:1,species:{},parasites:{hyperparasite:12}};const direct=S.HyperParasite.initial(w);assert.equal(direct.planned,12);assert.equal(direct.actual,12);assert.equal(direct.attached.actual,9);assert.equal(direct.free.actual,3);assert.deepEqual(w.organisms.map(o=>o.id),ids);reset(w);check(w);
 for(const o of w.organisms)o.infection.q=null;w.config.founderCounts.parasites.hyperparasite=0;assert.equal(S.HyperParasite.initial(w).actual,0);assert.equal(S.HyperParasite.summary(w).count,0);reset(w);check(w);
 const missing=fixture();missing.config.founderCounts={version:1,species:{},parasites:{hyperparasite:1}};assert.throws(()=>S.HyperParasite.initial(missing),/PLACEMENT_SHORTAGE/);assert.equal(missing.organisms.length,0);
 const future=fixture(),h=host(future),p=primary(future,h,{matureAt:0});future.config.hyperParasiteSettings.initialFraction=1;const noReopen=S.HyperParasite.initial(future);assert.equal(noReopen.planned,1);assert.equal(noReopen.actual,0);assert.equal(noReopen.shortage,1);assert.equal(p.matureAt,0);assert.equal(p.q,null);reset(future);check(future);
});

test("short coupled Q worlds remain reproducible with finite hosted, free-adult and egg reserves",()=>{
 const run=()=>{let w=fixture(),p=primary(w,host(w));attached(w,p,{E:.2});adult(w,0,{E:.5});reset(w);for(let turn=0;turn<12;turn++){w=E.step(w);check(w);assert(Object.values(w.tallies.causes).every(Number.isFinite));}return E.fingerprint(w);};assert.equal(run(),run());
});

test("a same-P trophic migration carries the same Q and pauses its development through next-turn establishment",()=>{
 let found=false;
 for(let n=0;n<64&&!found;n++){
  const w=fixture(),source=S.organism(w,S.D.byId.grassbug,18,"migration-prey",{dna:dna(),age:3,E:6});w.organisms.push(source);const target=host(w,"migration-main"),p=primary(w,source,{origin:`moving-p:${n}`,stage:"middle",counter:6}),q=attached(w,p,{phase:2,age:12,bornAt:-11,B:.015,E:.5,hyper:{experience:10,development:10}});
  w.turn=1;const c=reset(w);E.P.hyperBegin(w,c);const identity={id:q.id,bornAt:q.bornAt,birthLife:q.birthLife,experience:q.hyper.experience,development:q.hyper.development};source.HP=0;c.harvestDead.add(source.id);E.P.transfer(w,c,source,target,"plant",{fraction:1});const pending=w.pending.find(a=>a.kind==="primary-migration");if(!pending){check(w);continue;}
  assert.equal(pending.infection,p);assert.equal(p.q,q);assert.equal(target.infection,null);E.P.mature(w,c);assert.equal(q.hyper.experience,identity.experience);assert.equal(q.hyper.development,identity.development);assert.equal(S.HyperParasite.summary(w).migrating,1);check(w);
  w.turn=2;let ctx=E.context(w);E.P.begin(w,ctx);E.P.mature(w,ctx);if(!target.infection){assert.equal(S.HyperParasite.entries(w).length,0);assert.equal(w.searchQ.length,0);check(w);continue;}
  assert.equal(target.infection,p);assert.equal(p.q,q);assert.equal(q.id,identity.id);assert.equal(q.bornAt,identity.bornAt);assert.equal(q.birthLife,identity.birthLife);assert.equal(q.hyper.development,identity.development);assert.equal(q.hyper.experience,identity.experience);check(w);
  w.turn=3;ctx=E.context(w);E.P.begin(w,ctx);E.P.mature(w,ctx);assert.equal(q.hyper.development,identity.development+1);assert.equal(q.hyper.experience,identity.experience+1);assert.equal(p.q,q);assert.equal(q.bornAt,identity.bornAt);check(w);found=true;
 }
 assert(found);
});

test("attached and adult Q expire at the original eighty-turn lifetime without resetting after detachment",()=>{
 for(const free of [false,true]){const w=fixture(),p=free?null:primary(w,host(w)),q=free?adult(w):attached(w,p,{E:.5});q.bornAt=0;q.age=79;w.turn=79;let c=reset(w);if(free)E.P.hyperSearch(w,c);else E.P.hyperBegin(w,c);assert(S.HyperParasite.entries(w).some(e=>e.q===q));check(w);w.turn=80;c=E.context(w);if(free)E.P.hyperSearch(w,c);else E.P.hyperBegin(w,c);assert(!S.HyperParasite.entries(w).some(e=>e.q===q));assert.equal(q.bornAt,0);check(w);}
});
