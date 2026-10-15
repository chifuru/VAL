/* Output-driven ecology. Drawing never changes nutrition or calculation state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FoodScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const kinds=['fizz','buzz','fizzbuzz','number'];
 const types={fizz:'life',buzz:'mineral',fizzbuzz:'information',number:'factor'};
 const colors={fizz:[109,223,202],buzz:[245,194,115],fizzbuzz:[176,164,255],number:[170,221,236]};
 const profiles={aquatic:'suction',whale:'suction',amphibian:'bite',avian:'bite',serpent:'bite',arthropod:'clasp',cephalopod:'envelop',jelly:'envelop',botanical:'fold',crystal:'resonate',mechanical:'clasp',ethereal:'assimilate'};
 function consumption(events,time){
  let latest=null;
  for(const e of events){
   const duration=e.duration||650;
   if(!Object.hasOwn(types,e.kind)||time<e.time||time-e.time>=duration)continue;
   if(latest&&e.time<latest.time)continue;
   latest={...e,duration,progress:(time-e.time)/duration,type:types[e.kind]};
  }
  return latest?[latest]:[];
 }
 function reaction(events,time,sequence){
  const e=consumption(events,time)[0];
  if(!e||(e.sequence!==undefined&&e.sequence!==sequence))return null;
  const p=e.progress,intake=smooth((p-.20)/.44),notice=Math.sin(clamp(p/.52)*Math.PI),absorb=Math.sin(clamp((p-.64)/.36)*Math.PI);
  return {...e,color:colors[e.kind],intake,notice,absorb,strength:absorb*(e.kind==='number'?.36:.75),vigor:e.changed===false?.48:1};
 }
 function profileFor(bodyPlan,kind){
  const mode=profiles[bodyPlan]||'suction';
  const site=kind==='number'?'flank':kind==='fizzbuzz'?'eye':kind==='buzz'&&['clasp','fold','resonate'].includes(mode)?'forelimb':['envelop','fold','assimilate'].includes(mode)?'chest':'mouth';
  return {mode,site,jaw:site==='mouth'&&['suction','bite'].includes(mode),gather:['envelop','fold','clasp'].includes(mode)};
 }
 // An interrupted transition starts from its exact previous weights, not from
 // a hard category switch. This is visual state only, captured by app.advance.
 function resourceWeights(events,time,sequence){
  let e=null;for(const candidate of events)if(Object.hasOwn(types,candidate.kind)&&candidate.time<=time&&(candidate.sequence===undefined||candidate.sequence===sequence)&&(!e||candidate.time>=e.time))e=candidate;
  if(!e)return [0,0,0,0];
  const age=time-e.time,duration=e.duration||650,fade=1-smooth((age-duration)/650),t=smooth(age/520),from=e.resourceFrom||[0,0,0,0];
  return kinds.map((kind,i)=>((from[i]||0)*(1-t)+(e.kind===kind?t:0))*fade);
 }
 function siteFor(b,profile){const socket=b.sockets[profile.site]||b.sockets.mouth;return b.surface(...socket).point;}
 function seed(g,x,y,size,variant,alpha=1){
  g.save();g.translate(x,y);g.globalAlpha*=alpha;g.rotate(variant*.7);g.fillStyle='#c2edf0';g.strokeStyle='#74bdbf';g.lineWidth=.8;
  if(variant===0){g.beginPath();g.ellipse(0,0,size*.36,size*.64,.5,0,Math.PI*2);g.fill();g.beginPath();g.moveTo(0,-size*.4);g.lineTo(0,size*.35);g.stroke();}
  else if(variant===1){for(let i=0;i<3;i++){const a=i*Math.PI*2/3;g.beginPath();g.ellipse(Math.cos(a)*size*.25,Math.sin(a)*size*.25,size*.38,size*.25,a,0,Math.PI*2);g.fill();}}
  else if(variant===2){g.beginPath();g.arc(0,0,size*.55,0,Math.PI*2);g.stroke();g.beginPath();g.arc(size*.12,-size*.10,size*.23,0,Math.PI*2);g.fill();}
  else{g.beginPath();g.moveTo(0,-size*.7);g.quadraticCurveTo(size*.65,size*.1,0,size*.55);g.quadraticCurveTo(-size*.65,size*.1,0,-size*.7);g.fill();}
  g.restore();
 }
 function atlas(g,config,images,type,variant,partial,x,y,size,angle=0){
  const s=config.food[type],im=images.get(s.file),r=s.regions[variant+(partial?4:0)],scale=size/Math.max(r[2],r[3]);
  g.save();g.translate(x,y);g.rotate(angle);g.drawImage(im,...r,-r[2]*scale/2,-r[3]*scale/2,r[2]*scale,r[3]*scale);g.restore();
 }
 function draw(g,b,state,config,images,time,still,events){
  if(still)return null;
  const e=reaction(events,time,state.current);if(!e)return null;
  const profile=profileFor(b.motion?.mode,e.kind),target=siteFor(b,profile),mouth=b.surface(...b.sockets.mouth).point,p=e.progress,t=e.intake,variant=((e.sequence||state.current)+state.seed)%4;
  const left=-(b.bw||0)*.5-25,bottom=(b.bh||0)*.5+20,right=(b.bw||0)*.5+25;
  const origin=e.kind==='buzz'?[Math.min(target[0]-100,left),Math.max(target[1]+88,bottom)]:e.kind==='fizzbuzz'?[Math.min(target[0]-88,left),target[1]-90]:e.kind==='number'?[Math.max(target[0]+85,right),target[1]-55]:[Math.min(target[0]-120,left),target[1]-20+variant*10];
  const x=t===1?target[0]:origin[0]+(target[0]-origin[0])*t,y=t===1?target[1]:origin[1]+(target[1]-origin[1])*t+(e.kind==='fizz'?Math.sin(p*16+variant)*6*(1-t):e.kind==='buzz'?-Math.sin(t*Math.PI)*18:0);
  const opacity=smooth(p/.12)*(1-smooth((p-.66)/.18)),rgb=e.color.join(','),size=(e.kind==='buzz'?58:52)*(1-t*.5);
  g.save();g.globalAlpha=opacity;
  if(e.kind==='number'){
   for(let i=0;i<5;i++){const angle=i*Math.PI*.4+variant,d=18*(1-t);seed(g,x+Math.cos(angle)*d,y+Math.sin(angle)*d,8*(1-t*.45),variant,1-i*.10);}
  }else if(e.kind==='fizzbuzz'){
   g.strokeStyle='rgba('+rgb+',.65)';g.lineWidth=1.2;
   for(let i=0;i<3;i++){g.beginPath();g.moveTo(origin[0]-i*12,origin[1]+(i-1)*14);g.bezierCurveTo(x-28,y-25+(i-1)*12,x-10,y+15,x,y);g.stroke();}
   atlas(g,config,images,e.type,variant,p>.55,x,y,size*.9,Math.sin(p*5)*.10);
  }else if(e.kind==='buzz'&&p>.28){
   // The crystal breaks where it grew. Each fragment reaches the tissue before
   // fading, rather than disappearing at a fixed screen position.
   for(let i=0;i<5;i++){const d=(1-t),angle=i*2.4+variant;atlas(g,config,images,e.type,variant,true,x+Math.cos(angle)*12*d,y+Math.sin(angle)*10*d,size*(.35+i*.035),angle*t);}
  }else atlas(g,config,images,e.type,variant,false,x,y,size*(e.kind==='buzz'?smooth(p/.28):1),e.kind==='fizz'?Math.sin(p*16)*.12:0);
  // A current or enclosing arc belongs to the contact organ, not to a UI badge.
  if(t>.1&&t<1){g.strokeStyle='rgba('+rgb+','+(.30*e.vigor)+')';g.lineWidth=1;
   if(profile.mode==='suction'){for(let i=0;i<3;i++){g.beginPath();g.moveTo(x-16,y+(i-1)*9);g.quadraticCurveTo(x+6,y+(i-1)*5,target[0],target[1]);g.stroke();}}
   else if(profile.gather){for(const side of [-1,1]){g.beginPath();g.moveTo(target[0]+8,target[1]+side*13);g.quadraticCurveTo(x-14*(1-t),y+side*24*(1-t),x,y+side*4*(1-t));g.stroke();}}
  }
  g.restore();
  return {kind:e.kind,type:e.type,sequence:e.sequence||state.current,value:e.value||({fizz:'Fizz',buzz:'Buzz',fizzbuzz:'FizzBuzz'}[e.kind]||String(state.current)),variant,progress:p,strength:e.strength,vigor:e.vigor,mode:profile.mode,site:profile.site,foodPoint:[x,y],target:target.slice(),origin,contact:t===1,phase:p<.20?'notice':p<.64?'intake':'absorb',mouth:mouth.slice()};
 }
 return {consumption,reaction,profileFor,resourceWeights,seed,draw};
});
