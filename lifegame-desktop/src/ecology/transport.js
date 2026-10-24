/* Bounded Worker wire format. Immutable terrain/config never cross per frame. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoTransport=api;})(globalThis,()=>{
  'use strict';
  const baseLists=['organisms','resources','carcasses','messages','pending'];
  const key=(name,row)=>name==='resources'?row.cell+':'+row.kind:name==='messages'?String(row.cell):name==='informationField'?(row.originId!==undefined?row.cell+':'+row.originId:JSON.stringify([row.cell,row.scope,row.roles,row.sourceSpecies,row.peerSpecies,row.meaning,row.evidence,row.sign,row.expires])):row.id;
  const copy=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(copy):Object.fromEntries(Object.keys(v).map(k=>[k,copy(v[k])]))):v;
  function same(a,b){if(Object.is(a,b))return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));}
  function encoder(initial){
    const primaryLists=initial.config?.primaryParasiteModel==='primary/1'?[...baseLists,'primaryInocula']:baseLists;
    const hyperLists=initial.config?.hyperParasiteModel==='hyper/1'?[...primaryLists,'searchQ','hyperInocula']:primaryLists;
    const lists=initial.config?.informationModel==='persistent/1'?[...hyperLists,'informationField']:hyperLists;
    const current=initial.config?.currentStateModel==='current-state/1',objectNames=current?['cellState','currentInfections','currentActivity']:[],objectBases=Object.fromEntries(objectNames.map(k=>[k,copy(initial[k])]));
    const fixed=new Set(['config','tiles','events',...objectNames,...(initial.config?.cellModel==='cell-reorganization/1'?['cellProfiles']:[])]);
    const signatures=new Map(lists.map(name=>[name,new Map(initial[name].map(row=>[key(name,row),{values:copy(row),stamp:0}]))]));
    const soil=Float64Array.from(initial.tiles,t=>t.soilM),orders=new Map(lists.map(name=>[name,initial[name].map(row=>key(name,row))]));let stamp=0;
    return function encode(w,final=false){
      stamp++;const patch={lists:{},soil:[],events:w.events};
      for(const name of lists){const rows=signatures.get(name),changed=[],updates=[],order=[],prev=orders.get(name);let ordered=prev.length===w[name].length;
        for(const row of w[name]){const id=key(name,row);if(prev[order.length]!==id)ordered=false;order.push(id);let before=rows.get(id);
          if(!before){changed.push(row);rows.set(id,{values:copy(row),stamp});continue;}
          before.stamp=stamp;const values={},removed=[];let count=0;
          for(const k of Object.keys(row))if(!Object.hasOwn(before.values,k)||!same(before.values[k],row[k])){values[k]=row[k];before.values[k]=copy(row[k]);count++;}
          for(const k of Object.keys(before.values))if(!Object.hasOwn(row,k)){removed.push(k);delete before.values[k];}
          if(count||removed.length)updates.push({id,values,removed});
        }
        for(const [id,row]of rows)if(row.stamp!==stamp)rows.delete(id);
        patch.lists[name]={changed,updates,order:ordered?null:order};if(!ordered)orders.set(name,order);
      }
      for(let i=0;i<w.tiles.length;i++)if(w.tiles[i].soilM!==soil[i]){soil[i]=w.tiles[i].soilM;patch.soil.push([i,soil[i]]);}
      if(current)patch.current=objectPatch(w,objectNames,objectBases);
      if(final){patch.meta={};for(const k of Object.keys(w))if(!lists.includes(k)&&!fixed.has(k))patch.meta[k]=w[k];}
      else patch.meta={turn:w.turn,diagnostics:null};return patch;
    };
  }
  function objectPatch(w,names,bases){
    const out={};for(const name of names){const before=bases[name],next=w[name],values={},vectors={},removed=[];
      for(const key of Object.keys(next))if(!same(before[key],next[key])){
        const a=before[key],b=next[key];if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every(n=>n===null||typeof n==='number')&&b.every(n=>n===null||typeof n==='number')){
          const changes=[];for(let i=0;i<b.length;i++)if(!Object.is(a[i],b[i])){changes.push([i,b[i]]);a[i]=b[i];}vectors[key]={length:b.length,changes};
        }else{values[key]=b;before[key]=copy(b);}
      }
      for(const key of Object.keys(before))if(!Object.hasOwn(next,key)){removed.push(key);delete before[key];}
      if(Object.keys(values).length||Object.keys(vectors).length||removed.length)out[name]={values,vectors,removed};
    }return out;
  }
  const indexes=new WeakMap();
  function index(name,rows){let m=indexes.get(rows);if(!m){m=new Map();for(let i=0;i<rows.length;i++)m.set(key(name,rows[i]),i);indexes.set(rows,m);}return m;}
  function update(row,delta){if(!row)throw Error('WIRE_MISSING:'+delta.id);const next={...row,...delta.values};for(const k of delta.removed)delete next[k];return next;}
  function apply(base,patch){
    const w={...base,...patch.meta,events:patch.events};
    for(const name of Object.keys(patch.lists)){
      const {changed,order,updates=[]}=patch.lists[name];
      if(order===null){
        if(!changed.length&&!updates.length){w[name]=base[name];continue;}
        const at=index(name,base[name]);w[name]=base[name].slice();
        for(const row of changed){const i=at.get(key(name,row));if(i===undefined)throw Error('WIRE_ORDER_MISMATCH:'+name);w[name][i]=row;}
        for(const delta of updates){const i=at.get(delta.id);if(i===undefined)throw Error('WIRE_ORDER_MISMATCH:'+name);w[name][i]=update(base[name][i],delta);}
        indexes.set(w[name],at);
      }else{
        const rows=new Map(base[name].map(row=>[key(name,row),row]));
        for(const row of changed)rows.set(key(name,row),row);
        for(const delta of updates)rows.set(delta.id,update(rows.get(delta.id),delta));
        w[name]=order.map(id=>{if(!rows.has(id))throw Error('WIRE_MISSING:'+id);return rows.get(id);});
      }
    }
    for(const [name,delta]of Object.entries(patch.current??{})){
      if(!['cellState','currentInfections','currentActivity'].includes(name)||!base[name])throw Error('WIRE_CURRENT_OBJECT:'+name);
      const next={...base[name],...delta.values};for(const key of delta.removed)delete next[key];
      for(const [key,v]of Object.entries(delta.vectors)){if(!Array.isArray(base[name][key])||base[name][key].length!==v.length)throw Error('WIRE_CURRENT_VECTOR:'+key);const array=base[name][key].slice(),seen=new Set();
        for(const [i,value]of v.changes){if(!Number.isSafeInteger(i)||i<0||i>=array.length||seen.has(i)||value!==null&&!Number.isFinite(value))throw Error('WIRE_CURRENT_INDEX:'+key);seen.add(i);array[i]=value;}next[key]=array;
      }w[name]=next;
    }
    w.tiles=patch.soil.length?base.tiles.slice():base.tiles;
    for(const [cell,soilM] of patch.soil)w.tiles[cell]={...w.tiles[cell],soilM};
    return w;
  }
  return {encoder,apply};
});
