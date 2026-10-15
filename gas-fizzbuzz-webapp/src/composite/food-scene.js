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
   const edge=Math.min(1,progress/.12,(1-progress)/.12),strength=e.kind==='fizzbuzz'?envelope:e.kind==='fizz'?edge*Math.sin(progress*Math.PI*2)**2:envelope*(.45+.55*Math.sin(progress*Math.PI*2)**2);
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
    const x=(b.sockets.forelimb[0]+b.sockets.hindlimb[0])*.5,y=b.bh*.5+10,r=Math.max(95,Math.min(205,b.bw*.40)),rgb=e.color.join(',');
    g.save();g.translate(x,y);g.scale(1,.28);const light=g.createRadialGradient(0,0,0,0,0,r);light.addColorStop(0,'rgba('+rgb+','+(e.strength*.85)+')');light.addColorStop(.45,'rgba('+rgb+','+(e.strength*.43)+')');light.addColorStop(1,'rgba('+rgb+',0)');g.fillStyle=light;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
    g.strokeStyle='rgba(255,226,165,'+(.9*e.strength)+')';g.lineWidth=2.2;
    for(let i=0;i<7;i++){const xx=(i-3)*r*.22;g.beginPath();g.moveTo(xx-16,8+(i%2)*8);g.lineTo(xx,-12);g.lineTo(xx+8,-2);g.lineTo(xx+20,-16);g.stroke();}g.restore();
    g.save();g.globalAlpha=e.strength*.8;const item=config.food.mineral;
    for(const side of [-1,1]){const region=item.regions[(state.seed+(side<0?0:1))%4],size=36,scale=size/Math.max(region[2],region[3]);g.drawImage(images.get(item.file),...region,x+side*r*.66-region[2]*scale/2,y-region[3]*scale,region[2]*scale,region[3]*scale);}g.restore();
   }else if(e.kind==='fizzbuzz'){
    const at=b.surface(...b.sockets[profile.site]).point,r=Math.max(32,Math.min(70,b.bw*.12)),rgb=e.color.join(',');g.save();g.globalCompositeOperation='screen';const light=g.createRadialGradient(at[0],at[1],0,at[0],at[1],r);light.addColorStop(0,'rgba('+rgb+','+(.48*e.strength)+')');light.addColorStop(1,'rgba('+rgb+',0)');g.fillStyle=light;g.fillRect(at[0]-r,at[1]-r,r*2,r*2);g.restore();
   }
   const bodyPoint=e.kind==='buzz'?[(b.sockets.forelimb[0]+b.sockets.hindlimb[0])*.5,b.bh*.5+10]:b.surface(...b.sockets[profile.site]).point,matrix=g.getTransform?.();
   const point=matrix?[matrix.a*bodyPoint[0]+matrix.c*bodyPoint[1]+matrix.e,matrix.b*bodyPoint[0]+matrix.d*bodyPoint[1]+matrix.f]:bodyPoint;
   return {kind:e.kind,count:e.count,sequence:e.sequence,progress:e.progress,strength:e.strength,duration:e.duration,jawOpen:e.kind==='fizz'?e.strength:0,point,...profile};
  });
 }
 return {quotas,durations,milestone,advanceEvents,reactions,profileFor,seed,draw};
});
