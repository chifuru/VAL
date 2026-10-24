'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../design/advantage-switches/model.cjs').model({producer:false,waterbug:false,hyperparasite:false}).N.CellResources;
const fixture=require('./cell-acquire-allocation-fixture.json');
test('allocation preserves baseline grants, ordering, raw inputs and empty-demand semantics',()=>{
 for(const row of fixture.cases)for(const reverse of [false,true]){
  const requests=reverse?row.requests.slice().reverse():row.requests,before=JSON.stringify({stocks:row.stocks,requests,demands:row.demands});
  const actual=R.allocate(row.stocks,requests,row.demands);
  assert.deepEqual({grants:[...actual.grants],remaining:actual.remaining},row.expected,row.scale+'/'+row.mode);
  assert.equal(JSON.stringify({stocks:row.stocks,requests,demands:row.demands}),before);
 }
 for(const requests of [[null],[{id:'bad',need:1,rates:{missing:1}}],[{id:'bad',need:1,rates:{M:0}}],[{id:'bad',need:1,rates:{M:1},fulfills:{unknown:1}}]])
  assert.throws(()=>R.allocate({M:1},requests),/CELL_REQUEST_INVALID/);
});
