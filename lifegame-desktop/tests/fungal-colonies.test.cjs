'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{Worker}=require('node:worker_threads');
const M=require('../src/ecology/observation-model.js'),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js'),T=require('../src/ecology/transport.js');
require('../src/ecology/replay-version.js');
const E=M.model(),S=E.S,signature=globalThis.EcoReplayVersion,legacy='c78400a515eba25515dd699c1f3f5ba6cc2004c5dc4b992fbf3e4c2d1c6082d9';
const config={seed:'i11d/fungal-contract',width:16,height:12,initial:4,lineages:'manual',selected:['solar'],ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',balanceModel:'survival/4',producerModel:'colony/1',largePlantModel:'independent/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',informationModel:'persistent/1',relationshipModel:'network/1',generationModel:'diverse/1',generationSettings:{mode:'manual',profile:'standard'}};
function fixture(settings={}){
 const w=E.create({...config,generationModel:undefined,generationSettings:undefined,width:8,height:8,initial:0,enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:true},fungalColonySettings:settings});
 w.tiles=w.tiles.map(t=>({...t,env:3,terrain:'plain',light:1,soilM:5,cover:'none',blocked:false,walls:[]}));
 w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];w.messages=[];w.config.enabled={main:false,plant:false,fungus:true,prey:false,P:false,Q:false};return w;
}
function add(w,id,species='fungus',cell=18,options={}){const o=S.organism(w,S.D.byId[species],cell,id,options);w.organisms.push(o);return o;}
function reset(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);return E.context(w);}
function ready(w){const c=reset(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,cost:0,path:[]});return c;}
const check=w=>assert.deepEqual(E.invariants(w),[]);

test('fungal groups preserve initial stock and explicit zeros, while legacy individuals retain their clocks',()=>{
 const old=E.create({...config,balanceModel:'survival/3'}),now=E.create(config);
 assert.deepEqual(S.totals(now),S.totals(old));
 const previous=new Map(old.organisms.map(o=>[o.id,o]));
 for(const o of now.organisms.filter(S.FungalColony.is)){const p=previous.get(o.id);for(const k of ['E','B','M'])assert.equal(o[k],p[k]);assert.equal(o.age,0);assert(!('birthLife'in o));assert.equal(S.ageInfo(o).applicable,false);assert.equal(S.Colony.is(o),false);}
 assert(now.organisms.some(S.FungalColony.is));assert(!old.organisms.some(S.FungalColony.is));assert(old.organisms.filter(o=>o.species==='fungus').every(o=>o.birthLife>0));check(now);check(old);
 const empty=E.create({...config,founderCounts:{version:1,species:{fungus:0},parasites:{}}});assert.equal(empty.stats.counts.fungus,0);assert.equal(empty.fungalColonySummary.count,0);
 for(const change of [{baseB:2},{regrowthCost:.9},{capacityB:0},{maintenance:NaN},{starvationTurns:1.5},{unknown:1}])assert.throws(()=>E.create({...config,fungalColonySettings:change}),/SETTINGS_INVALID/);
 assert.throws(()=>E.create({...config,balanceModel:'survival/3',fungalColonySettings:{regrowthB:0}}),/survival\/4/);
});

test('several consumers share finite edible stock and leave the same living base',()=>{
 const w=fixture(),p=add(w,'base','fungus',18,{B:6,E:4,M:.4});add(w,'grazer','solar',18,{E:0,HP:50});add(w,'grazer-2','solar',19,{E:0,HP:50});const c=reset(w);
 E.N.feed(w,c,E.P.transfer);E.N.feed(w,c,E.P.transfer);
 assert.equal(p.B,1);assert.equal(p.colony.last.consumedB,5);assert(!c.harvestDead.has(p.id));assert(w.organisms.includes(p));assert.equal(p.id,'base');check(w);
});

