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
 const hash=crypto.createHash('sha256');for(const f of ['map-data','map-templates','landscape','hash','catalogue','state','nutrition','behavior','reproduction','parasites','engine','observation-modules','observation-model']){hash.update(f+'\0');hash.update(fs.readFileSync(require.resolve('../src/ecology/'+f+'.js')));}
 assert(fs.readFileSync(require.resolve('../src/ecology/replay-version.js'),'utf8').includes(hash.digest('hex')));
});

test('successor model preserves replay of prior flagless worlds',()=>{
 require('../src/ecology/replay-version.js');
 const old='6e441483b2bd025ca772931640e3f3edfdfb3ed6a44609d7dadb61f567dcf941',s=storage();
 const w=specimen(),previous=A.create(s,E,old),record=previous.capture(w,'user-ended');previous.save(record);
 assert.equal(A.create(s,E,globalThis.EcoReplayVersion).replay(record.id).signature,old);
 const rows=JSON.parse(s.getItem());rows[0].config.socialRenewalModel='successor/1';s.setItem('',JSON.stringify(rows));
 assert.throws(()=>A.create(s,E,globalThis.EcoReplayVersion).replay(record.id));
});

test('template records require resolved map identity before replay',()=>{
 const s=storage(),a=A.create(s,E,'maps');
 const w=E.create({seed:'map-record',terrainSeed:'fixed',landscape:'templates',mapId:'river',width:40,height:28,initial:20,lineages:'few'});
 const r=a.capture(w,'user-ended');a.save(r);const rows=JSON.parse(s.getItem());delete rows[0].config.mapResolved;s.setItem('',JSON.stringify(rows));
 assert.throws(()=>a.replay(r.id),/地形の識別/);
});


test('I01 source-only optimization replays 4.2.32 manual conditions without broadening legacy aliases',()=>{
 require('../src/ecology/replay-version.js');
 const previous='8d7f6fbd94128cebf77ab6032098e09a432bc13d8cb2552222b0546971e84745';
 const M=require('../src/ecology/observation-model.js'),engine=M.model(),s=storage();
 let world=engine.create({seed:'founder',width:16,height:12,initial:24,lineages:'few',ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',founderCounts:{version:1,species:{grass:12,algae:10,moss:0},parasites:{leafparasite:3,hyperparasite:0}}});
 for(let n=0;n<4;n++)world=engine.step(world);
 const oldArchive=A.create(s,engine,previous),record=oldArchive.capture(world,'user-ended');oldArchive.save(record);
 const current=A.create(s,engine,globalThis.EcoReplayVersion),replay=current.replay(record.id);
 assert.equal(replay.signature,previous);let again=engine.create(replay.config);
 for(let n=0;n<replay.turn;n++)again=engine.step(again);
 assert.equal(engine.fingerprint(again),record.id);assert.equal(current.list().length,1);
 const rows=JSON.parse(s.getItem());rows[0].signature='unknown-biological-version';s.setItem('',JSON.stringify(rows));
 assert.throws(()=>current.replay(record.id),/計算版/);
 rows[0].signature='521df4a778be285f5d45548c265e3f4364744e9a10037bddf40beb34e5c65217';s.setItem('',JSON.stringify(rows));
 assert.throws(()=>current.replay(record.id),/計算版/,'older alias cannot acquire founder support via I01');
});
