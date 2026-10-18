'use strict';
// Read existing transactions. No coefficients, organism states or return values are altered.
function observe(E,world){
 const S=E.S,restore=[],row={feeding:{},demand:{},leafGrowth:{},light:{}};
 const add=(bucket,s,key,value)=>{const a=row[bucket][s]??={};a[key]=S.round((a[key]||0)+(value||0));};
 function hook(object,key,wrapper){const old=object[key];object[key]=(...args)=>wrapper(old,...args);restore.push(()=>object[key]=old);}
 hook(E.N,'feed',(fn,w,c,...args)=>{
  const before=new Map(w.organisms.map(o=>[o.id,{E:o.E,HP:o.HP,M:o.M}]));
  fn(w,c,...args);
  const maps=S.maps(w);
  for(const o of w.organisms){const b=before.get(o.id);for(const key of ['E','M','HP'])add('feeding',o.species,'gain'+key,o[key]-b[key]);
   for(const event of c.events.get(o.id)||[])if(event.type==='feed'){
    add('feeding',o.species,'source/'+(event.sourceSpecies||event.tag),event.amount);
    add('feeding',o.species,'material/'+(event.sourceSpecies||event.tag),event.material);
   }
   add('light',o.species,'E',c.records.get(o.id).light);
   if(S.spec(o).group==='prey'){
    const reachable=S.nearby(w,o.cell).filter(cell=>{const t=maps.food.get(cell);return t&&S.spec(t).group==='plant'&&S.edibleB(t)>0&&S.oneStep(w,o.cell,cell);});
    add('feeding',o.species,'alive',1);add('feeding',o.species,'withAdjacentLeaves',reachable.length>0?1:0);
   }
  }
 });
 hook(E.N,'settle',(fn,w,c,...args)=>{for(const o of w.organisms){const cost=c.costs.get(o.id);add('demand',o.species,'base',cost.base);add('demand',o.species,'density',cost.density);}return fn(w,c,...args);});
 hook(E.N,'investAndDrops',(fn,w,c,...args)=>{const before=new Map(w.organisms.filter(o=>S.spec(o).group==='plant').map(o=>[o.id,o.B]));const result=fn(w,c,...args);for(const o of w.organisms)if(before.has(o.id))add('leafGrowth',o.species,'B',Math.max(0,o.B-before.get(o.id)));return result;});
 try{return {world:E.step(world),row};}finally{for(const undo of restore.reverse())undo();}
}
function stocks(E,w){
 const S=E.S,species={},habitats={land:{producer:0,producerB:0,edibleB:0,primary:0},water:{producer:0,producerB:0,edibleB:0,primary:0}};
 for(const o of w.organisms){const s=S.spec(o),a=species[o.species]??={n:0,E:0,B:0,M:0,edibleB:0};a.n++;for(const k of ['E','B','M'])a[k]+=o[k];a.edibleB+=S.edibleB(o);
  const h=habitats[['shallow','deep'].includes(w.tiles[o.cell].terrain)?'water':'land'];
  if(s.group==='plant'){h.producer++;h.producerB+=o.B;h.edibleB+=S.edibleB(o);}if(s.group==='prey')h.primary++;
 }
 return {species,habitats,soilM:w.tiles.reduce((n,t)=>n+t.soilM,0)};
}
function lowerOnly(E,initial){const w=structuredClone(initial);w.organisms=w.organisms.filter(o=>E.S.spec(o).group!=='main');for(const o of w.organisms)o.infection=null;w.searchQ=[];w.pending=[];w.messages=[];w.contactPairs=[];w.initialMain=0;w.config.enabled={...w.config.enabled,main:false,P:false,Q:false};const t=E.S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);return w;}
module.exports={observe,stocks,lowerOnly};
