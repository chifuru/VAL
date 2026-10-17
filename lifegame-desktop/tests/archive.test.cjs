'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const E=require('../src/ecology/engine.js'),A=require('../src/ecology/archive.js');
function storage(){let value=null;return {getItem:()=>value,setItem:(_,v)=>{value=v;}};}
function specimen(){let w=E.create({seed:'archive-contract',width:16,height:12,initial:16,lineages:'manual',selected:['jelly','solar'],landscape:'watershed'});for(let i=0;i<8;i++)w=E.step(w);return w;}
test('final record contains initial config and final summary; repeated replay never records',()=>{
 const s=storage(),a=A.create(s,E,'version'),w=specimen(),record=a.capture(w,'user-ended');
 assert(!('organisms' in record));assert(!('history' in record));assert.equal(a.save(record),true);assert.equal(a.save(record),false);
 for(let k=0;k<3;k++){const r=a.replay(record.id);let next=E.create(r.config);for(let i=0;i<r.turn;i++)next=E.step(next);assert.equal(E.fingerprint(next),r.id);assert.equal(a.save(a.capture(next,'user-ended'),'replay'),false);assert.equal(a.list().length,1);}
});
test('incompatible, corrupt, full or failing storage cannot silently lose records',()=>{
 const s=storage(),a=A.create(s,E,'a'),record=a.capture(specimen(),'user-ended');a.save(record);
 assert.throws(()=>A.create(s,E,'b').replay(record.id),/計算版/);
 s.setItem('',JSON.stringify({wrong:true}));assert.throws(()=>a.list(),/破損/);assert.throws(()=>a.save(record),/破損/);
 const bad=A.create({getItem:()=>null,setItem:()=>{throw Error('quota');}},E,'a');assert.throws(()=>bad.save(record),/quota/);
 s.setItem('',JSON.stringify(Array.from({length:100},(_,i)=>({...record,id:'r'+i}))));assert.throws(()=>a.save(record),/100件/);
 a.remove('r0');assert.equal(a.list().length,99);
});
test('checked-in replay signature matches all biological sources including landscape',()=>{
 const hash=crypto.createHash('sha256');for(const f of ['landscape','hash','catalogue','state','nutrition','behavior','reproduction','parasites','engine']){hash.update(f+'\0');hash.update(fs.readFileSync(require.resolve('../src/ecology/'+f+'.js')));}
 assert(fs.readFileSync(require.resolve('../src/ecology/replay-version.js'),'utf8').includes(hash.digest('hex')));
});
