/* All ecology stays local, deterministic and independent of presentation time. */
'use strict';
importScripts('hash.js','catalogue.js','map-data.js','map-templates.js','landscape.js','state.js','nutrition.js','behavior.js','reproduction.js','parasites.js','engine.js','transport.js');
let world=null,encode=null,epoch=0,observeId=null;
onmessage=({data:d})=>{
  try {
    if(d.type==='init') {
      epoch=d.epoch;world=d.world;observeId=d.observeId;
      const start=performance.now(),cache=EcoState.prepareGeometry(world);
      encode=EcoTransport.encoder(world);
      postMessage({type:'ready',epoch,cache,prepareMs:performance.now()-start});
    } else if(d.type==='compute'&&d.epoch===epoch&&world) {
      for(let n=0;n<d.count&&world.turn<d.limit;n++) {
        const start=performance.now(),job=EcoEngine.beginTurn(world,{observeId}),patches=[],costs=[];
        for(let i=0;i<3;i++) {
          const t=performance.now(),r=job.advance(),patch=encode(job.display(),r.done);
          // postMessage below snapshots rows before the next phase mutates them.
          patches.push(structuredClone(patch));costs.push(performance.now()-t);
          if(r.done)world=r.world;
        }
        postMessage({type:'turn',epoch,turn:world.turn,patches,costs,computeMs:performance.now()-start});
        if(world.stopReason||world.turn>=d.limit)break;
      }
      postMessage({type:'idle',epoch});
    }
  } catch(e){postMessage({type:'error',epoch,message:e.message});}
};
