'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{model}=require('../design/advantage-switches/model.cjs'),F=require('./cell-archive-fixture.cjs'),
  E=model({producer:false,waterbug:false,hyperparasite:false}),S=E.S,C=S.CurrentInformation,I=S.PersistentInformation,
  initial=E.create({...F.config,currentStateModel:C.VERSION}),main=S.D.species.find(s=>s.group==='main'),cell=initial.organisms.find(o=>o.slot==='main').cell;
function world(){const w=structuredClone(initial);w.organisms=[];w.carcasses=[];w.pending=[];w.searchQ=[];w.informationField=[];w.informationLedger={initialAmount:0,generatedAmount:0,inactivatedAmount:0};return w;}
function actor(w,id,options={}){const o=S.organism(w,main,cell,id,{E:10,age:0,...options});w.organisms.push(o);return o;}
function ctx(){return {costs:new Map(),events:new Map(),records:new Map()};}
function note(w,o,{value=3,scope='all',meaning='feeding',peerId='target',peerSpecies=null,confirmedHarm=false}={}){
 return I.addExperience(w,o,{meaning,amount:1,values:[{axis:2,value}],scope,cell:o.cell,peerId,peerSpecies,result:'actual',confirmedHarm});
}
function publisher(w,id,options={}){const o=actor(w,id,options);for(let t=1;t<=3;t++){w.turn=t;for(let n=0;n<2;n++)note(w,o,{peerId:'target'+n,...options});}return o;}
function begin(w){const c=ctx();E.P.informationBegin(w,c);return c;}
const close=(a,b,e=1e-5)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);

