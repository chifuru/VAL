'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Factory=require('../design/advantage-switches/model.cjs');
const E=Factory.model({producer:false,waterbug:false,hyperparasite:false}),S=E.S,C=S.CellSpace;
const base={seed:'cell-motion-boundary',width:8,height:8,initial:0,
 enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},
 founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0},parasites:{}},
 producerModel:'colony/1',ryoukiModel:'ryouki/1',largePlantModel:'independent/1',
 largePlantSettings:{autoDensity:{land:0,water:0}},ecologyRevision:'observation/4.1'};
function fixture(){
 const w=structuredClone(E.create(base));w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];
 w.tiles=w.tiles.map(t=>({...t,env:3,terrain:'plain',light:1,soilM:5,cover:'none',blocked:false,walls:[]}));
 w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings();C.initialize(w);w.turn=1;return w;
}
function add(w,id,{species='ryouki',cell=18,state='settled',mutated=false,phase=4}={}){
 const o=S.organism(w,S.D.byId[species],cell,id,{age:18,phase});
 if(S.Ryouki.is(o))o.ryouki.mutated=mutated;
 C.assign(w,o,{state});w.organisms.push(o);return o;
}
function context(w){
 const ctx=E.context(w);for(const o of w.organisms){ctx.costs.set(o.id,{budget:o.E,action:0,base:0,density:0});
  ctx.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});}
 return ctx;
}
function path(ctx,o,cells){const [x,y]=S.xy({config:{width:8}},o.cell),[u,v]=[cells[0]%8,Math.floor(cells[0]/8)];
 ctx.intents.set(o.id,{type:'move',cell:cells.at(-1),path:cells,cost:999,direction:S.DIRS.findIndex(([dx,dy])=>dx===Math.sign(u-x)&&dy===Math.sign(v-y))});}
function valid(w){assert.deepEqual(C.validate(w),[]);}

test('three settlers admit two movers; arrivals cannot settle until a later turn',()=>{
 const w=fixture();for(let i=0;i<3;i++)add(w,'resident:'+i);
 const a=add(w,'arrival:a',{cell:17}),b=add(w,'arrival:b',{cell:26});const ctx=context(w);path(ctx,a,[18]);path(ctx,b,[18]);
 assert(E.B.candidates(w,a,ctx,S.maps(w)).some(c=>c.type==='move'&&c.cell===18));E.B.move(w,ctx);
 assert.equal(C.summary(w).settledIndividuals,3);assert.equal(C.summary(w).movingIndividuals,2);
 assert.equal(a.cellOccupancy.movedAt,1);valid(w);
 w.organisms=w.organisms.filter(o=>o.id!=='resident:0');E.B.move(w,context(w));
 assert.equal(C.summary(w).settledIndividuals,2,'fresh arrivals remain moving even if another context is built');
 w.turn++;const next=context(w);E.B.move(w,next);assert.equal(C.summary(w).settledIndividuals,3);assert.equal(C.summary(w).movingIndividuals,1);valid(w);
});

test('settlement arbitration is reproducible, array-order independent and does not rank paid cost',()=>{
 const original=fixture();for(let i=0;i<2;i++)add(original,'resident:'+i);
 add(original,'hope:a',{state:'moving'});add(original,'hope:b',{state:'moving'});
 const a=structuredClone(original),b=structuredClone(original);b.organisms.reverse();
 const ca=context(a),cb=context(b);ca.costs.get('hope:a').action=7;cb.costs.get('hope:b').action=9;
 E.B.move(a,ca);E.B.move(b,cb);assert.deepEqual(ca.cellMotion.settled,cb.cellMotion.settled);assert.equal(ca.cellMotion.settled.length,1);
 for(const w of [a,b]){assert.equal(C.summary(w).settledSlots,3);valid(w);}
});

test('packed nine keep independent IDs and only two individual passage slots',()=>{
 const w=fixture();for(let i=0;i<9;i++)add(w,'pack:'+i,{mutated:true});
 const a=add(w,'pass:a',{cell:17,mutated:true}),b=add(w,'pass:b',{cell:26,mutated:true}),c=add(w,'pass:c',{cell:19,mutated:true});
 const ctx=context(w);for(const o of [a,b,c])path(ctx,o,[18]);E.B.move(w,ctx);
 assert.equal([a,b,c].filter(o=>o.cell===18).length,2);assert.equal(C.summary(w).settledSlots,4,'one rejected resident remains at its source');
 const denied=[a,b,c].find(o=>o.cell!==18);assert.equal(ctx.costs.get(denied.id).action,0);assert.equal(ctx.records.get(denied.id).failure,'CELL_MOVE_CAPACITY');valid(w);
});

