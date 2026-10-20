"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const Factory=require("../design/advantage-switches/model.cjs");
const flags={producer:false,waterbug:false,hyperparasite:false},E=Factory.model(flags),S=E.S;
const base={seed:"persistent-information-contract",width:16,height:12,initial:4,lineages:"manual",selected:["ryouki"],ageModel:"life/1",ecologyRevision:"observation/4.1",producerModel:"colony/1",largePlantModel:"independent/1",ryoukiModel:"ryouki/1",primaryParasiteModel:"primary/1",hyperParasiteModel:"hyper/1",informationModel:"persistent/1"};
const dna=()=>Object.fromEntries(S.DNA.map(k=>[k,.5]));
function fixture(){
 const w=E.create({...base,width:8,height:8,initial:0,enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:true}});
 w.tiles=w.tiles.map(t=>({...t,env:3,terrain:"plain",light:1,soilM:5,cover:"none",blocked:false,walls:[]}));
 w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];w.messages=[];w.primaryInocula=[];w.hyperInocula=[];w.searchQ=[];w.turn=0;
 w.config.enabled={main:true,plant:true,fungus:true,prey:true,P:true,Q:true};return w;
}
function add(w,id,species="ryouki",x=2,y=2,options={}){const o=S.organism(w,S.D.byId[species],S.index(w,x,y),id,{dna:dna(),age:18,E:40,...options});w.organisms.push(o);return o;}
function reset(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);return E.context(w);}
function check(w){assert.deepEqual(E.invariants(w),[]);}
function close(a,b,tolerance=1e-6){assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);}
function experience(w,o,peer="peer",extra={}){return S.PersistentInformation.addExperience(w,o,{meaning:"resource",contentId:"resource",peerId:peer,peerSpecies:"grass",result:"fed",amount:1,cell:o.cell,kind:"fast",values:[{axis:2,value:2}],...extra});}
function experienceAt(w,o,turn,count,extra={}){w.turn=turn;let item;for(let n=0;n<count;n++)item=experience(w,o,`peer:${turn}:${n}`,extra);return item;}
function bundle(w,origin,cell,options={}){
 const c={originId:origin,contentId:"feeding",meaning:"feeding",kind:"fast",experienceAt:0,halfLife:25,originalValues:[{axis:2,value:2}],values:[{axis:2,value:2}],evidence:"normal",context:{cell,env:3},scope:"all",roles:["primary-consumer"],peerSpecies:"grass",count:3,distinctTurns:2},
  record={id:origin+":cell:"+cell,originId:origin,sourceId:"source:"+origin,sourceSpecies:"ryouki",sourceRoles:["primary-consumer","secondary-consumer","higher-consumer"],generatedAt:0,expires:160,amount:1,cell,contents:[c],score:.6,lowEvidence:false,qEffects:{promotion:0,vectors:Array(9).fill(0),traces:[]},...options};
 w.informationField.push(record);w.informationLedger.initialAmount=S.round(w.informationLedger.initialAmount+record.amount);return record;
}
function receive(w){const c=reset(w);E.P.informationTrack(w,c);E.P.informationBegin(w,c);return c;}
function flow(c,key){return c.persistentInformationFlow?.all[key]||0;}
function deathDraw(w,o,low=0,high=1){for(let n=0;n<10000;n++){w.config.seed=`information-death-boundary:${n}`;const u=S.r(w,"information/death",w.turn,o.id);if(u>=low&&u<high)return u;}assert.fail("no deterministic draw in requested interval");}
function generate(w,o,c=reset(w)){E.P.informationTrack(w,c);E.P.informationDeath(w,c,o,{cell:o.cell});E.P.informationFinalize(w,c);return c;}

test("persistent information is explicit, initially empty and non-nutritional without converting legacy information",()=>{
 const old=E.create({...base,informationModel:undefined}),w=E.create(base);assert(!old.config.informationSettings);assert(!Object.hasOwn(old,"informationField"));assert(old.resources.some(a=>a.kind==="info"));
 assert.equal(w.config.informationSettings.version,"persistent-information-parameters/1");assert.deepEqual(w.informationField,[]);assert.equal(w.informationLedger.initialAmount,0);assert(!w.resources.some(a=>a.kind==="info"));assert(w.organisms.every(o=>o.informationState.version==="persistent-information-state/1"));assert.equal(S.activeSpecies(old).length,S.activeSpecies(w).length);
 for(const patch of [{informationModel:"persistent/2"},{informationSettings:{version:"persistent-information-parameters/2"}},{informationSettings:{influence:-1}},{informationSettings:{influence:NaN}},{informationSettings:{influence:4.01}},{informationSettings:{receiveLimit:3}},{informationSettings:{unknown:1}}])assert.throws(()=>E.create({...base,...patch}),/SETTINGS_INVALID/);
 for(const influence of [0,.5,1,4])assert.equal(E.create({...base,informationSettings:{influence}}).config.informationSettings.influence,influence);check(old);check(w);
});

