"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),{model}=require("../design/survival-trial/model.cjs");
function fixture(){
 const E=model({routes:true}),S=E.S,w=E.create({seed:"route-contract",width:10,height:10,initial:4,lineages:"manual",selected:["kelp"]});
 w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];for(const t of w.tiles){t.blocked=false;t.walls=[];t.terrain="plain";t.env=5;}
 function add(species,cell,id,options={}){const o=S.organism(w,S.D.byId[species],cell,id,options);w.organisms.push(o);return o;}
 function budget(){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
 return {E,S,w,add,budget};
}
test("isolated baseline replays production without mutating production catalogue",()=>{
 const prod=require("../src/ecology/engine.js"),E=model(),cfg={seed:"loader-parity",width:12,height:12,initial:4,lineages:"manual",selected:["solar"]};let a=E.create(cfg),b=prod.create(cfg);
 for(let i=0;i<4;i++){assert.equal(E.fingerprint(a),prod.fingerprint(b));a=E.step(a);b=prod.step(b);}
 const maintenance=prod.S.D.byId.solar.maintenance;model({budget:true});assert.equal(prod.S.D.byId.solar.maintenance,maintenance);
});
test("three repeated local contacts seed one paid colony, keep donor, and cannot chain on the same day",()=>{
 const {E,S,w,add,budget}=fixture(),a=add("algae",44,"source"),b=add("algae",45,"target"),c=add("algae",46,"farther");a.infection=S.infection(w,"tideparasite",a.id);a.infection.counter=4;a.infection.E=1;budget();
 for(let i=1;i<=3;i++){w.turn=i;E.P.contacts(w,E.context(w));if(i<3)assert.equal(b.infection,null);}
 assert.ok(a.infection&&b.infection);assert.equal(b.infection.unit,"colony");assert.equal(b.infection.hostId,b.id);assert.equal(b.infection.sex,undefined);assert.equal(b.infection.E,.04);assert.equal(a.infection.E,.88);assert.equal(c.infection,null);
 const n=w.trialTransmission.contact;E.P.contacts(w,E.context(w));assert.equal(w.trialTransmission.contact,n);assert.deepEqual(E.invariants(w),[]);
});
test("expired exposure and blocked sight do not count as frequent contact",()=>{
 const {E,S,w,add}=fixture(),a=add("algae",44,"source"),b=add("algae",45,"target");a.infection=S.infection(w,"tideparasite",a.id);a.infection.counter=4;a.infection.E=1;
 w.turn=1;E.P.contacts(w,E.context(w));assert.equal(b.trialExposure[0].hits,1);w.turn=10;E.P.contacts(w,E.context(w));assert.equal(b.trialExposure[0].hits,1);w.tiles[44].walls=[45];w.tiles[45].walls=[44];w.turn=11;E.P.contacts(w,E.context(w));assert.equal(b.trialExposure.length,0);assert.equal(b.infection,null);
});
test("even an early infected host leaves a finite infectious carcass and can transfer its existing colony",()=>{
 const {E,S,w,add,budget}=fixture(),a=add("algae",44,"dead-host"),b=add("solar",45,"recipient");a.infection=S.infection(w,"tideparasite",a.id);a.infection.E=.3;const id=a.infection.id;budget();const ctx=E.context(w);E.N.carcass(w,a,ctx);w.organisms=w.organisms.filter(o=>o!==a);const corpse=w.carcasses[0];assert.equal(corpse.payloadExpires,w.turn+16);assert.equal(corpse.infection.id,id);
 E.P.transfer(w,ctx,corpse,b,"carcass");assert.equal(corpse.infection,null);assert.equal(b.infection.id,id);assert.equal(b.infection.stage,"extra");assert.equal(b.infection.hostId,b.id);assert.equal(w.trialTransmission.carcass,1);assert.deepEqual(E.invariants(w),[]);
});
test("mature terminal colony spreads at most three paid daughter colonies and carries paid hyperparasites",()=>{
 const {E,S,w,add,budget}=fixture(),a=add("kelp",44,"terminal",{phase:3});for(const [i,cell] of [34,43,45,54].entries())add("grass",cell,"target"+i);
 a.infection=S.infection(w,"leafparasite",a.id);const p=a.infection;p.stage="terminal";p.counter=8;p.E=1;p.q=S.hyper(w,p.id);p.q.phase=3;p.q.E=.2;budget();for(let i=1;i<=3;i++){w.turn=i;E.P.contacts(w,E.context(w));}
 const children=w.organisms.filter(o=>o!==a&&o.infection);assert.equal(children.length,3);assert.equal(w.trialTransmission.terminalContact,3);assert.ok(children.every(o=>o.infection.q.hostId===o.infection.id));assert.equal(p.E,.64);assert.equal(p.q.E,.02);assert.deepEqual(E.invariants(w),[]);
});
