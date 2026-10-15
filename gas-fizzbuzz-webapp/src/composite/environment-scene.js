(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./food-scene'):root.FoodScene);if(typeof module==='object'&&module.exports)module.exports=api;else root.EnvironmentScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(F){
 'use strict';const keys=['tide','heat','signal','void'],clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const noise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
 const keysLight=[[125,203,229],[245,176,108],[159,193,244],[185,196,225]],fillsLight=[[29,66,100],[73,36,53],[56,47,96],[35,39,65]];
 const tones=[[42,91,112],[112,70,48],[65,70,111],[48,60,83]];
 function weightsFor(state){const plan=state.environmentPlan;if(!plan)return [0,0,1,0];const t=clamp((state.points-20)/5);return plan.weights[0].map((v,i)=>v*(1-t)+plan.weights[1][i]*t);}
 function levelsFor(state){const maxima=[267,134,66,533];return ['fizz','buzz','fizzbuzz','number'].map((kind,i)=>clamp(Math.log1p(Math.max(0,state.foods?.[kind]||0))/Math.log1p(maxima[i])));}
 function toneFor(state){const weights=weightsFor(state);return [0,1,2].map(c=>Math.round(tones.reduce((v,t,i)=>v+t[c]*weights[i],0)));}
 function lightingFor(state){const weights=weightsFor(state),mix=table=>[0,1,2].map(c=>Math.round(table.reduce((v,t,i)=>v+t[c]*weights[i],0)/8)*8);return {key:mix(keysLight),fill:mix(fillsLight),floor:mix(tones)};}
 function floraPlan(state,growth=levelsFor(state).reduce((a,b)=>a+b,0)/4){const weights=weightsFor(state);return weights.flatMap((weight,kind)=>[0,1].map(row=>({kind,row,region:row*4+kind,weight,x:row?[.10,.91,.28,.73][kind]:[.015,.98,.17,.84][kind],y:row?1.055:1.025,size:row?[.31,.30,.30,.28][kind]:[.15,.17,.10,.11][kind],mirror:(state.seed+kind)%2===0,alpha:smooth(weight*2.4)*(row?.84:.66),growth})));}
 function lifePlan(state,time){const level=levelsFor(state)[0],weights=weightsFor(state),updraft=weights[1]*.018,flow=weights[0]*.018-weights[3]*.012;
  return Array.from({length:12},(_,i)=>{const n=state.seed+i*11,group=Math.floor(i/4),phase=time*(group===0?.00021:group===1?.00055:.00031)*(.75+noise(n)*.5)+noise(n+5)*6.28,left=i%2===0,depth=.52+noise(n+8)*.48,variant=(state.seed+i)%4,pose=(state.seed+Math.floor(i/4))%2;
   const bands=[.80,.57,.39],yaw=Math.tanh(Math.cos(phase)*4),x=(left?.13:.83)+Math.sin(phase)*(.045+noise(n)*.035)+flow*Math.sin(phase*.7),y=bands[group]+noise(n+2)*.10+Math.sin(phase*(group===0?.6:1.3)+i)*.012-updraft*Math.sin(phase);
   return {group,variant,pose,region:pose*4+variant,x,y,depth,size:(group===0?13:group===1?20:11)*( .7+noise(n+3)*.7)*(.75+.25*level),yaw,roll:Math.sin(phase*1.6)*(group===1?.09:.04),squeeze:1+Math.sin(phase*2.4)*.025,alpha:smooth((level-i/14)*4)*(.24+.34*level)*depth};
  });
 }
 function bedPlan(state){
  const sites=[[[.055,.95,.18],[.235,1.025,.23]],[[.82,.96,.18],[.99,1.045,.24]],[[.98,.87,.15],[.75,1.025,.20]],[[.04,.85,.18],[.48,1.12,.25]]];
  return sites.flatMap((group,kind)=>group.map(([x,y,size],i)=>({kind,x:x+(noise(state.seed+kind*17+i)-.5)*.025,y,size,threshold:i?.36:0,mirror:(state.seed+kind+i)%2===0,depth:i?'near':'mid'})));
 }
 function glow(g,x,y,r,color,alpha){const light=g.createRadialGradient(x,y,0,x,y,r);light.addColorStop(0,'rgba('+color+','+alpha+')');light.addColorStop(1,'rgba('+color+',0)');g.fillStyle=light;g.fillRect(x-r,y-r,r*2,r*2);}
 function weather(g,w,h,state,time,weights){
  g.save();for(let kind=0;kind<4;kind++){if(weights[kind]<.01)continue;g.globalAlpha=weights[kind]*.20;
   for(let i=0;i<12;i++){const n=state.seed+kind*101+i*7,x=w*(noise(n)*.28+(i%2?.70:0)),y=(noise(n+1)*h-time*(kind===1?.009:.002)*(1+i%3)+h*100)%h;
    if(kind===0){g.strokeStyle='#73b7d2';g.lineWidth=.6;g.beginPath();g.arc(x,y,1+i%3,0,Math.PI*2);g.stroke();}
    else{g.fillStyle=['','#d9a077','#9b9dc3','#a8bfd6'][kind];g.beginPath();g.ellipse(x,y,kind===1?.7:.6,kind===1?1.8:.6,0,0,Math.PI*2);g.fill();}
   }
  }g.restore();
 }
 function create(config,images){
  // Two display sizes (observation and miniature); bounded pixels also cover high DPI.
  const beds=new Map(),backdrops=new Map(),colonies=new Map(),forests=new Map();let bytes=0,hits=0,builds=0,clock=0;
  const limit=24*1024*1024;
  function touch(c){c._ecologyUse=++clock;return c;}
  function evict(only){let oldest=null;for(const map of only?[only]:[beds,backdrops,colonies,forests])for(const [key,c]of map){if(!oldest||(c._ecologyUse||0)<oldest.age)oldest={map,key,c,age:c._ecologyUse||0};}if(!oldest)return false;bytes-=oldest.c.width*oldest.c.height*4;oldest.map.delete(oldest.key);return true;}
  function cached(map,key,build){if(map.has(key)){hits++;return touch(map.get(key));}const c=build(),size=c.width*c.height*4;builds++;if(size>limit)return c;while(map.size>=2)evict(map);while(bytes+size>limit&&evict()){}map.set(key,touch(c));bytes+=size;return c;}
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function layer(w,h){const q=Math.min(1,Math.sqrt(950000/(w*h))),c=canvas(Math.ceil(w*q),Math.ceil(h*q));c.getContext('2d').scale(c.width/w,c.height/h);return c;}
  function colony(region,kind,state){
   const tone=toneFor(state),key=region+':'+tone.join(',');
   if(colonies.has(key)){const old=colonies.get(key);colonies.delete(key);colonies.set(key,old);hits++;return touch(old);}
   // The source alpha and color remain intact on disk. Only the cached display is harmonized.
   const c=canvas(region[2],region[3]),g=c.getContext('2d');g.filter='saturate(.68) brightness(.78)';g.drawImage(images.get(config.environments.growth.file),...region,0,0,c.width,c.height);g.filter='none';g.globalCompositeOperation='source-atop';g.fillStyle='rgba('+tone.join(',')+',.18)';g.fillRect(0,0,c.width,c.height);
   g.globalCompositeOperation='destination-in';const fade=g.createLinearGradient(0,c.height*.68,0,c.height);fade.addColorStop(0,'rgba(0,0,0,1)');fade.addColorStop(.65,'rgba(0,0,0,.88)');fade.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=fade;g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';
   const size=c.width*c.height*4;while(colonies.size>=16)evict(colonies);while(bytes+size>limit&&evict()){}if(bytes+size<=limit){colonies.set(key,touch(c));bytes+=size;}builds++;return c;
  }
  function backdrop(w,h,state){return cached(backdrops,[w,h,...weightsFor(state)].join(':'),()=>{const c=layer(w,h),g=c.getContext('2d');g.fillStyle='#060c18';g.fillRect(0,0,w,h);let total=0;
   weightsFor(state).forEach((weight,i)=>{if(!weight)return;const im=images.get(config.environments[keys[i]].file);total+=weight;g.save();g.globalAlpha=weight/total;const scale=Math.max(w/im.width,h/im.height);g.drawImage(im,(w-im.width*scale)/2,(h-im.height*scale)/2,im.width*scale,im.height*scale);g.restore();});
   const shade=g.createLinearGradient(0,0,w,h);shade.addColorStop(0,'rgba(3,9,21,.84)');shade.addColorStop(.5,'rgba(3,9,21,.17)');shade.addColorStop(1,'rgba(3,9,21,.08)');g.fillStyle=shade;g.fillRect(0,0,w,h);
   const light=lightingFor(state),rgb=light.key.join(',');g.save();
   for(let i=0;i<3;i++){g.save();g.translate(w*(.67+i*.13),0);g.rotate(.35);g.scale(.12,1);glow(g,0,h*.15,h*.74,rgb,.028-i*.004);g.restore();}
   glow(g,w*.76,h*.16,w*.33,rgb,.035);g.restore();return c;});}
  function ground(w,h,state){const levels=levelsFor(state).map(v=>Math.floor(v*40)/40),tone=toneFor(state),key=[w,h,state.seed,...levels,...tone].join(':');return cached(beds,key,()=>{const c=layer(w,h),g=c.getContext('2d'),growth=config.environments.growth;
   for(const bed of bedPlan(state)){const level=levels[bed.kind],emerge=smooth((level-bed.threshold)*3);if(!emerge)continue;const mature=smooth((level-.28)/.65),width=w*bed.size*(.40+.60*level),x=w*bed.x,y=h*bed.y;
    g.save();g.translate(x,y);if(bed.mirror)g.scale(-1,1);
    g.save();g.scale(1,.11);glow(g,0,-8,width*.62,'1,5,12',emerge*.52);g.restore();
    g.globalAlpha=emerge*(bed.depth==='near'?.52:.27);
    for(const [row,alpha]of [[0,1-mature],[1,mature]]){if(alpha<=0)continue;const region=growth.regions[row*4+bed.kind],sprite=colony(region,bed.kind,state),height=width*region[3]/region[2];g.save();g.globalAlpha*=alpha;g.drawImage(sprite,-width*.5,-height,width,height);g.restore();}g.restore();
   }
   // A shared low veil embeds roots in the terrain rather than displaying cutout stickers.
   const veil=g.createLinearGradient(0,h*.82,0,h);veil.addColorStop(0,'rgba('+tone.join(',')+',0)');veil.addColorStop(1,'rgba('+tone.join(',')+',.12)');g.fillStyle=veil;g.fillRect(0,h*.82,w,h*.18);return c;});}
  function forest(w,h,state,front){const light=lightingFor(state),growth=Math.floor(levelsFor(state).reduce((a,b)=>a+b,0)*10)/40,key=[w,h,state.seed,front,growth,...weightsFor(state)].join(':');return cached(forests,key,()=>{const c=layer(w,h),g=c.getContext('2d'),atlas=config.environments['habitat-flora'];
   for(const f of floraPlan(state,growth)){if(!!f.row!==front||f.alpha<.001)continue;const r=atlas.regions[f.region],width=w*f.size*(.44+.56*growth),height=width*r[3]/r[2];g.save();g.translate(w*f.x,h*f.y);if(f.mirror)g.scale(-1,1);g.globalAlpha=f.alpha;g.filter='brightness(.68) saturate(.86)';g.drawImage(images.get(atlas.file),...r,-width*.5,-height,width,height);g.restore();}
   const mist=g.createLinearGradient(0,h*.74,0,h);mist.addColorStop(0,'rgba('+light.fill.join(',')+',0)');mist.addColorStop(1,'rgba('+light.fill.join(',')+','+(front?.07:.035)+')');g.fillStyle=mist;g.fillRect(0,h*.74,w,h*.26);return c;
  });}
  function resources(g,w,h,state,time){const levels=levelsFor(state);g.drawImage(forest(w,h,state,false),0,0,w,h);g.drawImage(ground(w,h,state),0,0,w,h);g.save();
   for(const fish of lifePlan(state,time)){if(fish.alpha<=0)continue;const item=config.food.life,r=item.regions[fish.region],scale=fish.size/Math.max(r[2],r[3]);g.save();g.globalAlpha=fish.alpha;g.translate(fish.x*w,fish.y*h);g.rotate(fish.roll);g.scale(fish.yaw,fish.squeeze);g.drawImage(images.get(item.file),...r,-r[2]*scale/2,-r[3]*scale/2,r[2]*scale,r[3]*scale);g.restore();}
   // Information drifts as small motes around existing branches, not drawn electrical wires.
   if(levels[2])for(let i=0;i<8;i++){const n=state.seed+i*19,x=w*((i%2===0?.08:.80)+noise(n)*.10),y=h*(.49+noise(n+1)*.38),phase=time*.0004+i;g.fillStyle='rgba(175,177,218,'+(levels[2]*(.16+.08*Math.sin(phase)))+')';g.beginPath();g.arc(x+Math.sin(phase)*4,y+Math.cos(phase)*6,1+i%2*.45,0,Math.PI*2);g.fill();}
   if(levels[3]){g.globalAlpha=levels[3];for(let i=0;i<14;i++){const n=state.seed+i*23,x=w*noise(n),y=h*(.72+noise(n+2)*.25),phase=time*.0002+i;F.seed(g,x+Math.sin(phase)*4,y+Math.cos(phase)*2,1+noise(n+3)*1.5,i%4,.23);}}
   g.restore();return levels;
  }
  function foreground(g,w,h,state){const tone=toneFor(state);g.drawImage(forest(w,h,state,true),0,0,w,h);g.save();g.fillStyle='rgba('+tone.join(',')+',.026)';g.fillRect(0,0,w,h);const vignette=g.createRadialGradient(w*.57,h*.48,w*.18,w*.57,h*.48,w*.74);vignette.addColorStop(0,'rgba(2,7,17,0)');vignette.addColorStop(1,'rgba(2,7,17,.35)');g.fillStyle=vignette;g.fillRect(0,0,w,h);g.restore();}
  function draw(g,w,h,state,time,still){g.drawImage(backdrop(w,h,state),0,0,w,h);if(!still)weather(g,w,h,state,time,weightsFor(state));resources(g,w,h,state,still?0:time);}
  return {draw,foreground,resources,stats:()=>({bytes,limit,backdrops:backdrops.size,beds:beds.size,colonies:colonies.size,forests:forests.size,hits,builds})};
 }
 // Public pure planning helpers are also used by Node validation.
 return {weightsFor,levelsFor,bedPlan,toneFor,lightingFor,floraPlan,lifePlan,create};
});