test("holding eligibility counts actual content-specific outcomes on distinct turns without same-peer or received duplication",()=>{
 const w=fixture(),o=add(w,"holder");const first=experienceAt(w,o,0,2);assert.equal(first.count,2);assert.equal(first.distinctTurns,1);assert(!S.PersistentInformation.qualified(w,first));
 assert.equal(experience(w,o,"peer:0:0"),null);assert.equal(experience(w,o,"reader",{received:true}),null);assert.equal(experience(w,o,"imagined",{actual:false}),null);assert.equal(first.count,2);
 experienceAt(w,o,2,2);assert.equal(first.count,4);assert.equal(first.distinctTurns,2);assert(!S.PersistentInformation.qualified(w,first));experienceAt(w,o,5,1);assert.equal(first.count,5);assert.equal(first.distinctTurns,3);assert(!S.PersistentInformation.qualified(w,first));experience(w,o,"sixth");assert.equal(first.count,6);assert.equal(first.distinctTurns,3);assert(S.PersistentInformation.qualified(w,first));
 const unrelated=experience(w,o,"different-content",{meaning:"danger",contentId:"danger",result:"hurt",confirmedHarm:true,values:[{axis:1,value:2}]});assert.equal(unrelated.count,1);assert(!S.PersistentInformation.qualified(w,unrelated));assert.equal(first.count,6);reset(w);check(w);
});

test("each content and context keeps its own same-peer outcome rather than borrowing another summary's evidence",()=>{
 const w=fixture(),o=add(w,"content-holder"),a=experience(w,o,"same-peer"),b=experience(w,o,"same-peer",{contentId:"production",meaning:"production",kind:"place"}),otherPlace=experience(w,o,"same-peer",{context:{cell:19,env:3}});assert(a);assert(b);assert(otherPlace);assert.notEqual(a.originId,b.originId);assert.notEqual(a.originId,otherPlace.originId);assert.equal(a.count,1);assert.equal(b.count,1);
 assert.equal(experience(w,o,"same-peer",{contentId:"production",meaning:"production",kind:"place"}),null);reset(w);check(w);
});

test("role-specific evaluation uses fixed bounded benchmarks rather than age, population rank or summed omnivore roles",()=>{
 const w=fixture(),o=add(w,"evaluated"),a=o.informationState,b=S.PersistentInformation.basis(w,o);assert(b);a.progress.maintained=b.maintainedTurns/2;const role=Object.keys(b.roleAmounts)[0];a.progress.roleAmounts[role]=b.roleAmounts[role];
 const e=S.PersistentInformation.evaluate(w,o);assert.equal(e.A,.5);assert.equal(e.B,1);assert.equal(e.C,0);assert.equal(e.S,.6);assert.equal(e.pBase,.46);assert.equal(e.lifetime,160);
 for(const id of Object.keys(b.roleAmounts))a.progress.roleAmounts[id]=b.roleAmounts[id];assert.equal(S.PersistentInformation.evaluate(w,o).B,1);a.progress.maintained=100000;a.progress.relationTurns=100000;assert.equal(S.PersistentInformation.evaluate(w,o).S,1);assert.equal(S.PersistentInformation.evaluate(w,o).lifetime,200);
 const p=add(w,"colony-benchmark","grass",3,3,{age:999}),basis=S.PersistentInformation.basis(w,p);assert.equal(basis.maintainedTurns,100);assert.equal(p.informationState.progress.maintained,0);assert.equal(S.PersistentInformation.evaluate(w,p).A,0);reset(w);check(w);
});

test("experience and learned-state capacities are finite and do not turn accepted information into owned outcomes",()=>{
 const w=fixture(),o=add(w,"bounded");for(let n=0;n<24;n++)experience(w,o,`peer:${n}`,{contentId:`content:${n}`,meaning:"resource"});assert.equal(o.informationState.experience.length,16);assert(o.informationState.experience.every(e=>e.count===1&&e.distinctTurns===1));assert.equal(o.informationState.learned.length,0);assert.equal(o.informationState.progress.roleAmount,0);reset(w);check(w);
});

