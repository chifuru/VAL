'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Base=require('../src/ecology/engine.js'),Static=require('../src/ecology/observation-model.js'),
  Comparison=require('../design/advantage-switches/model.cjs'),O=require('../src/ecology/observations.js');

function flags(mask){return {producer:!!(mask&1),waterbug:!!(mask&2),hyperparasite:!!(mask&4)};}
function empty(E){
  const w=E.create({seed:'map-scope-fixture',width:8,height:8,initial:0,
    ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',
    enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:false}});
  w.tiles=w.tiles.map(t=>({...t,env:3,terrain:'plain',cover:'none',blocked:false,light:.7,walls:[],soilM:5}));
  w.organisms=[];w.resources=[];w.carcasses=[];w.messages=[];w.pending=[];w.searchQ=[];
  w.config.enabled={main:true,plant:true,fungus:true,prey:true,P:true,Q:true};
  return w;
}
function add(E,w,species,id,x,y,options={}){
  const o=E.S.organism(w,E.S.D.byId[species],E.S.index(w,x,y),id,options);w.organisms.push(o);return o;
}
function reset(E,w){
  const t=E.S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);
}
function assertTopology(w,m){
  assert.equal(m.byId.size,w.organisms.length);
  for(const o of w.organisms){
    assert.strictEqual(m.byId.get(o.id),o);
    const cells=o.slot==='main'?m.main:o.slot==='prey'&&m.prey?m.prey:m.food;
    assert.strictEqual(cells.get(o.cell),o);
  }
  for(const name of ['resources','carcasses']){
    const grouped=new Map();
    for(const row of w[name]){if(!grouped.has(row.cell))grouped.set(row.cell,[]);grouped.get(row.cell).push(row);}
    assert.equal(m[name].size,grouped.size);
    for(const [cell,rows]of grouped){assert.equal(m[name].get(cell).length,rows.length);rows.forEach((row,i)=>assert.strictEqual(m[name].get(cell)[i],row));}
  }
}

test('map scopes share only synchronous reads, retain live row values and never enter saved state',()=>{
  const S=Base.S,w=empty(Base),o=add(Base,w,'grass','plant',2,2),other=empty(Base);
  const a=S.maps(w),b=S.maps(w);assert.notStrictEqual(a,b);assert.notStrictEqual(a.byId,b.byId);
  a.byId.delete(o.id);a.food.clear();assert.strictEqual(S.maps(w).byId.get(o.id),o);
  const before=structuredClone(w);let shared;
  assert.equal(S.withMapScope(w,()=>{
    shared=S.maps(w);assert.strictEqual(S.maps(w),shared);
    assert.notStrictEqual(S.maps(other),S.maps(other));
    assert.throws(()=>S.withMapScope(w,()=>{}),/MAP_SCOPE_NESTED/);
    o.E++;assert.equal(S.maps(w).byId.get(o.id).E,before.organisms[0].E+1);o.E--;
    return 17;
  }),17);
  assert.notStrictEqual(S.maps(w),shared);assert.deepEqual(w,before);
  const seed=S.maps(w);S.withMapScope(w,()=>assert.strictEqual(S.maps(w),seed),seed);
  let failed;
  assert.throws(()=>S.withMapScope(w,()=>{failed=S.maps(w);throw Error('fixture-failure');}),/fixture-failure/);
  assert.notStrictEqual(S.maps(w),failed);assert.notStrictEqual(S.maps(w),S.maps(w));
});

test('co-located IDs remain independently addressable without granting future cohabitation capacity',()=>{
  const S=Base.S,w=empty(Base),a=add(Base,w,'myth','first',3,3),b=add(Base,w,'myth','second',3,3);
  S.withMapScope(w,()=>{
    const m=S.maps(w);assert.strictEqual(m.byId.get(a.id),a);assert.strictEqual(m.byId.get(b.id),b);
    assert.equal(m.byId.size,2);assert.strictEqual(m.main.get(a.cell),b);
  });
  // Cell occupancy/reservation is still single-owner. A future multi-owner index and
  // movement/birth arbitration must change together; byId retention is not permission.
  assert(Base.invariants(w).some(e=>e.startsWith('SLOT_DUPLICATE:')));
});

