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
   const strength=envelope;
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
    const x=(b.sockets.forelimb[0]+b.sockets.hindlimb[0])*.5,y=b.bh*.5+10,r=Math.max(65,Math.min(140,b.bw*.29));
    // Diffuse reflection belongs to the ground. No geometric burst or appearing crystal.
    g.save();g.translate(x,y);g.scale(1,.16);g.globalCompositeOperation='screen';
    for(let i=0;i<3;i++){const xx=(i-1)*r*.34,rr=r*(i===1?.82:.55),light=g.createRadialGradient(xx,0,0,xx,0,rr);light.addColorStop(0,'rgba(198,173,124,'+(e.strength*(i===1?.18:.10))+')');light.addColorStop(1,'rgba(120,139,153,0)');g.fillStyle=light;g.fillRect(xx-rr,-rr,rr*2,rr*2);}g.restore();
   }
   const bodyPoint=e.kind==='buzz'?[(b.sockets.forelimb[0]+b.sockets.hindlimb[0])*.5,b.bh*.5+10]:b.surface(...b.sockets[profile.site]).point,matrix=g.getTransform?.();
   const project=p=>matrix?[matrix.a*p[0]+matrix.c*p[1]+matrix.e,matrix.b*p[0]+matrix.d*p[1]+matrix.f]:p,point=project(bodyPoint),eyePoint=b.sockets.eye?project(b.sockets.eye):null;
   return {kind:e.kind,count:e.count,sequence:e.sequence,progress:e.progress,strength:e.strength,duration:e.duration,jawOpen:e.kind==='fizz'?e.strength:0,oral:e.kind==='fizz'?b.oral:null,eyePoint,point,...profile};
  });
 }
 return {quotas,durations,milestone,advanceEvents,reactions,profileFor,seed,draw};
});