test("content freshness uses the original experience clock with smooth independent half-lives",()=>{
 for(const halfLife of [25,50,100]){const content={experienceAt:10,halfLife};assert.equal(S.PersistentInformation.freshness(content,10),1);close(S.PersistentInformation.freshness(content,10+halfLife),.5);close(S.PersistentInformation.freshness(content,10+2*halfLife),.25);assert(S.PersistentInformation.freshness(content,10+halfLife-1)>.5);assert(S.PersistentInformation.freshness(content,10+halfLife+1)<.5);}
});

test("roles are fixed ecological sets for mixed diets and P or Q never inherit their physical host's role",()=>{
 const w=fixture(),mixed=add(w,"mixed"),plant=add(w,"producer","grass",3,3),fungus=add(w,"decomposer","fungus",4,4),prey=add(w,"primary-consumer","grassbug",5,5,{age:3}),p=S.infection(w,"leafparasite",mixed.id),q=S.hyper(w,p.id);mixed.infection=p;p.q=q;
 assert.deepEqual(S.PersistentInformation.roles(w,mixed),["primary-consumer","secondary-consumer","higher-consumer"]);assert.deepEqual(S.PersistentInformation.roles(w,plant),["producer"]);assert.deepEqual(S.PersistentInformation.roles(w,fungus),["decomposer"]);assert.deepEqual(S.PersistentInformation.roles(w,prey),["primary-consumer"]);assert.deepEqual(S.PersistentInformation.roles(w,p),["P"]);assert.deepEqual(S.PersistentInformation.roles(w,q),["Q"]);
 const actors=S.PersistentInformation.entries(w);assert.equal(new Set(actors.map(e=>e.subject.id)).size,6);assert.equal(p.informationState.experience.length,0);assert.equal(q.informationState.experience.length,0);reset(w);check(w);
});

test("maintained time and real relation time count once per turn while elapsed age alone supplies no role outcome",()=>{
 const w=fixture(),o=add(w,"progress");S.PersistentInformation.recordProgress(w,o,{maintained:true,relation:true});S.PersistentInformation.recordProgress(w,o,{maintained:true,relation:true});assert.equal(o.informationState.progress.maintained,1);assert.equal(o.informationState.progress.relationTurns,1);assert.equal(o.informationState.progress.roleAmount,0);assert.equal(o.informationState.experience.length,0);
 w.turn=100;S.PersistentInformation.recordProgress(w,o,{});assert.equal(o.informationState.progress.maintained,1);assert.equal(o.informationState.progress.relationTurns,1);assert.equal(o.informationState.progress.offspringSuccess,0);reset(w);check(w);
});

test("environment reading is nonconsuming, pays finite upkeep once and cannot become owned experience or repeat learning",()=>{
 const w=fixture(),o=add(w,"reader");w.turn=1;bundle(w,"read-once",o.cell);const before={E:o.E,B:o.B,M:o.M,HP:o.HP,dna:structuredClone(o.dna),weight:o.weights[2]},fee=S.round(S.PersistentInformation.maintenance(w,o)*.01),c=receive(w);
 assert.equal(o.informationState.learned.length,1);assert.equal(o.E,S.round(before.E-fee));assert(o.weights[2]>before.weight);assert.equal(o.B,before.B);assert.equal(o.M,before.M);assert.equal(o.HP,before.HP);assert.deepEqual(o.dna,before.dna);assert.equal(o.informationState.experience.length,0);close(w.informationField.reduce((n,e)=>n+e.amount,0),1);assert.equal(w.informationLedger.inactivatedAmount,0);assert.equal(flow(c,"receptionCostE"),fee);check(w);
 const first=o.weights[2],energy=o.E;E.P.informationBegin(w,c);assert.equal(o.weights[2],first);assert.equal(o.E,energy);w.turn=2;const next=receive(w);assert.equal(o.weights[2],first);assert.equal(o.E,energy);assert.equal(flow(next,"originsRead"),0);assert(flow(next,"deduplicated")>0);assert.equal(o.informationState.experience.length,0);check(w);
});

test("one origin with two contents pays once and leaves room for one more origin across the shared reception limit",()=>{
 const w=fixture(),o=add(w,"multi-content-reader");w.turn=1;const a=bundle(w,"first-origin",o.cell);a.contents.push({...structuredClone(a.contents[0]),contentId:"danger",meaning:"damage",values:[{axis:1,value:2}],originalValues:[{axis:1,value:2}]});bundle(w,"second-origin",o.cell);bundle(w,"third-origin",o.cell);
 const fee=S.round(S.PersistentInformation.maintenance(w,o)*.01),c=receive(w),origins=new Set(o.informationState.learned.map(e=>e.originId));assert.equal(origins.size,2);assert.equal(flow(c,"originsRead"),2);assert.equal(o.informationState.last.costE,S.round(2*fee));assert(o.weights[1]>S.D.byId.ryouki.weights[1]);check(w);
});

