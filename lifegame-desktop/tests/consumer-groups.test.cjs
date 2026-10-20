'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{Worker}=require('node:worker_threads');
const M=require('../src/ecology/observation-model.js'),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js'),T=require('../src/ecology/transport.js');
require('../src/ecology/replay-version.js');
const E=M.model({producer:false,waterbug:false,hyperparasite:false}),S=E.S,G=S.ConsumerGroup;
const config={seed:'consumer-contract',width:8,height:8,initial:0,ecologyRevision:'observation/4.1',ageModel:'life/1',consumerModel:'group/1',balanceModel:'survival/4',primaryParasiteModel:'primary/1',enabled:{main:false,plant:false,prey:false,fungus:false,P:false,Q:false}};
function fixture(){const w=E.create({...config,enabled:{...config.enabled,prey:true},founderCounts:{version:1,species:{grassbug:0,waterbug:0},parasites:{}}});w.tiles=w.tiles.map(t=>({...t,terrain:'plain',env:3,light:1,soilM:5,cover:'none',blocked:false,walls:[]}));w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];w.messages=[];w.primaryInocula=[];w.config.populationRegulation=false;return w;}
function group(w,id,cell=18,n=4,options={}){const o=S.organism(w,S.D.byId.grassbug,cell,id,{E:8*n,B:2*n,M:0,...options});o.consumerGroup.cohorts=[{age:10,phase:2,n}];G.refresh(w,o);w.organisms.push(o);return o;}
function ready(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};const c=E.context(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,cost:0,path:[]});return c;}
const check=w=>assert.deepEqual(E.invariants(w),[]);

test('favored grassbug group uses the effective waterbug survival profile; version 1 stays unchanged',()=>{
 for(const flags of [{producer:false,waterbug:false,hyperparasite:false},{producer:true,waterbug:true,hyperparasite:true}]){
  const model=M.model(flags),s=model.S,old=model.create({...config,consumerGroupSettings:{version:'consumer-group-parameters/1'},initial:12,enabled:{...config.enabled,prey:true}}),
    favored=model.create({...config,consumerGroupSettings:{version:'consumer-group-parameters/2'},initial:12,enabled:{...config.enabled,prey:true}}),
    grass=favored.organisms.find(o=>o.species==='grassbug');
  assert(grass);assert.equal(s.spec(grass).name,s.D.byId.grassbug.name);
  for(const key of ['life','maturity','maintenance','birthCooldown'])assert.equal(s.spec(grass)[key],s.D.byId.waterbug[key]);
  assert.deepEqual(s.spec(grass).capacity,s.D.byId.waterbug.capacity);
  assert(old.organisms.filter(o=>o.species==='grassbug').every(o=>s.spec(o)===s.D.byId.grassbug));
  assert.deepEqual(model.invariants(favored),[]);
  const balanced=model.create({...config,consumerGroupSettings:{version:'consumer-group-parameters/3'},initial:12,enabled:{...config.enabled,prey:true}}),balancedGrass=balanced.organisms.find(o=>o.species==='grassbug');
  assert.equal(s.spec(balancedGrass).life,240);assert.equal(s.spec(balancedGrass).maintenance,.06);
  assert.equal(s.spec(balancedGrass).birthCooldown,2);assert.equal(s.spec(balancedGrass).capacity[3],30);
  assert.equal(s.spec(balancedGrass).maturity,s.D.byId.waterbug.maturity);
  assert.deepEqual(model.invariants(balanced),[]);
 }
});

test('matched and balanced group recordings replay with their own settings version',()=>{
 for(const version of ['consumer-group-parameters/2','consumer-group-parameters/3']){
 const model=M.model(),w0=model.create({...config,consumerGroupSettings:{version},initial:12,enabled:{...config.enabled,prey:true}}),
  history=O.create(w0.config,globalThis.EcoReplayVersion,{species:model.S.activeSpecies(w0)});
 history.append(w0);const w=model.step(w0);history.append(w);
 const record=A.create({getItem:()=>null,setItem:()=>{}},model,globalThis.EcoReplayVersion).capture(w,'user',history.snapshot());
 assert.equal(record.config.consumerGroupSettings.version,version);
 A.create({getItem:()=>null,setItem:()=>{}},model,globalThis.EcoReplayVersion).replayRecord(record);
 if(version==='consumer-group-parameters/2'){
  const previous=structuredClone(record);previous.signature='9d1336a947b3e7357e4902957cedafbd7b7281c5c2dd85843e40d64cb0035dcd';
  previous.observation.metadata.version=previous.signature;
  A.create({getItem:()=>null,setItem:()=>{}},model,globalThis.EcoReplayVersion).replayRecord(previous);
 }
 }
});

