(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EnvironmentScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';const keys=['tide','heat','signal','void'];
 function weightsFor(state){const plan=state.environmentPlan;if(!plan)return [0,0,1,0];const t=Math.max(0,Math.min(1,(state.points-20)/5));return plan.weights[0].map((v,i)=>v*(1-t)+plan.weights[1][i]*t);}
 function draw(g,w,h,state,config,images,time,still){
  const weights=weightsFor(state);g.fillStyle='#060c18';g.fillRect(0,0,w,h);let total=0;
  weights.forEach((weight,i)=>{if(!weight)return;const im=images.get(config.environments[keys[i]].file);total+=weight;g.save();g.globalAlpha=weight/total;const scale=Math.max(w/im.width,h/im.height);g.drawImage(im,(w-im.width*scale)/2,(h-im.height*scale)/2,im.width*scale,im.height*scale);g.restore();});
  // A quiet upper left keeps the existing identity and status text legible.
  const shade=g.createLinearGradient(0,0,w,h);shade.addColorStop(0,'rgba(3,9,21,.88)');shade.addColorStop(.5,'rgba(3,9,21,.28)');shade.addColorStop(1,'rgba(3,9,21,.16)');g.fillStyle=shade;g.fillRect(0,0,w,h);
  if(!still){g.save();g.fillStyle='rgba(175,216,255,.18)';for(let i=0;i<20;i++){const x=(i*139+state.seed*11+time*.003*(i%3+1))%w,y=(i*79+time*.004)%h;g.fillRect(x,y,i%4?1:2,i%4?1:2);}g.restore();}
 }
 return {weightsFor,draw};
});
