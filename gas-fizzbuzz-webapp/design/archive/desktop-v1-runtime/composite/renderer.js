(function(root){
  'use strict';
  const E=root.CreatureEngine;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const legged=new Set(['myth','recursive','crystal','parallel','memory','serpent']);
  const defaults={head:[120,115],eye:[64,64],mouth:[120,135],dorsal:[220,205],shoulder:[215,205],flank:[170,170],chest:[205,160],forelimb:[160,185],hindlimb:[125,170],tailTip:[200,165],outerOrbit:[210,210]};
  const frontAnchors=new Set(['head','eye','mouth','chest','forelimb','flank']);

  function create(canvas,config){
    const images=new Map(),missing=new Set(),ctx=canvas.getContext('2d');
    let prepared=false,lastDraw=[],surfaceCache=null;
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
    function paint(g,key,level,x,y,w,h,angle=0,alpha=1,flip=false,tint=0,center=false){
      const s=sprite(key,level);if(!s)return;
      const im=images.get(s.file);if(!im)return;
      const [sx,sy,sw,sh]=s.region,scale=Math.min(w/sw,h/sh),pivot=center?[sw/2,sh/2]:s.root;
      g.save();g.translate(x,y);g.rotate(angle);if(flip)g.scale(-1,1);
      g.globalAlpha*=alpha;
      // A single palette adjustment applies to body and organs from the same DNA.
      g.filter='hue-rotate('+tint.toFixed(2)+'deg)';
      g.drawImage(im,sx,sy,sw,sh,-pivot[0]*scale,-pivot[1]*scale,sw*scale,sh*scale);
      g.restore();lastDraw.push(key);
    }
    function skeleton(a){
      const n=a.anatomy,d=a.dna,p=a.progress;
      // Engine anatomy already contains the cube-root volume scale.
      const volume=1,trunkShape=n.torso;
      const bw=260*trunkShape.scaleX*volume,bh=130*trunkShape.scaleY*volume;
      const hw=160*n.head.scaleX*volume,hh=140*n.head.scaleY*volume;
      const head=[-bw*.37,-bh*.18];
      const posture=legged.has(a.lineage)?p*.12:-p*.04;
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
      body.sockets.mouth=project('common:head',bodyTier(n.head),head,hw,hh,.035,.57);
      body.sockets.head=project('common:head',bodyTier(n.head),head,hw,hh,.52,.16);
      body.sockets.tailTip=project('common:tail',bodyTier(n.tail),body.sockets.tailBase,220*n.tail.scaleX,190*n.tail.scaleY,.78,.54,-.17);
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
      const size=defaults[part.anchor]||[160,160],scale=.45+.25*part.level+.15*part.growth;
      const tint=(a.color[0]-a.color[2])*.22+a.dna.skin*24-12;
      const count=clamp(part.count||1,1,6);
      for(let i=0;i<count;i++){
        const far=i%2===1;
        let x=base[0],y=base[1],angle=0,flip=far,center=false;
        let width=size[0]*scale*b.volume,height=size[1]*scale*b.volume;
        if(part.anchor==='outerOrbit'){
          const isRing=/ring|halo/i.test(part.id);
          if(isRing){x=0;y=-10;angle=-.16;flip=false;center=true;width=height=Math.max(b.bw,b.bh)*1.35;}
          else{const theta=-Math.PI*.85+i*Math.PI*1.85/count+(reduced?0:t/7000);x=Math.cos(theta)*(b.bw*.6+90);y=Math.sin(theta)*(b.bh*.7+105);}
        }else if(part.anchor==='tailTip'){angle=-.12;}
        else if(part.anchor==='flank'){x+=(i-(count-1)/2)*32;y+=i%2*19;angle=far?Math.PI*.65:Math.PI*.25;}
        else if(part.anchor==='forelimb'||part.anchor==='hindlimb'){x+=i*25;y+=far?-14:15;angle=Math.PI+(far?.3:-.25);}
        else if(part.anchor==='shoulder'){x+=far?35:-10;y+=far?-24:15;angle=far?-.65:.5;
          if(part.id==='additionalNeck'){x=base[0]+60+i*75;y=base[1]-b.bh*.18;angle=(i-.5)*.12;width=220*scale;height=280*scale;flip=false;}}
        else if(part.anchor==='eye'){x+=i*28;y+=i%2*17;angle=Math.PI;}
        else if(part.anchor==='mouth'){x-=i*12;y+=i*11;angle=-Math.PI*.55;}
        else if(part.anchor==='head'){x+=i*30;angle=(i-(count-1)/2)*.28;}
        const opacity=part.inherited?.68:(far?.78:1);
        paint(g,part.lineage+':'+part.id,part.level,x,y,width,height,angle,opacity,flip,tint,center);
      }
    }
    function anatomy(g,a,b){
      const n=a.anatomy,tint=(a.color[0]-a.color[2])*.22+a.dna.skin*24-12;
      const tail=b.sockets.tailBase;
      paint(g,'common:tail',bodyTier(n.tail),tail[0],tail[1],220*n.tail.scaleX*b.volume,190*n.tail.scaleY*b.volume,-.17,1,false,tint);
      const leg=legged.has(a.lineage),limb=n.limb;
      for(const side of [-1,1]){
        const anchor=b.sockets.hindlimb;
        if((limb.visibility||0)>.02){
          paint(g,leg?'common:limb':'common:fin',bodyTier(limb),anchor[0]+side*22,anchor[1]+side*8,
            120*limb.scaleX*b.volume,145*limb.scaleY*b.volume,leg?.15:Math.PI*.62,(limb.visibility||0)*(side<0?.68:1),side<0,tint);
        }
      }
      paint(g,'common:fin',bodyTier(n.fin),b.bw*.10,-b.bh*.30,150*n.fin.scaleX*b.volume,155*n.fin.scaleY*b.volume,-.1,.88,false,tint);
      paint(g,'common:torso',bodyTier(n.torso),0,0,b.bw,b.bh,0,1,false,tint);
      // Deterministic surface marks are clipped to the trunk's own PNG alpha.
      const surfaceKey=[a.seed,bodyTier(n.torso),a.color.map(x=>Math.round(x/8)).join(','),Math.round(n.shell.growth*10)].join(':');
      const marks=surfaceCache&&surfaceCache.key===surfaceKey?surfaceCache.canvas:document.createElement('canvas');
      const trunk=sprite('common:torso',bodyTier(n.torso)),image=trunk&&images.get(trunk.file);
      if(image){
        if(!surfaceCache||surfaceCache.key!==surfaceKey){
        marks.width=360;marks.height=220;
        const mg=marks.getContext('2d');
        mg.drawImage(image,...trunk.region,0,0,360,220);mg.globalCompositeOperation='source-in';
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
      paint(g,'common:fin',bodyTier(n.fin),fin[0],fin[1],125*n.fin.scaleX*b.volume,125*n.fin.scaleY*b.volume,Math.PI*.64,.9,false,tint);
      paint(g,'common:head',bodyTier(n.head),b.head[0],b.head[1],b.hw,b.hh,0,1,false,tint);
    }
    function eyes(g,a,b){
      const n=a.anatomy.eyes;
      const x=b.head[0]-b.hw*.20,y=b.head[1]-b.hh*.45;
      const spacing=n.spacing||(.4+a.dna.senses*.6),count=clamp(n.count||1,1,2);
      for(let i=count-1;i>=0;i--){
        paint(g,'common:eye',bodyTier(n),x+i*spacing*110,y-i*spacing*45,52*n.scaleX*b.volume,52*n.scaleY*b.volume,0,i?.70:1,false,(a.color[2]-a.color[0])*.1);
      }
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
      lastDraw=[];
      const a=E.appearanceFor(state),b=skeleton(a),w=target.width,h=target.height,mini=!!options.mini;
      const time=options.time||0,reduced=options.still!==false;
      g.clearRect(0,0,w,h);if(!mini)background(g,w,h,time);
      const fit=Math.min(w/1400,h/920)*(mini?.95:1);
      g.save();g.translate(w*.49,h*.53);g.scale(fit,fit);g.rotate(b.posture);
      if(!reduced)g.translate(0,Math.sin(time/1250)*2.3);
      const organs=mergeOrgans(a);
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
      g.restore();
    }
    function draw(state,options){drawTo(ctx,canvas,state,options);}
    function portrait(state,width=300,height=200){
      const target=document.createElement('canvas');target.width=width;target.height=height;
      drawTo(target.getContext('2d'),target,state,{mini:true,still:true});return target.toDataURL('image/png');
    }
    function organPortrait(part,width=100,height=80){
      const target=document.createElement('canvas');target.width=width;target.height=height;
      const g=target.getContext('2d'),s=sprite(part.lineage+':'+part.id,Math.max(1,part.level));
      if(s&&images.get(s.file))g.drawImage(images.get(s.file),...s.region,0,0,width,height);
      return target;
    }
    return {prepare,draw,portrait,organPortrait,missingAssets:()=>[...missing],renderedKeys:()=>lastDraw.slice(),assetVersion:config.version};
  }
  root.CreatureRenderer={create};
})(window);
