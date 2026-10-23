'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const O=require('../src/ecology/observations.js'),old={exports:{}},source=fs.readFileSync(path.resolve(__dirname,'../src/ecology/observations.js'),'utf8');
// Reproduce the prior defect without requiring Git history in a shallow checkout.
const beforeSource=source.replace('for(const row of structuredClone(snapshot.rows))h.rows.push(row);','h.rows.push(...structuredClone(snapshot.rows));');assert.notEqual(beforeSource,source);
new Function('require','module','exports',beforeSource)(createRequire(path.resolve(__dirname,'../src/ecology/observations.js')),old,old.exports);
function fixture(length){
 const h=O.create({seed:'long-restore-fixture',width:4,height:4},'long-restore-fixture',{species:[{id:'probe',name:'観測fixture',group:'main'}]}),s=h.snapshot();
 const variants=Array.from({length:7},(_,n)=>({counts:{probe:n},composition:{probe:{phases:{0:n},sex:{none:n},ages:{adult:n}}},current:{pyramid:{definition:'trophic-observed/1',layers:[0,0,n,0]},relations:{},bonds:{},summary:{}}}));
 s.rows=Array.from({length},(_,turn)=>({turn,...variants[turn%7]}));return s;
}
test('real restore keeps every ordered value beyond the former push argument limit',()=>{
 const s=fixture(300000);assert.throws(()=>old.exports.restore(s),RangeError);
 const h=O.restore(s);assert.equal(h.rows.length,s.rows.length);
 for(let i=0;i<s.rows.length;i++){assert.equal(h.rows[i].turn,i);assert.equal(h.rows[i].counts.probe,i%7);}
 assert.equal(h.rows.at(-1).turn,299999);assert.throws(()=>h.append({}),/読取専用/);
});
test('restore preserves source isolation and the prior internal alias semantics',()=>{
 const s=fixture(8),h=O.restore(s),before=old.exports.restore(s);
 assert.deepEqual(h.snapshot(),before.snapshot());
 assert.notEqual(h.rows,s.rows);assert.notEqual(h.rows[0],s.rows[0]);assert.notEqual(h.rows[0].counts,s.rows[0].counts);
 assert.equal(h.rows[0].counts,h.rows[7].counts);h.rows[0].counts.probe=99;assert.equal(h.rows[7].counts.probe,99);assert.equal(s.rows[0].counts.probe,0);
});
test('small compatibility records keep the same complete series and serialization',()=>{
 const s=fixture(11),h=O.restore(s),before=old.exports.restore(s);
 for(const axis of ['population','phases','sex','ages'])assert.deepEqual(h.series('all',axis),before.series('all',axis));
 assert.equal(JSON.stringify(h.snapshot()),JSON.stringify(before.snapshot()));
 // Use the existing real-observation fixture for CSV, whose optional display columns are complete.
 const F=require('./ecology-fixtures.cjs'),w=F.world(),record=O.create(w.config,'restore-compat');for(let t=0;t<3;t++){w.turn=t;record.append(w);}
 const saved=record.snapshot();assert.equal(O.restore(saved).csv(),old.exports.restore(saved).csv());
});
