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
 // One slow current links distant scenery, rooted flora and free organisms.
 function flowFor(state,time){const w=weightsFor(state),phase=time*.00027+noise(state.seed+41)*6.28;return {x:(w[0]*1.3+w[1]*.5-w[3]*.6)*Math.sin(phase),y:(w[0]*.3-w[1]*.5+w[3]*.25)*Math.cos(phase*.73),wind:(w[0]*.018+w[1]*.011+w[2]*.007+w[3]*.005)*Math.sin(phase),phase};}
 function floraPoseFor(state,plant,time,still){const flow=flowFor(state,time),phase=flow.phase+plant.kind*.91+plant.row*.68;return {x:plant.x,y:plant.y,angle:still?0:flow.wind*(plant.row?.45:1)+Math.sin(phase*1.3)*.003,stretch:still?1:1+Math.sin(phase*.7)*.002};}
 function resourcePlan(state,time,still=false){const levels=levelsFor(state),flow=flowFor(state,time);return [1,2].flatMap(kind=>Array.from({length:8},(_,i)=>{const n=state.seed+kind*97+i*23,level=levels[kind],phase=time*.00032+noise(n)*6.28,left=i%2===0;
  return {kind,region:(state.seed+i)%8,x:kind===1?[.025,.975,.12,.88,.245,.755,.34,.67][i]:(left?.08:.88)+(noise(n+1)-.5)*.09+(still?0:Math.sin(phase)*.007+flow.x*.003),y:kind===1?.96+noise(n+2)*.075:.36+noise(n+2)*.45+(still?0:Math.cos(phase*.8)*.009+flow.y*.003),size:kind===1?24+noise(n+3)*23:8+noise(n+3)*9,angle:kind===1?(noise(n+4)-.5)*.20:still?0:Math.sin(phase*.7)*.12,alpha:smooth((level-i/12)*3)*(kind===1?.42:.38)};
 }));}
 // Stable individuals belong to habitats. Mixture changes opacity, never their identity.
 function lifePlan(state,time){const level=levelsFor(state)[0],weights=weightsFor(state),current=flowFor(state,time);
  return Array.from({length:24},(_,i)=>{const kind=Math.floor(i/6),species=Math.floor(i%6/2),copy=i%2,n=state.seed+i*31,grounded=(kind===1&&species!==1)||(kind===3&&species===2),phase=time*(grounded?.00019:.00038)*(.75+noise(n)*.5)+noise(n+5)*6.28,pose=(state.seed+copy)%2,depth=.60+noise(n+8)*.35;
   const x=(copy?.83:.13)+Math.sin(phase)* (grounded?.023:.048)+current.x*.002,bands=kind===0?[.77,.53,.35]:kind===1?[.925,.38,.94]:kind===2?[.39,.61,.76]:[.40,.65,.94],y=bands[species]+noise(n+2)*.035+(grounded?0:Math.sin(phase*1.3+i)*.011+current.y*.002);
   return {kind,group:species,variant:species,pose,region:kind*6+species*2+pose,grounded,x,y,depth,size:(grounded?29:species===1?27:23)*(.8+noise(n+3)*.4)*(.72+.28*level),yaw:grounded?(copy?-1:1):Math.tanh(Math.cos(phase)*4),roll:grounded?Math.sin(phase)*.012:Math.sin(phase*1.6)*.075,squeeze:1+Math.sin(phase*2.4)*(grounded?.008:.024),alpha:smooth((level-species*.16-copy*.09)*3)*weights[kind]*(.32+.38*level)*depth};
  });
 }
 // Bounded ambient particles fade before wrapping, so a new cycle cannot flash at an edge.
 function particlePlan(state,time){const weights=weightsFor(state),flow=flowFor(state,time);return keys.flatMap((_,kind)=>Array.from({length:12},(_,i)=>{const n=state.seed+kind*101+i*7,phase=time*.00035+noise(n+3)*6.28,speed=[.000010,.000024,.000007,.000005][kind]*(.65+noise(n+2)),y=((noise(n+1)-time*speed)%1+1)%1,depth=.4+noise(n+4)*.6;
  return {kind,x:noise(n)*.26+(i%2?.72:.01)+Math.sin(phase)*.008+flow.x*.002,y,size:(.6+noise(n+5)*1.5)*depth,angle:phase*.28,alpha:weights[kind]*.28*depth*smooth(y/.12)*smooth((1-y)/.12)*(kind===1?.7+.3*Math.sin(phase)**2:1)};
 }));}
 function bedPlan(state){
  const sites=[[[.055,.95,.18],[.235,1.025,.23]],[[.82,.96,.18],[.99,1.045,.24]],[[.98,.87,.15],[.75,1.025,.20]],[[.04,.85,.18],[.48,1.12,.25]]];
  return sites.flatMap((group,kind)=>group.map(([x,y,size],i)=>({kind,x:x+(noise(state.seed+kind*17+i)-.5)*.025,y,size,threshold:i?.36:0,mirror:(state.seed+kind+i)%2===0,depth:i?'near':'mid'})));
 }
 function glow(g,x,y,r,color,alpha){const light=g.createRadialGradient(x,y,0,x,y,r);light.addColorStop(0,'rgba('+color+','+alpha+')');light.addColorStop(1,'rgba('+color+',0)');g.fillStyle=light;g.fillRect(x-r,y-r,r*2,r*2);}
 function weather(g,w,h,state,time){g.save();for(const p of particlePlan(state,time)){if(p.alpha<.001)continue;g.save();g.globalAlpha=p.alpha;g.translate(p.x*w,p.y*h);g.rotate(p.angle);g.strokeStyle=g.fillStyle=['#73b7d2','#d9a077','#a8b5df','#a8bfd6'][p.kind];g.lineWidth=.6;
  if(p.kind===0){g.beginPath();g.ellipse(0,0,p.size*.83,p.size,0,.18,Math.PI*1.85);g.stroke();}
  else if(p.kind===1){g.beginPath();g.ellipse(0,0,p.size*.38,p.size,0,0,Math.PI*2);g.fill();}
  else if(p.kind===2){g.beginPath();g.moveTo(-p.size,0);g.lineTo(0,-p.size*.7);g.lineTo(p.size,0);g.lineTo(0,p.size*.7);g.closePath();g.stroke();}
  else{g.beginPath();g.ellipse(0,0,p.size*.75,p.size*.4,0,0,Math.PI*2);g.fill();}g.restore();}g.restore();}
 function create(config,images){
  // Two display sizes (observation and miniature); bounded pixels also cover high DPI.
  const beds=new Map(),backdrops=new Map(),colonies=new Map(),forests=new Map(),decorations=new Map();let bytes=0,hits=0,builds=0,clock=0;
  const limit=24*1024*1024;
  function touch(c){c._ecologyUse=++clock;return c;}
  function evict(only){let oldest=null;for(const map of only?[only]:[beds,backdrops,colonies,forests,decorations])for(const [key,c]of map){if(!oldest||(c._ecologyUse||0)<oldest.age)oldest={map,key,c,age:c._ecologyUse||0};}if(!oldest)return false;bytes-=oldest.c.width*oldest.c.height*4;oldest.map.delete(oldest.key);return true;}
  function cached(map,key,build,capacity=2){if(map.has(key)){hits++;return touch(map.get(key));}const c=build(),size=c.width*c.height*4;builds++;if(size>limit)return c;while(map.size>=capacity)evict(map);while(bytes+size>limit&&evict()){}map.set(key,touch(c));bytes+=size;return c;}
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
  function scenerySprite(item,region,state,native){const tone=toneFor(state),map=native?forests:decorations,key=[item.file,region,...tone].join(':');return cached(map,key,()=>{const q=Math.min(1,(native?512:128)/Math.max(region[2],region[3])),c=canvas(Math.ceil(region[2]*q),Math.ceil(region[3]*q)),g=c.getContext('2d');g.filter=native?'brightness(.68) saturate(.86)':'brightness(.67) saturate(.76)';g.drawImage(images.get(item.file),...region,0,0,c.width,c.height);g.filter='none';g.globalCompositeOperation='source-atop';g.fillStyle='rgba('+tone.join(',')+',.09)';g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';return c;},native?12:24);}
  function forest(g,w,h,state,front,time,still){const light=lightingFor(state),growth=Math.floor(levelsFor(state).reduce((a,b)=>a+b,0)*10)/40,atlas=config.environments['habitat-flora'];
   for(const f of floraPlan(state,growth)){if(!!f.row!==front||f.alpha<.001)continue;const r=atlas.regions[f.region],width=w*f.size*(.44+.56*growth),height=width*r[3]/r[2],pose=floraPoseFor(state,f,time,still),image=scenerySprite(atlas,r,state,true);g.save();g.translate(w*pose.x,h*pose.y);g.rotate(pose.angle);g.scale(f.mirror?-1:1,pose.stretch);g.globalAlpha=f.alpha;g.drawImage(image,-width*.5,-height,width,height);g.restore();}
   const mist=g.createLinearGradient(0,h*.74,0,h);mist.addColorStop(0,'rgba('+light.fill.join(',')+',0)');mist.addColorStop(1,'rgba('+light.fill.join(',')+','+(front?.07:.035)+')');g.save();g.fillStyle=mist;g.fillRect(0,h*.74,w,h*.26);g.restore();
  }
  function resources(g,w,h,state,time,still=false){const levels=levelsFor(state);forest(g,w,h,state,false,time,still);g.drawImage(ground(w,h,state),0,0,w,h);g.save();
   for(const fish of lifePlan(state,time)){if(fish.alpha<=0)continue;const item=config.food['habitat-life'],r=item.regions[fish.region],scale=fish.size/Math.max(r[2],r[3]);g.save();g.globalAlpha=fish.alpha;g.translate(fish.x*w,fish.y*h);g.rotate(fish.roll);g.scale(fish.yaw,fish.squeeze);g.drawImage(images.get(item.file),...r,-r[2]*scale/2,-r[3]*scale/2,r[2]*scale,r[3]*scale);g.restore();}
   // Small native material fragments are rooted or drifting, never pulled into a mouth.
   for(const material of resourcePlan(state,time,still)){if(material.alpha<.001)continue;const item=config.food[material.kind===1?'mineral':'information'],r=item.regions[material.region],image=scenerySprite(item,r,state,false),scale=material.size/Math.max(r[2],r[3]),height=r[3]*scale,width=r[2]*scale;g.save();g.translate(material.x*w,material.y*h);g.rotate(material.angle);g.globalAlpha=material.alpha;g.drawImage(image,-width*.5,material.kind===1?-height:-height*.5,width,height);g.restore();}
   // Information drifts as small motes around existing branches, not drawn electrical wires.
   if(levels[2])for(let i=0;i<8;i++){const n=state.seed+i*19,x=w*((i%2===0?.08:.80)+noise(n)*.10),y=h*(.49+noise(n+1)*.38),phase=time*.0004+i;g.fillStyle='rgba(175,177,218,'+(levels[2]*(.16+.08*Math.sin(phase)))+')';g.beginPath();g.arc(x+Math.sin(phase)*4,y+Math.cos(phase)*6,1+i%2*.45,0,Math.PI*2);g.fill();}
   if(levels[3]){g.globalAlpha=levels[3];for(let i=0;i<14;i++){const n=state.seed+i*23,x=w*noise(n),y=h*(.72+noise(n+2)*.25),phase=time*.0002+i;F.seed(g,x+Math.sin(phase)*4,y+Math.cos(phase)*2,1+noise(n+3)*1.5,i%4,.23);}}
   g.restore();return levels;
  }
  function foreground(g,w,h,state,time=0,still=true){const tone=toneFor(state);forest(g,w,h,state,true,time,still);g.save();g.fillStyle='rgba('+tone.join(',')+',.026)';g.fillRect(0,0,w,h);const vignette=g.createRadialGradient(w*.57,h*.48,w*.18,w*.57,h*.48,w*.74);vignette.addColorStop(0,'rgba(2,7,17,0)');vignette.addColorStop(1,'rgba(2,7,17,.35)');g.fillStyle=vignette;g.fillRect(0,0,w,h);g.restore();}
  function draw(g,w,h,state,time,still){const flow=flowFor(state,time),dx=still?0:flow.x*.7,dy=still?0:flow.y*.5;g.drawImage(backdrop(w,h,state),-2+dx,-2+dy,w+4,h+4);if(!still)weather(g,w,h,state,time,weightsFor(state));resources(g,w,h,state,still?0:time,still);}
  return {draw,foreground,resources,stats:()=>({bytes,limit,backdrops:backdrops.size,beds:beds.size,colonies:colonies.size,forests:forests.size,decorations:decorations.size,hits,builds})};
 }
 // Public pure planning helpers are also used by Node validation.
 return {weightsFor,levelsFor,bedPlan,toneFor,lightingFor,floraPlan,floraPoseFor,flowFor,resourcePlan,lifePlan,particlePlan,create};
});
