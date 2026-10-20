/* Presentation coordinates only. Biological cells, heights and distances never change. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoDisplayPlane=api;})(globalThis,()=>{
 'use strict';
 const LIFT=1.2;
 function spatial(items,box,size=4){
  const bins=new Map();items.forEach((item,i)=>{const b=box(item);for(let y=Math.floor(b[1]/size);y<=Math.floor(b[3]/size);y++)for(let x=Math.floor(b[0]/size);x<=Math.floor(b[2]/size);x++){const k=x+':'+y;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(i);}});
  return rect=>{const ids=new Set();for(let y=Math.floor(rect[1]/size);y<=Math.floor(rect[3]/size);y++)for(let x=Math.floor(rect[0]/size);x<=Math.floor(rect[2]/size);x++)for(const i of bins.get(x+':'+y)||[])ids.add(i);return [...ids].sort((a,b)=>a-b).map(i=>items[i]);};
 }

 function parasitePoint(point,kind,detail=false,rank=0,count=1){
  const shared=count>1,
    offset=shared?(detail&&kind==='Q'?[[-.24,-.25],[.25,-.24],[-.34,-.15]]:[[-.10,-.18],[.12,-.17],[-.20,-.12]])[Math.min(2,rank)]:detail&&kind==='Q'?[.43,-.37]:[.23,-.26];
  return [point[0]+offset[0],point[1]+offset[1]];
 }
 function create(w,P,enabled,detail=false){
  const main=new Set(),food=new Set(),producer=new Set(),basal=new Set(),prey=new Set(),hosts=new Map(),extras=new Map(),anchors=new Map(),mainGroups=new Map();
  for(const o of w.organisms){(o.slot==='main'?main:o.slot==='producer'?producer:food).add(o.cell);if(o.slot==='main'){if(!mainGroups.has(o.cell))mainGroups.set(o.cell,[]);mainGroups.get(o.cell).push(o);}if(o.slot==='food')basal.add(o.cell);if(o.slot==='prey')prey.add(o.cell);hosts.set(o.id,o);if(o.infection){hosts.set(o.infection.id,o);if(o.infection.q)hosts.set(o.infection.q.id,o);}}
  for(const group of mainGroups.values())group.sort((a,b)=>String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0);
  for(const a of w.carcasses||[]){extras.set(a.id,a);if(a.payloadExpires>w.turn&&a.infection){extras.set(a.infection.id,a);if(a.infection.q)extras.set(a.infection.q.id,a);}}
  const searching=new Map((w.searchQ||[]).map(q=>[q.id,q]));
  function anchor(o,progress=1,move=null){
   if(!move&&anchors.has(o.id))return anchors.get(o.id);
   const overlap=main.has(o.cell)&&food.has(o.cell),layered=basal.has(o.cell)&&prey.has(o.cell),
     independent=producer.has(o.cell)&&(main.has(o.cell)||food.has(o.cell)),
     corner={main:[.19,.26],producer:[.79,.24],food:[.22,.84],prey:[.8,.84]}[o.slot]||[.5,.55],
     group=mainGroups.get(o.cell)||[],shared=o.slot==='main'&&group.length>1&&group.every(a=>a.species==='ryouki'&&a.ryouki?.mutated),
     count=shared?group.length:1,rank=shared?group.findIndex(a=>a.id===o.id):0,
     offset=shared?[[-.16,-.16],[.18,-.16],[.01,.21]][Math.min(2,rank)]:[0,0],
     ox=(independent?corner[0]:layered?(o.slot==='main'?.65:o.slot==='prey'?.18:.68):overlap?(o.slot==='main'?.67:.2):.5)+offset[0],
     oy=(independent?corner[1]:layered?(o.slot==='main'?.4:o.slot==='prey'?.72:.88):overlap?(o.slot==='main'?.44:.81):.55)+offset[1];
   let x=o.cell%w.config.width,y=Math.floor(o.cell/w.config.width);
   if(move?.from!==undefined){
    const route=o.species==='ryouki'&&Array.isArray(move.path)&&move.path.length&&Number.isInteger(move.to)?[move.from,...move.path]:[move.from,o.cell],
      t=Math.max(0,Math.min(1,progress))*(route.length-1),index=Math.min(route.length-2,Math.floor(t)),part=t-index,
      from=route[index],to=route[index+1],u=from%w.config.width,v=Math.floor(from/w.config.width);
    x=u+(to%w.config.width-u)*part;y=v+(Math.floor(to/w.config.width)-v)*part;
   }
   const ground=P.point(x+ox,y+oy),point=[ground[0],ground[1]-(enabled&&o.slot==='main'?LIFT:0)];
   const result={ground,point,depth:P.depth(x+ox,y+oy),elevated:!!enabled&&o.slot==='main',cohabit:count,rank,scale:count===3?.62:count===2?.72:1};if(!move)anchors.set(o.id,result);return result;
  }
  function entity(id){
   const host=hosts.get(id);if(host){const a={...anchor(host),point:[...anchor(host).point]};if(host.id!==id)a.point=parasitePoint(a.point,host.infection?.q?.id===id?'Q':'P',detail,a.rank,a.cohabit);return {...a,host,id,cell:host.cell};}
   const a=extras.get(id);if(a){
    const ground=P.point(a.cell%w.config.width+(a.slot==='food'?.22:a.slot==='prey'?.52:a.slot==='producer'?.72:.86),Math.floor(a.cell/w.config.width)+.86),point=[...ground];
    if(id!==a.id){point[0]+=a.infection?.q?.id===id?.23:.09;point[1]-=a.infection?.q?.id===id?.18:.12;}
    return {id,cell:a.cell,host:a,ground,point,elevated:false,carcass:true};
   }
   const q=searching.get(id);if(q){const p=P.point(q.cell%w.config.width+.5,Math.floor(q.cell/w.config.width)+.5);return {id,cell:q.cell,point:[p[0]+.24,p[1]-.25],ground:p,elevated:false};}
   return null;
  }
  let organismIndex,resourceIndex;
  function candidates(rect){
   if(!organismIndex){const moves=new Map((w.events||[]).filter(e=>e.type==='move').map(e=>[e.id,e]));organismIndex=spatial(w.organisms,o=>{const a=anchor(o),m=moves.get(o.id),points=[a];if(m){points.push(anchor(o,0,m));if(o.species==='ryouki'&&Number.isInteger(m.to)&&m.path?.length)for(let i=1;i<m.path.length;i++)points.push(anchor(o,i/m.path.length,m));}return [Math.min(...points.map(p=>p.point[0]))-1,Math.min(...points.map(p=>p.point[1]))-1,Math.max(...points.map(p=>p.point[0]))+1,Math.max(...points.map(p=>p.ground[1]))+1];});}
   return organismIndex(rect);
  }
  function resources(rect){resourceIndex ||= spatial(w.resources,o=>{const p=P.point(o.cell%w.config.width+.5,Math.floor(o.cell/w.config.width)+.5);return [p[0]-.6,p[1]-.6,p[0]+.6,p[1]+.6];});return resourceIndex(rect);}
  return {anchor,entity,main,food,producer,candidates,resources,enabled:!!enabled};
 }
 return {create,LIFT,parasitePoint,spatial};
});
