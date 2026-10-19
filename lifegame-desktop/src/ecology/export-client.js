/* Bounded export messages yield between batches; rows remain complete and ordered. */
(function(root){'use strict';
  const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));
  async function run(format,input,{workerFactory=()=>new Worker('ecology/export-worker.js')}={}){
    const rows=format==='csv'?input.rows:input.observation?.rows||[],length=rows.length;
    const metadata=format==='csv'?input.metadata:null,header=format==='json'?{...input,...(input.observation?{observation:{...input.observation,rows:undefined}}:{})}:null;
    let worker;
    try{worker=workerFactory();}catch{
      const parts=[];
      if(format==='json'){
        // The fallback also stringifies each row separately, rather than the entire history.
        if(header.observation){const {observation,...rest}=header;parts.push(JSON.stringify(rest).slice(0,-1)+',"observation":'+JSON.stringify(observation).slice(0,-1)+',"rows":[');}
        else parts.push(JSON.stringify(header));
        for(let i=0;i<length;i++){parts.push((i?',':'')+JSON.stringify(rows[i]));if(i%8===7)await yieldUI();}
        if(header.observation)parts.push(']}}');
      }else {
        const h=root.EcoObservations.create(metadata.config,metadata.version,{species:metadata.species});
        for(let i=0;i<length;i+=8){h.rows.push(...rows.slice(i,Math.min(length,i+8)));parts.push(...h.csvChunks(8,{header:i===0}));h.rows.length=0;await yieldUI();}
        if(!length)parts.push(...h.csvChunks());
      }
      return new Blob(parts,{type:format==='csv'?'text/csv;charset=utf-8':'application/json'});
    }
    const send=d=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('書き出し処理が応答しませんでした。再試行できます。')),60000);
      worker.onmessage=({data:r})=>{clearTimeout(timer);r.type==='error'?reject(Error(r.message)):resolve(r);};worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message||'書き出し処理を起動できませんでした。'));};worker.postMessage(d);
    });
    try{
      await send({type:'begin',format,metadata,header});
      for(let i=0;i<length;i+=8){await send({type:'rows',rows:rows.slice(i,Math.min(length,i+8))});await yieldUI();}
      const result=await send({type:'finish'});if(result.type!=='complete')throw Error('書き出しが完了しませんでした。');return result.blob;
    }finally{worker.terminate();}
  }
  root.EcoExport={csv:(history,options)=>run('csv',history,options),json:(record,options)=>run('json',record,options)};
})(globalThis);
