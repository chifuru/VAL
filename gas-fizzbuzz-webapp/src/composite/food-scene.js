/* Count milestones trigger gestures. Rendering never changes nutrition. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FoodScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const kinds=['fizz','buzz','fizzbuzz'],quotas=Object.freeze({fizz:4,buzz:2,fizzbuzz:1}),durations=Object.freeze({fizz:900,buzz:1100,fizzbuzz:1400});
 const colors={fizz:[99,224,162],buzz:[244,181,86],fizzbuzz:[141,155,255]};
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
  return active([...retained.filter(e=>e.kind!==kind),{kind,count,sequence:next.current,time,duration:durations[kind],carry:reactions(retained,time,next.current).find(e=>e.kind===kind)?.strength||0}],time,next.current);
 }
 function reactions(events,time,sequence){
  return active(events,time,sequence).map(e=>{
   const progress=(time-e.time)/e.duration,envelope=Math.sin(progress*Math.PI)**2;
   const strength=envelope+(1-envelope)*(e.carry||0)*(1-progress)**3;
   return {...e,progress,strength,color:colors[e.kind]};
  });
 }
 function profileFor(bodyPlan,kind){
  if(kind==='buzz'){const grounded=['avian','amphibian','arthropod','crystal','mechanical','botanical'].includes(bodyPlan);return {mode:grounded?'ground-glow':'body-glow',site:grounded?'ground':'flank',glow:'whole-body',movement:'settle'};}
  if(kind==='fizzbuzz'){const dorsal=['aquatic','whale','serpent','arthropod','cephalopod'].includes(bodyPlan);return {mode:dorsal?'dorsal-glow':'crown-glow',site:dorsal?'dorsal':'head',glow:'whole-body',movement:'wave'};}
  if(kind==='fizz')return {mode:['jelly','cephalopod','botanical','ethereal'].includes(bodyPlan)?'oral-fold':'jaw',site:'mouth',glow:'whole-body',movement:'contract'};
  return null;
 }
 const response={aquatic:[1,.9,1.1],amphibian:[.82,1.1,.7],avian:[.72,.8,.8],serpent:[1.15,.8,1.2],crystal:[.38,.55,.42],arthropod:[.60,.85,.55],jelly:[1.2,.72,1.18],cephalopod:[1.1,.78,1.15],botanical:[.55,.40,.8],whale:[.75,.95,.9],mechanical:[.32,.5,.38],ethereal:[.8,.4,1.1]};
 function motionProfileFor(bodyPlan,kind){const p=response[bodyPlan]||response.aquatic,i={fizz:0,buzz:1,fizzbuzz:2}[kind];if(i===undefined)return null;return {squeeze:(kind==='fizz'?-.025:kind==='buzz'?.018:.014)*p[i],bend:(kind==='fizz'?-.004:kind==='buzz'?.013:.006)*p[i]};}
 function lightPlanFor(bodyPlan,kind,anatomy,progress){
  if(!kinds.includes(kind))return null;
  const joints=anatomy.joints;if(kind==='buzz')return {type:'rise',position:1.2-progress*1.6,width:.46};
  const site=kind==='fizz'?'mouth':profileFor(bodyPlan,kind).site;
  return {type:'spread',origin:(joints[site]||joints.flank).slice(),radius:(kind==='fizz'?.18:.12)+progress*1.2};
 }
 // Presentation-only events come from real stage/level increases, never a timer lottery.
 const growthDurations={evolution:1800,organ:1100};
 function activeGrowth(events,time,sequence){
  const found=new Map();for(const e of events){if(!Object.hasOwn(growthDurations,e.type)||!Number.isInteger(e.sequence)||e.sequence<1||e.sequence>sequence||!Number.isFinite(e.time)||time<e.time||time-e.time>=growthDurations[e.type])continue;const old=found.get(e.type);if(!old||e.sequence>old.sequence)found.set(e.type,e);}
  return [...found.values()];
 }
 function growthReactions(events,time,sequence){return activeGrowth(events,time,sequence).map(e=>{const duration=growthDurations[e.type],progress=(time-e.time)/duration;return {...e,duration,progress,strength:Math.sin(progress*Math.PI)**2+(1-Math.sin(progress*Math.PI)**2)*(e.carry||0)*(1-progress)**3};});}
 function advanceGrowth(events,previous,next,before,after,time){
  if(previous.seed!==next.seed)return [];const retained=activeGrowth(events,time,next.current);
  if(next.current!==previous.current+1)return retained;
  let event=null;
  if(next.stage>previous.stage)event={type:'evolution',from:previous.stage,to:next.stage,sites:['torso'],sequence:next.current,time};
  else{const anchors={torso:'flank',head:'head',eyes:'eye',tail:'tailTip',fin:'shoulder',limb:'forelimb',shell:'dorsal'},sites=[];
   for(const key of Object.keys(anchors))if(after.anatomy[key].level>before.anatomy[key].level)sites.push(anchors[key]);
   const prior=new Map([...before.inheritedOrgans,...before.organs].map(p=>[p.lineage+':'+p.id,p.level]));
   for(const p of [...after.inheritedOrgans,...after.organs])if(p.level>(prior.get(p.lineage+':'+p.id)||0))sites.push(p.anchor||'flank');
   if(sites.length)event={type:'organ',sites:[...new Set(sites)].slice(0,4),sequence:next.current,time};
  }
  if(!event||retained.some(e=>e.type===event.type&&e.sequence>=event.sequence))return retained;
  const old=growthReactions(retained,time,next.current).find(e=>e.type===event.type);event.carry=old?.strength||0;if(old&&event.type==='organ')event.sites=[...new Set([...old.sites,...event.sites])].slice(-4);return [...retained.filter(e=>e.type!==event.type),event];
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
   const grounded=Boolean(b.contacts?.length),contact=grounded?[b.contacts.reduce((v,p)=>v+p.point[0],0)/b.contacts.length,b.supportY]:null;
   if(grounded){
    const [x,y]=contact,r=Math.max(45,Math.min(120,b.bw*.24)),reflected=colors[e.kind].map((v,i)=>Math.round(v*.60+(b.light?.floor?.[i]||50)*.40)).join(','),gain=e.kind==='buzz'?1:.28;
    g.save();g.translate(x,y+2);g.scale(1,.13);g.globalCompositeOperation='screen';const light=g.createRadialGradient(0,0,0,0,0,r);light.addColorStop(0,'rgba('+reflected+','+(e.strength*gain*.16)+')');light.addColorStop(.45,'rgba('+reflected+','+(e.strength*gain*.055)+')');light.addColorStop(1,'rgba('+reflected+',0)');g.fillStyle=light;g.fillRect(-r,-r,r*2,r*2);g.restore();
   }
   const bodyPoint=e.kind==='buzz'&&grounded?contact:b.surface(...b.sockets[e.kind==='buzz'?'flank':profile.site]).point,matrix=g.getTransform?.();
   const project=p=>matrix?[matrix.a*p[0]+matrix.c*p[1]+matrix.e,matrix.b*p[0]+matrix.d*p[1]+matrix.f]:p,point=project(bodyPoint),eyePoint=b.sockets.eye?project(b.sockets.eye):null;
   return {reflection:grounded,kind:e.kind,count:e.count,sequence:e.sequence,progress:e.progress,strength:e.strength,duration:e.duration,jawOpen:e.kind==='fizz'?e.strength:0,oral:e.kind==='fizz'?b.oral:null,eyePoint,point,...profile};
  });
 }
 return {colors,lightPlanFor,motionProfileFor,quotas,durations,milestone,advanceEvents,reactions,profileFor,advanceGrowth,growthReactions,seed,draw};
});