test('support placement keeps its private mutable food map and later rebuilds every new ID',()=>{
  const E=Comparison.model(flags(0)),S=E.S,w=empty(E);reset(E,w);
  S.ProducerSupport.attach(w,{land:{capacity:1},water:{capacity:1},establishment:1});
  S.ProducerSupport.begin(w,S);assert(w.organisms.length>0);
  const m=S.maps(w);assertTopology(w,m);assert.notStrictEqual(S.maps(w),m);
  m.food.clear();m.byId.clear();assertTopology(w,S.maps(w));
});

test('engine scopes end at movement, feeding/death, birth and resource-supply boundaries',()=>{
  const E=Comparison.model(flags(0)),S=E.S,w=empty(E);
  const mover=add(E,w,'myth','mover',0,0,{E:50,age:10}),from=mover.cell,to=S.index(w,1,0);
  add(E,w,'myth','dying',7,7,{E:10,HP:0,age:10});
  add(E,w,'grassbug','grazer',6,6,{E:0,age:10});
  const plants=[[2,2],[3,2],[4,3]].map(([x,y],i)=>add(E,w,'grass','plant'+i,x,y,{phase:2,E:20,M:1,B:8,age:10}));
  const consumed={cell:S.index(w,6,6),kind:'seed',q:1,E:2,M:.1,G:0,created:0,expires:null};w.resources.push(consumed);reset(E,w);
  const maps=S.maps;S.maps=state=>{const m=maps(state);assertTopology(state,m);return m;};
  let moved=false,fed=false,died=false,born=[],parentSnapshot,supplySnapshot,supplied=false;
  E.B.choose=(state,ctx,stage)=>{
    for(const o of state.organisms)ctx.intents.set(o.id,{type:'stop',cell:o.cell,cost:0,path:[]});
    if(stage==='move')ctx.intents.set(mover.id,{type:'move',cell:to,cost:0,path:[to],direction:2});
    else {const m=S.maps(state);assert(!m.main.has(from));assert.equal(m.main.get(to).id,mover.id);moved=true;}
  };
  const feed=E.N.feed;E.N.feed=(state,...args)=>{
    const result=feed(state,...args);assert(!state.resources.includes(consumed));
    assert(!(S.maps(state).resources.get(consumed.cell)||[]).some(a=>a===consumed));fed=true;return result;
  };
  const settle=E.N.settle;E.N.settle=(state,...args)=>{
    const result=settle(state,...args),m=S.maps(state);assert(!m.byId.has('dying'));
    assert([...m.carcasses.values()].flat().some(a=>a.id.startsWith('c:dying:')));died=true;return result;
  };
  const reproduce=E.R.reproduce;E.R.reproduce=(state,ctx)=>{
    parentSnapshot=S.maps(state);born=reproduce(state,ctx);assert(born.length>0);
    ctx.current=new Proxy({}, {get(){throw Error('STALE_POST_BIRTH_CURRENT');}});
    return born;
  };
  const drops=E.N.investAndDrops;E.N.investAndDrops=(state,...args)=>{
    const m=S.maps(state);assert.notStrictEqual(m,parentSnapshot);for(const child of born)assert.strictEqual(m.byId.get(child.id),child);
    return drops(state,...args);
  };
  const supply=E.N.supply,supplyCell=S.index(w,5,0);
  E.N.supply=(state,ctx,candidates)=>{
    supplySnapshot=S.maps(state);
    return supply(state,ctx,[...candidates,{source:state.organisms.find(o=>o.id===plants[0].id),cell:supplyCell,kind:'seed',q:1,E:.1,M:0,G:0,costE:.1,costB:0,costM:0,expires:null}]);
  };
  const parasites=E.P.reproduce;E.P.reproduce=(state,...args)=>{
    const m=S.maps(state);assert.notStrictEqual(m,supplySnapshot);assert(m.resources.get(supplyCell)?.some(a=>a.kind==='seed'));
    supplied=true;return parasites(state,...args);
  };
  const next=E.step(w);assert(moved&&fed&&died&&born.length&&supplied);assert.deepEqual(E.invariants(next),[]);
});