test('initial local packing preserves individuals, all E/B/M and P/Q; explicit zero remains zero',()=>{
 const F=require('../operations/evidence/i11d-lower-renewal-v1/check-cases.json').cases[0].config,prod=M.model(),old=prod.create({...F,balanceModel:'survival/4'}),w=prod.create({...F,balanceModel:'survival/4',consumerModel:'group/1'});
 assert.deepEqual(w.stats.counts,old.stats.counts);assert.deepEqual(prod.S.totals(w),prod.S.totals(old));
 for(const id of G.species){const before=old.organisms.filter(o=>o.species===id),now=w.organisms.filter(o=>o.species===id);assert(now.length<before.length);for(const k of ['E','B','M'])assert.equal(now.reduce((n,o)=>n+o[k],0),before.reduce((n,o)=>n+o[k],0));}
 assert.deepEqual(prod.invariants(w),[]);
 const empty=E.create({...config,enabled:{...config.enabled,prey:true},founderCounts:{version:1,species:{grassbug:0,waterbug:0},parasites:{}}});assert.equal(empty.stats.counts.grassbug+empty.stats.counts.waterbug,0);
 for(const invalid of [{capacity:0},{initialSize:99},{maxBirths:NaN},{unknown:1}])assert.throws(()=>E.create({...config,consumerGroupSettings:invalid}),/SETTINGS_INVALID/);
});

test('births pay 8E per child, retain I/age0 cohorts and cannot repeat in the same turn',()=>{
 const w=fixture(),o=group(w,'parents',18,4,{E:80});w.turn=1;const c=ready(w),before=S.totals(w);G.reproduce(w,c,E.R.birthPressure);
 assert.equal(G.count(o),6);assert.equal(o.E,76);assert.equal(o.B,12);assert.equal(o.consumerGroup.cohorts.find(c=>c.age===0).phase,1);assert.equal(c.births.length,2);assert.deepEqual(S.totals(w),before);
 G.reproduce(w,c,E.R.birthPressure);assert.equal(G.count(o),6);check(w);
 const x=fixture(),low=group(x,'poor',18,4,{E:8}),d=ready(x);G.reproduce(x,d,E.R.birthPressure);assert.equal(G.count(low),4);assert.equal(d.births.length,0);
});

test('combat and repeated predation remove finite members and leave separately owned remains',()=>{
 const w=fixture(),o=group(w,'target'),c=ready(w);G.damage(w,o,7);E.N.groupDamage(w,c,'combat');assert.equal(G.count(o),3);assert.equal(c.deaths[0].count,1);assert(o.HP>0);check(w);
 E.N.groupLoss(w,o,1,'harvest',c);E.N.groupLoss(w,o,1,'harvest',c);assert.equal(G.count(o),1);assert.equal(new Set(w.carcasses.map(x=>x.id)).size,3);assert.equal(c.deaths.reduce((n,d)=>n+d.count,0),3);check(w);
});

test('feeding a living group kills only the consumed member and pays from finite remains',()=>{
 const w=fixture(),o=group(w,'prey',18,4),hunter=S.organism(w,S.D.byId.serpent,19,'hunter',{E:0,HP:50});w.organisms.push(hunter);const c=ready(w);c.intents.set(hunter.id,{type:'harvest',target:o.id,cell:19,cost:0,path:[]});
 E.N.feed(w,c,E.P.transfer);assert(G.count(o)>0&&G.count(o)<4);assert(c.deaths.some(d=>d.reason==='harvest'));assert(hunter.E>0);check(w);
});

test('age deaths affect only expired cohorts; no nutrition eventually eliminates groups',()=>{
 const w=fixture(),o=group(w,'mixed',18,3,{age:500});o.consumerGroup.cohorts=[{age:31,phase:2,n:1},{age:0,phase:1,n:2}];G.refresh(w,o);w.turn=1;const c=ready(w);E.N.settle(w,c,E.P.fee);
 assert.equal(G.count(o),2);assert.equal(o.age,501);assert.deepEqual(o.consumerGroup.cohorts,[{age:1,phase:1,n:2}]);assert.equal(c.deaths.find(d=>d.reason==='age').count,1);check(w);
 const x=fixture();group(x,'starved',18,4,{E:0});let lost=0;for(let t=1;t<=40&&x.organisms.length;t++){x.turn=t;G.begin(x);const d=ready(x);E.N.settle(x,d,E.P.fee);lost+=d.deaths.reduce((n,a)=>n+a.count,0);check(x);}assert.equal(x.organisms.length,0);assert.equal(lost,4);
});

test('local splitting and joining conserve members/material, pay movement and do not count births',()=>{
 const w=fixture(),o=group(w,'source',18,6),c=ready(w),before=S.totals(w);G.disperse(w,c,E.B.moveCost);
 assert.equal(w.organisms.length,2);assert.equal(w.organisms.reduce((n,a)=>n+G.count(a),0),6);assert.equal(c.births.length,0);assert.equal(c.deaths.length,0);assert(w.ledger.sinks>0);assert(Math.abs(S.totals(w).E+w.ledger.sinks-before.E)<1e-5);assert.equal(S.totals(w).M,before.M);check(w);
 const x=fixture(),a=group(x,'from',18,4),b=group(x,'to',19,2);for(let cell=0;cell<x.tiles.length;cell++)if(![18,19].includes(cell))x.tiles[cell].blocked=true;const d=ready(x);G.disperse(x,d,E.B.moveCost);assert.equal(G.count(a),2);assert.equal(G.count(b),4);assert.equal(x.organisms.length,2);check(x);
});

