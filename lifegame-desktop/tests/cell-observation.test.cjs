'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),D=require('../src/ecology/display-plane.js'),P=require('../src/ecology/projection.js');
function fixture(){
 const w={config:{width:8,height:8,cellModel:'cell-reorganization/1'},tiles:Array.from({length:64},()=>({terrain:'plain'})),organisms:[],carcasses:[],resources:[],events:[],searchQ:[]};
 for(let slot=0;slot<3;slot++)for(let i=0;i<3;i++)w.organisms.push({id:`r${slot}-${i}`,species:'ryouki',cell:27,slot:'main',ryouki:{mutated:true},cellOccupancy:{state:'settled',slot}});
 for(let i=0;i<2;i++)w.organisms.push({id:'moving'+i,species:i?'freshwaterlight':'crystal',cell:27,slot:i?'producer':'main',cellOccupancy:{state:'moving'}});
 for(const [kind,count,slot]of [['colony',6,'food'],['plant',3,'producer'],['group',5,'prey'],['fungus',6,'food']])for(let i=0;i<count;i++)w.organisms.push({id:kind+i,species:kind,cell:27,slot,cellLife:{kind}});
 w.organisms[0].infection={id:'p',q:{id:'q'}};return w;
}
test('every maximum-layer biological ID has a separate finite anchor inside its own cell',()=>{
 const w=fixture(),before=structuredClone(w),p=P.build(w),layout=D.create(w,p,false,true),points=w.organisms.map(o=>layout.anchor(o));assert.equal(points.length,31);assert.equal(new Set(points.map(a=>JSON.stringify(a.point))).size,31);
 for(const a of points){assert(a.point.every(Number.isFinite));assert(a.scale>0&&a.scale<=1);assert(a.depth>0);}assert.deepEqual(w,before);assert.equal(layout.candidates([-100,-100,100,100]).length,31);
});
test('physical settlement groups retain three packed IDs each and movers remain distinct',()=>{
 const w=fixture(),layout=D.create(w,P.build(w),false);for(let slot=0;slot<3;slot++){const rows=w.organisms.filter(o=>o.cellOccupancy?.slot===slot);assert.deepEqual(rows.map(o=>layout.anchor(o).rank),[0,1,2]);assert(rows.every(o=>layout.anchor(o).cohabit===3));}
 for(const o of w.organisms.filter(o=>o.cellOccupancy?.state==='moving'))assert.equal(layout.anchor(o).cohabit,1);
});
test('reversed biological arrays preserve ID positions, rank, scaling and spatial candidates',()=>{
 const w=fixture(),p=P.build(w),a=D.create(w,p,false,true),b=D.create({...w,organisms:w.organisms.slice().reverse()},p,false,true);for(const o of w.organisms)assert.deepEqual(a.anchor(o),b.anchor(o));
});
test('host P/Q and scaled detailed picking use the same parent anchor',()=>{
 const w=fixture(),layout=D.create(w,P.build(w),false,true),host=w.organisms[0],a=layout.anchor(host);assert.deepEqual(layout.entity('p').point,D.parasitePoint(a.point,'P',true,a.rank,a.cohabit,a.scale));assert.deepEqual(layout.entity('q').point,D.parasitePoint(a.point,'Q',true,a.rank,a.cohabit,a.scale));assert.notDeepEqual(layout.entity('p').point,layout.entity('q').point);assert.equal(layout.entity('q').host.id,host.id);
});
test('all layers interpolate to the current anchor without changing biological location',()=>{
 const w=fixture(),layout=D.create(w,P.build(w),false,true),before=structuredClone(w);for(const o of w.organisms){const start=layout.anchor(o,0,{from:18}),end=layout.anchor(o,1,{from:18});assert.deepEqual(end,layout.anchor(o));assert.notDeepEqual(start.point,end.point);}assert.deepEqual(w,before);
});
test('freshwater layer-four display remains producer identity and singleton legacy position is preserved',()=>{
 const w=fixture();w.organisms=[w.organisms.find(o=>o.species==='freshwaterlight')];const p=P.build(w),layout=D.create(w,p,false);assert.deepEqual(layout.anchor(w.organisms[0]).point,p.point(3.5,3.55));assert.equal(w.organisms[0].slot,'producer');assert.equal(layout.anchor(w.organisms[0]).scale,1);
});
