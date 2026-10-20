/* All ecology stays local, deterministic and independent of presentation time. */
'use strict';
importScripts('hash.js','map-data.js','map-templates.js','landscape.js','observation-modules.js','observation-model.js','transport.js');
let world=null,encode=null,epoch=0,observeId=null,engine=null,stream=false;
onmessage=({data:d})=>{
  try {
    if(d.type==='init') {
      epoch=d.epoch;world=d.world;observeId=d.observeId;stream=d.stream===true;
      if(world.config.advantageSettings)engine=EcoObservationModel.model(world.config.advantageSettings);
      else {
        if(!globalThis.EcoEngine)importScripts('catalogue.js','state.js','nutrition.js','behavior.js','reproduction.js','parasites.js','engine.js');
        engine=globalThis.EcoEngine;
      }
      const start=performance.now(),cache=engine.S.prepareGeometry(world);
      encode=EcoTransport.encoder(world);
      postMessage({type:'ready',epoch,cache,prepareMs:performance.now()-start});
    } else if(d.type==='compute'&&d.epoch===epoch&&world) {
      if(!Number.isSafeInteger(d.count)||d.count<=0)throw Error('計算要求の件数が不正です');
      const count=Math.min(d.count,6);
      for(let n=0;n<count&&world.turn<d.limit;n++) {
        const start=performance.now(),job=engine.beginTurn(world,{observeId}),patches=[],costs=[];
        for(let i=0;i<3;i++) {
          const t=performance.now(),r=job.advance(),patch=encode(job.display(),r.done);
          // postMessage below snapshots rows before the next phase mutates them.
          if(stream)postMessage({type:'phase',epoch,turn:job.display().turn,phase:i,patch});
          else patches.push(structuredClone(patch));
          costs.push(performance.now()-t);
          if(r.done)world=r.world;
        }
        postMessage({type:'turn',epoch,turn:world.turn,patches:stream?null:patches,costs,computeMs:performance.now()-start});
        if(world.stopReason||world.turn>=d.limit)break;
      }
      postMessage({type:'idle',epoch});
    }
  } catch(e){postMessage({type:'error',epoch,message:e.message});}
};
