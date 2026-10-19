'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),D=require('../src/ecology/display-plane.js'),P=require('../src/ecology/projection.js');
const world=()=>({config:{width:8,height:8},tiles:Array.from({length:64},()=>({terrain:'plain'})),organisms:[{id:'m',slot:'main',cell:27,infection:{id:'p',q:{id:'q'}}},{id:'b',slot:'food',cell:27},{id:'f',slot:'prey',cell:27}],searchQ:[{id:'search',cell:27}]});
test('only main display rises; colocated lower layers and biological world stay unchanged',()=>{
 const w=world(),before=JSON.stringify(w),p=P.build(w),off=D.create(w,p,false),on=D.create(w,p,true);
 for(const o of w.organisms){const a=off.anchor(o),b=on.anchor(o);assert.deepEqual(a.ground,b.ground);assert.equal(a.depth,b.depth);assert.equal(a.point[0],b.point[0]);assert(Math.abs(a.point[1]-b.point[1]-(o.slot==='main'?D.LIFT:0))<1e-9);}
 assert.equal(JSON.stringify(w),before);assert.notDeepEqual(on.anchor(w.organisms[1]).point,on.anchor(w.organisms[2]).point);
});
test('attached P and Q rise with the host; search Q stays on its real base cell',()=>{
 const w=world(),p=P.build(w),off=D.create(w,p,false),on=D.create(w,p,true);
 for(const id of ['m','p','q'])assert(Math.abs(off.entity(id).point[1]-on.entity(id).point[1]-D.LIFT)<1e-9);
 assert.deepEqual(on.entity('search'),off.entity('search'));assert.equal(on.entity('missing'),null);
 w.organisms[0].slot='prey';const lower=D.create(w,p,true);assert.equal(lower.entity('p').elevated,false);
});
test('movement interpolates on the same elevated plane and converges to the settled anchor',()=>{
 const w=world(),p=P.build(w),off=D.create(w,p,false),on=D.create(w,p,true),o=w.organisms[0],move={from:18};
 for(const t of [0,.25,.5,.75,1]){const a=off.anchor(o,t,move),b=on.anchor(o,t,move);assert.deepEqual(a.ground,b.ground);assert(Math.abs(a.point[1]-b.point[1]-D.LIFT)<1e-9);}
 assert.deepEqual(on.anchor(o,1,move),on.anchor(o));
});
