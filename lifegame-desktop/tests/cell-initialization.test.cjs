'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const flags={producer:false,waterbug:false,hyperparasite:false},E=require('../design/advantage-switches/model.cjs').model(flags),S=E.S,C=S.CellSpace;
const zeros={grass:0,moss:0,algae:0,phytoplankton:0,forestcrown:0,starcrown:0,freshwaterlight:0,grassbug:0,waterbug:0,fungus:0};
const base={seed:'cell-initial-audit',width:8,height:8,initial:0,
 enabled:{main:false,plant:true,prey:true,fungus:true,P:false,Q:false},
 founderCounts:{version:1,species:zeros,parasites:{tideparasite:0,leafparasite:0,hyperparasite:0}},
 producerModel:'colony/1',producerSettings:{land:{occupancy:0},water:{occupancy:0}},largePlantModel:'independent/1',largePlantSettings:{autoDensity:{land:0,water:0}},
 consumerModel:'group/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',parasiteCohortModel:'cohort/1',
 ageModel:'life/1',balanceModel:'survival/4',informationModel:'persistent/1',ecologyRevision:'observation/4.1',cellModel:C.VERSION,cellSettings:{aquaticProfile:'freshwater-comparison/1'}};
const found=(c,species)=>({...c,founderCounts:{...c.founderCounts,species:{...c.founderCounts.species,...species}}});
const eligible=(w,id)=>w.tiles.reduce((n,_,cell)=>n+Number(S.validHabitat(w,S.D.byId[id],cell)),0);
const near=(a,b)=>assert(Math.abs(a-b)<.00008,`${a} != ${b}`);
const data=x=>JSON.parse(JSON.stringify(x));
const equal=(a,b,message)=>assert(require('node:util').isDeepStrictEqual(data(a),data(b)),message);
function valid(w,e=E){assert.deepEqual(e.invariants(w),[]);const total=e.S.totals(w);near(total.E+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);near(total.M+w.ledger.Mloss,w.ledger.initialM+(w.ledger.cellInputM||0));}
function internal(w,e){w.turn++;const c=e.context(w);e.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});e.B.move(w,c);e.cellLife(w,c);e.finish(w,c);valid(w,e);}

test('real generation respects explicit counts/zero and uses separate layers plus same-layer vacant slots',()=>{
 const empty=E.create(base);assert.equal(empty.organisms.length,0);const n=eligible(empty,'grass')+1;
 const w=E.create(found(base,{grass:n,grassbug:n}));valid(w);
 assert.equal(w.organisms.filter(o=>o.species==='grass').length,n);assert.equal(w.organisms.filter(o=>o.species==='grassbug').length,n);
 assert.equal(w.organisms.length,2*n);assert.equal(S.ConsumerGroup.count(w.organisms.find(o=>o.species==='grassbug')),1,'the requested population is not multiplied by group capacity');
 assert.equal(new Set(w.organisms.map(o=>o.id)).size,2*n);assert(w.organisms.some(o=>o.species==='grass'&&w.organisms.some(b=>b.species==='grassbug'&&b.cell===o.cell)));
 for(const id of ['grass','grassbug'])assert(w.organisms.filter(o=>o.species===id).length>new Set(w.organisms.filter(o=>o.species===id).map(o=>o.cell)).size);
 for(const o of w.organisms){near(o.cellMatter.bodyM,.02*o.B);assert(o.B<=S.phenotype(w,o).capB);assert.equal(w.config.founderReport.species[o.species].actual,n);}
 const row=w.colonySummary.water;assert.equal(row.count,n);assert.equal(row.occupiedCells,n-1);assert.equal(row.capacityB,n*20);
});

test('fixed initial capacities reject overflow, preserve old placement and ignore old variable colony capacity',()=>{
 const empty=E.create(base),n=eligible(empty,'grass');assert.throws(()=>E.create(found(base,{grass:6*n+1})),/PLACEMENT_SHORTAGE/);
 const legacy=structuredClone(found(base,{grass:n+1}));delete legacy.cellModel;delete legacy.cellSettings;assert.throws(()=>E.create(legacy),/PLACEMENT_SHORTAGE/);
 const w=E.create(found({...base,producerSettings:{land:{occupancy:0,capacityB:80,initialFraction:.5},water:{occupancy:0,capacityB:80,initialFraction:.5}}},{grass:1}));valid(w);
 const o=w.organisms[0];assert.equal(o.B,12);assert.equal(o.colony.capacityB,20);near(o.cellMatter.bodyM,.24);
 const unknown=structuredClone(base);delete unknown.cellSettings;const u=E.create(unknown),water=u.cellProfiles.profiles.findIndex(p=>p.region==='water');assert(water>=0);assert.equal(u.cellState.water[water],null);
});

test('all three placement forms use up to three actual ordinary settlers without mutation or duplicate IDs',()=>{
 const empty=E.create(base),usable=empty.tiles.filter(t=>!t.blocked).length,initial=4*Math.floor(usable*3/4);assert(initial>usable);
 for(const placement of ['natural','scatter','cluster']){
  const w=E.create({...base,placement,initial,lineages:'manual',selected:['ryouki'],enabled:{...base.enabled,main:true}});valid(w);
  assert.equal(w.organisms.length,initial);assert.equal(new Set(w.organisms.map(o=>o.id)).size,initial);
  assert(w.organisms.every(o=>o.cellOccupancy.state==='settled'&&!o.ryouki.mutated));assert.equal(C.summary(w).settledIndividuals,initial);
  assert([...C.index(w).values()].every(rows=>rows[4].length<=3));
 }
});

