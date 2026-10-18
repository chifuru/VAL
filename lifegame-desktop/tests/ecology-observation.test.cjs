'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('./ecology-fixtures.cjs'),{E,S}=F,O=require('../src/ecology/observations.js');
function revised(){const w=F.world();w.config.ecologyRevision='observation/4.1';w.config.ageModel='life/1';w.searchQ=[];return w;}
test('all turn values survive more than two 500-turn blocks and CSV preserves old peaks and config',()=>{
 const w=F.world();w.config.seed='exact-history';const h=O.create(w.config,'test-version');
 for(let t=0;t<=1200;t++){w.turn=t;w.stats.counts.abyss=t===12?999:t%7;h.append(w);}
 assert.equal(h.rows.length,1201);assert.equal(h.rows[12].counts.abyss,999);assert.equal(h.rows[0].turn,0);assert.equal(h.rows.at(-1).turn,1200);
 assert(h.bins(40).some(b=>b.max.abyss===999));assert.equal(h.append(w),false);
 assert(h.csv().includes('"12","population","abyss","999"'));assert(h.csv().includes('exact-history'));
 w.turn=1202;assert.throws(()=>h.append(w),/欠測/);assert.equal(h.rows.length,1201);
});
test('age-mature phase I and II can reproduce, juveniles cannot; every child begins phase I age zero',()=>{
 for(const phase of [1,2])for(const mature of [false,true]){
  const w=revised(),parents=F.parents(w,'abyss',phase);for(const o of parents){S.initializeAge(w,o);o.age=mature?S.ageInfo(o).matureAt:0;o.HP=100;}
  const c=F.ready(w),before=S.totals(w),children=E.R.reproduce(w,c);
  assert.equal(children.length,mature?1:0);if(mature){assert.equal(children[0].phase,1);assert.equal(children[0].age,0);assert.equal(S.ageInfo(children[0]).stage,'juvenile');assert.deepEqual(S.totals(w),before);}
 }
});
test('movement and a subsequent effect use the remaining budget; feeding does not finance prior actions',()=>{
 const w=revised(),a=F.add(w,'abyss','actor',2,2,{E:20}),b=F.add(w,'myth','target',4,2),c=F.ready(w);
 c.intents.set(a.id,{type:'move',cell:S.index(w,3,2),path:[S.index(w,3,2)],direction:0,cost:1});E.B.move(w,c);
 const moved=a.cell;E.B.choose(w,c,'effect');assert.notEqual(c.intents.get(a.id).type,'move');assert.equal(a.cell,moved);
 c.intents.set(a.id,{type:'attack',target:b.id,cell:a.cell,path:[],cost:3});E.B.combat(w,c);assert.equal(c.costs.get(a.id).action,4);
 const energy=a.E;E.N.payActions(w,c);assert.equal(a.E,energy-4);assert.equal(c.costs.get(a.id).action,0);
});
test('Q window opens only after first terminal maturation and never directly suppresses P maturation',()=>{
 const w=revised(),host=F.add(w,'abyss','host',3,3,{E:80});host.infection=S.infection(w,'tideparasite',host.id);const p=host.infection;p.stage='terminal';p.counter=7;p.E=1;
 const c=F.ready(w);c.byParasite.get(p.id).full=true;E.P.mature(w,c);assert.equal(p.matureAt,w.turn);assert.equal(E.P.windowOpen(w,p),false);
 for(let t=1;t<=4;t++){w.turn=p.matureAt+t;assert.equal(E.P.windowOpen(w,p),t<=3);}
 const q=S.hyper(w,p.id);q.phase=2;q.E=.5;p.q=q;p.counter=6;const d=F.ready(w);d.byParasite.get(p.id).full=true;E.P.mature(w,d);assert.equal(p.counter,7);
});
test('search Q attaches only inside the limited window and conserves finite energy',()=>{
 for(const inside of [false,true]){
  const w=revised(),host=F.add(w,'abyss','host',3,3);host.infection=S.infection(w,'tideparasite',host.id);const p=host.infection;p.stage='terminal';p.counter=8;p.matureAt=inside?w.turn-1:w.turn-5;
  const q=S.hyper(w,'search');q.cell=host.cell;q.E=.5;q.expires=w.turn+10;w.searchQ=[q];const c=F.ready(w),before=S.totals(w).E+w.ledger.sinks;E.P.search(w,c);
  assert.equal(!!p.q,inside);assert(Math.abs(S.totals(w).E+w.ledger.sinks-before)<.001);
 }
});
test('finite P maintenance causes loss without food and grooming cannot remove an internal parasite',()=>{
 const w=revised(),host=F.add(w,'abyss','host',3,3,{E:0});host.infection=S.infection(w,'tideparasite',host.id);host.infection.E=0;
 const c=F.ready(w);for(let n=0;n<10;n++)E.P.fee(w,c,host);assert.equal(host.infection,null);
 const v=revised(),a=F.add(v,'abyss','helper',2,2,{E:80}),b=F.add(v,'abyss','carrier',3,2,{E:80});b.infection=S.infection(v,'tideparasite',b.id);const p=b.infection;p.load=.5;
 const d=F.ready(v);d.intents.set(a.id,{type:'groom',target:b.id,cost:.3});E.P.clear(v,d);assert.equal(b.infection,p);assert(p.load>=.2,'ordinary grooming cannot clear internal P');
});
test('contact episodes, continued contact and a wall-blocked neighbor are distinct',()=>{
 const w=revised();F.add(w,'grass','a',2,2);F.add(w,'grass','b',3,2);
 const c=F.ready(w);E.finish(w,c);const first=w.observation;assert.equal(Object.values(first.contactEpisodes).reduce((a,n)=>a+n,0),1);
 w.turn++;E.finish(w,F.ready(w));assert.equal(Object.values(w.observation.contactEpisodes).reduce((a,n)=>a+n,0),0);assert.equal(Object.values(w.observation.contactTurns).reduce((a,n)=>a+n,0),1);
 w.tiles[S.index(w,2,2)].walls.push(S.index(w,3,2));w.turn++;E.finish(w,F.ready(w));assert.equal(Object.keys(w.observation.contactTurns).length,0);
});
test('new production worlds retain invariants, deterministic replay and observation independence',()=>{
 let a=E.create({seed:'new-rules41',width:40,height:28,initial:80,lineages:'few',ageModel:'life/1',ecologyRevision:'observation/4.1'}),b=E.create(a.config);assert(a.searchQ.length>=4);
 for(let t=0;t<30;t++){a=E.step(a,{observeId:a.organisms[0]?.id});b=E.step(b);assert.deepEqual(E.invariants(a),[]);assert.equal(E.fingerprint(a),E.fingerprint(b));}
});