test('b+a keeps only effective changes; expiry preserves learning and child uses its own base',()=>{
 const w=world(),o=actor(w,'parent');const b=o.birthWeights.slice();assert(!Object.hasOwn(o,'weights'));
 C.adjust(o,Array(9).fill(1000));assert.deepEqual(C.weights(o),Array(9).fill(100));close(o.informationState.change[2],100-b[2]);
 C.adjust(o,[0,0,-1]);close(C.weights(o)[2],99);w.turn=40;C.expire(w,o);close(C.weights(o)[2],99);
 const child=actor(w,'child',{birthWeights:b.slice(),weights:b.slice(),parents:[o.id]});assert.deepEqual(C.weights(child),b);assert.deepEqual(child.informationState.change,Array(9).fill(0));
 assert(!('learned' in o.informationState));assert(!('experience' in o.informationState));assert.deepEqual(C.validate(w),[]);
});
test('own publication uses fixed meaning slots, real outcomes, local context and a 30T clock',()=>{
 const w=world(),o=publisher(w,'sender');assert.equal(C.components(o).length,1);assert(C.qualified(C.components(o)[0]));
 assert.equal(note(w,o,{peerId:'target1'}),null);assert.equal(I.addExperience(w,o,{received:true,meaning:'feeding'}),null);
 for(let t=4;t<=45;t++){w.turn=t;note(w,o,{peerId:'target'+t});}assert.equal(C.components(o).length,1);
 const last=o.informationState.outgoing.lastAt;w.turn=last+29;C.expire(w,o);assert.equal(C.components(o).length,1);
 w.turn++;C.expire(w,o);assert.equal(C.components(o).length,0);
 w.turn++;note(w,o);o.cell=S.nearby(w,o.cell)[0];w.turn++;note(w,o);assert.equal(C.components(o).length,1);assert.equal(C.components(o)[0].count,1);
});
test('combined receipt pays once; repeated direction habituates without sender history or self-experience',()=>{
 const w=world(),sender=publisher(w,'sender'),o=actor(w,'receiver');const before=C.weights(o)[2],energy=o.E;
 const c1=begin(w),d1=C.weights(o)[2]-before;assert(d1>0);close(o.informationState.incoming.habituationPositive[2],.25);
 close(energy-o.E,I.maintenance(w,o)*.01);assert.equal(c1.persistentInformationFlow.all.learned,1);assert.equal(C.components(o).length,0);
 const first=C.weights(o)[2];w.turn++;begin(w);assert(C.weights(o)[2]-first<d1);close(o.informationState.incoming.habituationPositive[2],.4375);
 assert(!JSON.stringify(o.informationState).includes(sender.id));assert(!('learned' in o.informationState));
 w.organisms=[o];w.turn+=10;begin(w);assert.equal(o.informationState.incoming.lastAt,null);assert(C.weights(o)[2]>before);
});
test('opposite stimuli retain both signs; reverse learning uses separate habituation',()=>{
 const w=world(),a=publisher(w,'positive'),b=publisher(w,'negative',{value:-3}),o=actor(w,'receiver'),before=C.weights(o)[2];
 begin(w);close(C.weights(o)[2],before);assert(o.informationState.incoming.positive[2]>0&&o.informationState.incoming.negative[2]>0);
 w.organisms=[b,o];w.turn++;begin(w);assert(C.weights(o)[2]<before);assert.equal(C.components(o).length,0);
});
test('scope and true parent/caregiver use stronger direct transmission; unrelated kin is excluded',()=>{
 const w=world(),sender=publisher(w,'parent',{scope:'kin'}),child=actor(w,'child',{parents:[sender.id]}),stranger=actor(w,'stranger'),before=C.weights(stranger)[2];
 begin(w);assert(C.weights(child)[2]>child.birthWeights[2]);close(C.weights(stranger)[2],before);assert.equal(child.informationState.incoming.positive[2],1);
 const p=world(),ordinary=publisher(p,'sender'),kin=actor(p,'child',{parents:[ordinary.id]}),other=actor(p,'other');begin(p);
 close(kin.informationState.incoming.positive[2],1);close(other.informationState.incoming.positive[2],.25);
 ordinary.informationState.outgoing.components=Object.fromEntries(C.components(ordinary).map((c,i)=>['species'+i,{...c,scope:'species'}]));other.species=S.D.species.find(s=>s.group==='main'&&s.id!==main.id).id;p.turn++;begin(p);assert.equal(other.informationState.incoming.lastAt,3);
});
test('zero influence or insufficient budget produces no learning and no reception fee',()=>{
 for(const kind of ['zero','budget']){const w=world();publisher(w,'sender');const o=actor(w,'receiver'),before=C.weights(o),energy=o.E;
  if(kind==='zero')w.config.informationSettings.influence=0;else o.E=0;
  const start=o.E;begin(w);assert.deepEqual(C.weights(o),before);close(o.E,start);assert.equal(o.informationState.incoming.lastAt,null);assert(energy>0);
 }
});
test('parasite host affinity is an acquired current preference, separate from inherited host genes',()=>{
 const w=world(),host=actor(w,'carrier'),p=structuredClone(I.entries(initial).find(e=>e.kind==='P').subject);host.infection=p;
 const species=Object.values(S.PrimaryParasite.hostTable[p.species]).flat()[0],genes=JSON.stringify(p.primary.adaptation);
 publisher(w,'teacher',{peerSpecies:species});const before=E.P.informationHostFactor(w,p,species);begin(w);
 assert(E.P.informationHostFactor(w,p,species)>before);assert.equal(p.informationState.hostLearning.base,0);assert.equal(JSON.stringify(p.primary.adaptation),genes);
});
test('death publications coalesce by current class and expiry, without source identity or clock refresh',()=>{
 const w=world(),a=publisher(w,'dead1'),b=publisher(w,'dead2');w.turn=4;const previous=S.r;S.r=()=>0;
 try {for(const o of [a,b])C.generate(w,ctx(),{subject:o,roles:I.roles(w,o)});}finally{S.r=previous;}
 assert.equal(w.informationField.length,1);close(w.informationField[0].amount,2);assert(!('originId' in w.informationField[0]));assert(!JSON.stringify(w.informationField).includes('dead'));
 const oldExpiry=w.informationField[0].expires,newer={...structuredClone(w.informationField[0]),expires:oldExpiry+10,amount:1};w.informationField=C.compact(w,ctx(),[...w.informationField,newer]);w.informationLedger.generatedAmount++;
 assert.equal(w.informationField.length,2);assert(w.informationField.some(a=>a.expires===oldExpiry));assert.deepEqual(C.validate(w),[]);
 const c=publisher(w,'moved');c.cell=S.nearby(w,c.cell)[0];w.turn++;S.r=()=>0;
 try{assert.equal(C.generate(w,ctx(),{subject:c}).generated,false);}finally{S.r=previous;}
});
test('synchronous diffusion conserves amount/evidence, decays strength once and expires the original bucket',()=>{
 const w=world();w.turn=0;w.informationField=[{cell,scope:'all',roles:[],sourceSpecies:main.id,peerSpecies:null,meaning:'feeding',evidence:'normal',sign:1,
 expires:30,updatedAt:0,amount:100,evidenceDose:10,strength:[0,0,50,0,0,0,0,0,0]}];w.informationLedger.generatedAmount=100;
 w.turn=1;begin(w);close(w.informationField.reduce((n,a)=>n+a.amount,0),100);close(w.informationField.reduce((n,a)=>n+a.evidenceDose,0),10);
 close(w.informationField.reduce((n,a)=>n+a.strength[2],0),50*Math.pow(2,-1/15));assert(w.informationField.filter(a=>a.cell!==cell).reduce((n,a)=>n+a.amount,0)<=20+1e-5);
 const duplicate={...structuredClone(w.informationField[0]),evidence:'low'};assert.equal(C.compact(w,ctx(),[w.informationField[0],duplicate]).length,2);
 w.turn=30;begin(w);assert.equal(w.informationField.length,0);close(w.informationLedger.inactivatedAmount,100);assert.deepEqual(C.validate(w),[]);
});
test('place stimulus is temporary and does not charge or add to acquired a',()=>{
 const w=world(),o=actor(w,'observer'),before=C.weights(o),energy=o.E;w.turn=1;
 w.informationField=[{cell,scope:'all',roles:[],sourceSpecies:main.id,peerSpecies:null,meaning:'damage',evidence:'normal',sign:1,expires:30,updatedAt:1,amount:1,evidenceDose:1,strength:[0,1,0,0,0,0,0,0,0]}];w.informationLedger.generatedAmount=1;
 // Populate the immutable index without receiving into a live observer.
 w.organisms=[];const c=begin(w);w.organisms=[o];const p=E.P.informationPlace(w,c,o,cell);assert(p.warning>0);assert.deepEqual(C.weights(o),before);close(o.E,energy);
});
test('Q retains the live link and finite aggregated residues; later Q does not renew older expiry',()=>{
 const w=world(),host=actor(w,'host'),p={id:'P',species:'leafparasite'},q={id:'Q1',phase:3,hyper:{genes:{investment:{promotion:1,distortion:1}},bias:{axis:2,sign:1}}};
 w.turn=2;C.trace(w,host,p,q,1);assert.equal(host.qInformation.active.qId,q.id);const live=C.traceEffects(w,host).promotion;assert(live>0);
 C.detach(w,host,p,q);assert.equal(host.qInformation.active,null);assert.equal(host.qInformation.residual[0].expires,32);
 w.turn=12;close(C.traceEffects(w,host).promotion,live/2);q.id='Q2';C.trace(w,host,p,q,1);C.detach(w,host,p,q);
 assert.deepEqual(host.qInformation.residual.map(a=>a.expires),[32,42]);assert(!JSON.stringify(host.qInformation.residual).includes('Q'));
 w.turn=32;C.expire(w,host);assert.deepEqual(host.qInformation.residual.map(a=>a.expires),[42]);w.turn=42;C.expire(w,host);assert(!host.qInformation);
});
test('source and generated models commit the same short current-state run and preserve the input',()=>{
 const G=require('../src/ecology/observation-model.js').model(F.config.advantageSettings);let a=E.create({...F.config,currentStateModel:C.VERSION}),b=G.create({...F.config,currentStateModel:C.VERSION});
 for(let t=0;t<3;t++){const before=JSON.stringify(a);const job=E.beginTurn(a);job.advance();job.cancel();assert.equal(JSON.stringify(a),before);a=E.step(a);b=G.step(b);
  assert.deepEqual(a,b);assert.deepEqual(E.invariants(a),[]);assert.equal(a.persistentInformationSummary.definition,'current-information-observed/1');}
 assert.equal(a.turn,3);assert(!JSON.stringify(a.organisms.map(o=>o.informationState)).includes('"learned":'));
});
test('unknown/old state is rejected rather than silently reinterpreted',()=>{
 assert.throws(()=>E.create({...F.config,currentStateModel:'future'}),/現在状態比較モデル/);const w=world(),o=actor(w,'actor');o.informationState={version:'persistent-information-state/1',learned:[]};assert.throws(()=>C.attach(w,o),/CURRENT_INFORMATION_OLD_STATE/);
});
test('actual child construction inherits b without acquired a; frozen snapshots expose derived values',()=>{
 const w=world(),mother=actor(w,'mother'),father=actor(w,'father',{sex:'male'}),c={species:main.id,slot:'main',cell,parents:[mother,father],kind:1,costs:[0,0],cellBudget:true};
 const baseline=E.R.child(w,c,ctx());C.adjust(mother,Array(9).fill(20));C.adjust(father,Array(9).fill(-20));const born=E.R.child(w,c,ctx());
 assert.deepEqual(born.birthWeights,baseline.birthWeights);assert.deepEqual(born.informationState.change,Array(9).fill(0));assert(!Object.hasOwn(born,'weights'));
 const snap=I.snapshot(w,mother);assert.deepEqual(snap.currentWeights,C.weights(mother));snap.informationState.change[0]=999;assert.notEqual(mother.informationState.change[0],999);
});
test('internal current-state records are explicitly blocked until the new archive schema is connected',()=>{
 const A=require('../src/ecology/cell-archive.js'),w=world(),before=JSON.stringify(w),stub={engine:E,signature:'new-comparison'};
 assert.throws(()=>A.capture(w,'manual',null,stub),/CURRENT_STATE_ARCHIVE_UNCONNECTED/);
 assert.throws(()=>A.validate({config:w.config},E,null),/CURRENT_STATE_ARCHIVE_UNCONNECTED/);assert.equal(JSON.stringify(w),before);
});
