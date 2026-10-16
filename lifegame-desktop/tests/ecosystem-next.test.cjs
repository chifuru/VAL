"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),{model}=require('../design/ecosystem-next/model.cjs');
function pair(a,b){
 const E=model(),S=E.S,w=E.create({width:10,height:10,initial:0,enabled:{main:false,plant:false,fungus:false,prey:false}});
 w.organisms=[];w.resources=[];w.pending=[];w.carcasses=[];
 for(const t of w.tiles)Object.assign(t,{env:3,terrain:'plain',cover:'none',blocked:false,walls:[],light:.7});
 const x=S.organism(w,S.D.byId[a],44,'a',{phase:4,E:80}),y=S.organism(w,S.D.byId[b],45,'b',{phase:4,E:80});w.organisms.push(x,y);
 const ctx=E.context(w);E.prepare(w,ctx);return {E,S,w,x,y,ctx};
}
test('mutual non-aggression excludes both attack candidates and stale forced attacks',()=>{
 for(const [a,b] of [['solar','kelp'],['kelp','solar']]){
  const {E,S,w,x,y,ctx}=pair(a,b);
  assert(!E.B.candidates(w,x,ctx,S.maps(w)).some(c=>c.type==='attack'&&c.target===y.id));
  ctx.intents.set(x.id,{type:'attack',target:y.id,cost:3});ctx.intents.set(y.id,{type:'stop',cost:0});
  E.B.combat(w,ctx);assert.equal(ctx.records.get(y.id).damage,0);
 }
});
test('friendship does not disable a different lineage predator attack',()=>{
 const {E,S,w,x,y,ctx}=pair('abyss','solar');
 assert(E.B.candidates(w,x,ctx,S.maps(w)).some(c=>c.type==='attack'&&c.target===y.id));
 ctx.intents.set(x.id,{type:'attack',target:y.id,cost:3});ctx.intents.set(y.id,{type:'stop',cost:0});E.B.combat(w,ctx);
 assert(ctx.records.get(y.id).damage>0);
});
