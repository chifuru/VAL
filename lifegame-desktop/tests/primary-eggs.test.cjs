'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../src/ecology/observation-model.js'),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js');
const E=M.model(),S=E.S,old=require('../operations/evidence/primary-eggs-v1/old-boundary.json');
require('../src/ecology/replay-version.js');
const config={...old.config,primaryEggModel:'egg/1',hyperParasiteModel:undefined,balanceModel:'survival/4',consumerModel:'group/1',enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:false},producerSupport:{enabled:false},primaryParasiteSettings:{maintenance:[0,.005,.007,.010],developmentCost:.003,emissionCost:.08,entryRates:{contact:1,water:1},establishmentRate:1,mutationRate:0}};
function fixture(water=false,extra={}){
 const w=E.create({...config,width:40,height:28,initial:24,landscape:'templates',mapId:'river',...extra}),host=w.organisms.find(o=>o.species===(water?'jelly':'solar')),target=w.organisms.find(o=>o.species===(water?'algae':'grass'));
 assert(host&&target);host.cell=5*w.config.width+5;target.cell=host.cell+1;host.infection=null;target.infection=null;host.E=10;target.dna.skin=0;
 w.organisms=[host,target];w.pending=[];w.carcasses=[];w.searchQ=[];w.hyperInocula=[];w.primaryInocula=[];
 for(const tile of w.tiles){tile.blocked=false;tile.terrain=water?'shallow':'plain';tile.cover='none';}
 const p=S.PrimaryParasite.infection(w,water?'tideparasite':'leafparasite',host.id,0,'egg-test');host.infection=p;
 Object.assign(p,{stage:'terminal',counter:8,E:1,ready:0});p.primary.settledAt=-1;p.primary.pauseUntil=-1;
 w.turn=2;const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);
 const ctx=E.context(w);E.P.produce(w,ctx,host);return {w,host,target,p,ctx,eggs:[...w.primaryInocula]};
}
function tick(w,turn){w.turn=turn;const ctx=E.context(w);E.P.begin(w,ctx);E.P.contacts(w,ctx);S.PrimaryParasite.summary(w);w.stats=E.summarize(w);return ctx;}