test('actual prefix alone is charged; a wall, insufficient budget or full tile stops further steps',()=>{
 for(const reason of ['TERRAIN','BUDGET','CAPACITY']){
  const w=fixture(),o=add(w,'walker',{cell:17});const ctx=context(w),unit=E.B.moveCost(w,o,18);
  if(reason==='TERRAIN')w.tiles[18].walls=[19];
  if(reason==='BUDGET')ctx.costs.get(o.id).budget=unit+.000001;
  if(reason==='CAPACITY'){for(let i=0;i<3;i++)add(w,'settle:'+i,{cell:19});for(let i=0;i<2;i++)add(w,'wait:'+i,{cell:19,state:'moving'});}
  // Rebuild traits for obstacles added after the first actor.
  const fresh=context(w);fresh.costs.get(o.id).budget=ctx.costs.get(o.id).budget;path(fresh,o,[18,19,20]);E.B.move(w,fresh);
  assert.equal(o.cell,18,reason);assert(Math.abs(fresh.costs.get(o.id).action-unit)<1e-8,reason);
  assert.equal(fresh.records.get(o.id).failure,'CELL_MOVE_'+reason);assert.deepEqual(fresh.records.get(o.id).ryoukiSteps,[18]);valid(w);
 }
});

test('blocked and species-incompatible terrain cannot be entered; aquatic producer uses the shared main capacity',()=>{
 const w=fixture(),bug=add(w,'water',{species:'waterbug',cell:17}),ctx=context(w);path(ctx,bug,[18]);E.B.move(w,ctx);
 assert.equal(bug.cell,17);assert.equal(ctx.costs.get(bug.id).action,0);
 const water=fixture();for(const cell of [17,18]){water.tiles[cell].terrain='shallow';water.tiles[cell].env=0;}
 const plant=add(water,'float',{species:'freshwaterlight',cell:17});for(let i=0;i<3;i++)add(water,'r:'+i,{cell:18});
 const c=context(water);path(c,plant,[18]);E.B.move(water,c);assert.equal(plant.cell,18);assert.equal(plant.slot,'producer');assert.equal(C.layer(plant),4);valid(water);
 const blocked=fixture(),o=add(blocked,'blocked',{cell:17});blocked.tiles[18].blocked=true;const b=context(blocked);path(b,o,[18]);E.B.move(blocked,b);assert.equal(o.cell,17);assert.equal(b.costs.get(o.id).action,0);
});

test('movement distance stays phase-dependent for normal ryouki and three for all mutated phases',()=>{
 for(const phase of [1,2,3,4])for(const mutated of [false,true]){
  const w=fixture(),o=add(w,'speed',{cell:17,phase,mutated}),ctx=context(w);path(ctx,o,[18,19,20,21]);E.B.move(w,ctx);
  assert.equal(o.cell,17+(mutated?3:phase));assert.equal(ctx.records.get(o.id).ryoukiSteps.length,mutated?3:phase);valid(w);
 }
});

test('local encounter elects combat, locks movement and preserves actual contact IDs',()=>{
 const w=fixture(),o=add(w,'hunter',{cell:17}),prey=add(w,'insect',{cell:18,species:'grassbug'});
 o.weights=o.weights.map(()=>0);o.weights[0]=100;o.E=8;prey.HP=1;
 const ctx=context(w);path(ctx,o,[18,19,20]);E.B.move(w,ctx);
 assert.equal(o.cell,18);assert.equal(ctx.cellMotion.engaged.get(o.id)?.target,prey.id);
 assert(ctx.cellMotion.contacts.some(c=>c.cell===18&&c.ids.includes(o.id)&&c.ids.includes(prey.id)));
 E.B.choose(w,ctx,'effect');assert.equal(ctx.intents.get(o.id).target,prey.id);
 const moveCost=ctx.costs.get(o.id).action;E.B.combat(w,ctx);assert.equal(prey.HP,0);assert.equal(o.cell,18);
 assert(ctx.costs.get(o.id).action>moveCost);const E0=o.E,paid=ctx.costs.get(o.id).action;
 E.N.payActions(w,ctx);assert(Math.abs(o.E-(E0-paid))<.00001);E.N.payActions(w,ctx);assert(Math.abs(o.E-(E0-paid))<.00001);
 assert.throws(()=>E.B.move(w,ctx),/CELL_MOVE_ALREADY_RESOLVED/);assert.throws(()=>E.B.combat(w,ctx),/CELL_COMBAT_ALREADY_RESOLVED/);valid(w);
});