test("ordinary live transmission is quarter-strength while only a local actual parent or caregiver reaches a juvenile at full strength",()=>{
 function run(kind,juvenile=true){
  const w=fixture(),receiver=add(w,"live-reader","ryouki",2,2,{phase:4,branch3:0,branch4:0,age:juvenile?0:18}),sender=add(w,"live-source","ryouki",3,2);for(const turn of [0,2,5])experienceAt(w,sender,turn,2);w.turn=6;
  if(kind==="parent"||kind==="remote")receiver.parents=[sender.id];if(kind==="caregiver")receiver.informationState.caregivers=[{id:sender.id,expires:10}];if(kind==="remote")sender.cell=S.index(w,6,6);
  const weight=receiver.weights[2],c=receive(w);check(w);return {delta:receiver.weights[2]-weight,receiver,c};
 }
 const ordinary=run("ordinary"),parent=run("parent"),caregiver=run("caregiver"),adult=run("parent",false),remote=run("remote");assert(ordinary.delta>0);close(parent.delta,4*ordinary.delta,3e-6);close(caregiver.delta,parent.delta);close(adult.delta,ordinary.delta);assert.equal(remote.delta,0);assert.equal(remote.receiver.informationState.learned.length,0);assert.equal(parent.receiver.informationState.experience.length,0);
});

test("k zero preserves real reads and fees while preventing both learning and place stimulation",()=>{
 const w=fixture(),o=add(w,"zero-reader");w.config.informationSettings.influence=0;w.turn=1;bundle(w,"zero-origin",o.cell);const weights=o.weights.slice(),E0=o.E,c=receive(w),place=E.P.informationPlace(w,c,o,o.cell);assert.deepEqual(o.weights,weights);assert.equal(o.informationState.learned.length,1);assert(flow(c,"originsRead")>0);assert.equal(flow(c,"learningDeltaAbs"),0);assert.equal(o.E,S.round(E0-S.PersistentInformation.maintenance(w,o)*.01));assert.deepEqual(place,{attraction:0,warning:0,value:0,origins:[]});check(w);
});

test("low evidence halves a content's initial learning effect once without consuming or shortening its information",()=>{
 function run(low){const w=fixture(),o=add(w,"low-reader");w.turn=1;const record=bundle(w,"half-origin",o.cell);if(low){record.lowEvidence=true;record.contents[0].evidence="low";}const before=o.weights[2],c=receive(w);check(w);return {delta:o.weights[2]-before,field:w.informationField,c};}
 const normal=run(false),low=run(true);close(normal.delta,2*low.delta,3e-6);assert.equal(flow(normal.c,"receptionCostE"),flow(low.c,"receptionCostE"));assert(low.field.every(e=>e.expires===160&&e.contents[0].experienceAt===0));
});

test("content scopes are independent inside a bundle and overlapping receiver roles never multiply one content",()=>{
 const w=fixture(),p=add(w,"plant-reader","grass");w.turn=1;const record=bundle(w,"mixed-scope",p.cell);record.contents.push({...structuredClone(record.contents[0]),contentId:"consumer-only",scope:"layer",roles:["primary-consumer"],values:[{axis:3,value:2}],originalValues:[{axis:3,value:2}]});const c=receive(w);assert(p.informationState.learnedPreferences[2]>0);assert.equal(p.informationState.learnedPreferences[3],0);assert(flow(c,"rejectedScope")>0);assert.equal(p.informationState.learned.length,1);check(w);
 function mixed(roles){const world=fixture(),o=add(world,"role-reader");world.turn=1;const b=bundle(world,"role-origin",o.cell);b.contents[0].scope="layer";b.contents[0].roles=roles;const before=o.weights[2];receive(world);check(world);return o.weights[2]-before;}
 assert.equal(mixed(["primary-consumer"]),mixed(["primary-consumer","secondary-consumer","higher-consumer"]));
});