test('independent plants share only their own layer, while the mobile producer shares main settlement slots',()=>{
 const config={...base,width:40,height:28,landscape:'templates',mapId:'river'},empty=E.create(config),land=eligible(empty,'forestcrown');assert(land>0);
 const w=E.create(found(config,{forestcrown:land+1,freshwaterlight:1}));valid(w);
 assert.equal(w.organisms.filter(o=>o.species==='forestcrown').length,land+1);assert(w.organisms.filter(o=>o.species==='forestcrown').every(o=>o.birthLife>=540&&o.birthLife<=660));
 const floating=w.organisms.find(o=>o.species==='freshwaterlight');assert.equal(C.layer(floating),4);assert.equal(floating.birthLife,240);assert.equal(w.largePlantSummary.land.occupiedCells,land);
 const crowded={...base,initial:4*Math.floor(empty.config.width/2),lineages:'manual',selected:['ryouki'],enabled:{...base.enabled,main:true}};
 const v=E.create(found(crowded,{freshwaterlight:1}));valid(v);assert.equal(C.summary(v).settledIndividuals,crowded.initial+1);
 const full=E.create(base),cell=full.tiles.findIndex((t,i)=>!t.blocked&&S.validHabitat(full,S.D.byId.freshwaterlight,i)),f=C.founders(full);
 for(let i=0;i<3;i++)f.add(S.D.byId.ryouki,cell,'resident:'+i);
 assert.throws(()=>f.add(S.D.byId.freshwaterlight,cell,'floating'),/CELL_SPACE_FULL/);
});

test('actual river founders and short life agree across generated modules, observation, JSON and worker without opening public gates',()=>{
 const M=require('../src/ecology/observation-model.js'),T=require('../src/ecology/transport.js'),O=require('../src/ecology/observations.js'),G=M.model(flags);
 const config={...base,width:40,height:28,initial:84,lineages:'few',landscape:'templates',mapId:'river',enabled:{main:true,plant:true,prey:true,fungus:true,P:true,Q:true}};
 delete config.founderCounts;delete config.producerSettings;delete config.largePlantSettings;
 const w=E.create(config),g=G.create(config);equal(g,w,'generated initial world');valid(w);const encoder=T.encoder(w),h=O.create(w.config,'initialization/1',{species:S.activeSpecies(w)});h.append(w);
 const initial=JSON.stringify(w);for(const summary of [S.Colony.summary,S.FungalColony.summary,S.ConsumerGroup.summary,S.LargePlant.summary])summary(w);assert.equal(JSON.stringify(w),initial);
 const f=w.fungalColonySummary;assert.equal(f.capacityB,3*f.count);assert.equal(f.bodyM,S.round(.02*f.B));assert.equal(f.regrowthB,undefined,'legacy flow history is not presented as current life activity');
 for(let turn=1;turn<=2;turn++){
  const before=structuredClone(w);internal(w,E);internal(g,G);equal(w,g,'generated short life');
  const patch=data(encoder(w,true)),received=T.apply(before,patch);equal(received,w,'worker persisted state');valid(received);valid(data(w));
  const world=JSON.stringify(w);h.append(w);assert.equal(JSON.stringify(w),world);
 }
 assert.equal(h.rows.length,3);assert.deepEqual(O.restore(h.snapshot()).snapshot(),h.snapshot());require('./cell-turn-assertion.cjs')(E,w);
 assert.throws(()=>require('../src/ecology/archive.js').create({getItem:()=>null,setItem(){}},E,'initialization/1').capture(w,'manual'),/CELL_MODEL_INCOMPLETE/);
 console.log(JSON.stringify({representative:'river 40x28',T0:h.rows[0].counts,T2:h.rows[2].counts,turns:2,energyAndMaterial:'conserved'}));
});

test('candidate settings enter manual generation and resolved initial conditions recreate the same real world',()=>{
 const U=require('../src/ecology/cell-interface.js'),c={...base,width:40,height:28,landscape:'templates',mapId:'river',initial:24,lineages:'few',
  enabled:{main:true,plant:true,prey:true,fungus:true,P:false,Q:false},generationModel:'diverse/1',generationSettings:{mode:'manual',profile:'auto',locks:[]}};
 delete c.founderCounts;delete c.producerSettings;delete c.largePlantSettings;
 const candidate=U.connect(S.validate(c),c),input=JSON.stringify(candidate),w=E.create(candidate);valid(w);assert.equal(JSON.stringify(candidate),input);
 assert.equal(w.config.generationResolved.version,'diverse-generation-resolved/1');assert.equal(w.config.generationSettings.mode,'manual');assert.equal(w.config.generationResolved.profile,'standard');
 const recreated=E.create(w.config);equal(recreated,w,'resolved initial conditions regenerate all bodies and slots');assert.equal(E.fingerprint(recreated),E.fingerprint(w));
});