test('regrowth spends stored organic E once per turn, remains capped and does not require light',()=>{
 const w=fixture(),p=add(w,'regrowth','fungus',18,{B:1,E:10,M:0});w.tiles[18].light=0;reset(w);
 S.FungalColony.regrow(w,p,false);S.FungalColony.regrow(w,p,false);
 assert.equal(p.B,2);assert.equal(p.E,8.8);assert.equal(p.colony.last.regrowthB,1);assert.equal(p.colony.last.regrowthCostE,1.2);assert.equal(w.ledger.sinks,.2);check(w);
 for(const change of [(w,p)=>p.E=0,(w,p)=>p.colony.activity=0,(w,p)=>w.config.fungalColonySettings.regrowthB=0]){
  const x=fixture(),q=add(x,'no-free-input','fungus',18,{B:1,E:10,M:0});change(x,q);reset(x);const total=S.totals(x);S.FungalColony.regrow(x,q,false);assert.equal(q.B,1);assert.deepEqual(S.totals(x),total);check(x);
 }
 const z=fixture({regrowthB:0});assert.equal(z.config.fungalColonySettings.regrowthB,0);
});

test('decomposition actually consumes finite organic stock before a paid same-ID recovery',()=>{
 const w=fixture(),p=add(w,'decomposer','fungus',18,{B:1,E:0,M:0});w.resources.push({cell:18,kind:'organic',q:1,E:4,M:.2,G:0});const c=reset(w);
 E.N.feed(w,c,E.P.transfer);assert(p.E>0);assert(p.colony.last.assimilatedE>0);assert.equal(w.resources.filter(r=>r.kind==='organic').length,0);const before=p.E;
 S.FungalColony.regrow(w,p,false);assert(p.B>1);assert(p.E<before);assert.equal(p.id,'decomposer');check(w);
});

test('starved bases disappear once, leave finite remains and never respawn without parents',()=>{
 let w=fixture();const p=add(w,'empty-base','fungus',18,{B:1,E:0,M:0,HP:50});reset(w);let deaths=0;
 for(let t=1;t<=12;t++){w.turn=t;S.FungalColony.begin(w);const c=ready(w);E.N.settle(w,c,E.P.fee);deaths+=c.deaths.length;check(w);if(t<12)assert(w.organisms.some(o=>o.id===p.id));}
 assert.equal(deaths,1);assert.equal(w.organisms.length,0);assert.equal(w.carcasses.length,1);assert.equal(w.carcasses[0].id,'c:'+p.id+':12');
 const total=S.totals(w);const c=ready(w);E.N.settle(w,c,E.P.fee);assert.equal(w.carcasses.length,1);assert.deepEqual(S.totals(w),total);check(w);
 w=E.step(w);assert.equal(w.stats.counts.fungus,0);check(w);
});

test('established time is not individual lifespan and paid colonies remain age/sex nonapplicable',()=>{
 const w=fixture(),p=add(w,'established','fungus',18,{age:500,E:10,B:1,phase:1});const c=ready(w);E.N.settle(w,c,E.P.fee);
 assert(w.organisms.includes(p));assert.equal(p.age,501);assert.equal(c.deaths.length,0);assert.equal(S.ageInfo(p).applicable,false);check(w);
});

test('adjacent establishment creates a new identity and pays the original finite birth budget',()=>{
 const w=fixture(),p=add(w,'parent','fungus',18,{E:20,B:8,M:1,phase:2});w.turn=1;const c=ready(w),before=S.totals(w),children=E.R.reproduce(w,c);
 assert.equal(children.length,1);const q=children[0];assert(S.FungalColony.is(q));assert.notEqual(q.id,p.id);assert.equal(q.colony.origin.kind,'parent');assert.deepEqual(q.parents,[p.id]);assert.equal(q.generation,p.generation+1);assert.equal(q.B,2);assert.equal(q.colony.baseB,1);assert.equal(q.E,6);assert.equal(q.M,.2);assert.equal(q.phase,1);assert.equal(q.age,0);assert(S.oneStep(w,p.cell,q.cell));assert.deepEqual(S.totals(w),before);check(w);
});