test('egg model is explicit, saved, validated, and preserves the previous 4T biological fingerprint',()=>{
 let w=E.create(old.config);for(let n=0;n<old.turn;n++)w=E.step(w);assert.equal(E.fingerprint(w),old.fingerprint);assert.deepEqual(w.stats,old.stats);
 const settings=E.create(config).config.primaryEggSettings;assert.deepEqual(settings,{version:'primary-egg-parameters/1',landLifetime:20,waterLifetime:30,hatchTurns:2,waterMoveChance:.25});
 for(const edit of [{primaryEggModel:'future'},{primaryEggSettings:{hatchTurns:0}},{primaryEggSettings:{unexpected:1}},{primaryEggSettings:{waterMoveChance:2}},{primaryEggSettings:{landLifetime:2,hatchTurns:2}},{parasiteDispersalModel:undefined}])assert.throws(()=>E.create({...config,...edit}),/一次寄生卵/);
});
test('terminal release pays for two separate finite egg batches; first-host release remains a transfer',()=>{
 for(const water of [false,true]){
  const {w,p,ctx,eggs}=fixture(water);assert.equal(eggs.length,2);assert.equal(new Set(eggs.map(i=>i.id)).size,2);
  assert(eggs.every(i=>i.egg.state==='free'&&!i.transfer&&i.E===.06&&i.expires-i.createdAt===(water?30:20)));
  assert.equal(p.E,.84);assert.equal(ctx.primaryFlow.eggs.laid,2);assert.deepEqual(ctx.births,[]);assert.deepEqual(E.invariants(w),[]);
 }
 const {w,p,host}=fixture();w.primaryInocula=[];Object.assign(p,{stage:'first',counter:4,E:1,ready:0});const i=E.P.produce(w,E.context(w),host);assert(i.transfer&&!i.egg);
});
test('laid eggs outlive their parent, attach, wait two turns, hatch once and settle next turn',()=>{
 const {w,host,target,eggs}=fixture();const id=eggs[0].id;
 E.P.exclude(w,E.context(w),host,'immunity');assert.equal(host.infection,null);
 let ctx=tick(w,3);const egg=w.primaryInocula.find(i=>i.id===id);assert.equal(egg.egg.state,'attached');assert.equal(egg.egg.hatchAt,5);assert.equal(ctx.primaryFlow.eggs.attached,1);
 assert.equal(E.P.expose(w,ctx,egg,target).exposed,0);assert.equal(egg.E,.06);
 target.cell++;ctx=tick(w,4);assert.equal(egg.cell,target.cell);assert.equal(ctx.primaryFlow.eggs.hatched,0);assert.equal(target.infection,null);
 ctx=tick(w,5);assert.equal(ctx.primaryFlow.eggs.hatched,1);assert.equal(ctx.primaryFlow.bySpecies.leafparasite.contact.invaded,1);assert.equal(target.infection,null);assert(!w.primaryInocula.some(i=>i.id===id));
 ctx=tick(w,6);assert.equal(ctx.primaryFlow.bySpecies.leafparasite.contact.established,1);assert.equal(target.infection.phase,1);assert.equal(target.infection.primary.cohort.members,2);assert.equal(target.infection.primary.parents[0],eggs[0].parentId);assert.deepEqual(E.invariants(w),[]);
});
test('water eggs move without dilution or duplication and can attach two cells from the terminal host',()=>{
 const {w,host,target,eggs}=fixture(true,{primaryEggSettings:{waterMoveChance:1}});target.cell=host.cell+2;
 for(let i=0;i<w.tiles.length;i++)w.tiles[i].terrain=i>=host.cell&&i<=target.cell?'shallow':'plain';
 const before=eggs.map(i=>({id:i.id,E:i.E,expires:i.expires}));let ctx=tick(w,3);
 assert.equal(ctx.primaryFlow.eggs.moved,2);assert.equal(w.primaryInocula.length,2);
 for(const i of w.primaryInocula){const b=before.find(a=>a.id===i.id);assert(b);assert.equal(i.E,b.E);assert.equal(i.expires,b.expires);}
 assert.equal(w.primaryInocula.filter(i=>i.egg.state==='attached').length,1);
 tick(w,4);ctx=tick(w,5);assert.equal(ctx.primaryFlow.eggs.hatched,1);assert.equal(ctx.primaryFlow.bySpecies.tideparasite.water.invaded,1);
 tick(w,6);assert.equal(target.infection.species,'tideparasite');assert.deepEqual(E.invariants(w),[]);
});
test('occupied first hosts cause waiting; expiry is absolute and hatch failure consumes its batch once',()=>{
 const a=fixture();a.target.infection=S.PrimaryParasite.infection(a.w,'leafparasite',a.target.id,0,'occupied');a.target.infection.E=.1;
 tick(a.w,3);assert(a.w.primaryInocula.every(i=>i.egg.state==='free'));E.P.exclude(a.w,E.context(a.w),a.target,'immunity');tick(a.w,4);assert.equal(a.eggs[0].egg.hatchAt,6);assert.equal(a.eggs[0].expires,22);
 const b=fixture(false,{primaryParasiteSettings:{...config.primaryParasiteSettings,entryRates:{contact:0}}});tick(b.w,3);tick(b.w,4);const failed=tick(b.w,5);assert.equal(failed.primaryFlow.eggs.failed,1);assert.equal(b.target.infection,null);assert.equal(b.eggs[0].E,0);tick(b.w,6);assert.equal(b.eggs[0].E,0);
 const c=fixture();c.target.cell=c.host.cell+6;const expired=tick(c.w,22);assert.equal(expired.primaryFlow.eggs.expired,2);assert.equal(c.w.primaryInocula.length,0);assert.deepEqual(E.invariants(c.w),[]);
});
test('attached egg batches are lost with their target instead of silently finding another host',()=>{
 const {w,target,eggs}=fixture();tick(w,3);w.organisms=w.organisms.filter(o=>o!==target);const c=tick(w,4);assert.equal(c.primaryFlow.eggs.lostHost,1);assert.equal(eggs[0].E,0);assert(!w.primaryInocula.some(i=>i.id===eggs[0].id));
});
test('egg counts and events remain separate from living P through CSV, archive replay and validation',()=>{
 let w=E.create({...config,width:40,height:28,initial:24,landscape:'templates',mapId:'river'});const h=O.create(w.config,globalThis.EcoReplayVersion,{species:S.activeSpecies(w)});h.append(w);
 for(let n=0;n<12;n++){w=E.step(w);assert.deepEqual(E.invariants(w),[]);h.append(w);}
 assert(h.rows.every(r=>r.primaryParasite.count===r.counts.leafparasite+r.counts.tideparasite));
 assert(h.rows.some(r=>r.primaryParasiteFlow.eggs.laid>0));assert(h.csv().includes('primary_egg_records'));assert(h.csv().includes('primary_egg_flow_hatched'));
 const snapshot=h.snapshot();assert.deepEqual(O.restore(snapshot).rows,h.rows);
 for(const change of [s=>delete s.rows[0].primaryParasite.eggs,s=>s.rows[0].primaryParasiteFlow.eggs.hatched=-1,s=>s.metadata.config.primaryEggModel='future']){const broken=structuredClone(snapshot);change(broken);assert.throws(()=>O.restore(broken),/一次寄生/);}
 let raw=null;const storage={getItem:()=>raw,setItem:(_,v)=>raw=v},archive=A.create(storage,E,globalThis.EcoReplayVersion),record=archive.capture(w,'user',snapshot);archive.save(record);
 const replay=archive.replay(record.id);let again=E.create(replay.config);for(let n=0;n<record.turn;n++)again=E.step(again);assert.equal(E.fingerprint(again),record.finalFingerprint);
 // A pre-egg signature must never authorize records carrying the new model.
 const forged=A.create(storage,E,'765d6ec931e82c8aee9099a66ba4a7b9a9c3f24bb3bd122bdf612624fc2ebab5').capture(w,'user');raw=JSON.stringify([forged]);assert.throws(()=>archive.replay(forged.id),/計算版/);
});

