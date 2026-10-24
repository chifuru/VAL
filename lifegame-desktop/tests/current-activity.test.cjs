'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),F=require('./cell-archive-fixture.cjs'),flags={producer:false,waterbug:false,hyperparasite:false},
 E=require('../design/advantage-switches/model.cjs').model(flags),S=E.S,A=S.CurrentActivity,N=E.N.CellResources,T=S.SoilMatter,initial=E.create({...F.config,currentStateModel:'current-state/1'});
function world(settings={}){const w=structuredClone(initial);for(const k of ['organisms','resources','carcasses','pending','primaryInocula','hyperInocula','searchQ','informationField'])w[k]=[];
 w.currentInfections.types=[];w.turn=0;w.tiles=w.tiles.map(t=>({...t,terrain:'plain',env:3,light:1,soilM:5,blocked:false,cover:'none',walls:[]}));w.config.cellSettings=S.CellSpace.settings(settings);delete w.cellState;delete w.cellProfiles;S.CellSpace.initialize(w);S.PersistentInformation.initialize(w);ledger(w);return w;}
function ledger(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
function add(w,id='plant',cell=18){const o=S.organism(w,S.D.byId.grass,cell,id,{age:18,E:0,M:0,B:6});S.CellSpace.assign(w,o);w.organisms.push(o);return o;}
function next(w){w.turn++;const c=E.context(w);N.begin(w,c);return c;}
const near=(a,b)=>assert(Math.abs(a-b)<.00003,`${a} != ${b}`);
function conserved(w){const t=S.totals(w);near(t.E+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);near(t.M+w.ledger.Mloss,w.ledger.initialM+(w.ledger.cellInputM||0));}
function dense(profiles,water){const Q=S.round,flow={waterInput:0,waterDrain:0,waterEvaporation:0};for(let cell=0;cell<water.length;cell++){
 const p=profiles[cell];if(p.waterCapacity===null)continue;const input=p.waterInput??p.rain,total=Q(water[cell]+input),drain=Q(Math.max(0,total-p.waterCapacity)),held=Q(total-drain),evap=Q(Math.min(held,p.evaporation));water[cell]=Q(held-evap);flow.waterInput=Q(flow.waterInput+input);flow.waterDrain=Q(flow.waterDrain+drain);flow.waterEvaporation=Q(flow.waterEvaporation+evap);
}return flow;}
function background(w,c){c.cellLifeDone=true;return N.background(w,c);}

test('sparse water matches dense stocks and every input/drain/evaporation flow across wet and dry fixed conditions',()=>{
 for(const settings of [{},{rainScale:0},{rainScale:.02},{rainScale:.1,temperature:30},{rainScale:3,temperature:5},{soilQuality:1.25,temperature:45}]){
  const w=world(settings),expected=w.cellState.water.slice();for(let t=0;t<40;t++){const f=dense(w.cellProfiles.profiles,expected),c=next(w);assert.deepEqual(w.cellState.water,expected);for(const k of Object.keys(f))assert.equal(c.cellResources.flow[k],f[k]);assert.deepEqual(A.validate(w),[]);}conserved(w);
 }
});
test('an equilibrated empty board visits zero water/mineral cells while retaining fixed flows',()=>{
 const w=world();for(let n=0;n<10;n++)next(w);assert.equal(A.summary(w).waterDue,0);const values=w.cellState.water.slice(),c=next(w);assert.equal(A.stats(w).waterVisited,0);assert.equal(A.stats(w).mineralVisited,0);assert.deepEqual(w.cellState.water,values);assert(c.cellResources.flow.waterInput>0);assert(c.cellResources.flow.waterDrain>0);conserved(w);
});
test('consumption wakes only its cell once and can return it to equilibrium',()=>{
 const w=world();for(let n=0;n<10;n++)next(w);w.cellState.water[18]-=2;A.waterChanged(w,18);A.waterChanged(w,18);assert.deepEqual(w.currentActivity.waterDue,[18]);next(w);assert.equal(A.stats(w).waterVisited,1);assert.equal(w.currentActivity.waterDue.length,0);next(w);assert.equal(A.stats(w).waterVisited,0);
});
test('a later occupant sees actual rain accumulated on an empty cell; readonly stock access does not advance time',()=>{
 const w=world(),expected=w.cellState.water.slice();for(let n=0;n<10;n++){dense(w.cellProfiles.profiles,expected);next(w);}add(w);const before=JSON.stringify(w);for(let n=0;n<4;n++)assert.equal(S.CellSpace.stock(w,18).water,expected[18]);assert.equal(JSON.stringify(w),before);
});
test('real photo/mineral allocations notify water and mineral targets without making new stock',()=>{
 const w=world();for(let n=0;n<10;n++)next(w);const o=add(w);ledger(w);w.turn++;const c=E.context(w);E.prepare(w,c);E.B.move(w,c);E.N.payActions(w,c);
 N.acquire(w,c,[{id:'photo',actor:o.id,kind:'photo',need:1},{id:'mineral',actor:o.id,kind:'mineral',need:.1}],[{actor:o.id,height:0,area:1,capture:1}]);
 assert(c.cellResources.receipts.some(r=>r.kind==='photo'&&r.E>0));assert(w.currentActivity.waterDue.includes(18));assert(w.currentActivity.mineralDirty.includes(18));conserved(w);
});
test('positive mineral inputs update only their configured cells and retain full-soil overflow',()=>{
 const w=world();for(const p of w.cellProfiles.profiles)p.mineralInput=0;w.cellProfiles.profiles[18].mineralInput=.2;A.initialize(w);for(let n=0;n<100;n++)next(w);
 assert.equal(A.stats(w).mineralVisited,1);assert.equal(A.stats(w).waitingTried,0);assert.equal(w.tiles[18].soilM,20);near(T.summary(w).waitingM,5);near(w.ledger.cellInputM,20);conserved(w);
});
test('full mineral waiting stock sleeps until an actual vacancy, then retries once at the next preparation',()=>{
 const w=world();for(const cell of [18,19,20]){w.tiles[cell].soilM=20;T.wait(w,cell,2);}ledger(w);for(let n=0;n<5;n++){next(w);assert.equal(A.stats(w).waitingTried,0);}assert.equal(T.summary(w).waitingM,6);
 w.tiles[18].soilM-=.5;w.ledger.initialM-=.5;A.mineralChanged(w,18);A.mineralChanged(w,18);next(w);assert.equal(A.stats(w).waitingTried,1);assert.equal(w.tiles[18].soilM,20);near(T.summary(w).waitingM,5.5);next(w);assert.equal(A.stats(w).waitingTried,0);conserved(w);
});
test('new waiting material in an open cell becomes ready without a full waiting-list scan',()=>{
 const w=world();T.wait(w,18,.4);ledger(w);const before=w.tiles[18].soilM;next(w);assert.equal(A.stats(w).waitingTried,1);near(w.tiles[18].soilM,before+.4);assert.equal(T.summary(w).waitingM,0);conserved(w);
});
test('deferred mineral return is available at next T once; blocked overflow remains finite',()=>{
 const w=world();T.defer(w,18,{M:.4,kind:'mineral'});ledger(w);assert.equal(w.cellState.nextMaterial.length,1);const before=w.tiles[18].soilM;next(w);near(w.tiles[18].soilM,before+.4);assert.equal(w.cellState.nextMaterial.length,0);const bytes=JSON.stringify(w);assert.throws(()=>N.begin(w,E.context(w)),/ALREADY/);assert.equal(JSON.stringify(w),bytes);conserved(w);
 w.carcasses.push({id:'late-minerals',cell:18,E:0,M:.4,G:0,q:1,sourceClass:'plant',created:w.turn,availableAt:w.turn+1});w.ledger.initialM+=.4;E.finish(w,E.context(w));assert.equal(w.activitySummary.mineralDirty,1);assert.equal(w.activitySummary.mineralDirty,w.currentActivity.mineralDirty.length);conserved(w);
});
test('dry stocks skip row work and resume on the next real rainfall even without organisms',()=>{
 const w=world();T.organic(w,18,100,2,10,'plant');ledger(w);let c=next(w);w.cellState.water[18]=0;A.waterChanged(w,18);const before=T.rows(w)[0].E;background(w,c);assert.equal(T.rows(w)[0].E,before);assert.equal(A.stats(w).soilSkipped,1);assert.equal(A.stats(w).soilRows,0);
 c=next(w);assert(w.cellState.water[18]>0);background(w,c);assert(T.rows(w)[0].E<before);assert.equal(A.stats(w).soilRows,1);conserved(w);
});
test('static unsuitable decomposition conditions preserve stock without per-row decomposition attempts',()=>{
 const w=world();w.cellProfiles.profiles[18].fungalPH=0;for(const type of ['plant','fungal','lower-animal'])T.organic(w,18,10,.2,1,type);ledger(w);const c=next(w);background(w,c);assert.equal(A.stats(w).soilCells,1);assert.equal(A.stats(w).soilSkipped,1);assert.equal(A.stats(w).soilRows,0);assert.equal(T.summary(w).E,30);conserved(w);
});
test('decay load updates only current/previous affected cells and clears a disappeared source',()=>{
 const w=world();A.decay(w,new Map([[18,100]]));assert(w.cellState.decayLoad[18]>0);w.turn++;A.decay(w,new Map([[19,100]]));assert.equal(A.stats(w).decayVisited,2);assert.equal(w.cellState.decayLoad[18],0);assert(w.cellState.decayLoad[19]>0);A.decay(w,new Map());assert.equal(w.cellState.decayLoad[19],0);assert.equal(w.currentActivity.decayCells.length,0);
});
test('unresolved aquatic cells stay unresolved and are not accidentally granted fixed inputs',()=>{
 const w=world();const p=w.cellProfiles.profiles[18];p.waterCapacity=null;p.mineralCapacity=null;p.mineralInput=null;w.cellState.water[18]=null;A.initialize(w);const c=next(w);assert.equal(w.cellState.water[18],null);assert(!w.currentActivity.waterDue.includes(18));assert(!w.currentActivity.mineralCells.includes(18));assert(c.cellResources.flow.waterInput>0);
});
test('current candidate validation rejects duplicate/foreign cells and invalid clocks',()=>{
 const w=world();w.currentActivity.waterDue.push(w.currentActivity.waterDue[0]);assert(A.validate(w).some(e=>e.includes('TARGET')));A.initialize(w);w.currentActivity.at=w.turn+1;assert.deepEqual(A.validate(w),['CURRENT_ACTIVITY_STATE']);
});
test('source/generated current-state runs agree through 4T and cancellation keeps all target state unchanged',()=>{
 const G=require('../src/ecology/observation-model.js').model(flags),config={...F.config,currentStateModel:'current-state/1'};let a=E.create(config),b=G.create(config);
 for(let n=0;n<4;n++){const before=JSON.stringify(a),job=E.beginTurn(a);job.advance();job.advance();job.cancel();assert.equal(JSON.stringify(a),before);a=E.step(a);b=G.step(b);assert.deepEqual(a,b);assert.deepEqual(E.invariants(a),[]);}
});