function recorded(balanceModel='survival/4',version=signature){let w=E.create({...config,balanceModel}),h=O.create(w.config,version,{species:S.activeSpecies(w)});h.append(w);for(let t=0;t<3;t++){w=E.step(w);check(w);h.append(w);}return {w,h};}
test('all-turn observations retain group units, biomass and nonapplicable age/sex, rejecting missing data',()=>{
 const {w,h}=recorded();assert.deepEqual(h.rows.map(r=>r.turn),[0,1,2,3]);const last=h.rows.at(-1),count=last.counts.fungus;
 assert.equal(last.fungalColony.count,count);assert.equal(last.composition.fungus.ages.nonapplicable,count);assert.equal(last.composition.fungus.sex.nonapplicable,count);
 const csv=h.csv();assert(csv.includes('"population","fungus","'+count+'","fungal_colony"'));assert(csv.includes('"fungal_colony_regrowthCostE","fungus"'));assert(csv.includes('"model_E"'));assert.deepEqual(O.restore(h.snapshot()).snapshot(),h.snapshot());
 for(const change of [s=>delete s.definitions.fungalColony,s=>delete s.rows[1].fungalColony,s=>s.rows[1].fungalColony.baseB=-1,s=>s.rows[1].fungalColony.count++,s=>s.metadata.config.balanceModel='survival/3']){const bad=h.snapshot();change(bad);assert.throws(()=>O.restore(bad),/菌膜群落観測/);}
 const bad=E.create(config);delete bad.fungalColonySummary;assert.throws(()=>O.create(bad.config,signature,{species:S.activeSpecies(bad)}).append(bad),/菌膜群落観測/);
});

test('final archives reproduce complete new state, keep old individual replay and reject forged fungal records',()=>{
 let bytes=null;const store={getItem:()=>bytes,setItem:(_k,v)=>bytes=v},a=A.create(store,E,signature),{w,h}=recorded(),r=a.capture(w,'user',h.snapshot());
 assert.equal(r.config.balanceModel,'survival/4');assert.equal(r.config.fungalColonySettings.version,'fungal-colony-parameters/1');assert.deepEqual(r.final.fungalColony,h.rows.at(-1).fungalColony);assert.equal(r.final.state.examples.fungalColonies.total,w.stats.counts.fungus);assert(a.save(r));
 let again=E.create(a.replay(r.id).config),obs=O.create(again.config,signature,{species:S.activeSpecies(again)});obs.append(again);for(let t=0;t<r.turn;t++){again=E.step(again);obs.append(again);}assert.equal(E.fingerprint(again),r.finalFingerprint);assert.deepEqual(obs.snapshot(),h.snapshot());
 const previous=recorded('survival/3',legacy),old=A.create(store,E,legacy).capture(previous.w,'legacy',previous.h.snapshot());assert.equal(a.replayRecord(old).signature,legacy);assert(!old.final.state.examples.fungalColonies);
 const good=bytes;for(const change of [x=>x.config.balanceModel='survival/3',x=>delete x.config.fungalColonySettings,x=>x.final.fungalColony.count++,x=>delete x.final.state.examples.fungalColonies,x=>x.final.state.examples.fungalColonies.total++,x=>{x.signature=legacy;x.observation.metadata.version=legacy;}]){const bad=structuredClone(r);change(bad);assert.throws(()=>a.replayRecord(bad));assert.equal(bytes,good);}
});

test('actual Worker patches retain the fungal summaries and match the complete atomic turn',{timeout:15000},async()=>{
 const worker=new Worker(path.join(__dirname,'compute-harness.cjs')),queue=[],waiters=[];worker.on('message',m=>waiters.length?waiters.shift()(m):queue.push(m));const next=()=>queue.length?Promise.resolve(queue.shift()):new Promise(r=>waiters.push(r));
 try{let w=E.create(config);worker.postMessage({type:'init',epoch:91,world:w,stream:true});assert.equal((await next()).type,'ready');worker.postMessage({type:'compute',epoch:91,count:2,limit:500});
  for(let n=0;n<2;n++){let view=w;for(let p=0;p<3;p++){const msg=await next();assert.equal(msg.type,'phase');view=T.apply(view,msg.patch);}assert.equal((await next()).type,'turn');assert.deepEqual(view,E.step(w));check(view);assert.equal(view.fungalColonySummary.count,view.stats.counts.fungus);w=view;}assert.equal((await next()).type,'idle');
 }finally{await worker.terminate();}
});
