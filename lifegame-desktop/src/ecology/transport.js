/* Bounded Worker wire format. Immutable terrain/config never cross per frame. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoTransport=api;})(globalThis,()=>{
  'use strict';
  const lists=['organisms','resources','carcasses','messages','pending'];
  const key=(name,row)=>name==='resources'?row.cell+':'+row.kind:name==='messages'?String(row.cell):row.id;
  function fields(row){
    const values={},objects={};for(const k of Object.keys(row)){const v=row[k],nested=v!==null&&typeof v==='object';objects[k]=nested;values[k]=nested?JSON.stringify(v):v;}return {values,objects};
  }
  function encoder(initial){
    const signatures=new Map(lists.map(name=>[name,new Map(initial[name].map(row=>[key(name,row),fields(row)]))]));
    let soil=initial.tiles.map(t=>t.soilM);
    const orders=new Map(lists.map(name=>[name,initial[name].map(row=>key(name,row))]));
    return function encode(w,final=false){
      const patch={lists:{},soil:[],events:w.events};
      for(const name of lists){
        const old=signatures.get(name),next=new Map(),changed=[],updates=[],order=[];
        for(const row of w[name]){
          const id=key(name,row),sig=fields(row),before=old.get(id);order.push(id);next.set(id,sig);
          if(!before){changed.push(row);continue;}
          const values={},removed=[];let count=0;
          for(const k of Object.keys(sig.values))if(!Object.hasOwn(before.values,k)||sig.objects[k]!==before.objects[k]||!Object.is(sig.values[k],before.values[k])){values[k]=row[k];count++;}
          for(const k of Object.keys(before.values))if(!Object.hasOwn(sig.values,k))removed.push(k);
          if(count||removed.length)updates.push({id,values,removed});
        }
        const prev=orders.get(name),same=prev.length===order.length&&order.every((id,i)=>id===prev[i]);
        patch.lists[name]={changed,updates,order:same?null:order};orders.set(name,order);signatures.set(name,next);
      }
      w.tiles.forEach((t,i)=>{if(t.soilM!==soil[i])patch.soil.push([i,t.soilM]);});
      soil=w.tiles.map(t=>t.soilM);
      if(final){patch.meta={};for(const k of Object.keys(w))if(!lists.includes(k)&&!['config','tiles','events'].includes(k))patch.meta[k]=w[k];}
      else patch.meta={turn:w.turn,diagnostics:null};
      return patch;
    };
  }
  function update(row,delta){if(!row)throw Error('WIRE_MISSING:'+delta.id);const next={...row,...delta.values};for(const k of delta.removed)delete next[k];return next;}
  function apply(base,patch){
    const w={...base,...patch.meta,events:patch.events};
    for(const name of lists){
      const {changed,order,updates=[]}=patch.lists[name];
      if(order===null){
        if(!changed.length&&!updates.length){w[name]=base[name];continue;}
        let at=0,full=0;w[name]=base[name].map(row=>{
          const id=key(name,row);
          if(full<changed.length&&id===key(name,changed[full]))return changed[full++];
          return at<updates.length&&id===updates[at].id?update(row,updates[at++]):row;
        });
        if(at!==updates.length||full!==changed.length)throw Error('WIRE_ORDER_MISMATCH:'+name);
      }else{
        const rows=new Map(base[name].map(row=>[key(name,row),row]));
        for(const row of changed)rows.set(key(name,row),row);
        for(const delta of updates)rows.set(delta.id,update(rows.get(delta.id),delta));
        w[name]=order.map(id=>{if(!rows.has(id))throw Error('WIRE_MISSING:'+id);return rows.get(id);});
      }
    }
    w.tiles=patch.soil.length?base.tiles.slice():base.tiles;
    for(const [cell,soilM] of patch.soil)w.tiles[cell]={...w.tiles[cell],soilM};
    return w;
  }
  return {encoder,apply};
});
