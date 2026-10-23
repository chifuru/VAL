'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
const start=source.indexOf('  function stackShape(data){'),end=source.indexOf('  function relationShape(rows){',start);
assert(start>=0&&end>start);
function load(){return vm.runInNewContext('const stackPaintCache=new WeakMap();'+source.slice(start,end)+';stackShape;');}
test('long finite history avoids the old variable-argument limit and keeps the same maximum',()=>{
 const data=Array.from({length:300000},(_,i)=>({values:{0:i%97},total:i%97}));
 assert.throws(()=>Math.max(1,...data.map(r=>r.total)),RangeError);
 assert.equal(load()(data).max,96);
 assert(source.includes('max=stackShape(series.phases).max'));
});
test('settled history reads no old totals and one appended row adds one total read',()=>{
 const scale=load();let reads=0;
 const row=n=>({values:{0:n},get total(){reads++;return n;}}),data=Array.from({length:20000},(_,i)=>row(i%53));
 assert.equal(scale(data).max,52);assert.equal(reads,20000);scale(data);assert.equal(reads,20000);
 const next=row(71);next.values={0:10,1:61};data.push(next);const result=scale(data);assert.equal(result.max,71);assert.equal(reads,20001);assert.deepEqual(Array.from(result.keys),['0','1']);
});
test('independent histories and shortened arrays do not retain another maximum',()=>{
 const scale=load(),a=[{values:{0:9},total:9},{values:{0:30},total:30}],b=[{values:{2:4},total:4}];
 assert.equal(scale(a).max,30);assert.equal(scale(b).max,4);a.pop();assert.equal(scale(a).max,9);assert.equal(scale([]).max,1);
});
