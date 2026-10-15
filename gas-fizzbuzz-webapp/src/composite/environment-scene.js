(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./food-scene'):root.FoodScene);if(typeof module==='object'&&module.exports)module.exports=api;else root.EnvironmentScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(F){
 'use strict';const keys=['tide','heat','signal','void'],clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const noise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
 function weightsFor(state){const plan=state.environmentPlan;if(!plan)return [0,0,1,0];const t=clamp((state.points-20)/5);return plan.weights[0].map((v,i)=>v*(1-t)+plan.weights[1][i]*t);}
 function levelsFor(state){const maxima=[267,134,66,533];return ['fizz','buzz','fizzbuzz','number'].map((kind,i)=>clamp(Math.log1p(Math.max(0,state.foods?.[kind]||0))/Math.log1p(maxima[i])));}
 function bedPlan(state){
  const sites=[[[.055,.95,.18],[.235,1.025,.23]],[[.82,.96,.18],[.99,1.045,.24]],[[.98,.87,.15],[.75,1.025,.20]],[[.04,.85,.18],[.48,1.12,.25]]];
  return sites.flatMap((group,kind)=>group.map(([x,y,size],i)=>({kind,x:x+(noise(state.seed+kind*17+i)-.5)*.025,y,size,threshold:i?.36:0,mirror:(state.seed+kind+i)%2===0,depth:i?'near':'mid'})));
 }
 function glow(g,x,y,r,color,alpha){const light=g.createRadialGradient(x,y,0,x,y,r);light.addColorStop(0,'rgba('+color+','+alpha+')');light.addColorStop(1,'rgba('+color+',0)');g.fillStyle=light;g.fillRect(x-r,y-r,r*2,r*2);}
 function weather(g,w,h,state,time,weights){
  g.save();
  for(let kind=0;kind<4;kind++){if(weights[kind]<.01)continue;g.globalAlpha=weights[kind]*.28;
   for(let i=0;i<16;i++){const n=state.seed+kind*101+i*7,x=w*(noise(n)*.32+(i%2?.67:0)),y=(noise(n+1)*h-time*(kind===1?.012:.003)*(1+i%3)+h*100)%h;
    if(kind===0){g.strokeStyle='#73b7d2';g.lineWidth=.65;g.beginPath();g.arc(x,y,1.4+i%3,0,Math.PI*2);g.stroke();}
    else if(kind===1){g.fillStyle=i%3?'#df9b66':'#ffc88a';g.fillRect(x,y,i%3?1:2,2+i%3);}
    else if(kind===2){g.strokeStyle='#9784c5';g.lineWidth=.6;g.beginPath();g.moveTo(x,y);g.lineTo(x+3,y-8);g.lineTo(x+8,y-10);g.stroke();}
    else{g.fillStyle='#a8bfd6';g.beginPath();g.arc(x,y,i%4?.7:1.7,0,Math.PI*2);g.fill();}
   }
  }g.restore();
 }
 function resources(g,w,h,state,time,config,images){
  const levels=levelsFor(state),growth=config.environments.growth,im=images.get(growth.file);
  // Beds occupy the edges and lower terrain; the central animal remains clear.
  for(const bed of bedPlan(state)){const level=levels[bed.kind],emerge=smooth((level-bed.threshold)*3);if(!emerge)continue;
   const mature=smooth((level-.28)/.65),width=w*bed.size*(.40+.60*level),x=w*bed.x,y=h*bed.y;
   g.save();g.translate(x,y);if(bed.mirror)g.scale(-1,1);g.globalAlpha=emerge*(bed.depth==='near'?.88:.53);
   for(const [row,alpha]of [[0,1-mature],[1,mature]]){if(alpha<=0)continue;const r=growth.regions[row*4+bed.kind],height=width*r[3]/r[2];g.save();g.globalAlpha*=alpha;g.drawImage(im,...r,-width*.5,-height,width,height);g.restore();}g.restore();
  }
  // Distinct, fixed spatial fields avoid stacking all resources at the same point.
  g.save();
  if(levels[1]){g.strokeStyle='rgba(213,168,103,'+(.30*levels[1])+')';g.lineWidth=1.1;for(let i=0;i<13;i++){const x=w*(.1+noise(state.seed+i*17)*.8),y=h*(.89+noise(i+7)*.09);g.beginPath();g.moveTo(x-20,y+6);g.lineTo(x,y);g.lineTo(x+14,y-3);g.lineTo(x+30,y+2);g.moveTo(x,y);g.lineTo(x+4,y+12);g.stroke();}}
  for(let i=0;i<12;i++){const emerge=smooth((levels[0]-i/14)*4);if(!emerge)continue;const n=state.seed+i*11,phase=time*.001*(.45+noise(n)*.4)+noise(n+5)*6.28,left=i%2===0;
   const x=w*((left?.13:.82)+Math.sin(phase)*(.045+noise(n)*.025)),y=h*(.48+noise(n+2)*.27)+Math.sin(phase*1.3+i)*5,size=(11+noise(n+3)*19)*(.75+.25*levels[0]),item=config.food.life,r=item.regions[(i+state.seed)%4],scale=size/Math.max(r[2],r[3]);
   g.save();g.globalAlpha=emerge*(.38+.40*levels[0]);g.translate(x,y);g.scale(Math.cos(phase)>0?-1:1,1);g.rotate(Math.sin(phase*2)*.10);g.drawImage(images.get(item.file),...r,-r[2]*scale/2,-r[3]*scale/2,r[2]*scale,r[3]*scale);g.restore();
  }
  if(levels[2])for(let i=0;i<9;i++){const n=state.seed+i*19,left=i%2===0,x=w*((left?.08:.80)+noise(n)*.10),y=h*(.42+noise(n+1)*.42),phase=time*.0007+i;g.globalAlpha=levels[2]*(.25+.12*Math.sin(phase));g.strokeStyle='#b6a0ed';g.lineWidth=.8;g.beginPath();g.moveTo(x,y+18);g.bezierCurveTo(x-15,y-5,x+18,y-8,x+7,y-32);g.moveTo(x+3,y-8);g.lineTo(x+20,y-20);g.stroke();glow(g,x+7,y-32,9,'172,155,245',.45);}
  if(levels[3]){g.globalAlpha=levels[3];for(let i=0;i<18;i++){const n=state.seed+i*23,x=w*noise(n),y=h*(.70+noise(n+2)*.28),phase=time*.00025+i;F.seed(g,x+Math.sin(phase)*5,y+Math.cos(phase)*3,1.5+noise(n+3)*2.5,i%4,.38);}glow(g,w*.20,h*.91,w*.24,'82,136,160',.12*levels[3]);glow(g,w*.83,h*.86,w*.25,'98,103,151',.11*levels[3]);}
  g.restore();return levels;
 }
 function draw(g,w,h,state,config,images,time,still){
  const weights=weightsFor(state),clock=still?0:time;g.fillStyle='#060c18';g.fillRect(0,0,w,h);let total=0;
  weights.forEach((weight,i)=>{if(!weight)return;const im=images.get(config.environments[keys[i]].file);total+=weight;g.save();g.globalAlpha=weight/total;const scale=Math.max(w/im.width,h/im.height);g.drawImage(im,(w-im.width*scale)/2,(h-im.height*scale)/2,im.width*scale,im.height*scale);g.restore();});
  const shade=g.createLinearGradient(0,0,w,h);shade.addColorStop(0,'rgba(3,9,21,.88)');shade.addColorStop(.5,'rgba(3,9,21,.22)');shade.addColorStop(1,'rgba(3,9,21,.08)');g.fillStyle=shade;g.fillRect(0,0,w,h);
  if(!still)weather(g,w,h,state,clock,weights);resources(g,w,h,state,clock,config,images);
  const vignette=g.createRadialGradient(w*.57,h*.48,w*.15,w*.57,h*.48,w*.70);vignette.addColorStop(0,'rgba(2,7,17,0)');vignette.addColorStop(1,'rgba(2,7,17,.38)');g.fillStyle=vignette;g.fillRect(0,0,w,h);
 }
 return {weightsFor,levelsFor,bedPlan,resources,draw};
});