test("an unfunded receiver cannot borrow future nutrition and a full cache preserves all active dedup records",()=>{
 const w=fixture(),o=add(w,"poor-reader","ryouki",2,2,{E:0});w.turn=1;bundle(w,"unfunded",o.cell);const weights=o.weights.slice(),c=receive(w);assert.equal(o.informationState.learned.length,0);assert.deepEqual(o.weights,weights);assert.equal(o.E,0);assert(flow(c,"rejectedBudget")>0);check(w);
 const full=fixture(),receiver=add(full,"full-cache");full.turn=1;receiver.informationState.learned=Array.from({length:64},(_,n)=>({originId:`cached:${n}`,contentIds:["feeding"],receivedAt:0,expires:100}));const saved=structuredClone(receiver.informationState.learned),before=receiver.weights.slice(),energy=receiver.E;bundle(full,"new-origin",receiver.cell);const blocked=receive(full);assert.deepEqual(receiver.informationState.learned,saved);assert.deepEqual(receiver.weights,before);assert.equal(receiver.E,energy);assert.equal(flow(blocked,"originsRead"),0);check(full);
 full.turn=100;const next=bundle(full,"after-expiry",receiver.cell,{generatedAt:99,expires:200});next.contents[0].experienceAt=99;const unblocked=receive(full);assert(flow(unblocked,"originsRead")>0);assert(receiver.informationState.learned.length<64);check(full);
});

test("information diffusion moves one synchronous neighboring twenty-percent budget without copying mass or clocks",()=>{
 const w=fixture();w.turn=1;const source=bundle(w,"diffusing",27),snapshot=structuredClone(source.contents),c=receive(w);const center=w.informationField.find(e=>e.cell===27);assert.equal(center.amount,.8);const neighbors=w.informationField.filter(e=>e.cell!==27);assert.equal(neighbors.length,8);close(neighbors.reduce((n,e)=>n+e.amount,0),.2);assert(neighbors.every(e=>S.distance(w,27,e.cell)===1));assert.equal(flow(c,"movedAmount"),.2);close(w.informationField.reduce((n,e)=>n+e.amount,0),1);assert(w.informationField.every(e=>e.originId==="diffusing"&&e.generatedAt===0&&e.expires===160));assert(w.informationField.every(e=>S.stable(e.contents)===S.stable(snapshot)));check(w);
});

test("cell capacity and microscopic or expired amounts are lost explicitly while surviving origins retain separate metadata",()=>{
 const w=fixture();w.turn=1;for(const id of ["a","b","c","d","z"])bundle(w,id,27);const c=receive(w);assert.equal(flow(c,"capacityLostAmount"),1);assert.equal(w.informationLedger.inactivatedAmount,1);close(w.informationField.reduce((n,e)=>n+e.amount,0),4);assert(!w.informationField.some(e=>e.originId==="z"));for(const cell of new Set(w.informationField.map(e=>e.cell)))assert(new Set(w.informationField.filter(e=>e.cell===cell).map(e=>e.originId)).size<=4);check(w);
 const micro=fixture();micro.turn=1;for(const cell of S.nearby(micro,27))micro.tiles[cell].blocked=true;bundle(micro,"small",27,{amount:.009999});bundle(micro,"minimum",27,{amount:.01});const lost=receive(micro);assert.equal(micro.informationField.length,1);assert.equal(micro.informationField[0].amount,.01);assert.equal(flow(lost,"microLostAmount"),.009999);check(micro);
 micro.turn=160;const expiry=receive(micro);assert.equal(micro.informationField.length,0);assert.equal(flow(expiry,"expiredAmount"),.01);check(micro);
});

test("nearby concentration counts fragmented origins once, stays bounded and keeps attraction separate from warning",()=>{
 const w=fixture(),o=add(w,"place-reader");w.turn=1;bundle(w,"attract",o.cell,{amount:.5});bundle(w,"attract",S.index(w,3,2),{amount:.5});for(const b of w.informationField)b.contents[0].context.cell=o.cell;const danger=bundle(w,"warn",o.cell);danger.contents[0].meaning="damage";danger.contents[0].contentId="damage";danger.contents[0].values=[{axis:1,value:2}];danger.contents[0].originalValues=structuredClone(danger.contents[0].values);
 const c=receive(w),before=S.stable(w.informationField),place=E.P.informationPlace(w,c,o,o.cell);assert(place.attraction>0&&place.attraction<=2);assert(place.warning>0&&place.warning<=2);assert.equal(place.origins.filter(e=>e.originId==="attract").length,1);assert.equal(E.P.informationPlace(w,c,o,o.cell),place);assert.equal(S.stable(w.informationField),before);E.P.informationUsed(w,c,o,o.cell,place);E.P.informationUsed(w,c,o,o.cell,place);assert.equal(flow(c,"placeApplications"),1);check(w);
 const remote=fixture(),r=add(remote,"remote-place-reader");remote.turn=1;const b=bundle(remote,"remote-context",r.cell);b.contents[0].context.cell=63;const rc=receive(remote);assert(r.informationState.learned.length>0);assert.equal(E.P.informationPlace(remote,rc,r,r.cell).attraction,0);check(remote);
});

