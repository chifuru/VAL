/* Presentation coordinates only. Biological cells, heights and distances never change. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoDisplayPlane=api;})(globalThis,()=>{
 'use strict';
 const LIFT=1.2;
 function parasitePoint(point,kind,detail=false){
  const offset=detail&&kind==='Q'?[.43,-.37]:[.23,-.26];
  return [point[0]+offset[0],point[1]+offset[1]];
 }
 function create(w,P,enabled,detail=false){
  const cells=slot=>new Set(w.organisms.filter(slot).map(o=>o.cell)),
    main=cells(o=>o.slot==='main'),food=cells(o=>o.slot!=='main'),basal=cells(o=>o.slot==='food'),prey=cells(o=>o.slot==='prey'),
    hosts=new Map();
  for(const o of w.organisms){hosts.set(o.id,o);if(o.infection){hosts.set(o.infection.id,o);if(o.infection.q)hosts.set(o.infection.q.id,o);}}
  function anchor(o,progress=1,move=null){
   const overlap=main.has(o.cell)&&food.has(o.cell),layered=basal.has(o.cell)&&prey.has(o.cell),
     ox=layered?(o.slot==='main'?.65:o.slot==='prey'?.18:.68):overlap?(o.slot==='main'?.67:.2):.5,
     oy=layered?(o.slot==='main'?.4:o.slot==='prey'?.72:.88):overlap?(o.slot==='main'?.44:.81):.55;
   let x=o.cell%w.config.width,y=Math.floor(o.cell/w.config.width);
   if(move?.from!==undefined){const u=move.from%w.config.width,v=Math.floor(move.from/w.config.width);x=u+(x-u)*progress;y=v+(y-v)*progress;}
   const ground=P.point(x+ox,y+oy),point=[ground[0],ground[1]-(enabled&&o.slot==='main'?LIFT:0)];
   return {ground,point,depth:P.depth(x+ox,y+oy),elevated:!!enabled&&o.slot==='main'};
  }
  function entity(id){
   const host=hosts.get(id);if(host){const a=anchor(host);if(host.id!==id)a.point=parasitePoint(a.point,host.infection?.q?.id===id?'Q':'P',detail);return {...a,host,id,cell:host.cell};}
   for(const a of w.carcasses||[]){
    if(a.id!==id&&(!(a.payloadExpires>w.turn)||(a.infection?.id!==id&&a.infection?.q?.id!==id)))continue;
    const ground=P.point(a.cell%w.config.width+(a.slot==='food'?.22:a.slot==='prey'?.52:.86),Math.floor(a.cell/w.config.width)+.86),point=[...ground];
    if(id!==a.id){point[0]+=a.infection?.q?.id===id?.23:.09;point[1]-=a.infection?.q?.id===id?.18:.12;}
    return {id,cell:a.cell,host:a,ground,point,elevated:false,carcass:true};
   }
   const q=(w.searchQ||[]).find(q=>q.id===id);if(q){const p=P.point(q.cell%w.config.width+.5,Math.floor(q.cell/w.config.width)+.5);return {id,cell:q.cell,point:[p[0]+.24,p[1]-.25],ground:p,elevated:false};}
   return null;
  }
  return {anchor,entity,enabled:!!enabled};
 }
 return {create,LIFT,parasitePoint};
});