test('engine failure releases the map scope before a discarded turn can be inspected again',()=>{
  const E=Comparison.model(flags(0)),w=empty(E);add(E,w,'grass','plant',2,2,{age:10,E:12});reset(E,w);
  let failedWorld,failedMap;
  E.P.contacts=state=>{failedWorld=state;failedMap=E.S.maps(state);throw Error('contact-failure');};
  const job=E.beginTurn(w);job.advance();job.advance();assert.throws(()=>job.advance(),/contact-failure/);
  assert.notStrictEqual(E.S.maps(failedWorld),failedMap);assert.notStrictEqual(E.S.maps(failedWorld),E.S.maps(failedWorld));
  assert.throws(()=>job.advance(),/TURN_DISCARDED/);
});

function parity(factory,mask,turns=8){
  const E=factory(flags(mask)),Fresh=factory(flags(mask));
  assert.equal(typeof E.S.withMapScope,'function');
  Fresh.S.withMapScope=(_w,run)=>run();
  const config={seed:'map-scope-parity',width:16,height:12,initial:24,lineages:'few',ecologyRevision:'observation/4.1',
    ageModel:'life/1',randomModel:'table/1',populationRegulation:{version:1}};
  let a=E.create(config),b=Fresh.create(config),scopeCalls=0;
  const maps=E.S.maps,scope=E.S.withMapScope;
  E.S.maps=w=>{const m=maps(w);assertTopology(w,m);return m;};
  E.S.withMapScope=(...args)=>{scopeCalls++;return scope(...args);};
  const ah=O.create(a.config,'scope-parity',{species:E.S.D.species}),bh=O.create(b.config,'scope-parity',{species:Fresh.S.D.species});
  ah.append(a);bh.append(b);
  for(let t=0;t<turns;t++){
    const aj=E.beginTurn(a),bj=Fresh.beginTurn(b);
    for(let phase=0;phase<3;phase++){
      const ar=aj.advance(),br=bj.advance();assert.equal(ar.done,br.done);assert.deepEqual(aj.display(),bj.display());
      if(ar.done){a=ar.world;b=br.world;}
    }
    assert.deepEqual(E.invariants(a),[]);assert.deepEqual(a,b);assert.equal(E.fingerprint(a),Fresh.fingerprint(b));
    ah.append(a);bh.append(b);assert.deepEqual(ah.rows.at(-1),bh.rows.at(-1));
  }
  assert.equal(scopeCalls,turns*3);assert.equal(ah.csv(),bh.csv());assert.deepEqual(ah.snapshot(),bh.snapshot());
}
test('all eight dynamic profiles preserve every phase, world, fingerprint, observation, CSV and finite budget',()=>{
  for(let mask=0;mask<8;mask++)parity(Comparison.model,mask);
});
test('static profiles preserve all eight shared/fresh comparisons after regeneration',()=>{
  for(let mask=0;mask<8;mask++)parity(Static.model,mask);
});
test('legacy base ecology remains identical when synchronous sharing is disabled',()=>{
  const S=Base.S,scope=S.withMapScope;
  let a=Base.create({seed:'legacy-map-scope',width:16,height:12,initial:24,lineages:'few'}),b=structuredClone(a);
  for(let t=0;t<8;t++){
    a=Base.step(a);try{S.withMapScope=(_w,run)=>run();b=Base.step(b);}finally{S.withMapScope=scope;}
    assert.deepEqual(a,b);assert.equal(Base.fingerprint(a),Base.fingerprint(b));assert.deepEqual(Base.invariants(a),[]);
  }
});
