'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../design/advantage-switches/model.cjs').model(),S=E.S;
const config={seed:'i11b/mixed-initial-age',terrainSeed:'i11b/initial/map',width:40,height:28,initial:80,lineages:'manual',selected:['solar','precocial','ryouki','swarm'],placement:'natural',landscape:'templates',mapId:'woodland',ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',balanceModel:'survival/2',enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true}};
test('initial main founders have deterministic mixed ages with valid age-based capabilities and unchanged phase/lineage',()=>{
 const a=E.create(config),b=E.create(config),old=E.create({...config,balanceModel:'survival/1'}),main=a.organisms.filter(o=>o.slot==='main');assert.deepEqual(a,b);assert.equal(main.length,80);assert(main.some(o=>S.ageInfo(o).stage==='adult'));assert(main.some(o=>S.ageInfo(o).stage==='juvenile'));
 assert(new Set(main.map(o=>o.age)).size>10);const oldMain=new Map(old.organisms.filter(o=>o.slot==='main').map(o=>[o.id,o]));
 for(const o of main){const previous=oldMain.get(o.id);assert(previous);assert(o.age>=0&&o.age<o.birthLife*.5);assert.equal(o.birthLife,previous.birthLife);assert.equal(o.phase,1);assert.equal(o.generation,0);assert.deepEqual(o.parents,[]);assert.equal(o.E,previous.E);assert.equal(o.B,previous.B);assert.equal(o.M,previous.M);assert(o.HP<=S.phenotype(a,o).maxHP);assert.equal(previous.age,0);}
 assert.deepEqual(E.invariants(a),[]);assert.deepEqual(E.invariants(old),[]);
});
test('explicit ages and later-born organisms never acquire an initial founder age',()=>{
 const w=E.create(config),s=S.D.byId.solar;
 assert.equal(S.organism(w,s,0,'i:main:explicit',{age:0}).age,0);assert.equal(S.organism(w,s,0,'child:1',{age:0}).age,0);
 w.turn=10;assert.equal(S.organism(w,s,0,'i:main:later').age,0);assert.equal(S.organism(w,s,0,'birth:10').age,0);
});
test('terminal P initial placement is limited to genuinely mature founders and keeps valid Q windows',()=>{
 const w=E.create(config),entries=S.PrimaryParasite.entries(w),terminal=entries.filter(e=>e.p.stage==='terminal');assert(terminal.length>0,'mixed founders permit actual terminal-host placement');
 for(const e of terminal){assert.equal(S.ageInfo(e.host).stage,'adult');assert(S.PrimaryParasite.hostRule(e.p.species,e.host).allowed);if(e.p.q){const q=e.p.q;assert(q.bornAt>=e.p.matureAt+1&&q.bornAt<=e.p.matureAt+3);assert.equal(q.age,-q.bornAt);}}
 const previous=E.create({...config,balanceModel:'survival/1'});assert.equal(S.PrimaryParasite.entries(previous).filter(e=>e.p.stage==='terminal').length,0);assert.deepEqual(E.invariants(w),[]);
});
