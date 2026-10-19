/* Fixed display terrain only; this worker never receives biological entities. */
'use strict';
importScripts('projection.js','habitat.js','scenery.js');
let scene=null,epoch=0;
onmessage=({data:d})=>{try{
 if(d.type==='init'){
  epoch=d.epoch;globalThis.EcoArt={images:d.images,loaded:true};
  scene=EcoScenery.build(d.world,EcoProjection.build(d.world));
 }else if(d.type==='render'&&d.epoch===epoch&&scene){
  const at=performance.now(),c=new OffscreenCanvas(Math.round(d.width*d.dpr),Math.round(d.height*d.dpr)),g=c.getContext('2d');
  g.scale(d.dpr,d.dpr);g.translate(d.x,d.y);g.scale(d.scale,d.scale);
  const visible=(p,margin=1)=>p[0]*d.scale+d.x>=-d.scale*margin&&p[1]*d.scale+d.y>=-d.scale*margin&&p[0]*d.scale+d.x<=d.width+d.scale*margin&&p[1]*d.scale+d.y<=d.height+d.scale*margin;
  scene.surface(g,visible,true,d.scale);
  const bitmap=c.transferToImageBitmap();postMessage({type:'surface',epoch,key:d.key,bitmap,metrics:scene.metrics,ms:performance.now()-at},[bitmap]);
 }
}catch(e){postMessage({type:'error',epoch,message:e.message});}};