test("death uses its own three-outcome two-turn threshold and one draw for normal, low or no generation",()=>{
 const w=fixture(),o=add(w,"normal-death");for(const contentId of ["resource","production","support"]){experienceAt(w,o,0,2,{contentId});experienceAt(w,o,2,1,{contentId});}w.turn=5;
 assert(o.informationState.experience.every(e=>!S.PersistentInformation.qualified(w,e)));const u=deathDraw(w,o,0,.1),c=generate(w,o),d=o.informationState.deathDecision;assert.equal(d.u,u);assert.equal(d.pN,.1);assert.equal(d.pL,0);assert.equal(d.kind,"normal");assert.equal(w.informationField.length,1);assert.equal(w.informationField[0].contents.length,2);assert.equal(w.informationField[0].amount,1);assert.equal(flow(c,"deathDecisions"),1);assert.equal(flow(c,"normalGenerated"),1);assert.equal(w.informationLedger.generatedAmount,1);
 const state=S.stable(w.informationField),decision=structuredClone(d);E.P.informationFinalize(w,c);w.turn=6;deathDraw(w,o,.8,1);const second=generate(w,o);assert.deepEqual(o.informationState.deathDecision,decision);assert.equal(S.stable(w.informationField),state);assert.equal(flow(second,"deathDecisions"),0);check(w);
 for(const [mode,draw,pN,pL,kind]of [["empty",[0,.04],0,0,null],["low",[0,.04],0,.05,"low"],["mixed",[.11,.14],.1,.05,"low"],["mixed",[.2,.3],.1,.05,null]]){
  const a=fixture(),subject=add(a,`death-${mode}`);if(mode!=="empty")experience(a,subject,"one");if(mode==="mixed"){experienceAt(a,subject,0,2,{contentId:"normal"});experienceAt(a,subject,1,1,{contentId:"normal"});}a.turn=4;deathDraw(a,subject,...draw);const ctx=generate(a,subject),result=subject.informationState.deathDecision;assert.equal(result.pN,pN);assert.equal(result.pL,pL);assert.equal(result.kind,kind);assert.equal(flow(ctx,"deathDecisions"),1);assert.equal(a.informationField.length,kind?1:0);if(kind==="low")assert(a.informationField[0].contents.every(e=>e.evidence==="low"));check(a);
 }
});

test("only an actual harmful outcome supplies the forty-percent normal-generation floor, including at k zero",()=>{
 for(const harm of [false,true]){const w=fixture(),o=add(w,`harm-${harm}`);w.config.informationSettings.influence=0;experience(w,o,"attacker",{meaning:"damage",contentId:"damage",result:"injured",confirmedHarm:harm,values:[{axis:1,value:2}]});w.turn=1;deathDraw(w,o,.2,.3);const c=generate(w,o),d=o.informationState.deathDecision;assert.equal(d.pN,harm?.4:0);assert.equal(d.kind,harm?"normal":null);assert.equal(flow(c,"normalGenerated"),harm?1:0);if(harm){assert.equal(w.informationField[0].contents[0].evidence,"confirmed-harm");assert.equal(w.informationField[0].contents[0].count,1);assert.equal(w.informationField[0].contents[0].distinctTurns,1);}check(w);}
});

test("a living summary and its death bundle share dedup identity and the original experience clock",()=>{
 const w=fixture(),receiver=add(w,"dedup-reader"),source=add(w,"dedup-source","ryouki",3,2);for(const t of [0,2,5])experienceAt(w,source,t,2);w.turn=6;receive(w);assert.equal(receiver.informationState.learned.length,1);const own=source.informationState.experience[0],weights=receiver.weights.slice();w.turn=10;deathDraw(w,source,0,.1);generate(w,source);const record=w.informationField[0],content=record.contents[0];assert.equal(content.originId,own.originId);assert.equal(content.experienceAt,5);assert.equal(record.generatedAt,10);assert.equal(record.expires,110);assert.equal(S.PersistentInformation.freshness(content,30),.5);
 w.organisms=w.organisms.filter(o=>o!==source);w.turn=11;const energy=receiver.E,c=receive(w);assert.deepEqual(receiver.weights,weights);assert.equal(receiver.E,energy);assert.equal(receiver.informationState.learned.length,1);assert.equal(flow(c,"originsRead"),0);assert.equal(flow(c,"receptionCostE"),0);assert.equal(receiver.informationState.experience.length,0);check(w);
});

