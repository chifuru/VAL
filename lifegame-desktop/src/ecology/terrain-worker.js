/* Fixed display terrain only; this worker never receives biological entities. */
'use strict';
importScripts('projection.js','habitat.js','scenery.js');
let scene=null,projection=null,epoch=0;
onmessage=({data:d})=>{try{
 if(d.type==='init'){
  epoch=d.epoch;globalThis.EcoArt={images:d.images,loaded:true};
  projection=EcoProjection.build(d.world);scene=EcoScenery.build(d.world,projection);
  const at=performance.now(),r=projection.bounds,u=24,c=new OffscreenCanvas(Math.ceil((r.maxX-r.minX)*u),Math.ceil((r.maxY-r.minY)*u)),g=c.getContext('2d');
  g.scale(u,u);g.translate(-r.minX,-r.minY);scene.surface(g,null,false,u);g.setTransform(1,0,0,1,0,0);
  const soft=new OffscreenCanvas(c.width,c.height),sg=soft.getContext('2d');sg.filter='blur(1.1px) saturate(.65) brightness(.72)';sg.drawImage(c,0,0);g.globalCompositeOperation='copy';g.drawImage(soft,0,0);
  const bitmap=c.transferToImageBitmap();postMessage({type:'overview',epoch,bitmap,bounds:r,unit:u,ms:performance.now()-at},[bitmap]);
 }else if(d.type==='render'&&d.epoch===epoch&&scene){
  const at=performance.now(),c=new OffscreenCanvas(Math.round(d.width*d.dpr),Math.round(d.height*d.dpr)),g=c.getContext('2d');
  g.scale(d.dpr,d.dpr);g.translate(d.x,d.y);g.scale(d.scale,d.scale);
  const visible=(p,margin=1)=>p[0]*d.scale+d.x>=-d.scale*margin&&p[1]*d.scale+d.y>=-d.scale*margin&&p[0]*d.scale+d.x<=d.width+d.scale*margin&&p[1]*d.scale+d.y<=d.height+d.scale*margin;
  scene.surface(g,visible,true,d.scale);
  const bitmap=c.transferToImageBitmap();postMessage({type:'surface',epoch,key:d.key,bitmap,rect:{x:d.x,y:d.y,width:d.width,height:d.height,scale:d.scale},metrics:scene.metrics,ms:performance.now()-at},[bitmap]);
 }
}catch(e){postMessage({type:'error',epoch,message:e.message});}};
