'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),F=require('./cell-archive-fixture.cjs'),
 flags={producer:false,waterbug:false,hyperparasite:false},E=require('../design/advantage-switches/model.cjs').model(flags),S=E.S,C=S.CurrentInfections,
 config={...F.config,currentStateModel:'current-state/1',primaryEggModel:'egg/1',parasiteDispersalModel:'fanout/1'},initial=E.create(config);
function world(){const w=structuredClone(initial);for(const k of ['organisms','resources','carcasses','pending','primaryInocula','hyperInocula','searchQ','informationField'])w[k]=[];
 w.currentInfections.types=[];w.tiles=w.tiles.map(t=>({...t,terrain:'plain',env:3,light:1,soilM:5,blocked:false,cover:'none',walls:[]}));delete w.cellState;delete w.cellProfiles;S.CellSpace.initialize(w);S.PersistentInformation.initialize(w);w.turn=2;return w;}
function add(w,id,species='grass',cell=18){const o=S.organism(w,S.D.byId[species],cell,id,{age:20,E:5,M:0,B:6});S.CellSpace.assign(w,o);w.organisms.push(o);return o;}
function parent(w,species='leafparasite'){return S.infection(w,species,'parent-host',0,'fixture');}
function inoculum(w,p,options={}){const i=S.PrimaryParasite.inoculum(w,p,{kind:'contact',cell:18,createdAt:0,expires:20,route:'contact',...options});w.primaryInocula.push(i);return i;}
function eggs(w,n=4,species='leafparasite'){const p=parent(w,species);p.stage='terminal';for(let n0=0;n0<n;n0++)inoculum(w,p,{kind:species==='tideparasite'?'water':'contact',route:species==='tideparasite'?'water':'contact',hostId:null,createdAt:0,expires:species==='tideparasite'?w.config.primaryEggSettings.waterLifetime:w.config.primaryEggSettings.landLifetime,egg:{version:'primary-egg/1',state:'free',attachedAt:null,hatchAt:null}});C.compact(w);return p;}
function total(w){return S.totals(w).E;}
function ledger(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
const near=(a,b)=>assert(Math.abs(a-b)<.00003,`${a} != ${b}`);
function conserved(w){near(total(w)+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);}

test('1000 identical environmental releases become one finite pool and one shared genotype',()=>{
 const w=world(),p=parent(w);for(let n=0;n<1000;n++)inoculum(w,p);const before=total(w);C.compact(w);
 assert.equal(w.primaryInocula.length,1);assert.equal(w.currentInfections.types.length,1);near(total(w),before);near(w.primaryInocula[0].amount,1000);
 assert(!Object.hasOwn(w.primaryInocula[0],'adaptation'));assert(!Object.hasOwn(w.primaryInocula[0],'hostPreference'));assert.deepEqual(C.validate(w),[]);
 const bytes=JSON.stringify(w);C.compact(w);assert.equal(JSON.stringify(w),bytes);
});
test('clocks, routes, stages, genetics and direct parents cannot be averaged by sharing a cell',()=>{
 const w=world(),p=parent(w);inoculum(w,p);inoculum(w,p);inoculum(w,p,{expires:21});inoculum(w,p,{createdAt:1});inoculum(w,p,{route:'water'});inoculum(w,p,{stage:'middle'});inoculum(w,p,{parentId:'other-parent'});inoculum(w,p,{sourceId:'other-source'});
 const different=inoculum(w,p);different.adaptation.routes.contact=.7;C.compact(w);assert.equal(w.primaryInocula.length,8);assert.equal(w.currentInfections.types.length,2);assert.equal(w.primaryInocula.filter(i=>i.amount===2).length,1);
});
test('host-bound and one-member transfers stay distinct while identical genotype definitions are shared and released',()=>{
 const w=world(),p=parent(w);inoculum(w,p,{kind:'invading',hostId:'a'});inoculum(w,p,{kind:'invading',hostId:'b'});inoculum(w,p,{transfer:true});inoculum(w,p,{transfer:true});C.compact(w);
 assert.equal(w.primaryInocula.length,4);assert(w.primaryInocula.every(i=>!i.pool));assert.equal(w.currentInfections.types.length,1);w.primaryInocula=[];C.compact(w);assert.equal(w.currentInfections.types.length,0);
});
test('generation chains use short real IDs and retain only direct parent references',()=>{
 const w=world();let p=parent(w);for(let n=0;n<100;n++){const i=inoculum(w,p);const child=S.PrimaryParasite.infection(w,p.species,'host',w.turn,i.id,i);assert.deepEqual(child.primary.parents,[p.id]);assert(child.id.length<12);assert(i.id.length<12);p=child;}
 assert.equal(p.primary.generation,100);
});
test('water diffusion conserves finite amount without recursively growing IDs or retaining duplicate traits',()=>{
 const w=world(),p=parent(w,'tideparasite');w.tiles.forEach(t=>t.terrain='shallow');inoculum(w,p,{kind:'water',route:'water'});C.compact(w);ledger(w);const before=total(w);const c=E.context(w);C.hydrate(w);E.P.diffuse(w,c);C.compact(w);
 near(total(w),before);conserved(w);assert(w.primaryInocula.length>1);assert(w.primaryInocula.every(i=>i.id.length<12));assert.equal(w.currentInfections.types.length,1);assert.deepEqual(C.validate(w),[]);
});
test('one free-egg pool attaches real doses to multiple hosts with an unspent remainder',()=>{
 const w=world();for(let n=0;n<3;n++)add(w,'target-'+n,'grass',n===2?19:18);eggs(w);ledger(w);const before=total(w),c=E.context(w);C.hydrate(w);E.P.contacts(w,c);C.compact(w);
 const bound=w.primaryInocula.filter(i=>i.egg?.state==='attached'),free=w.primaryInocula.filter(i=>i.egg?.state==='free');assert.equal(bound.length,3);assert.equal(free.length,1);near(free[0].E,.06);assert.equal(new Set(bound.map(i=>i.hostId)).size,3);near(total(w),before);conserved(w);assert.deepEqual(C.validate(w),[]);
});
test('a large environmental egg dose splits into finite standard-size attachments',()=>{
 const w=world();add(w,'first');add(w,'second');const p=parent(w);p.stage='terminal';inoculum(w,p,{E:.12,hostId:null,createdAt:0,expires:w.config.primaryEggSettings.landLifetime,egg:{version:'primary-egg/1',state:'free',attachedAt:null,hatchAt:null}});C.compact(w);ledger(w);E.P.contacts(w,E.context(w));C.compact(w);
 const bound=w.primaryInocula.filter(i=>i.egg?.state==='attached');assert.equal(bound.length,2);assert(bound.every(i=>i.E<=S.PrimaryParasite.settings(w).standardReserve));conserved(w);assert.deepEqual(C.validate(w),[]);
});
test('attached egg hatches and establishes only on the following turn, with finite E and inherited route',()=>{
 const w=world(),host=add(w,'first-host');eggs(w,1);ledger(w);C.hydrate(w);E.P.contacts(w,E.context(w));const attached=w.primaryInocula.find(i=>i.egg?.state==='attached');assert(attached);const hatch=attached.egg.hatchAt,random=S.r;S.r=()=>0;
 try{w.turn=hatch;E.P.begin(w,E.context(w));assert(!host.infection);assert(w.primaryInocula.some(i=>i.kind==='invading'&&i.establishAt===hatch+1));C.compact(w);w.turn++;E.P.begin(w,E.context(w));assert(S.PrimaryParasite.is(host.infection));assert.equal(host.infection.primary.route,'contact');C.compact(w);conserved(w);}finally{S.r=random;}
});
test('egg loss and expiry dissipate only the real remaining dose and release unused definitions',()=>{
 const w=world(),host=add(w,'lost');eggs(w,1);ledger(w);C.hydrate(w);E.P.contacts(w,E.context(w));C.compact(w);w.organisms=[];w.ledger.initialE-=host.E+host.B;w.ledger.initialM-=host.M+(host.cellMatter?.bodyM||0);w.turn++;E.P.begin(w,E.context(w));C.compact(w);assert.equal(w.primaryInocula.length,0);assert.equal(w.currentInfections.types.length,0);conserved(w);
 const v=world();eggs(v,1);ledger(v);v.turn=v.primaryInocula[0].expires;E.P.begin(v,E.context(v));C.compact(v);assert.equal(v.primaryInocula.length,0);conserved(v);
});
test('water-egg dispersal distributes current stock and avoids land/blocked cells without changing expiry',()=>{
 const w=world();w.tiles.forEach(t=>t.terrain='shallow');w.tiles[19].terrain='plain';w.tiles[17].blocked=true;eggs(w,4,'tideparasite');ledger(w);const expiry=w.primaryInocula[0].expires,random=S.r;S.r=()=>0;
 try{E.P.begin(w,E.context(w));C.compact(w);conserved(w);assert(w.primaryInocula.length>1);assert(w.primaryInocula.every(i=>i.expires===expiry&&i.cell!==19&&i.cell!==17&&w.tiles[i.cell].terrain==='shallow'));assert.deepEqual(C.validate(w),[]);}finally{S.r=random;}
});
test('incompatible exposure consumes a finite dose without fabricating a parasite or extending its clock',()=>{
 const w=world(),p=parent(w),host=add(w,'wrong-host','crystal');const i=inoculum(w,p);C.compact(w);ledger(w);const c=E.context(w),out=E.P.expose(w,c,i,host);assert(!out.compatible);assert(!host.infection);near(i.E,0);C.compact(w);conserved(w);assert.equal(w.currentInfections.types.length,0);
});
test('P acquired resistance does not stick forever at rounded millionths',()=>{
 const w=world(),host=add(w,'resistant');S.PrimaryParasite.acquireResistance(w,host,'leafparasite','contact');host.primaryResistance.entries[0].value=.000002;
 for(let n=0;n<43;n++){w.turn++;S.PrimaryParasite.beginResistance(w,host);}assert(!host.primaryResistance);assert.equal(S.PrimaryParasite.resistance(w,host,'leafparasite','contact'),0);
});
test('Q acquired resistance also expires at the effective minimum without a free permanent residue',()=>{
 const w=world(),p=parent(w);p.E=2;S.HyperParasite.acquireResistance(w,p);p.hyperResistance.value=.000002;
 for(let n=0;n<43;n++){w.turn++;S.HyperParasite.beginResistance(w,p);}assert(!p.hyperResistance);assert.equal(S.HyperParasite.resistance(w,p),0);
});
test('Q active information remains linked, detached residual lasts at most 30T and reads do not extend it',()=>{
 const w=world(),host=add(w,'holder'),p=parent(w),q=S.hyper(w,p.id,w.turn);host.infection=p;p.hostId=host.id;p.q=q;const I=S.CurrentInformation;
 I.trace(w,host,p,q,.1);I.detach(w,host,p,q);const before=JSON.stringify(host.qInformation),expires=host.qInformation.residual[0].expires;
 for(let n=0;n<3;n++)I.traceEffects(w,host);assert.equal(JSON.stringify(host.qInformation),before);w.turn=expires;I.expire(w,host);assert(!host.qInformation);assert.equal(I.traceEffects(w,host).promotion,0);
});
test('host-specific Q invasions share definitions but retain their individual window proof',()=>{
 const w=world(),p=parent(w),q=S.hyper(w,p.id,w.turn),traits=S.HyperParasite.childTraits(w,q,'fixed');for(let n=0;n<2;n++)w.hyperInocula.push({id:C.id(w,'h'),kind:'invading',hostId:'P-'+n,cell:18,E:.1,createdAt:1,expires:5,establishAt:3,matureAt:1,...structuredClone(traits)});
 C.compact(w);assert.equal(w.hyperInocula.length,2);assert.equal(w.currentInfections.types.length,1);assert(!w.hyperInocula[0].genes);assert.deepEqual(C.view(w,w.hyperInocula[0],'Q').genes,traits.genes);assert.deepEqual(C.validate(w),[]);
 w.hyperInocula[0].genotype='missing';assert.throws(()=>C.hydrate(w),/CURRENT_INFECTION_TYPE/);
});
test('source/generated current-state runs agree through 4T and cancellation never changes the committed world',()=>{
 const G=require('../src/ecology/observation-model.js').model(flags);let a=E.create(config),b=G.create(config);
 for(let n=0;n<4;n++){const bytes=JSON.stringify(a),job=E.beginTurn(a);job.advance();job.advance();job.cancel();assert.equal(JSON.stringify(a),bytes);a=E.step(a);b=G.step(b);assert.deepEqual(a,b);assert.deepEqual(E.invariants(a),[]);assert.deepEqual(C.validate(a),[]);}
});
