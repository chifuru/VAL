/* Export receives immutable aggregates in bounded batches, never biological worlds. */
'use strict';
importScripts('current-observations.js','observations.js');
let format,parts=[],history,first=true,hasObservation=false,current=false;
onmessage=({data:d})=>{try{
  if(d.type==='begin'){
    format=d.format;parts=[];first=true;
    if(format==='csv'){current=d.metadata.config.currentStateModel==='current-state/1';history=current?null:EcoObservations.create(d.metadata.config,d.metadata.version,{species:d.metadata.species});}
    else {
      const {observation,...header}=d.header;hasObservation=!!observation;
      if(hasObservation)parts.push(JSON.stringify(header).slice(0,-1)+(Object.keys(header).length?',':'')+'"observation":'+JSON.stringify(observation).slice(0,-1)+(Object.keys(observation).length?',':'')+'"rows":[');
      else parts.push(JSON.stringify(header));
    }
    postMessage({type:'ready'});
  }else if(d.type==='rows'){
    if(format==='csv'&&current){parts.push(...EcoCurrentObservations.csvRows(d.rows,{header:first}));
    }else if(format==='csv'){
      history.rows.push(...d.rows);
      for(const part of history.csvChunks(8,{header:first}))parts.push(part);
      history.rows.length=0;
    }else for(const row of d.rows){parts.push((first?'':',')+JSON.stringify(row));first=false;}
    if(format==='csv')first=false;
    postMessage({type:'ack'});
  }else if(d.type==='finish'){
    if(format==='csv'&&first)parts.push(...(current?EcoCurrentObservations.csvRows([]):history.csvChunks()));
    if(format==='json'&&hasObservation)parts.push(']}}');
    const blob=new Blob(parts,{type:format==='csv'?'text/csv;charset=utf-8':'application/json'});parts=[];history=null;postMessage({type:'complete',blob});
  }
}catch(e){parts=[];history=null;postMessage({type:'error',message:e.message});}};
