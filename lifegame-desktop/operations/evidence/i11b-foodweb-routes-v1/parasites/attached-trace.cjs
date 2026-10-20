"use strict";
const fs=require("node:fs"),path=require("node:path"),F=require("../../../../design/advantage-switches/model.cjs"),pre=require("./initial-v2-preflight.json"),results=[];
for(const c of pre.rows){const E=F.model({producer:true,waterbug:true,hyperparasite:true});let w=E.create(c.requested);const initial=E.S.HyperParasite.entries(w).filter(e=>e.p).map(e=>({q:e.q.id,p:e.p.id,h:e.host.id})),rows=[];
  for(let t=0;t<=15;t++){rows.push({turn:w.turn,subjects:initial.map(ids=>{const entry=E.S.HyperParasite.locate(w,ids.q),p=E.S.PrimaryParasite.locate(w,ids.p),h=w.organisms.find(o=>o.id===ids.h),corpse=w.carcasses.find(o=>o.id.startsWith("c:"+ids.h+":"));return {ids,q:entry?.q,p:p?.p,host:h?{id:h.id,cell:h.cell,HP:h.HP,E:h.E,age:h.age,phase:h.phase,infection:h.infection?.id}:null,corpse:corpse?{id:corpse.id,p:corpse.infection?.id,E:corpse.E,expires:corpse.expires}:null,events:(w.events||[]).filter(e=>e.id===ids.h||e.id===ids.p||e.id===ids.q||e.parasite===ids.p||e.parasite===ids.q||e.target===ids.h)};}),deathCauses:w.last?.deathCauses});if(t===15)break;w=E.step(w);const errors=E.invariants(w);if(errors.length)throw Error(errors.join("\n"));}
  results.push({id:c.id,initial,rows});
}
fs.writeFileSync(path.join(__dirname,"attached-trace.json"),JSON.stringify({scope:"15T sourceFactory survival/2 initial-attachedQ loss trace; no organism edits",results},null,2)+"\n");
