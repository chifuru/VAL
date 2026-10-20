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
test('independent producer keeps a fourth distinct anchor and follows its own movement',()=>{
 const w=world();w.organisms.push({id:'tree',slot:'producer',cell:27});
 const before=JSON.stringify(w),p=P.build(w),layout=D.create(w,p,false),points=w.organisms.map(o=>layout.anchor(o).point);
 assert.equal(new Set(points.map(p=>JSON.stringify(p))).size,4);
 assert(layout.producer.has(27));assert(layout.food.has(27));assert.equal(layout.entity('tree').host.id,'tree');
 const tree=w.organisms.at(-1),move={from:26};
 assert.deepEqual(layout.anchor(tree,1,move),layout.anchor(tree));
 assert.notDeepEqual(layout.anchor(tree,0,move).point,layout.anchor(tree).point);
 assert.equal(JSON.stringify(w),before);
});
test('mutated ryouki cohabitants keep stable ID anchors with lower layers and attached P/Q',()=>{
 const w=world();w.organisms=w.organisms.filter(o=>o.slot!=='main');
 for(const id of ['r-c','r-a','r-b'])w.organisms.push({id,species:'ryouki',slot:'main',cell:27,ryouki:{mutated:true},infection:id==='r-c'?{id:'p',q:{id:'q'}}:null});
 w.organisms.push({id:'tree',slot:'producer',cell:27});const before=JSON.stringify(w),p=P.build(w),layout=D.create(w,p,false,true),all=w.organisms.map(o=>layout.anchor(o));
 assert.equal(new Set(all.map(a=>JSON.stringify(a.point))).size,6);
 const reverse=D.create({...w,organisms:[...w.organisms].reverse()},p,false,true);
 for(const o of w.organisms)assert.deepEqual(layout.anchor(o),reverse.anchor(o));
 const host=w.organisms.find(o=>o.id==='r-c'),a=layout.anchor(host);
 assert.equal(a.cohabit,3);assert.equal(a.rank,2);assert.equal(a.scale,.62);
 assert.deepEqual(layout.entity('p').point,D.parasitePoint(a.point,'P',true,2,3));
 assert.deepEqual(layout.entity('q').point,D.parasitePoint(a.point,'Q',true,2,3));
 assert.equal(JSON.stringify(w),before);
});
test('ryouki movement follows each successful path segment and spatial candidates include detours',()=>{
 const w=world();w.organisms=[{id:'walker',species:'ryouki',slot:'main',cell:27,ryouki:{mutated:false}}];
 const p=P.build(w),layout=D.create(w,p,false),o=w.organisms[0],move={type:'move',id:o.id,from:18,to:27,path:[19,20,28,27]};w.events=[move];
 for(const [progress,cell]of [[0,18],[.25,19],[.5,20],[.75,28],[1,27]]){
  const expected=p.point(cell%8+.5,Math.floor(cell/8)+.55);assert.deepEqual(layout.anchor(o,progress,move).point,expected);
 }
 assert.deepEqual(layout.anchor(o,1,move),layout.anchor(o));
 const middle=layout.anchor(o,.5,move).point;assert(layout.candidates([middle[0]-.01,middle[1]-.01,middle[0]+.01,middle[1]+.01]).some(a=>a.id===o.id));
});