test("newly generated information is unavailable during that turn and becomes readable only at the next resource phase",()=>{
 const w=fixture(),receiver=add(w,"next-turn-reader"),source=add(w,"next-turn-source","ryouki",3,2);experienceAt(w,source,0,2);experienceAt(w,source,1,1);w.turn=2;deathDraw(w,source,0,.1);const c=receive(w);assert.equal(receiver.informationState.learned.length,0);generate(w,source,c);assert.equal(w.informationField.length,1);E.P.informationBegin(w,c);assert.equal(receiver.informationState.learned.length,0);assert.equal(flow(c,"originsRead"),0);
 w.organisms=w.organisms.filter(o=>o!==source);w.turn=3;const next=receive(w);assert.equal(receiver.informationState.learned.length,1);assert.equal(flow(next,"environmentRead"),1);assert.equal(w.informationField[0].generatedAt,2);assert.equal(w.informationField[0].contents[0].experienceAt,1);check(w);
});

test("Q information traces require an actual finite payment and death processing does not charge that payment again",()=>{
 const w=fixture(),h=add(w,"paid-trace-host","solar",3,3,{age:30}),p=S.infection(w,"leafparasite",h.id,0,"paid-trace-p"),q=S.HyperParasite.create(w,p.id,0,"paid-trace-q");h.infection=p;p.q=q;Object.assign(p,{stage:"terminal",counter:8,phase:3,B:.04,E:0,matureAt:0});Object.assign(q,{phase:3,B:.02,E:.1,age:12,bornAt:-11});Object.assign(q.hyper,{state:"preparation",experience:12,development:12,prepareUntil:100,settledAt:-1,pauseUntil:-1,bias:{axis:2,sign:1,vector9:[0,0,1,0,0,0,0,0,0]}});w.config.hyperParasiteSettings.exclusionRate=0;w.turn=1;
 const c=reset(w);E.P.hyperBegin(w,c);assert.equal(q.hyper.last.informationE,.008);assert.equal(h.hyperTraces.length,1);assert.equal(h.hyperTraces[0].paidE,.008);assert.equal(h.hyperTraces[0].promotion,.05);assert.equal(h.hyperTraces[0].distortion,.1);assert.notEqual(h.hyperTraces[0],p.hyperTraces[0]);check(w);
 experience(w,h,"attacker",{contentId:"damage",meaning:"damage",confirmedHarm:true,values:[{axis:2,value:1}],scope:"all"});deathDraw(w,h,0,.4);const before={E:S.totals(w).E,sinks:w.ledger.sinks,trace:structuredClone(h.hyperTraces),own:structuredClone(h.informationState.experience)},dc=generate(w,h,c),record=w.informationField[0];assert.equal(S.totals(w).E,before.E);assert.equal(w.ledger.sinks,before.sinks);assert.deepEqual(h.hyperTraces,before.trace);assert.deepEqual(h.informationState.experience,before.own);assert.equal(record.qEffects.promotion,.05);assert.equal(record.qEffects.vectors[2],.1);assert.equal(record.contents[0].originalValues[0].value,1);assert.equal(record.contents[0].values[0].value,1.6);assert.equal(flow(dc,"qPromoted"),1);assert.equal(flow(dc,"qDistorted"),1);check(w);
 const poor=fixture(),host=add(poor,"unpaid-host","solar",3,3,{age:30}),pp=S.infection(poor,"leafparasite",host.id),qq=S.HyperParasite.create(poor,pp.id);host.infection=pp;pp.q=qq;pp.E=0;qq.E=0;poor.config.hyperParasiteSettings.exclusionRate=0;poor.turn=1;const pc=reset(poor);E.P.hyperBegin(poor,pc);assert.equal(qq.hyper.last.informationE,0);assert(!host.hyperTraces?.length);check(poor);
});

