(function(root){
  'use strict';
  const E=root.CreatureEngine;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const legged=new Set(['myth','recursive','crystal','parallel','memory','serpent']);
  const defaults={head:[120,115],eye:[64,64],mouth:[120,135],dorsal:[220,205],shoulder:[215,205],flank:[170,170],chest:[205,160],forelimb:[160,185],hindlimb:[125,170],tailTip:[200,165],outerOrbit:[210,210]};
  const frontAnchors=new Set(['head','eye','mouth','chest','forelimb','flank']);

  function create(canvas,config){
    const images=new Map(),missing=new Set(),ctx=canvas.getContext('2d');
    let prepared=false,lastDraw=[],lastSources=[],surfaceCache=null,currentPalette=null;const paletteCache=new Map(),skinCache=new Map();
    const resolve=file=>new URL(file,document.baseURI).href;
    async function prepare(){
      const files=[...new Set(Object.values(config.sprites).flat().map(s=>s.file))];
      await Promise.all(files.map(async file=>{
        const im=new Image();im.src=resolve(file);
        try{await im.decode();images.set(file,im);}catch(error){missing.add(file);}
      }));
      if(missing.size)throw new Error('画像ファイルを読み込めません: '+[...missing].join(', '));
      prepared=true;
    }
    function sprite(key,level){
      const list=config.sprites[key];
      if(!list||!list.length){missing.add(key);return null;}
      return list[clamp(Math.floor(level)-1,0,list.length-1)];
    }
    function bodyKey(a,id){return (a.bodyFamily?'body-'+a.bodyFamily:'common')+':'+id;}
    function recolored(s,im,color){
      const key=[s.file,s.region.join(','),color.map(v=>Math.round(v/12)*12).join(',')].join(':');
      if(paletteCache.has(key))return paletteCache.get(key);
      const [, ,w,h]=s.region,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(im,...s.region,0,0,w,h);
      const data=g.getImageData(0,0,w,h),p=data.data;
      for(let i=0;i<p.length;i+=4){if(!p[i+3])continue;const l=(p[i]*.22+p[i+1]*.65+p[i+2]*.13)/255;const amount=l<.12?.12:l>.8?.28:.72;
        const blend=s.anatomy?.material==='alloy'?amount*.6:amount;
        for(let j=0;j<3;j++){const target=color[j]*(.35+.95*l)+(l>.65?(l-.65)*180:0);p[i+j]=Math.round(p[i+j]*(1-blend)+clamp(target,0,255)*blend);}}
      g.putImageData(data,0,0);if(paletteCache.size>220)paletteCache.clear();paletteCache.set(key,c);return c;
    }
    function paint(g,key,level,x,y,w,h,angle=0,alpha=1,flip=false,tint=0,center=false,attach=false){
      const s=sprite(key,level);if(!s)return;
      const im=images.get(s.file);if(!im)return;
      const [sx,sy,sw,sh]=s.region,scale=Math.min(w/sw,h/sh),pivot=center?[sw/2,sh/2]:attach?s.attachmentRoot:s.root;
      g.save();g.translate(x,y);g.rotate(angle);if(flip)g.scale(-1,1);
      g.globalAlpha*=alpha;
      // A single palette adjustment applies to body and organs from the same DNA.
      g.filter=currentPalette?'none':'hue-rotate('+tint.toFixed(2)+'deg)';
      const painted=currentPalette?recolored(s,im,currentPalette):im;
      g.drawImage(painted,currentPalette?0:sx,currentPalette?0:sy,sw,sh,-pivot[0]*scale,-pivot[1]*scale,sw*scale,sh*scale);
      g.restore();lastDraw.push(key);lastSources.push({key,level:clamp(Math.floor(level),1,config.sprites[key].length),file:s.file,region:s.region.slice()});
    }
    function livingSkin(a,s,base){
      const tissue=a.anatomy.shell,step=Math.round(tissue.growth*32),key=[s.file,s.region,step,tissue.pattern,a.dna.seed,a.color].join(':');
      if(skinCache.has(key))return skinCache.get(key);
      const [, ,w,h]=s.region,painted=document.createElement('canvas'),marks=document.createElement('canvas');painted.width=marks.width=w;painted.height=marks.height=h;
      const pg=painted.getContext('2d'),mg=marks.getContext('2d');pg.drawImage(base,0,0,w,h);
      mg.strokeStyle=mg.fillStyle='rgb('+a.color.map(v=>clamp(v+65,0,255)).join(',')+')';mg.lineWidth=1+step/12;
      const gap=Math.max(12,Math.round(Math.min(w,h)/9)),offset=a.dna.seed%gap;
      for(let y=offset;y<h;y+=gap)for(let x=offset;x<w;x+=gap){
        if(tissue.pattern===0){mg.beginPath();mg.moveTo(x,y);mg.quadraticCurveTo(x+gap*.4,y-gap*.3,x+gap*.8,y);mg.stroke();}
        else if(tissue.pattern===1){mg.beginPath();mg.ellipse(x,y,1+step/12,2+step/8,0,0,Math.PI*2);mg.fill();}
        else if(tissue.pattern===2){mg.beginPath();for(let i=0;i<=6;i++){const t=i*Math.PI/3;mg.lineTo(x+Math.cos(t)*gap*.35,y+Math.sin(t)*gap*.35);}mg.stroke();}
        else{mg.beginPath();mg.moveTo(x,y+gap);mg.lineTo(x+gap*.3,y);mg.moveTo(x+gap*.15,y+gap*.5);mg.lineTo(x+gap*.5,y+gap*.25);mg.stroke();}
      }
      mg.globalCompositeOperation='destination-in';mg.drawImage(base,0,0,w,h);
      pg.globalAlpha=.025+tissue.growth*.13;pg.drawImage(marks,0,0);if(skinCache.size>64)skinCache.clear();skinCache.set(key,painted);return painted;
    }
    const eyeSites={aquatic:[.15,.48],amphibian:[.14,.44],avian:[.14,.36],serpent:[.19,.35],crystal:[.16,.48],arthropod:[.18,.51],jelly:[.43,.46],cephalopod:[.17,.40],botanical:[.17,.44],whale:[.21,.47],mechanical:[.15,.44],ethereal:[.15,.43]};
    function integratedSkeleton(a){
      const biological=a.version>=4,level=Math.min(biological?4:3,a.stage+1),prefix=biological?'bio-':'core-',key=prefix+a.bodyPlan+':body',s=sprite(key,level),n=a.anatomy;
      const verticalMesh=biological&&s.anatomy?.axis==='vertical';
      const sw=s.region[2],sh=s.region[3],baseScale=Math.min(480*n.torso.scaleX/sw,300*n.torso.scaleY/sh);
      const slices=72,dx=(verticalMesh?sh:sw)/slices,positions=[0],sx=[],sy=[];
      function smooth(t){t=clamp(t,0,1);return t*t*(3-2*t);}
      for(let i=0;i<slices;i++){const u=(i+.5)/slices,h=1-smooth((u-.16)/.30),tail=smooth((u-.58)/.30);
        const vx=1+h*(clamp(n.head.scaleX/n.torso.scaleX,.65,1.5)-1)+tail*(clamp(n.tail.scaleX/n.torso.scaleX,.65,1.6)-1),vy=1+h*(clamp(n.head.scaleY/n.torso.scaleY,.7,1.4)-1)+tail*(clamp(n.tail.scaleY/n.torso.scaleY,.65,1.5)-1);
        sx.push(vx);sy.push(vy);positions.push(positions[i]+dx*baseScale*(verticalMesh?vy:vx));}
      const width=verticalMesh?sw*baseScale*Math.max(...sx):positions[slices],height=verticalMesh?positions[slices]:sh*baseScale*Math.max(...sy);
      function point(u,v){const along=verticalMesh?v:u,slot=clamp(Math.floor(along*slices),0,slices-1),fraction=along*slices-slot;return verticalMesh?[(u-.5)*sw*baseScale*sx[slot],positions[slot]+fraction*dx*baseScale*sy[slot]-height*.5]:[positions[slot]+fraction*dx*baseScale*sx[slot]-width*.5,(v-.5)*sh*baseScale*sy[slot]];}
      const bell=a.bodyPlan==='jelly',flower=a.bodyPlan==='botanical',eye=bell&&a.stage===0?[.20,.38]:eyeSites[a.bodyPlan],vertical=bell||flower;
      const sockets={eye:point(...eye),head:point(eye[0]+.07,eye[1]-.13),mouth:point(Math.max(.03,eye[0]-.1),eye[1]+.09),
        dorsal:point(vertical?.5:.48,vertical?.20:.28),shoulder:point(vertical?.32:.35,vertical?.48:.43),flank:point(.53,.57),chest:point(.40,.57),
        forelimb:point(vertical?.35:.31,.66),hindlimb:point(.65,.68),tailBase:point(.78,.57),tailTip:point(vertical?.58:.91,vertical?.82:.53),outerOrbit:point(.52,.46)};
      if(biological&&s.anatomy?.joints)for(const [joint,p]of Object.entries(s.anatomy.joints))sockets[joint]=point(...p);
      return {integrated:true,biological,verticalMesh,prefix,key,level,s,sw,sh,baseScale,slices,dx,positions,sx,sy,bw:width,bh:height,volume:1,head:sockets.head,hw:width*.27,hh:height*.3,posture:0,sockets};
    }
    function coherentAnatomy(g,a,b){
      const n=a.anatomy,finKey=b.prefix+a.bodyPlan+':fin',limbKey=b.prefix+a.bodyPlan+':limb';
      const tier=part=>b.biological?Math.min(a.stage+1,part.level):bodyTier(part);
      // Far appendages grow from real source-body sockets; they remain behind its skin.
      const aquatic=['aquatic','whale','jelly','cephalopod','ethereal'].includes(a.bodyPlan),finCount=n.fin.count||2;
      for(let i=0;i<finCount;i++){const side=i%2?-1:1,root=i>=2?b.sockets.flank:b.sockets.shoulder;
        paint(g,finKey,tier(n.fin),root[0]+side*5,root[1]+side*5,(b.biological?75:100)*n.fin.scaleX,(b.biological?90:110)*n.fin.scaleY,side*(aquatic?.45:.25),side<0?.82:1,side<0);}
      const source=images.get(b.s.file);let im=currentPalette?recolored(b.s,source,currentPalette):source;
      if(b.biological)im=livingSkin(a,b.s,im);
      g.save();for(let i=0;i<b.slices;i++){
        const xscale=b.baseScale*b.sx[i],yscale=b.baseScale*b.sy[i],sx=currentPalette?0:b.s.region[0],sy=currentPalette?0:b.s.region[1];
        if(b.verticalMesh)g.drawImage(im,sx,sy+i*b.dx,b.sw,b.dx,-b.sw*.5*xscale,b.positions[i]-b.bh*.5,b.sw*xscale,b.dx*yscale+.6);
        else g.drawImage(im,sx+i*b.dx,sy,b.dx,b.sh,b.positions[i]-b.bw*.5,-b.sh*.5*yscale,b.dx*b.baseScale*b.sx[i]+.6,b.sh*yscale);}
      g.restore();lastDraw.push(b.key);lastSources.push({key:b.key,level:b.level,file:b.s.file,region:b.s.region.slice()});
      // Actual tissue pattern follows the alpha of the entire integrated core.
      if(a.stage===3&&!b.biological){g.save();g.globalAlpha=.18;g.shadowColor='rgb('+a.color.join(',')+')';g.shadowBlur=15;
        for(let i=0;i<2;i++)paint(g,finKey,3,b.sockets.dorsal[0]+i*15,b.sockets.dorsal[1],100*n.fin.scaleX,115*n.fin.scaleY,(i-.5)*.35,.65,i===1);g.restore();}
      for(let side of [-1,1]){const joint=a.bodyPlan==='jelly'||a.bodyPlan==='cephalopod'?b.sockets.flank:b.sockets.forelimb;
        paint(g,limbKey,tier(n.limb),joint[0]+side*7,joint[1],(b.biological?58:70)*n.limb.scaleX,(b.biological?78:95)*n.limb.scaleY,side*.16,.35+.6*n.limb.visibility,side<0);}
    }
    function skeleton(a){
      if(a.bodyPlan)return integratedSkeleton(a);
      const n=a.anatomy,d=a.dna,p=a.progress;
      // Engine anatomy already contains the cube-root volume scale.
      const volume=1,trunkShape=n.torso;
      const long=a.bodyFamily==='serpent'?1.55:1,armored=a.bodyFamily==='crystal'?1.2:1;
      const targetBW=260*trunkShape.scaleX*volume*long,targetBH=130*trunkShape.scaleY*volume*armored;
      const trunkSprite=sprite(bodyKey(a,'torso'),bodyTier(n.torso)),tw=trunkSprite.region[2],th=trunkSprite.region[3],trunkScale=Math.min(targetBW/tw,targetBH/th);
      const bw=tw*trunkScale,bh=th*trunkScale;
      const hw=160*n.head.scaleX*volume,hh=140*n.head.scaleY*volume;
      const head=a.bodyFamily?[-bw*.43,-bh*.02]:[-bw*.37,-bh*.18];
      const posture=legged.has(a.lineage)?-p*.08:-p*.03;
      const body={bw,bh,hw,hh,volume,head,posture,
        sockets:{head:[head[0],head[1]-hh*.35],eye:[head[0]-hw*.25,head[1]-hh*.29],mouth:[head[0]-hw*.49,head[1]+hh*.04],
          dorsal:[bw*.02,-bh*.38],shoulder:[-bw*.22,-bh*.03],flank:[bw*.05,bh*.13],chest:[-bw*.12,bh*.10],
          forelimb:[-bw*.25,bh*.18],hindlimb:[bw*.23,bh*.20],tailBase:[bw*.36,bh*.12],tailTip:[0,0],outerOrbit:[bw*.13,-bh*.10]}};
      // Project sockets from the same sprite/pivot/rotation used to draw the
      // anatomy, so a tail or whisker stays physically attached as DNA changes.
      function project(key,level,base,w,h,nx,ny,angle=0){
        const s=sprite(key,level),[, ,sw,sh]=s.region,scale=Math.min(w/sw,h/sh);
        const x=(nx*sw-s.root[0])*scale,y=(ny*sh-s.root[1])*scale;
        return [base[0]+x*Math.cos(angle)-y*Math.sin(angle),base[1]+x*Math.sin(angle)+y*Math.cos(angle)];
      }
      if(a.bodyFamily){body.head=project(bodyKey(a,'torso'),bodyTier(n.torso),[0,0],bw,bh,.08,.48);head[0]=body.head[0];head[1]=body.head[1];body.sockets.tailBase=project(bodyKey(a,'torso'),bodyTier(n.torso),[0,0],bw,bh,.92,.52);}
      body.sockets.eye=project(bodyKey(a,'head'),bodyTier(n.head),head,hw,hh,.28,.53);
      body.sockets.mouth=project(bodyKey(a,'head'),bodyTier(n.head),head,hw,hh,.035,.57);
      body.sockets.head=project(bodyKey(a,'head'),bodyTier(n.head),head,hw,hh,.52,.16);
      body.sockets.tailTip=project(bodyKey(a,'tail'),bodyTier(n.tail),body.sockets.tailBase,220*n.tail.scaleX,190*n.tail.scaleY,.78,.54,-.17);
      return body;
    }
    function bodyTier(n){return clamp(Math.ceil(n.level*.75),1,3);}
    function mergeOrgans(a){
      const organs=new Map();
      for(const part of [...a.inheritedOrgans,...a.organs]){
        if(!part.level)continue;
        const key=part.lineage+':'+part.id,previous=organs.get(key);
        if(!previous||part.level>previous.level||part.xp>previous.xp)organs.set(key,{...part,inherited:a.inheritedOrgans.includes(part)});
      }
      return [...organs.values()];
    }
    function organ(g,part,a,b,t,reduced){
      const base=b.sockets[part.anchor]||b.sockets.flank;
      const size=defaults[part.anchor]||[160,160],scale=(b.biological?.35:b.integrated?.50:1)*(b.biological&&part.inherited?.68:1)*(.45+.25*part.level+.15*part.growth)*(1+((part.form||1)-1)*.09);
      const tint=(a.color[0]-a.color[2])*.22+a.dna.skin*24-12;
      const count=clamp(part.count||1,1,6);
      for(let i=0;i<count;i++){
        const far=i%2===1;
        let x=base[0],y=base[1],angle=0,flip=far,center=false;
        let width=size[0]*scale*b.volume,height=size[1]*scale*b.volume;
        if(part.anchor==='outerOrbit'){
          const isRing=/ring|halo/i.test(part.id);
          if(isRing){x=0;y=-10;angle=-.16;flip=false;center=true;width=height=Math.max(b.bw,b.bh)*(b.biological&&part.inherited?.92:1.35);}
          else{const theta=-Math.PI*.85+i*Math.PI*1.85/count+(reduced?0:t/7000);x=Math.cos(theta)*(b.bw*(b.integrated?.43:.6)+(b.integrated?30:90));y=Math.sin(theta)*(b.bh*(b.integrated?.38:.7)+(b.integrated?35:105));if(b.integrated){width*=.55;height*=.55;g.save();g.strokeStyle='rgba('+a.color.join(',')+',.55)';g.lineWidth=2;g.beginPath();g.moveTo(base[0],base[1]);g.bezierCurveTo(base[0]+(x-base[0])*.25,base[1]-35,x-10,y+20,x,y);g.stroke();g.restore();}}
        }else if(part.anchor==='tailTip'){angle=-.12;}
        else if(part.anchor==='flank'){x+=(i-(count-1)/2)*32;y+=i%2*19;angle=far?Math.PI*.65:Math.PI*.25;}
        else if(part.anchor==='forelimb'||part.anchor==='hindlimb'){x+=i*(b.integrated?9:25);y+=far?-7:7;angle=Math.PI+(far?.3:-.25);}
        else if(part.anchor==='shoulder'){x+=far?35:-10;y+=far?-24:15;angle=far?-.65:.5;
          if(part.id==='additionalNeck'){x=base[0]+(b.integrated?10+i*24:60+i*75);y=base[1]-(b.integrated?0:b.bh*.18);angle=(i-.5)*.12;width=220*scale;height=280*scale;flip=false;}}
        else if(part.anchor==='eye'){x+=i*28;y+=i%2*17;angle=Math.PI;}
        else if(part.anchor==='mouth'){x-=i*12;y+=i*11;angle=-Math.PI*.55;}
        else if(part.anchor==='head'){x+=i*30;angle=(i-(count-1)/2)*.28;}
        const opacity=part.inherited?(b.biological?.68:.86):(far?.84:1);
        paint(g,part.lineage+':'+part.id,part.level,x,y,width,height,angle+((part.form||1)-1)*.06,opacity,flip,tint,center,b.biological);
      }
    }
    function anatomy(g,a,b){
      if(b.integrated){coherentAnatomy(g,a,b);return;}
      const n=a.anatomy,tint=(a.color[0]-a.color[2])*.22+a.dna.skin*24-12;
      const tail=b.sockets.tailBase;
      paint(g,bodyKey(a,'tail'),bodyTier(n.tail),tail[0],tail[1],220*n.tail.scaleX*b.volume,190*n.tail.scaleY*b.volume,-.17,1,false,tint);
      const leg=legged.has(a.lineage),limb=n.limb;
      for(const side of [-1,1]){
        const anchor=b.sockets.hindlimb;
        if((limb.visibility||0)>.02){
          paint(g,leg?bodyKey(a,'limb'):bodyKey(a,'fin'),bodyTier(limb),anchor[0]+side*22,anchor[1]+side*8,
            120*limb.scaleX*b.volume,145*limb.scaleY*b.volume,leg?.15:Math.PI*.62,(limb.visibility||0)*(side<0?.68:1),side<0,tint);
        }
      }
      paint(g,bodyKey(a,'fin'),bodyTier(n.fin),b.bw*.10,-b.bh*.30,150*n.fin.scaleX*b.volume,155*n.fin.scaleY*b.volume,-.1,.88,false,tint);
      paint(g,bodyKey(a,'torso'),bodyTier(n.torso),0,0,b.bw,b.bh,0,1,false,tint);
      // Deterministic surface marks are clipped to the trunk's own PNG alpha.
      const surfaceKey=[a.seed,bodyTier(n.torso),a.color.map(x=>Math.round(x/8)).join(','),Math.round(n.shell.growth*10)].join(':');
      const marks=surfaceCache&&surfaceCache.key===surfaceKey?surfaceCache.canvas:document.createElement('canvas');
      const trunk=sprite(bodyKey(a,'torso'),bodyTier(n.torso)),image=trunk&&images.get(trunk.file);
      if(image){
        if(!surfaceCache||surfaceCache.key!==surfaceKey){
        marks.width=360;marks.height=220;
        const mg=marks.getContext('2d');
        mg.drawImage(currentPalette?recolored(trunk,image,currentPalette):image,...(currentPalette?[0,0,trunk.region[2],trunk.region[3]]:trunk.region),0,0,360,220);mg.globalCompositeOperation='source-in';
        mg.fillStyle='rgba('+a.color.join(',')+',.24)';mg.fillRect(0,0,360,220);
        mg.globalCompositeOperation='source-atop';
        mg.fillStyle='rgba(201,230,255,'+(.08+.12*n.shell.growth)+')';
        const spacing=18+Math.floor(a.dna.skin*18);
        for(let y=22;y<200;y+=spacing)for(let x=25+(y%2)*8;x<345;x+=spacing){
          if((x+y+Math.floor(a.dna.seed))%7<3)mg.fillRect(x,y,3+Math.floor(n.shell.growth*4),n.shell.pattern%2?8:4);
        }
        surfaceCache={key:surfaceKey,canvas:marks};
        }
        const [, ,sw,sh]=trunk.region,scale=Math.min(b.bw/sw,b.bh/sh);
        g.save();g.drawImage(marks,-trunk.root[0]*scale,-trunk.root[1]*scale,sw*scale,sh*scale);g.restore();
      }
      const fin=b.sockets.forelimb;
      paint(g,bodyKey(a,'fin'),bodyTier(n.fin),fin[0],fin[1],125*n.fin.scaleX*b.volume,125*n.fin.scaleY*b.volume,Math.PI*.64,.9,false,tint);
      paint(g,bodyKey(a,'head'),bodyTier(n.head),b.head[0],b.head[1],b.hw,b.hh,0,1,false,tint);
    }
    function eyes(g,a,b){
      const n=a.anatomy.eyes,base=b.sockets.eye;
      const count=clamp(n.count||1,1,6),saved=currentPalette;
      const modes=n.sense||'',accent=/熱|赤外|紫外/.test(modes)?[255,154,61]:/位相|信号/.test(modes)?[209,128,255]:/電位|磁場/.test(modes)?[103,255,213]:[92,204,255];
      if(a.bodyFamily)currentPalette=accent;
      for(let i=count-1;i>=0;i--){
        const eyeScale=b.biological?(a.bodyPlan==='whale'?.22:.32):b.integrated?(a.bodyPlan==='whale'?.34:a.bodyPlan==='arthropod'?.48:.45):1;
        const extra=i>=2,x=base[0]+(i%2)*12+(extra?(i-1)*25:0),y=base[1]-(i%2)*9-(extra?18:0),factor=extra?.62:1;
        g.save();if(a.stage>0){g.shadowColor='rgb('+accent.join(',')+')';g.shadowBlur=6+a.stage*3;}
        paint(g,bodyKey(a,'eye'),bodyTier(n),x,y,48*n.scaleX*factor*eyeScale,48*n.scaleY*factor*eyeScale,0,i===1?.78:1,false,0);g.restore();
      }
      currentPalette=saved;
    }
    function background(g,w,h,time){
      const grad=g.createRadialGradient(w*.5,h*.45,10,w*.5,h*.45,w*.66);
      grad.addColorStop(0,'#182441');grad.addColorStop(.6,'#0b1428');grad.addColorStop(1,'#060c17');
      g.fillStyle=grad;g.fillRect(0,0,w,h);
      g.strokeStyle='rgba(101,142,204,.045)';g.lineWidth=1;
      for(let x=0;x<w;x+=50){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
      for(let y=0;y<h;y+=50){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
      g.fillStyle='rgba(158,205,250,.36)';
      for(let i=0;i<35;i++){const x=(i*167+53)%w,y=(i*97+33)%h;g.fillRect(x,y,i%9?1:2,i%9?1:2);}
      g.strokeStyle='rgba(152,202,254,.10)';g.beginPath();g.ellipse(w*.5,h*.74,w*.3,h*.055,0,0,Math.PI*2);g.stroke();
    }
    function drawTo(g,target,state,options={}){
      if(!prepared)return;
      lastDraw=[];lastSources=[];
      const a=E.appearanceFor(state);currentPalette=a.bodyFamily?a.color:null;const b=skeleton(a),w=target.width,h=target.height,mini=!!options.mini;
      const time=options.time||0,reduced=options.still!==false;
      g.clearRect(0,0,w,h);if(!mini)background(g,w,h,time);
      const organs=mergeOrgans(a);
      const ringExtent=organs.filter(p=>p.anchor==='outerOrbit'&&/ring|halo/i.test(p.id)).reduce((size,p)=>Math.max(size,Math.max(b.bw,b.bh)*(b.biological&&p.inherited?.92:1.35)+100),0);
      const extentX=b.integrated?Math.max(b.bw+230,ringExtent):Math.max(1100,b.bw*2.5+450),extentY=b.integrated?Math.max(b.bh+220,ringExtent):Math.max(900,b.bh*2.8+430);
      const fit=Math.min(w*.90/extentX,h*.86/extentY)*(mini?.92:1);
      g.save();g.translate(w*(b.integrated?.58:.50),h*(b.integrated?.56:.61));g.scale(fit,fit);g.rotate(b.posture);
      if(!reduced){const breath=Math.sin(time/1250);g.translate(0,breath*2.3);g.scale(1+breath*.008,1-breath*.012);}
      const isFront=p=>frontAnchors.has(p.anchor)||p.id==='additionalNeck';
      organs.filter(p=>!isFront(p)).sort((a,b)=>Number(!/ring|halo/i.test(a.id))-Number(!/ring|halo/i.test(b.id))).forEach(p=>organ(g,p,a,b,time,reduced));
      anatomy(g,a,b);
      organs.filter(isFront).forEach(p=>organ(g,p,a,b,time,reduced));
      eyes(g,a,b);
      if(!mini){
        const events=options.energyEvents||[];
        events.forEach(e=>{
          const f=clamp((time-e.time)/380,0,1);if(f>=1)return;
          const mouth=b.sockets.mouth;
          const colors={fizz:'#77ceff',buzz:'#ffd27c',fizzbuzz:'#c8a5ff',number:'#c1d4e4'};
          const x=-350+(mouth[0]+350)*f,y=-120+(mouth[1]+120)*f+Math.sin(f*Math.PI)*40;
          g.save();g.globalAlpha=1-f*.65;g.fillStyle=colors[e.kind];g.shadowColor=colors[e.kind];g.shadowBlur=18;
          g.beginPath();g.arc(x,y,6+(1-f)*3,0,Math.PI*2);g.fill();g.restore();
        });
      }
      g.restore();currentPalette=null;
    }
    function draw(state,options){const w=Math.round(canvas.clientWidth*(window.devicePixelRatio||1)),h=Math.round(canvas.clientHeight*(window.devicePixelRatio||1));if(w>0&&h>0&&(canvas.width!==w||canvas.height!==h)){canvas.width=w;canvas.height=h;}drawTo(ctx,canvas,state,options);}
    function portrait(state,width=300,height=200){
      const target=document.createElement('canvas');target.width=width;target.height=height;
      drawTo(target.getContext('2d'),target,state,{mini:true,still:true});return target.toDataURL('image/png');
    }
    function organPortrait(part,width=100,height=80){
      const target=document.createElement('canvas');target.width=width;target.height=height;
      const g=target.getContext('2d'),s=sprite(part.lineage+':'+part.id,Math.max(1,part.level));
      if(s&&images.get(s.file)){let [x,y,w,h]=s.region;if(part.crop){const c=s.anatomy?.crops?.[part.bodyPart]||part.crop;x+=w*c[0];y+=h*c[1];w*=c[2];h*=c[3];}const scale=Math.min(width/w,height/h);g.drawImage(images.get(s.file),x,y,w,h,(width-w*scale)/2,(height-h*scale)/2,w*scale,h*scale);}
      return target;
    }
    return {prepare,draw,portrait,organPortrait,missingAssets:()=>[...missing],renderedKeys:()=>lastDraw.slice(),renderedSources:()=>lastSources.map(s=>({...s,region:s.region.slice()})),assetVersion:config.version};
  }
  root.CreatureRenderer={create};
})(window);