test('combat rechecks target survival, range, readiness, friendship and remaining budget without charging failures',()=>{
 for(const change of ['death','range','cooldown','friend','budget']){
  const w=fixture(),o=add(w,'hunter',{cell:17}),prey=add(w,'insect',{cell:18,species:'grassbug'});const ctx=context(w);
  ctx.intents.set(o.id,{type:'attack',cell:o.cell,target:prey.id,path:[],cost:999});
  if(change==='death')prey.HP=0;if(change==='range')prey.cell=50;if(change==='cooldown')o.attackReady=w.turn+1;
  if(change==='friend')prey.species='ryouki';if(change==='budget')ctx.costs.get(o.id).budget=0;
  E.B.combat(w,ctx);assert.equal(ctx.costs.get(o.id).action,0,change);assert.equal(ctx.records.get(o.id).failure,'TARGET_LOST',change);
 }
});

test('full settlement does not force friendly combat, eviction or grant a fourth settlement',()=>{
 const w=fixture();for(let i=0;i<3;i++)add(w,'resident:'+i);const waiting=add(w,'waiting',{state:'moving'});
 const ctx=context(w);E.B.move(w,ctx);E.B.choose(w,ctx,'effect');E.B.combat(w,ctx);
 assert.notEqual(ctx.intents.get(waiting.id).type,'attack');assert.equal(waiting.cellOccupancy.state,'moving');
 assert.equal(C.summary(w).settledIndividuals,3);assert.equal(w.organisms.length,4);valid(w);
});

test('sustained low density waits for ordinary capacity, then releases without identity or resource changes',()=>{
 const w=fixture();for(let i=0;i<9;i++)add(w,'pack:'+i,{mutated:true});
 w.config.ryoukiSettings={...w.config.ryoukiSettings,densityLow:9,densityHigh:10,lowTurns:1};
 S.Ryouki.begin(w);assert(w.organisms.every(o=>o.ryouki.mutated&&o.ryouki.releaseWaiting));valid(w);
 w.organisms=w.organisms.slice(0,3);const before=w.organisms.map(o=>({id:o.id,E:o.E,B:o.B,M:o.M,HP:o.HP,phase:o.phase,age:o.age,G:o.G}));
 w.turn++;S.Ryouki.begin(w);assert(w.organisms.every(o=>!o.ryouki.mutated&&!o.ryouki.releaseWaiting));
 assert.deepEqual(w.organisms.map(o=>({id:o.id,E:o.E,B:o.B,M:o.M,HP:o.HP,phase:o.phase,age:o.age,G:o.G})),before);valid(w);
});

test('voluntary departure can resolve release waiting; state and movement timestamp survive Worker/JSON',()=>{
 const w=fixture();for(let i=0;i<9;i++)add(w,'pack:'+i,{mutated:true});
 const o=w.organisms[0];o.ryouki.lowRun=w.config.ryoukiSettings.lowTurns;o.ryouki.releaseWaiting=true;
 const T=require('../src/ecology/transport.js'),encode=T.encoder(w),before=structuredClone(w),ctx=context(w);path(ctx,o,[19]);E.B.move(w,ctx);
 assert.equal(o.ryouki.mutated,false);assert.equal(o.cellOccupancy.state,'moving');assert.equal(o.cellOccupancy.movedAt,1);
 const received=T.apply(before,JSON.parse(JSON.stringify(encode(w,true))));assert.deepEqual(received,w);valid(received);
});

test('transient occupant with full settlement tries an available route and waits if all routes are blocked',()=>{
 const w=fixture();for(let i=0;i<3;i++)add(w,'resident:'+i);const o=add(w,'transient',{state:'moving'});
 let ctx=context(w);E.B.choose(w,ctx,'move');assert.equal(ctx.intents.get(o.id).type,'move');
 for(const c of S.nearby(w,o.cell))w.tiles[c].blocked=true;
 ctx=context(w);E.B.choose(w,ctx,'move');assert.equal(ctx.intents.get(o.id).type,'stop');E.B.move(w,ctx);
 assert.equal(o.cellOccupancy.state,'moving');valid(w);
});

test('generated runtime and source model resolve the same movement, occupancy and events',()=>{
 const G=require('../src/ecology/observation-model.js').model({producer:false,waterbug:false,hyperparasite:false});
 const a=fixture();for(let i=0;i<3;i++)add(a,'resident:'+i);const entrant=add(a,'entrant',{cell:17});
 const b=structuredClone(a),ca=context(a),cb=G.context(b);
 for(const o of b.organisms){cb.costs.set(o.id,{budget:o.E,action:0,base:0,density:0});cb.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});}
 path(ca,entrant,[18,19,20]);path(cb,b.organisms.find(o=>o.id===entrant.id),[18,19,20]);
 E.B.move(a,ca);G.B.move(b,cb);assert.deepEqual(a,b);assert.deepEqual(ca.events,cb.events);assert.deepEqual(ca.costs,cb.costs);
 assert.deepEqual(ca.cellMotion.contacts,cb.cellMotion.contacts);valid(a);valid(b);
});