test('Worker transports egg batches and their attachment clocks without changing the committed turn',{timeout:30000},async()=>{
 const {Worker}=require('node:worker_threads'),path=require('node:path'),T=require('../src/ecology/transport.js');
 const w=E.create({...config,width:40,height:28,initial:24,landscape:'templates',mapId:'river'}),donor=S.PrimaryParasite.entries(w)[0].p;
 const i=S.PrimaryParasite.inoculum(w,donor,{kind:'contact',cell:0,hostId:null,createdAt:0,expires:20,stage:'terminal',transfer:false,egg:{version:'primary-egg/1',state:'free',attachedAt:null,hatchAt:null}});
 w.primaryInocula.push(i);w.ledger.initialE=S.round(w.ledger.initialE+i.E);S.PrimaryParasite.summary(w);w.stats=E.summarize(w);assert.deepEqual(E.invariants(w),[]);
 const worker=new Worker(path.join(__dirname,'compute-harness.cjs')),messages=[],waiting=[];
 worker.on('message',m=>waiting.length?waiting.shift()(m):messages.push(m));const next=()=>messages.length?Promise.resolve(messages.shift()):new Promise(r=>waiting.push(r));
 try{
  worker.postMessage({type:'init',epoch:1,world:w,stream:false});assert.equal((await next()).type,'ready');worker.postMessage({type:'compute',epoch:1,count:1,limit:500});
  const packet=await next();assert.equal(packet.type,'turn',packet.message);let transported=w;for(const patch of packet.patches)transported=T.apply(transported,patch);
  assert.deepEqual(transported,E.step(w));assert.deepEqual(E.invariants(transported),[]);assert(transported.primaryInocula.some(a=>a.id===i.id&&a.egg));assert.equal((await next()).type,'idle');
 }finally{await worker.terminate();}
});