test('a dying infected cohort passes the same P/Q once; healthy members remain uninfected',()=>{
 const w=fixture(),o=group(w,'infected',18,3),p=S.infection(w,'leafparasite',o.id);p.stage='middle';p.counter=6;p.q=S.hyper(w,p.id);const q=p.q;o.infection=p;
 o.consumerGroup.cohorts=[{age:31,phase:2,n:1},{age:0,phase:1,n:2}];o.consumerGroup.infectedId=p.id;o.consumerGroup.infectedAge=31;G.refresh(w,o);w.turn=1;const c=ready(w);E.N.settle(w,c,E.P.fee);
 assert.equal(G.count(o),2);assert.equal(o.infection,null);assert.equal(w.carcasses.filter(a=>a.infection?.id===p.id).length,1);assert.equal(p.hostId,w.carcasses[0].id);assert.equal(w.carcasses[0].infection.q,q);assert.equal(q.hostId,p.id);check(w);
});

test('all-turn counts/composition, archive replay and old individual recordings remain distinct',()=>{
 const prod=M.model(),base=require('../operations/evidence/i11d-lower-renewal-v1/check-cases.json').cases[0].config;let w=prod.create({...base,balanceModel:'survival/4',consumerModel:'group/1'}),h=O.create(w.config,globalThis.EcoReplayVersion,{species:prod.S.activeSpecies(w)});h.append(w);
 for(let t=0;t<3;t++){w=prod.step(w);assert.deepEqual(prod.invariants(w),[]);h.append(w);}
 assert.deepEqual(O.restore(h.snapshot()).snapshot(),h.snapshot());assert(h.csv().includes('consumer_group_groups'));
 const last=h.rows.at(-1);for(const id of G.species){assert.equal(last.consumerGroups.species[id].individuals,last.counts[id]);assert.equal(last.composition[id].phases.reduce((a,n)=>a+n,0),last.counts[id]);assert(!Object.values(last.funnel).some(c=>c.species===id));}
 const store={getItem:()=>null,setItem:()=>{}},archive=A.create(store,prod,globalThis.EcoReplayVersion),record=archive.capture(w,'user',h.snapshot());archive.replayRecord(record);
 const oldGroupSig='6db4142a9987079b6e0a4f6f1f06623fe9b1dd5096763ce2682993aefbb3316c';
 const previous=structuredClone(record);previous.signature=oldGroupSig;
 // Historical group recordings retain their old biology and replay signature.
 previous.observation=h.snapshot();previous.observation.metadata.version=oldGroupSig;
 archive.replayRecord(previous);
 let again=prod.create(record.config);for(let t=0;t<record.turn;t++)again=prod.step(again);assert.equal(prod.fingerprint(again),record.finalFingerprint);
 for(const mutate of [a=>delete a.rows[1].consumerGroups,a=>a.rows[1].consumerGroups.species.grassbug.individuals++,a=>a.metadata.config.consumerModel=undefined]){const broken=h.snapshot();mutate(broken);assert.throws(()=>O.restore(broken),/集団/);}
 const oldSig='90daa5c38dfbc78aa12c79176ff54d5e70f6e90590ff4d2dbcaf2ef5647b56e4',old=prod.create({...base,balanceModel:'survival/4'}),oldHistory=O.create(old.config,oldSig,{species:prod.S.activeSpecies(old)});oldHistory.append(old);const oldRecord=A.create(store,prod,oldSig).capture(old,'user',oldHistory.snapshot());archive.replayRecord(oldRecord);
 const forged=structuredClone(record);forged.signature=oldSig;forged.observation.metadata.version=oldSig;assert.throws(()=>archive.replayRecord(forged));
});

test('actual Worker phases retain groups and agree with the atomic turn',{timeout:20000},async()=>{
 const prod=M.model(),w=prod.create({...config,initial:4,enabled:{main:true,plant:true,fungus:true,prey:true,P:false,Q:false},lineages:'manual',selected:['solar'],width:16,height:12}),worker=new Worker(path.join(__dirname,'compute-harness.cjs')),queue=[],waiters=[];
 worker.on('message',m=>waiters.length?waiters.shift()(m):queue.push(m));const next=()=>queue.length?Promise.resolve(queue.shift()):new Promise(r=>waiters.push(r));
 try{worker.postMessage({type:'init',epoch:101,world:w,stream:true});assert.equal((await next()).type,'ready');worker.postMessage({type:'compute',epoch:101,count:1,limit:500});let view=w;
 for(let p=0;p<3;p++){const m=await next();assert.equal(m.type,'phase');view=T.apply(view,m.patch);}assert.equal((await next()).type,'turn');assert.deepEqual(view,prod.step(w));assert.equal((await next()).type,'idle');}finally{await worker.terminate();}
});
