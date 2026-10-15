/* One output row, one visible meal. Rendering never awards nutrition. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FoodScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=v=>Math.max(0,Math.min(1,v));
 const types={fizz:'life',buzz:'mineral',fizzbuzz:'information',number:null};
 const colors={fizz:[105,210,255],buzz:[255,205,116],fizzbuzz:[202,158,255],number:[192,217,234]};
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
  const p=e.progress,pulse=Math.sin(clamp((p-.20)/.80)*Math.PI);
  return {...e,color:colors[e.kind],strength:pulse*(e.kind==='number'?.35:1)};
 }
 function draw(g,b,state,config,images,time,still,events){
  if(still)return null;
  const e=reaction(events,time,state.current);if(!e)return null;
  const p=e.progress,mouth=b.surface(...b.sockets.mouth).point,variant=((e.sequence||state.current)+state.seed)%4;
  // Materialize in front of the mouth and dissolve as the animal lights up.
  const intake=clamp((p-.15)/.42),x=mouth[0]-58*(1-intake),y=mouth[1]-5;
  const opacity=clamp(p/.12)*(1-clamp((p-.35)/.25));
  g.save();g.globalAlpha=opacity;
  if(e.type){
   const s=config.food[e.type],im=images.get(s.file),r=s.regions[variant+(p>.34?4:0)];
   const size=(e.type==='mineral'?48:45)*(1-intake*.45),scale=size/Math.max(r[2],r[3]);
   g.translate(x,y+(e.type==='life'?Math.sin(p*12)*3:0));
   g.drawImage(im,...r,-r[2]*scale/2,-r[3]*scale/2,r[2]*scale,r[3]*scale);
  }else{
   g.font='bold 22px monospace';g.textAlign='center';g.textBaseline='middle';g.fillStyle='rgb('+e.color.join(',')+')';g.fillText(e.value||String(e.sequence||state.current),x,y);
  }
  g.restore();
  return {kind:e.kind,sequence:e.sequence||state.current,value:e.value||({fizz:'Fizz',buzz:'Buzz',fizzbuzz:'FizzBuzz'}[e.kind]||String(state.current)),variant,progress:p,strength:e.strength,foodPoint:[x,y],phase:p<.2?'appear':p<.6?'intake':'absorb',mouth:mouth.slice()};
 }
 return {consumption,reaction,draw};
});
