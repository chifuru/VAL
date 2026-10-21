/* Fixed display terrain only; this worker never receives biological entities. */
'use strict';
importScripts('projection.js','habitat.js','scenery.js');
let scene=null,projection=null,epoch=0,previous=null;
onmessage=async({data:d})=>{try{
 if(d.type==='init'){
  epoch=d.epoch;previous=null;globalThis.EcoArt={images:d.images,loaded:true};
  projection=EcoProjection.build(d.world);scene=EcoScenery.build(d.world,projection);
  const at=performance.now(),r=projection.bounds,u=24,c=new OffscreenCanvas(Math.ceil((r.maxX-r.minX)*u),Math.ceil((r.maxY-r.minY)*u)),g=c.getContext('2d');
  g.scale(u,u);g.translate(-r.minX,-r.minY);scene.surface(g,null,false,u);g.setTransform(1,0,0,1,0,0);
  const soft=new OffscreenCanvas(c.width,c.height),sg=soft.getContext('2d');sg.filter='blur(1.1px) saturate(.65) brightness(.72)';sg.drawImage(c,0,0);g.globalCompositeOperation='copy';g.drawImage(soft,0,0);
  const bitmap=c.transferToImageBitmap();postMessage({type:'overview',epoch,bitmap,bounds:r,unit:u,ms:performance.now()-at},[bitmap]);
 }else if(d.type==='render'&&d.epoch===epoch&&scene){
  const at=performance.now(),c=new OffscreenCanvas(Math.round(d.width*d.dpr),Math.round(d.height*d.dpr)),g=c.getContext('2d');
  const prior=previous,offsetX=prior?(d.x-prior.x)*d.dpr:0,offsetY=prior?(d.y-prior.y)*d.dpr:0,
    dx=Math.round(offsetX),dy=Math.round(offsetY),reuse=prior&&prior.epoch===epoch&&prior.scale===d.scale&&prior.dpr===d.dpr&&prior.width===c.width&&prior.height===c.height&&
      Math.abs(offsetX-dx)<1e-6&&Math.abs(offsetY-dy)<1e-6&&Math.abs(dx)<c.width&&Math.abs(dy)<c.height;
  let reusedPixels=0,exposed=null;
  if(reuse){
    g.save();g.globalCompositeOperation='copy';g.drawImage(prior.canvas,dx,dy);g.restore();
    exposed=[];
    if(dx>0)exposed.push([0,0,dx,c.height]);else if(dx<0)exposed.push([c.width+dx,0,-dx,c.height]);
    if(dy>0)exposed.push([0,0,c.width,dy]);else if(dy<0)exposed.push([0,c.height+dy,c.width,-dy]);
    reusedPixels=(c.width-Math.abs(dx))*(c.height-Math.abs(dy));
    g.beginPath();for(const [x,y,w,h]of exposed)g.rect(x,y,w,h);g.clip();
  }
  g.scale(d.dpr,d.dpr);g.translate(d.x,d.y);g.scale(d.scale,d.scale);
  const visible=(p,margin=1)=>p[0]*d.scale+d.x>=-d.scale*margin&&p[1]*d.scale+d.y>=-d.scale*margin&&p[0]*d.scale+d.x<=d.width+d.scale*margin&&p[1]*d.scale+d.y<=d.height+d.scale*margin;
  if(!reuse||exposed.length){
    const newArea=(p,margin)=>visible(p,margin)&&exposed.some(([x,y,w,h])=>{
      const px=(p[0]*d.scale+d.x)*d.dpr,py=(p[1]*d.scale+d.y)*d.dpr,pad=d.scale*d.dpr*(margin+1);
      return px>=x-pad&&px<=x+w+pad&&py>=y-pad&&py<=y+h+pad;
    });
    scene.surface(g,reuse?newArea:visible,true,d.scale);
  }
  previous={epoch,canvas:c,x:d.x,y:d.y,width:c.width,height:c.height,scale:d.scale,dpr:d.dpr};
  const bitmap=await createImageBitmap(c);
  if(d.epoch!==epoch){bitmap.close();return;}
  postMessage({type:'surface',epoch,key:d.key,bitmap,rect:{x:d.x,y:d.y,width:d.width,height:d.height,scale:d.scale},metrics:scene.metrics,ms:performance.now()-at,reusedPixels},[bitmap]);
 }
}catch(e){postMessage({type:'error',epoch,message:e.message});}};
