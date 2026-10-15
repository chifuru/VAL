/* Visual encounters never award nutrition. Only CreatureEngine.step consumes rows. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FoodScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=v=>Math.max(0,Math.min(1,v)),types=['life','mineral','information'];
 function encounters(seed,time){
  const cycle=4800,lifetime=3500,result=[];
  for(let i=0;i<9;i++){
   const shifted=time+i*571+(seed%37)*79,epoch=Math.floor(shifted/cycle),age=shifted-epoch*cycle;
   if(age>=lifetime)continue;
   result.push({id:i+':'+epoch,type:types[i%3],variant:(seed+i+epoch)%4,age,progress:age/lifetime,opacity:Math.min(1,age/420,(lifetime-age)/600),slot:i});
  }
  return result;
 }
 function consumption(events,time){return events.filter(e=>time>=e.time&&time-e.time<900).slice(-4).map(e=>({...e,progress:(time-e.time)/900,type:{fizz:'life',buzz:'mineral',fizzbuzz:'information',number:null}[e.kind]}));}
 function draw(g,b,state,config,images,time,still,events){
  function sprite(type,variant,x,y,size,opacity,angle=0,eaten=false,growth=1){
   const s=config.food[type],im=images.get(s.file),r=s.regions[variant+(eaten?4:0)],scale=size/Math.max(r[2],r[3]);
   g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=clamp(opacity);g.drawImage(im,...r,-r[2]*scale/2,-r[3]*scale/2,r[2]*scale,r[3]*scale*growth);g.restore();
  }
  const clock=still?1600:time;
  for(const e of encounters(state.seed,clock)){
   const t=e.progress,phase=e.slot*.9;
   if(e.type==='life')sprite(e.type,e.variant,-b.bw*.62-Math.cos(phase)*b.bw*.22+Math.sin(t*7+phase)*32,-b.bh*.05+Math.sin(phase)*b.bh*.4+Math.cos(t*6)*12,38+(e.slot%3)*9,e.opacity,Math.sin(t*5)*.14);
   else if(e.type==='mineral')sprite(e.type,e.variant,(e.slot-4)*b.bw*.14,b.bh*.48,52,e.opacity,0,false,.25+.75*Math.sin(t*Math.PI));
   else sprite(e.type,e.variant,Math.cos(phase+t*.9)*b.bw*.68,Math.sin(phase+t*.9)*b.bh*.55,34,e.opacity,Math.sin(t*3)*.25);
  }
  if(still)return;
  const mouth=b.sockets.mouth;
  for(const e of consumption(events,time)){
   const f=e.progress,ease=f*f*(3-2*f),variant=((e.sequence||state.current)+state.seed)%4;
   if(!e.type){g.save();g.globalAlpha=Math.sin(f*Math.PI)*.5;g.strokeStyle='#a7c3da';g.lineWidth=1.5;g.beginPath();g.arc(mouth[0],mouth[1],8+f*20,0,Math.PI*2);g.stroke();g.restore();continue;}
   const start=e.type==='life'?[mouth[0]-210,mouth[1]-45]:e.type==='mineral'?[mouth[0]+90,b.bh*.48]:[mouth[0]-70,mouth[1]-150];
   const x=start[0]+(mouth[0]-start[0])*ease,y=start[1]+(mouth[1]-start[1])*ease+Math.sin(f*Math.PI)*(e.type==='life'?-35:15);
   sprite(e.type,variant,x,y,(e.type==='mineral'?46:40)*(1-.72*ease),1-ease,Math.sin(f*10)*.2,f>.45);
   if(e.type==='information'){g.save();g.globalAlpha=(1-f)*.45;g.strokeStyle='#9ed8ff';g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+20,y+30,mouth[0],mouth[1]);g.stroke();g.restore();}
  }
 }
 return {encounters,consumption,draw};
});