test("Q traces combine as a bounded weighted mean, decay from detachment and leave fixed generated contents unchanged",()=>{
 function run(age,opposed=false,qEffects=true,k=1){
  const w=fixture(),o=add(w,"trace-mean-host");w.config.informationSettings.qEffects=qEffects;w.config.informationSettings.influence=k;experience(w,o,"attacker",{contentId:"damage",meaning:"damage",confirmedHarm:true,values:[{axis:2,value:1}],scope:"all"});
  const trace=(id,sign)=>({version:"hyper-trace/1",qId:id,pId:"p:"+id,sourceId:o.id,phase:3,firstAt:1,updatedAt:1,detachedAt:1,paidE:.008,promotion:.05,distortion:.1,strength:.15,direction:{axis:2,sign,vector9:[0,0,sign,0,0,0,0,0,0]}});o.hyperTraces=[trace("q-one",1),trace("q-two",opposed?-1:1)];w.turn=age+1;deathDraw(w,o,0,.4);const originals=structuredClone(o.informationState.experience),traces=structuredClone(o.hyperTraces);generate(w,o);const record=w.informationField[0];assert.deepEqual(o.informationState.experience,originals);assert.deepEqual(o.hyperTraces,traces);assert.deepEqual(record.sourceRoles,S.PersistentInformation.roles(w,o));assert.equal(record.contents[0].scope,"all");assert.equal(record.contents[0].experienceAt,0);assert.equal(record.contents[0].originalValues[0].value,1);check(w);return {w,o,record};
 }
 const fresh=run(0),half=run(50),expired=run(100),opposed=run(0,true),off=run(0,false,false),zero=run(0,false,true,0);assert.equal(fresh.record.qEffects.promotion,.05);assert.equal(fresh.record.qEffects.vectors[2],.1);assert.equal(fresh.record.qEffects.traces.length,2);assert.equal(fresh.o.informationState.deathDecision.pN,.45);assert.equal(half.record.qEffects.promotion,.025);assert.equal(half.record.qEffects.vectors[2],.05);assert.equal(expired.record.qEffects.promotion,0);assert.equal(expired.record.qEffects.vectors[2],0);assert.equal(expired.record.qEffects.traces.length,0);assert.equal(opposed.record.qEffects.vectors[2],0);assert.equal(opposed.record.qEffects.promotion,.05);assert.equal(off.record.qEffects.promotion,0);assert.equal(off.record.qEffects.vectors[2],0);assert.deepEqual(zero.record.qEffects,fresh.record.qEffects);
 const content=structuredClone(fresh.record.contents[0]),expiry=fresh.record.expires;fresh.w.organisms=[];fresh.w.turn=51;receive(fresh.w);assert(fresh.w.informationField.every(e=>S.stable(e.contents[0])===S.stable(content)&&e.expires===expiry));assert.equal(S.PersistentInformation.freshness(content,25),.5);check(fresh.w);
});

test("place information changes an actual legal movement choice and candidate inspection alone does not count as use",()=>{
 function run(targetX,k){const w=fixture(),o=add(w,"controlled-mover","grassbug",3,3,{age:3});w.config.informationSettings.influence=k;w.turn=1;const target=S.index(w,targetX,3);bundle(w,"movement-cue",target);const c=reset(w);E.prepare(w,c);E.P.informationBegin(w,c);for(const cell of S.nearby(w,o.cell,1,true))E.P.informationPlace(w,c,o,cell);assert.equal(flow(c,"placeApplications"),0);E.B.choose(w,c,"move");const chosen=c.intents.get(o.id);E.B.move(w,c);assert.equal(o.cell,chosen.cell);assert(S.oneStep(w,S.index(w,3,3),o.cell));assert.equal(flow(c,"placeApplications"),k?1:0);check(w);return {cell:o.cell,chosen,target};}
 const left=run(2,4),right=run(4,4);assert.equal(left.cell,left.target);assert.equal(right.cell,right.target);assert.notEqual(left.cell,right.cell);const zero=run(2,0);assert(!zero.chosen.informationPlace?.value);
});

test("whole-turn and three committed phases reproduce the same coupled information world with finite budgets",()=>{
 let whole=E.create({...base,width:16,height:12,initial:12}),phased=structuredClone(whole);const original=E.fingerprint(whole);for(let t=0;t<8;t++){whole=E.step(whole);const turn=E.beginTurn(phased);for(let stage=1;stage<=3;stage++){const result=turn.advance();assert.equal(result.phase,stage);assert.equal(result.done,stage===3);if(stage<3)assert.equal(phased.turn,t);}phased=turn.display();assert.equal(E.fingerprint(phased),E.fingerprint(whole));check(whole);assert(Object.values(whole.tallies.causes).every(Number.isFinite));assert.equal(whole.observation.persistentInformation.turn,whole.turn);assert(whole.organisms.some(o=>o.informationState.progress.maintained>0));}assert.notEqual(E.fingerprint(whole),original);
});
