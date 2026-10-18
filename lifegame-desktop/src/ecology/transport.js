/* Bounded Worker wire format. Immutable terrain/config never cross per frame. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoTransport=api;})(globalThis,()=>{
  'use strict';
  const lists=['organisms','resources','carcasses','messages','pending'];
  const key=(name,row)=>name==='resources'?row.cell+':'+row.kind:name==='messages'?String(row.cell):row.id;
  function encoder(initial){
    const signatures=new Map(lists.map(name=>[name,new Map(initial[name].map(row=>[key(name,row),JSON.stringify(row)]))]));
    let soil=initial.tiles.map(t=>t.soilM);
    return function encode(w,final=false){
      const patch={lists:{},soil:[],events:w.events};
      for(const name of lists){
        const old=signatures.get(name),next=new Map(),changed=[],order=[];
        for(const row of w[name]){const id=key(name,row),sig=JSON.stringify(row);order.push(id);next.set(id,sig);if(old.get(id)!==sig)changed.push(row);}
        patch.lists[name]={changed,order};signatures.set(name,next);
      }
      w.tiles.forEach((t,i)=>{if(t.soilM!==soil[i])patch.soil.push([i,t.soilM]);});
      soil=w.tiles.map(t=>t.soilM);
      if(final){
        patch.meta={};
        for(const k of Object.keys(w))if(!lists.includes(k)&&!['config','tiles','events'].includes(k))patch.meta[k]=w[k];
      } else patch.meta={turn:w.turn,diagnostics:null};
      return patch;
    };
  }
  function apply(base,patch){
    const w={...base,...patch.meta,events:patch.events};
    for(const name of lists){
      const rows=new Map(base[name].map(row=>[key(name,row),row]));
      for(const row of patch.lists[name].changed)rows.set(key(name,row),row);
      w[name]=patch.lists[name].order.map(id=>{if(!rows.has(id))throw Error('WIRE_MISSING:'+id);return rows.get(id);});
    }
    w.tiles=base.tiles.slice();
    for(const [cell,soilM] of patch.soil)w.tiles[cell]={...w.tiles[cell],soilM};
    return w;
  }
  return {encoder,apply};
});
