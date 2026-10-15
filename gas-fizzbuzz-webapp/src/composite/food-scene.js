/* Count milestones trigger gestures. Rendering never changes nutrition. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FoodScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const kinds=['fizz','buzz','fizzbuzz'],quotas=Object.freeze({fizz:4,buzz:2,fizzbuzz:1}),durations=Object.freeze({fizz:900,buzz:1100,fizzbuzz:1400});
 const colors={fizz:[109,223,202],buzz:[245,194,115],fizzbuzz:[176,164,255]};
 function milestone(kind,count){return Object.hasOwn(quotas,kind)&&Number.isInteger(count)&&count>=1&&(count-1)%quotas[kind]===0;}
 function active(events,time,sequence){
  const latest=new Map();
  for(const e of events){
   if(!milestone(e.kind,e.count)||!Number.isInteger(e.sequence)||e.sequence<1||e.sequence>sequence||!Number.isFinite(e.time))continue;
   const duration=durations[e.kind];if(time<e.time||time-e.time>=duration)continue;
   const old=latest.get(e.kind);if(old&&(old.time>e.time||old.sequence>=e.sequence))continue;
   latest.set(e.kind,{...e,duration});
  }
  return kinds.filter(kind=>latest.has(kind)).map(kind=>latest.get(kind));
 }
 function advanceEvents(events,previous,next,time){
  if(previous.seed!==next.seed)return [];
  const retained=active(events,time,next.current),kind=next.lastMeal?.kind,count=next.foods[kind];
  if(next.current!==previous.current+1||!milestone(kind,count)||count!==previous.foods[kind]+1)return retained;
  if(retained.some(e=>e.kind===kind&&e.count>=count))return retained;
  return active([...retained.filter(e=>e.kind!==kind),{kind,count,sequence:next.current,time,duration:durations[kind]}],time,next.current);
 }
 function reactions(events,time,sequence){
  return active(events,time,sequence).map(e=>{
   const progress=(time-e.time)/e.duration,envelope=Math.sin(progress*Math.PI)**2;
   const strength=e.kind==='fizzbuzz'?envelope:envelope*Math.sin(progress*Math.PI*2)**2;
   return {...e,progress,strength,color:colors[e.kind]};
  });
 }
 function profileFor(bodyPlan,kind){
  if(kind==='buzz')return {mode:'ground-glow',site:'ground'};
  if(kind==='fizzbuzz'){const dorsal=['aquatic','whale','serpent','arthropod','cephalopod'].includes(bodyPlan);return {mode:dorsal?'dorsal-glow':'crown-glow',site:dorsal?'dorsal':'head'};}
  if(kind==='fizz')return {mode:['jelly','cephalopod','botanical','ethereal'].includes(bodyPlan)?'oral-fold':'jaw',site:'mouth'};
  return null;
 }
 function seed(g,x,y,size,variant,alpha=1){
  g.save();g.translate(x,y);g.globalAlpha*=alpha;g.rotate(variant*.7);g.fillStyle='#c2edf0';g.strokeStyle='#74bdbf';g.lineWidth=.8;
  if(variant===0){g.beginPath();g.ellipse(0,0,size*.36,size*.64,.5,0,Math.PI*2);g.fill();g.beginPath();g.moveTo(0,-size*.4);g.lineTo(0,size*.35);g.stroke();}
  else if(variant===1){for(let i=0;i<3;i++){const a=i*Math.PI*2/3;g.beginPath();g.ellipse(Math.cos(a)*size*.25,Math.sin(a)*size*.25,size*.38,size*.25,a,0,Math.PI*2);g.fill();}}
  else if(variant===2){g.beginPath();g.arc(0,0,size*.55,0,Math.PI*2);g.stroke();g.beginPath();g.arc(size*.12,-size*.10,size*.23,0,Math.PI*2);g.fill();}
  else{g.beginPath();g.moveTo(0,-size*.7);g.quadraticCurveTo(size*.65,size*.1,0,size*.55);g.quadraticCurveTo(-size*.65,size*.1,0,-size*.7);g.fill();}
  g.restore();
 }
 function draw(g,b,state,config,images,time,still,events){
  if(still)return [];
  return reactions(events,time,state.current).map(e=>{
   const profile=profileFor(b.motion?.mode,e.kind);
   if(e.kind==='buzz'){
    const x=(b.sockets.forelimb[0]+b.sockets.hindlimb[0])*.5,y=b.bh*.5+18,r=Math.max(70,Math.min(165,b.bw*.32)),rgb=e.color.join(',');
    g.save();g.translate(x,y);g.scale(1,.22);const light=g.createRadialGradient(0,0,0,0,0,r);light.addColorStop(0,'rgba('+rgb+','+(e.strength*.46)+')');light.addColorStop(.5,'rgba('+rgb+','+(e.strength*.18)+')');light.addColorStop(1,'rgba('+rgb+',0)');g.fillStyle=light;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
    g.strokeStyle='rgba('+rgb+','+(e.strength*.45)+')';g.lineWidth=1.6;g.beginPath();g.ellipse(0,0,r*.62,r*.5,0,0,Math.PI*2);g.stroke();g.restore();
   }
   return {kind:e.kind,count:e.count,sequence:e.sequence,progress:e.progress,strength:e.strength,duration:e.duration,...profile};
  });
 }
 return {quotas,durations,milestone,advanceEvents,reactions,profileFor,seed,draw};
});
