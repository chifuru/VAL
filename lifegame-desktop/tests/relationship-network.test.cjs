'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const N=require('../src/ecology/relationship-network.js'),O=require('../src/ecology/observations.js'),D=require('../src/ecology/catalogue.js'),F=require('./ecology-fixtures.cjs');
const species=D.species,symbols=Object.fromEntries([...species.map(s=>s.id),'organic','mineral'].map(id=>[id,'M-1 0 H1']));
function world(active=true){
  const counts=Object.fromEntries(species.map(s=>[s.id,0]));Object.assign(counts,{grass:1,solar:1,abyss:1});
  return {turn:0,config:active?{relationshipModel:'network/1'}:{},stats:{counts,main:2,food:1,P:0,Q:0},organisms:[{id:'plant',species:'grass',B:4},{id:'receiver',species:'solar',B:10},{id:'other',species:'abyss',B:20}],carcasses:[],searchQ:[],observation:{relations:{},flowTelemetry:{definition:'nutrition-observed/1',inputs:[],production:{},relationship:{definition:'relationship-telemetry/1',turn:0,damage:{},kills:{},care:{},clear:{}},information:{definition:'information-observed/1',origins:[],emissions:[],receipts:[],effects:[]}}}};
}
function advance(w,turn){w.turn=turn;w.observation={relations:{},flowTelemetry:{definition:'nutrition-observed/1',inputs:[],production:{},relationship:{definition:'relationship-telemetry/1',turn,damage:{},kills:{},care:{},clear:{}},information:{definition:'information-observed/1',origins:[],emissions:[],receipts:[],effects:[]}}};return w.observation.flowTelemetry;}
function history(w){return O.create(w.config,'network-test',{species});}
test('uncapped combat amounts, care and actual removal are collected only by the new observation gate',()=>{
  const w=F.world();w.config.ecologyRevision='observation/4.1';w.config.relationshipModel='network/1';const a=F.add(w,'solar','a',2,2),b=F.add(w,'abyss','b',3,2);w.stats=F.E.summarize(w);const ctx=F.E.context(w);
  ctx.events.set(a.id,[...Array.from({length:8},(_,i)=>({type:'dummy'+i})),{type:'attack',target:b.id,actualDamage:7.5},{type:'care',target:b.id,amount:1},{type:'clear',target:b.id,reason:'groom'},{type:'clear',target:b.id,reason:'maintenance'}]);
  ctx.records.get(b.id).hitBy=a.id;ctx.deaths.push({id:b.id,species:b.species,reason:'combat'});F.E.finish(w,ctx);
  assert.deepEqual(w.observation.flowTelemetry.relationship,{definition:'relationship-telemetry/1',turn:1,damage:{'solar|abyss':7.5},kills:{'solar|abyss':1},care:{'solar|abyss':1},clear:{'solar|abyss':1}});
  delete w.config.relationshipModel;const old=F.E.context(w);F.E.finish(w,old);assert.equal(w.observation.flowTelemetry.relationship,undefined);
});
test('food arrows follow actual energy, distinguish carcasses and never use information as food',()=>{
  const w=world(),h=history(w);h.append(w);const flow=advance(w,1);
  flow.inputs=[{id:'receiver',species:'solar',type:'plant',sourceSpecies:'grass',source:'plant',energy:3,tag:'plant'},{id:'other',species:'abyss',type:'carcass',sourceSpecies:'grassbug',source:'c:dead:0',energy:2,tag:'animal'},{id:'receiver',species:'solar',type:'resource',source:'r:1:info',energy:9,tag:'information'},{id:'plant',species:'grass',type:'light',energy:4,tag:'light'}];
  h.append(w);const edges=h.rows[1].relationship.edges;
  assert(edges.some(e=>e.from==='grass'&&e.to==='solar'&&e.type==='feeding'&&e.value===3));assert(edges.some(e=>e.from==='@carcass:grassbug'&&e.to==='abyss'&&e.type==='scavenging'&&e.value===2));assert(edges.some(e=>e.from==='@light'&&e.to==='grass'&&e.value===4));assert(!edges.some(e=>e.from.includes('info')));
  const csv=h.csv();assert(csv.includes('"network_feeding","grass|solar","3","model_E"'));assert(csv.includes('"network_biomass","solar","10","model_B"'));assert.equal(O.restore(h.snapshot()).csv(),csv);
});
test('role pyramid follows observed producer, herbivore and predator feeding without duplicating biomass',()=>{
  const w=world(),h=history(w);w.organisms.push({id:'bug',species:'grassbug',B:5});w.stats.counts.grassbug=1;h.append(w);
  const flow=advance(w,1);flow.inputs=[{id:'receiver',species:'solar',type:'animal',sourceSpecies:'grassbug',source:'bug',energy:2,tag:'animal'},{id:'other',species:'abyss',type:'animal',sourceSpecies:'solar',source:'receiver',energy:3,tag:'animal'}];h.append(w);
  const p=h.rows[1].current.pyramid;assert.deepEqual(p.roleLayers,[4,5,10,20,0]);assert.equal(p.roleUnknown,0);
  assert.equal(p.roleLayers.reduce((a,b)=>a+b,0),39);
});
test('information attributes only nonzero known origins once, separating confirmed Q mediation',()=>{
  const w=world(),h=history(w);h.append(w);const flow=advance(w,1);w.informationField=[{originId:'origin'}];flow.information.effects=[{recipient:'receiver',species:'solar',event:{id:'origin',sourceSpecies:'grass'},deltaAbs:.1},{recipient:'receiver',species:'solar',event:{id:'origin:feeding',sourceSpecies:'grass'},deltaAbs:.2,place:true},{recipient:'receiver',species:'solar',event:{id:'q-origin',sourceSpecies:'grass',mediated:true},deltaAbs:.3},{recipient:'receiver',species:'solar',event:{id:'zero',sourceSpecies:'grass'},deltaAbs:0},{recipient:'receiver',species:'solar',event:{id:'unknown',sourceSpecies:'none'},deltaAbs:1}];
  h.append(w);assert.deepEqual(h.rows[1].relationship.edges.map(e=>[e.from,e.to,e.type,e.value]),[['grass','solar','information',1],['hyperparasite','solar','mediated',1]]);
});
test('100T windows retain boundary values, use shared scales and change only on the following turn',()=>{
  const w=world(),h=history(w);h.append(w);
  for(let t=1;t<=501;t++){const flow=advance(w,t);flow.relationship.damage={'solar|abyss':t<=100?1:2};w.organisms[1].B=t<=100?10:30;h.append(w);}
  let m=N.build(h,100);assert.equal(m.current.first,1);assert.equal(m.current.last,100);assert.equal(m.current.complete,true);assert.deepEqual(m.past,[null,null,null,null]);assert.equal(m.current.biomass.solar,10);
  m=N.build(h,101);assert.equal(m.current.first,101);assert.equal(m.current.observed,1);assert.equal(m.current.biomass.solar,30);assert.equal(m.past[0].biomass.solar,10);assert.equal(m.past[0].edges.find(e=>e.type==='combat').rate,1);assert.equal(m.current.edges.find(e=>e.type==='combat').rate,2);assert.equal(m.maximum.combat,2);
  m=N.build(h,400);assert.equal(m.current.first,301);assert.equal(m.past.filter(Boolean).length,3);
  m=N.build(h,500);assert.equal(m.current.first,401);assert.equal(m.past.filter(Boolean).length,4);assert.equal(m.current.last,500);
  m=N.build(h,501);assert.equal(m.first,501);assert.equal(m.current.first,501);assert.deepEqual(m.past,[null,null,null,null]);assert.equal(h.rows.length,502);assert.equal(N.build(h,501),m);
});
test('new snapshot saves all intervals and rejects missing, corrupted and future definitions',()=>{
  const w=world(),h=history(w);h.append(w);advance(w,1).relationship.damage={'solar|abyss':2};h.append(w);const snapshot=h.snapshot();assert.equal(snapshot.definitions.relationship,N.definition);assert.equal(snapshot.relationshipIntervals.intervals.length,1);assert.deepEqual(O.restore(snapshot).snapshot(),snapshot);
  for(const change of [s=>delete s.definitions.relationship,s=>s.definitions.relationship='future',s=>s.metadata.config.relationshipModel='future',s=>delete s.metadata.relationshipDefinition,s=>delete s.rows[1].relationship,s=>s.rows[1].relationship.edges[0].value=-1,s=>s.rows[1].relationship.edges[0].value=Infinity,s=>delete s.relationshipIntervals,s=>s.relationshipIntervals.intervals[0].edges[0].value=999]){const broken=structuredClone(snapshot);change(broken);assert.throws(()=>O.restore(broken),/観測|関係|非有限/);}
});
test('legacy snapshots and CSV are unmodified and absent old relation data is not zero-filled',()=>{
  const w=world(false),h=history(w);delete w.observation.flowTelemetry.relationship;h.append(w);advance(w,1);delete w.observation.flowTelemetry.relationship;h.append(w);const snapshot=h.snapshot(),csv=h.csv();assert.equal(snapshot.definitions.relationship,undefined);assert.equal(snapshot.relationshipIntervals,undefined);assert.equal(h.rows[1].relationship,undefined);assert.deepEqual(O.restore(snapshot).snapshot(),snapshot);assert.equal(O.restore(snapshot).csv(),csv);const m=N.build(h);assert.equal(m.missing,true);assert.equal(m.current.biomass.solar,null);assert.equal(m.current.coverage.combat,0);assert.equal(m.current.edges.length,0);
});
test('initial, extinct and missing states remain distinct in models and shared-symbol markup',()=>{
  const w=world(),h=history(w);h.append(w);let m=N.build(h);assert.equal(m.initial,true);assert.equal(m.current.observed,0);assert.match(N.render(m,{symbols,species}),/初期構成のみ/);
  const flow=advance(w,1);flow.relationship.damage={'solar|abyss':3};w.organisms=w.organisms.filter(o=>o.species!=='solar');w.stats.counts.solar=0;w.stats.main=1;h.append(w);m=N.build(h);const html=N.render(m,{symbols,species});assert.match(html,/data-network-edge="combat"/);assert.match(html,/data-network-node="solar"/);assert.match(html,/現在は消失/);assert.equal(m.current.biomass.solar,0);assert.equal((html.match(/data-relationship-plane=/g)||[]).length,3);assert(!html.includes('relationship-history'));assert(!html.includes('undefined'));
});
test('missing amount measurements stay unrecorded instead of becoming apparent measured zero',()=>{
  const w=world(),h=history(w);h.append(w);advance(w,1);delete w.observation.flowTelemetry.relationship;delete w.observation.flowTelemetry.inputs;h.append(w);const row=h.rows[1].relationship;assert.equal(row.availability.combat,'unrecorded');assert.equal(row.availability.nutrition,'unrecorded');const m=N.build(h);assert.equal(m.current.coverage.combat,0);assert.match(N.render(m,{symbols,species}),/未記録を含む/);
  assert(h.csv().includes('"network_measurement","combat","unrecorded","measurement_state","","unrecorded"'));
});
test('the current relationship display has three focused cards without period thumbnails',()=>{
  const w=world(),h=history(w);h.append(w);
  for(let t=1;t<=101;t++){const flow=advance(w,t);flow.inputs=t===1?[{id:'plant',species:'grass',type:'light',energy:2,tag:'light'}]:t===101?[{id:'other',species:'abyss',type:'carcass',sourceSpecies:'grassbug',source:'c:dead:0',energy:3,tag:'animal'}]:[];if(t===101){w.organisms=w.organisms.filter(o=>o.species!=='solar');w.stats.counts.solar=0;}h.append(w);}
  const model=N.build(h),html=N.render(model,{symbols,species});
  assert.deepEqual(model.species,['abyss','solar','grass']);assert(model.past[0].counts.solar>0);assert.equal(model.current.counts.solar,0);
  const svg=[...html.matchAll(/<svg class="relationship-svg" viewBox="0 0 (\d+) (\d+)"/g)];assert.equal(svg.length,3);
  assert.match(html,/data-network-edge="scavenging"/);assert.match(html,/data-network-node="@carcass:grassbug"/);
  assert(!html.includes('data-network-node="@light"'));assert(!html.includes('relationship-past'));assert(!html.includes('100–199T'));
});
