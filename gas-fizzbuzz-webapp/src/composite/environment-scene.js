(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./food-scene'):root.FoodScene);if(typeof module==='object'&&module.exports)module.exports=api;else root.EnvironmentScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(F){
 'use strict';const keys=['tide','heat','signal','void'];
 function weightsFor(state){const plan=state.environmentPlan;if(!plan)return [0,0,1,0];const t=Math.max(0,Math.min(1,(state.points-20)/5));return plan.weights[0].map((v,i)=>v*(1-t)+plan.weights[1][i]*t);}
 function resources(g,w,h,state,time,events,config,images){
  const weights=F.resourceWeights(events,time,state.current);
  weights.forEach((weight,kind)=>{if(weight<.002)return;g.save();g.globalAlpha=weight*.45;
   // Keep the silhouette and the upper-left identity area clear. These are
   // resource habitats; only FoodScene draws the one consumed encounter.
   for(let i=0;i<9;i++){
    const variant=(i+state.seed)%4,x=w*(.15+((i*97+state.seed*13)%700)/1000),y=h*(.73+(i%3)*.055),phase=time*.001+i;
    if(kind===0||kind===1){
     const item=config.food[kind===0?'life':'mineral'],r=item.regions[variant],size=kind===0?16+(i%3)*5:24+variant*6,scale=size/Math.max(r[2],r[3]);
     g.save();g.translate(x+(kind===0?Math.sin(phase*.7)*12:0),y-(kind===0?30+Math.cos(phase)*10:0));if(kind===0)g.rotate(Math.sin(phase)*.14);
     g.drawImage(images.get(item.file),...r,-r[2]*scale/2,-r[3]*scale,r[2]*scale,r[3]*scale);g.restore();
    }
    else if(kind===2){g.strokeStyle='#b1a9e8';g.lineWidth=.7;g.beginPath();g.moveTo(x-18,y-40);g.bezierCurveTo(x-4,y-55+Math.sin(phase)*8,x+4,y-18,x+22,y-37);g.stroke();g.fillStyle='#d5c7f2';g.beginPath();g.arc(x+Math.sin(phase)*15,y-38,1.5,0,Math.PI*2);g.fill();}
    else F.seed(g,x+Math.sin(phase*.6)*7,y-24+Math.cos(phase*.8)*8,3+variant,variant,.7);
   }g.restore();
  });
  return weights;
 }
 function draw(g,w,h,state,config,images,time,still,events=[]){
  const weights=weightsFor(state);g.fillStyle='#060c18';g.fillRect(0,0,w,h);let total=0;
  weights.forEach((weight,i)=>{if(!weight)return;const im=images.get(config.environments[keys[i]].file);total+=weight;g.save();g.globalAlpha=weight/total;const scale=Math.max(w/im.width,h/im.height);g.drawImage(im,(w-im.width*scale)/2,(h-im.height*scale)/2,im.width*scale,im.height*scale);g.restore();});
  const shade=g.createLinearGradient(0,0,w,h);shade.addColorStop(0,'rgba(3,9,21,.88)');shade.addColorStop(.5,'rgba(3,9,21,.28)');shade.addColorStop(1,'rgba(3,9,21,.16)');g.fillStyle=shade;g.fillRect(0,0,w,h);
  if(!still){g.save();g.fillStyle='rgba(175,216,255,.18)';for(let i=0;i<20;i++){const x=(i*139+state.seed*11+time*.003*(i%3+1))%w,y=(i*79+time*.004)%h;g.fillRect(x,y,i%4?1:2,i%4?1:2);}g.restore();resources(g,w,h,state,time,events,config,images);}
 }
 return {weightsFor,resources,draw};
});
