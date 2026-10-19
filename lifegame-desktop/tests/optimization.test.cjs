'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=require('../src/ecology/hash.js'),T=require('../src/ecology/transport.js'),M=require('../src/ecology/observation-model.js'),O=require('../src/ecology/observations.js');
test('random table is portable, order independent, purpose separated and not a short repeating cycle',()=>{
 const context={TextEncoder};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../src/ecology/hash.js'),'utf8'),context);
 const bins=Array(16).fill(0),values=[];
 for(let i=0;i<8192;i++){const args=['乱数確認','move',i%500,'o'+Math.floor(i/500),[i%8,i],null],a=H.tableHash(...args);assert.equal(a,context.EcoHash.tableHash(...args));bins[a>>>28]++;values.push(a);}
 assert(new Set(values).size>8100);assert(bins.every(n=>n>380&&n<650));
 for(let i=0;i<100;i++){const args=['乱数確認','move',i,'id',i];const x=H.tableHash(...args);H.tableHash('noise','other',999,'else');assert.equal(H.tableHash(...args),x);assert.notEqual(x,H.tableHash('乱数確認','combat',i,'id',i));}
 for(let i=0;i<6;i++)H.tableHash('evict'+i,'purpose');assert.equal(H.tableHash('乱数確認','move',0,'o0',[0,0],null),values[0]);
});
test('versioned table worlds keep finite budgets and exact repeatability without rewriting legacy configurations',()=>{
 const E=M.model(),config={seed:'table-budget',width:16,height:12,initial:24,lineages:'few',ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',populationRegulation:{version:1}};
 let a=E.create(config),b=E.create(config);for(let i=0;i<15;i++){a=E.step(a);b=E.step(b);assert.deepEqual(E.invariants(a),[]);assert.deepEqual(a,b);}
 assert.equal(E.create({...config,randomModel:undefined}).config.randomModel,undefined);assert.throws(()=>E.create({...config,randomModel:'table/99'}),/乱数方式/);
});
test('wire format shares unchanged order, preserves snapshots, addition, deletion and reordered lists',()=>{
 const E=M.model(),initial=E.create({seed:'wire-opt',width:8,height:8,initial:24,lineages:'few'}),encode=T.encoder(initial),before=structuredClone(initial),next=structuredClone(initial);
 let patch=structuredClone(encode(next));assert.equal(patch.lists.organisms.order,null);assert.strictEqual(T.apply(initial,patch).organisms,initial.organisms);
 next.organisms[0].E+=1;patch=structuredClone(encode(next));let view=T.apply(initial,patch);assert.deepEqual(view.organisms,next.organisms);assert.deepEqual(initial,before);
 next.organisms[0].dna.body+=.01;next.organisms[0].temporary={a:1};patch=structuredClone(encode(next));view=T.apply(view,patch);assert.deepEqual(view.organisms,next.organisms);delete next.organisms[0].temporary;patch=structuredClone(encode(next));view=T.apply(view,patch);assert.deepEqual(view.organisms,next.organisms);
 next.organisms.reverse();patch=structuredClone(encode(next));assert(patch.lists.organisms.order);view=T.apply(view,patch);assert.deepEqual(view.organisms,next.organisms);
 next.organisms.pop();patch=structuredClone(encode(next));view=T.apply(view,patch);assert.deepEqual(view.organisms,next.organisms);
});
test('cached series retains every raw turn and computes all composition targets identically',()=>{
 const E=M.model(),w=E.create({seed:'series-opt',width:8,height:8,initial:24,lineages:'few'}),history=O.create(w.config,'test',{species:E.S.D.species});let state=w;
 for(let i=0;i<8;i++){
  if(i)state=E.step(state);history.append(state);
  for(const target of ['main','all','plant','prey'])for(const axis of ['population','phases','sex','ages']){
   const actual=history.series(target,axis),expected=history.rows.map(r=>{const values={};for(const [id,n]of Object.entries(r.counts)){if(target!=='all'&&id!==target&&E.S.D.byId[id]?.group!==target)continue;if(axis==='population'){values[id]=n;continue;}let sum=0;for(const [key,v]of Object.entries(r.composition[id]?.[axis]||{})){values[key]=(values[key]||0)+v;sum+=v;}if(n>sum)values.nonapplicable=(values.nonapplicable||0)+n-sum;}return {turn:r.turn,values,total:Object.values(values).reduce((a,n)=>a+n,0)};});
   assert.deepEqual(actual,expected);
  }
 }
 assert.equal(history.snapshot().rows.length,8);
});