test('finite observation capacity refuses a new row without silently deleting any recorded turn',()=>{
 const w=F.world(),h=O.create(w.config,'capacity',{maxBytes:20000});w.turn=0;h.append(w);const original=JSON.stringify(h.rows);w.turn=1;
 let failed=false;for(let t=1;t<50;t++){w.turn=t;try{h.append(w);}catch(e){assert.match(e.message,/容量上限/);failed=true;break;}}
 assert(failed);assert.equal(h.rows[0].turn,0);assert(h.rows.length>=1);assert(h.csv().includes('"0","population"'));assert(original.length>0);
});
test('relationship continuity measures repeated completed time blocks, not a single burst',()=>{
 function record(repeated){const w=F.world(),h=O.create(w.config,'continuity');for(let t=0;t<=20;t++){w.turn=t;w.observation={relations:(repeated?(t===1||t===11):t===1)?{'abyss|myth|combat':repeated?1:2}:{}};h.append(w);}return h.rows.at(-1);}
 assert.equal(record(false).continuous,0);assert.equal(record(true).continuous,1);
});

test('turn zero reports initial conditions without fabricated interaction events',()=>{
 const w=E.create({seed:'initial-observation',width:40,height:28,initial:80,lineages:'few',ageModel:'life/1',ecologyRevision:'observation/4.1'}),h=O.create(w.config,'initial');h.append(w);
 assert.equal(h.rows[0].contacts,0);assert.equal(h.rows[0].interactions,0);assert.equal(h.rows[0].bondTurns,0);assert.equal(h.rows[0].turn,0);
});
