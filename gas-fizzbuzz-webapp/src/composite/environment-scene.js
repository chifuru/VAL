(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./food-scene'):root.FoodScene);if(typeof module==='object'&&module.exports)module.exports=api;else root.EnvironmentScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(F){
 'use strict';const keys=['tide','heat','signal','void'],clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const noise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
 const tones=[[42,91,112],[112,70,48],[65,70,111],[48,60,83]];
 function weightsFor(state){const plan=state.environmentPlan;if(!plan)return [0,0,1,0];const t=clamp((state.points-20)/5);return plan.weights[0].map((v,i)=>v*(1-t)+plan.weights[1][i]*t);}
 function levelsFor(state){const maxima=[267,134,66,533];return ['fizz','buzz','fizzbuzz','number'].map((kind,i)=>clamp(Math.log1p(Math.max(0,state.foods?.[kind]||0))/Math.log1p(maxima[i])));}
 function toneFor(state){const weights=weightsFor(state);return [0,1,2].map(c=>Math.round(tones.reduce((v,t,i)=>v+t[c]*weights[i],0)));}
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
  const beds=new Map(),backdrops=new Map(),colonies=new Map();let bytes=0,hits=0,builds=0;
  const limit=24*1024*1024;
  function cached(map,key,build){if(map.has(key)){const c=map.get(key);map.delete(key);map.set(key,c);hits++;return c;}const c=build(),size=c.width*c.height*4;builds++;if(size>limit)return c;while(bytes+size>limit||map.size>=2){const victim=map.size?map:[beds,backdrops,colonies].find(m=>m.size);if(!victim)break;const k=victim.keys().next().value,old=victim.get(k);bytes-=old.width*old.height*4;victim.delete(k);}map.set(key,c);bytes+=size;return c;}
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function colony(region,kind,state){
   const tone=toneFor(state),key=region+':'+tone.map(v=>Math.round(v/16)).join(',');
   if(colonies.has(key)){hits++;return colonies.get(key);}
   // The source alpha and color remain intact on disk. Only the cached display is harmonized.
   const c=canvas(region[2],region[3]),g=c.getContext('2d');g.filter='saturate(.68) brightness(.78)';g.drawImage(images.get(config.environments.growth.file),...region,0,0,c.width,c.height);g.filter='none';g.globalCompositeOperation='source-atop';g.fillStyle='rgba('+tone.join(',')+',.18)';g.fillRect(0,0,c.width,c.height);
   g.globalCompositeOperation='destination-in';const fade=g.createLinearGradient(0,c.height*.68,0,c.height);fade.addColorStop(0,'rgba(0,0,0,1)');fade.addColorStop(.65,'rgba(0,0,0,.88)');fade.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=fade;g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';
   const size=c.width*c.height*4;while(colonies.size&&(colonies.size>=16||bytes+size>limit)){const k=colonies.keys().next().value,old=colonies.get(k);bytes-=old.width*old.height*4;colonies.delete(k);}if(bytes+size<=limit){colonies.set(key,c);bytes+=size;}builds++;return c;
  }
  function backdrop(w,h,state){return cached(backdrops,[w,h,...weightsFor(state)].join(':'),()=>{const c=canvas(w,h),g=c.getContext('2d');g.fillStyle='#060c18';g.fillRect(0,0,w,h);let total=0;
   weightsFor(state).forEach((weight,i)=>{if(!weight)return;const im=images.get(config.environments[keys[i]].file);total+=weight;g.save();g.globalAlpha=weight/total;const scale=Math.max(w/im.width,h/im.height);g.drawImage(im,(w-im.width*scale)/2,(h-im.height*scale)/2,im.width*scale,im.height*scale);g.restore();});
   const shade=g.createLinearGradient(0,0,w,h);shade.addColorStop(0,'rgba(3,9,21,.88)');shade.addColorStop(.5,'rgba(3,9,21,.22)');shade.addColorStop(1,'rgba(3,9,21,.08)');g.fillStyle=shade;g.fillRect(0,0,w,h);return c;});}
  function ground(w,h,state){const levels=levelsFor(state).map(v=>Math.floor(v*40)/40),tone=toneFor(state),key=[w,h,state.seed,...levels,...tone].join(':');return cached(beds,key,()=>{const c=canvas(w,h),g=c.getContext('2d'),growth=config.environments.growth;
   for(const bed of bedPlan(state)){const level=levels[bed.kind],emerge=smooth((level-bed.threshold)*3);if(!emerge)continue;const mature=smooth((level-.28)/.65),width=w*bed.size*(.40+.60*level),x=w*bed.x,y=h*bed.y;
    g.save();g.translate(x,y);if(bed.mirror)g.scale(-1,1);
    g.save();g.scale(1,.11);glow(g,0,-8,width*.62,'1,5,12',emerge*.52);g.restore();
    g.globalAlpha=emerge*(bed.depth==='near'?.78:.39);
    for(const [row,alpha]of [[0,1-mature],[1,mature]]){if(alpha<=0)continue;const region=growth.regions[row*4+bed.kind],sprite=colony(region,bed.kind,state),height=width*region[3]/region[2];g.save();g.globalAlpha*=alpha;g.drawImage(sprite,-width*.5,-height,width,height);g.restore();}g.restore();
   }
   // A shared low veil embeds roots in the terrain rather than displaying cutout stickers.
   const veil=g.createLinearGradient(0,h*.82,0,h);veil.addColorStop(0,'rgba('+tone.join(',')+',0)');veil.addColorStop(1,'rgba('+tone.join(',')+',.12)');g.fillStyle=veil;g.fillRect(0,h*.82,w,h*.18);return c;});}
  function resources(g,w,h,state,time){const levels=levelsFor(state);g.drawImage(ground(w,h,state),0,0);g.save();
   // Different sizes, phase offsets and elliptical routes read as independent animals.
   for(let i=0;i<12;i++){const emerge=smooth((levels[0]-i/14)*4);if(!emerge)continue;const n=state.seed+i*11,phase=time*.00055*(.45+noise(n)*.4)+noise(n+5)*6.28,left=i%2===0,depth=.55+noise(n+8)*.45;
    const x=w*((left?.13:.82)+Math.sin(phase)*(.045+noise(n)*.025)),y=h*(.48+noise(n+2)*.27)+Math.sin(phase*1.3+i)*(3+i%3),size=(11+noise(n+3)*19)*(.75+.25*levels[0])*depth,item=config.food.life,r=item.regions[(i+state.seed)%4],scale=size/Math.max(r[2],r[3]);
    g.save();g.globalAlpha=emerge*(.26+.30*levels[0])*depth;g.translate(x,y);g.scale(Math.cos(phase)>0?-1:1,1);g.rotate(Math.sin(phase*2)*.07);g.drawImage(images.get(item.file),...r,-r[2]*scale/2,-r[3]*scale/2,r[2]*scale,r[3]*scale);g.restore();
   }
   // Information drifts as small motes around existing branches, not drawn electrical wires.
   if(levels[2])for(let i=0;i<8;i++){const n=state.seed+i*19,x=w*((i%2===0?.08:.80)+noise(n)*.10),y=h*(.49+noise(n+1)*.38),phase=time*.0004+i;g.fillStyle='rgba(175,177,218,'+(levels[2]*(.16+.08*Math.sin(phase)))+')';g.beginPath();g.arc(x+Math.sin(phase)*4,y+Math.cos(phase)*6,1+i%2*.45,0,Math.PI*2);g.fill();}
   if(levels[3]){g.globalAlpha=levels[3];for(let i=0;i<14;i++){const n=state.seed+i*23,x=w*noise(n),y=h*(.72+noise(n+2)*.25),phase=time*.0002+i;F.seed(g,x+Math.sin(phase)*4,y+Math.cos(phase)*2,1+noise(n+3)*1.5,i%4,.23);}}
   g.restore();return levels;
  }
  function foreground(g,w,h,state){const tone=toneFor(state);g.save();g.fillStyle='rgba('+tone.join(',')+',.026)';g.fillRect(0,0,w,h);const vignette=g.createRadialGradient(w*.57,h*.48,w*.18,w*.57,h*.48,w*.74);vignette.addColorStop(0,'rgba(2,7,17,0)');vignette.addColorStop(1,'rgba(2,7,17,.35)');g.fillStyle=vignette;g.fillRect(0,0,w,h);g.restore();}
  function draw(g,w,h,state,time,still){g.drawImage(backdrop(w,h,state),0,0);if(!still)weather(g,w,h,state,time,weightsFor(state));resources(g,w,h,state,still?0:time);}
  return {draw,foreground,resources,stats:()=>({bytes,limit,backdrops:backdrops.size,beds:beds.size,colonies:colonies.size,hits,builds})};
 }
 // Public pure planning helpers are also used by Node validation.
 return {weightsFor,levelsFor,bedPlan,toneFor,create};
});
