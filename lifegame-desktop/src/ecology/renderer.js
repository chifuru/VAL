/* Rendering reads a settled world. Animation never changes biological state. */
(function (root, factory) {
  const api = factory(root.EcoState, root.EcoArt);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EcoRenderer = api;
})(globalThis, function (S, Art) {
  "use strict";
  const resourceKinds=Object.keys(S.FOOD);
  const colors = [
    "#63c9c4",
    "#efad64",
    "#bea2e8",
    "#82ba99",
    "#b0d1dc",
    "#97bd68",
    "#d4c179",
    "#c59873",
  ];
  // ID order is stable; highlight colors never depend on selection order.
  function highlightColor(id) {
    const index=[...S.D.species,...(S.D.independentPlants||[]),...(S.D.ryouki?[S.D.ryouki]:[])].findIndex(s=>s.id===id);
    return `hsl(${Math.round((index*137.508+32)%360)} 78% 68%)`;
  }
  // Cartographic symbols, shared by board and legend. Shape is independent of biology.
  const symbolPaths = {
      abyss:
        "M-.7 .6 Q-1 -.7 0 -.7 Q1 -.7 .7 .6 M-.45 .25 Q-.8 1 -.95 .5 M0 .3 Q.15 1 .4 .65 M.4 .2 Q1 .8 .9 .2",
      myth: "M-1 .4 L-.4 -.45 L0 .1 L.4 -.7 L1 .2 L.2 .45 L0 .9 Z",
      recursive: "M-.8 -.7 H.1 V-.1 H.8 V.7 H-.1 V.1 H-.8 Z M-.45 -.4 L.45 .4",
      sail: "M0 -.9 L.9 .5 H-.8 Z M0 -.9 V.7 M-.85 .8 H.85",
      gravity:
        "M-.85 0 A.85 .4 -30 1 0 .85 0 A.85 .4 -30 1 0 -.85 0 M0 -.45 V.45 M-.25 0 H.25",
      crystal:
        "M0 -.95 L.7 -.25 L.5 .7 L0 1 L-.5 .7 L-.7 -.25 Z M0 -.95 V1 M-.7 -.25 H.7",
      manyeyes:
        "M0 -.8 A.8 .8 0 1 0 .01 -.8 M-.6 -.2 H-.3 M.3 -.2 H.6 M-.15 .4 H.15",
      abyssshell:
        "M-.8 .5 Q-.8 -1 0 -.8 Q.8 -1 .8 .5 Z M-.35 .4 V-.4 M0 .4 V-.65 M.35 .4 V-.4",
      parallel:
        "M-.7 -.8 V.8 M0 -.8 V.8 M.7 -.8 V.8 M-.9 -.45 H.9 M-.9 .45 H.9",
      memory: "M-.8 0 A.8 .8 0 1 1 0 .8 H-.4 V.1 H.35 V-.35 H-.25",
      serpent:
        "M-.7 .7 C.8 1 -1 -.4 .2 -.4 C1 -.4 .9 -1 .35 -.8 M.35 -.8 L.4 -.5",
      solar:
        "M0 -.6 A.6 .6 0 1 0 .01 -.6 M0 -.8 V-1 M0 .8 V1 M-.8 0 H-1 M.8 0 H1 M-.6 -.6 L-.8 -.8 M.6 -.6 L.8 -.8 M-.6 .6 L-.8 .8 M.6 .6 L.8 .8",
      antimeme:
        "M-.8 -.3 V-.8 H-.3 M.3 -.8 H.8 V-.3 M.8 .3 V.8 H.3 M-.3 .8 H-.8 V.3 M-.2 -.1 L.2 .1",
      valis: "M0 -.9 L.9 0 L0 .9 L-.9 0 Z M0 -.35 L.35 0 L0 .35 L-.35 0 Z",
      jelly:
        "M-.85 0 Q-.7 -1 0 -.8 Q.7 -1 .85 0 Z M-.5 0 Q-.8 .55 -.5 .9 M0 0 Q.3 .55 0 .95 M.5 0 Q.8 .55 .5 .9",
      kelp: "M0 .9 V-.8 M0 -.5 Q-1 -.9 -.6 -.2 Q-.2 .1 0 -.2 M0 .2 Q1 -.3 .65 .4 Q.2 .8 0 .5",
      whale: "M-.8 -.1 Q0 -1 .8 -.15 L1 -.5 V.5 L.7 .2 Q0 1 -.8 .1 Z",
      swarm:
        "M-.8 0 Q-.8 -.65 0 -.65 Q.8 -.65 .8 0 Q.8 .65 0 .65 Q-.8 .65 -.8 0 M-.8 0 H.8 M-.5 .5 L-.8 .9 M.5 .5 L.8 .9",
      plasma:
        "M-.6 -.75 L.1 -.4 L.5 -1 L.4 -.1 L.95 .2 L.25 .4 L-.2 1 L-.25 .2 L-.9 .05 Z",
      cephalopod:
        "M-.5 -.15 Q-.7 -.95 0 -.95 Q.7 -.95 .5 -.15 M-.5 -.15 Q-1 .8 -.5 .8 Q0 .8 -.15 .1 M.15 .1 Q0 .8 .5 .8 Q1 .8 .5 -.15",
      precocial:
        "M-.95 .4 L-.7 -.4 L0 -.75 L.7 -.4 L.95 .4 Z M-.7 -.4 L-.25 .4 M.7 -.4 L.25 .4 M-.95 .7 H.95",
      ryouki: "M-1 0 L0 -.5 L1 0 L0 .5 Z M-.9 -.05 L-1.15 -.3 M-.9 .05 L-1.15 .3 M-.55 .3 L-.7 .65 M-.15 .45 L-.2 .75 M.25 .4 L.35 .7 M.6 .2 L.8 .5",
      phytoplankton: "M-.4 -.55 A.48 .48 0 1 0 -.39 .41 A.48 .48 0 1 0 -.4 -.55 M.48 -.15 A.4 .4 0 1 0 .49 .65 A.4 .4 0 1 0 .48 -.15",
      tideparasite: "M-.8 -.5 Q-.1 -1 .5 -.4 Q1 .1 .3 .6 Q-.3 1 -.7 .3 M-.55 -.25 Q0 -.55 .4 0 M-.3 .35 L-.55 .75",
      leafparasite: "M0 -.85 L.65 0 L0 .85 L-.65 0 Z M-.9 -.45 L-.4 -.1 M.9 -.45 L.4 -.1 M-.9 .45 L-.4 .1 M.9 .45 L.4 .1",
      hyperparasite: "M0 -.9 L.8 .55 H-.8 Z M0 -.9 V.05 M-.8 .55 L0 .05 L.8 .55 M-.18 -.1 H.18 V.25 H-.18 Z",
      algae:
        "M-.8 .7 Q-.6 -.4 -.3 -.8 M0 .8 Q-.2 -.1 .2 -.75 M.5 .7 Q.8 0 .6 -.5",
      moss: "M-.85 .5 Q-.6 -.5 -.25 .2 Q0 -.8 .3 .1 Q.7 -.4 .85 .5 Z",
      grass:
        "M0 .9 V-.75 M0 .1 Q-.9 -.6 -.7 -.15 Q-.4 .3 0 .45 M0 -.2 Q.8 -.8 .7 -.25 Q.4 .1 0 .1",
      forestcrown: "M0 .9 V-.25 M-.9 -.35 Q-.7 -.85 0 -.8 Q.7 -.85 .9 -.35 Z M-.75 .15 Q-.55 -.35 0 -.25 Q.55 -.35 .75 .15 Z M-.45 .9 L0 .55 L.45 .9",
      starcrown: "M0 .9 V.05 M0 -.95 L.22 -.35 L.85 -.65 L.5 -.1 L1 .15 L.3 .25 L0 .65 L-.3 .25 L-1 .15 L-.5 -.1 L-.85 -.65 L-.22 -.35 Z",
      freshwaterlight: "M.65 -.65 C-.8 -1 -1 .8 .15 .75 C.85 .65 .7 -.3 -.1 -.25 C-.6 -.2 -.45 .35 .05 .25 M.65 -.65 Q1 -.15 .65 .05",
      fungus: "M-.9 0 Q-.8 -1 0 -.9 Q.8 -1 .9 0 Z M-.2 0 V.8 H.2 V0",
      waterbug:
        "M0 -.8 L.6 0 L0 .8 L-.6 0 Z M-.5 -.2 L-1 -.5 M.5 -.2 L1 -.5 M-.5 .2 L-1 .5 M.5 .2 L1 .5",
      grassbug:
        "M-.25 -.7 H.25 V.7 H-.25 Z M-.25 -.4 L-.9 -.7 M.25 -.4 L.9 -.7 M-.25 .3 L-.9 .65 M.25 .3 L.9 .65",
      info: "M0 -1 L.65 0 L0 1 L-.65 0 Z M0 -.45 V.45",
      seed: "M-.5 .7 Q-1 -.8 .6 -.7 Q1 .8 -.5 .7 M-.3 .4 L.4 -.45",
      spore: "M0 -.9 V.9 M-.8 -.45 L.8 .45 M-.8 .45 L.8 -.45",
      egg: "M0 -.9 C-1 -.4 -.8 .85 0 .85 C.8 .85 1 -.4 0 -.9 Z",
      organic: "M-.85 .1 L-.35 -.55 L.2 -.1 L.8 -.55 L.6 .65 L-.4 .8 Z",
      mineral: "M-.7 -.5 H.5 L.9 .1 L.4 .7 H-.5 L-.9 0 Z",
      droplet: "M0 -.95 Q-1 .3 -.55 .65 Q0 1.1 .55 .65 Q1 .3 0 -.95 Z",
      factor: "M-.8 -.6 H.8 L-.8 .6 H.8 M0 -.8 V.8",
    },
    symbolCache = new Map(),symbolImages=new Map(),ellipseImages=new Map(),basalSprites=new Map();
  let symbolResolution=24;
  const spriteMetrics={builds:0,hits:0,bytes:{symbols:0,ellipses:0,basal:0}};
  function readSprite(map,key){const image=map.get(key);if(image){map.delete(key);map.set(key,image);spriteMetrics.hits++;}return image;}
  function keepSprite(name,map,key,image,limit,count){map.set(key,image);spriteMetrics.builds++;spriteMetrics.bytes[name]+=image.width*image.height*4;while((spriteMetrics.bytes[name]>limit||map.size>count)&&map.size>1){const k=map.keys().next().value,a=map.get(k);map.delete(k);spriteMetrics.bytes[name]-=a.width*a.height*4;}}

  function symbolColor(s) {
    if (s.group !== "main")
      return s.group === "plant"
        ? "#d0ef9b"
        : s.group === "fungus"
          ? "#e5c0ff"
          : "#ffd18a";
    const vivid = {
      solar: "#ffb84b",
      jelly: "#64ddff",
      serpent: "#6ae3ff",
      cephalopod: "#cb93ff",
      kelp: "#b3e671",
      crystal: "#bce8ff",
    };
    if (vivid[s.id]) return vivid[s.id];
    const channels = s.color
      .match(/[0-9a-f]{2}/gi)
      .map((h) => Math.round(parseInt(h, 16) * 0.6 + 255 * 0.4));
    return "rgb(" + channels.join(",") + ")";
  }
  function symbol(g,id,x,y,r,color='#e8e4be'){
    if(!symbolPaths[id])return false;
    const pixels=Math.max(8,Math.min(192,Math.ceil(r*symbolResolution*2))),key=[id,color,pixels].join('/');
    let image=readSprite(symbolImages,key);
    if(!image){image=document.createElement('canvas');const n=pixels+8;image.width=image.height=n;const c=image.getContext('2d');c.translate(n/2,n/2);c.scale(pixels/2,pixels/2);c.lineJoin='round';c.lineCap='round';
      if(!symbolCache.has(id))symbolCache.set(id,new Path2D(symbolPaths[id]));const path=symbolCache.get(id);c.strokeStyle='#041820';c.lineWidth=.48;c.stroke(path);c.strokeStyle=color;c.lineWidth=.19;c.stroke(path);
      keepSprite('symbols',symbolImages,key,image,16*1024*1024,512);}
    const size=r*2*(image.width/pixels);g.drawImage(image,x-size/2,y-size/2,size,size);return true;
  }
  function ellipseStamp(g,x,y,rx,ry,fill,stroke=null,line=0){
    const z=symbolResolution,key=[rx,ry,fill,stroke,line,z].join('/');let image=readSprite(ellipseImages,key);
    if(!image){image=document.createElement('canvas');image.width=Math.max(2,Math.ceil((rx*2+line)*z)+4);image.height=Math.max(2,Math.ceil((ry*2+line)*z)+4);const c=image.getContext('2d');c.translate(image.width/2,image.height/2);c.scale(z,z);c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}keepSprite('ellipses',ellipseImages,key,image,8*1024*1024,256);}
    g.drawImage(image,x-image.width/z/2,y-image.height/z/2,image.width/z,image.height/z);
  }
  function basalSprite(g,o,x,y,z,age){
    const unit=Math.max(16,symbolResolution),key=[o.species,age.enabled,age.stage,!!o.infection,!!o.infection?.q,z,unit].join('/');let image=readSprite(basalSprites,key);
    if(!image){image=document.createElement('canvas');image.width=image.height=Math.ceil(unit*2)+4;const c=image.getContext('2d');c.translate(image.width/2,image.height/2);c.scale(unit,unit);
      ellipseStamp(c,0,.04,.22,.17,'#061922cc');ellipseStamp(c,0,0,.235,.185,'#02131cf0','#c5e9be99',Math.max(.018,.55/z));symbol(c,o.species,0,0,.17,symbolColor(S.spec(o)));
      if(age.enabled&&age.stage!=='adult'){c.strokeStyle=age.stage==='juvenile'?'#fff0b2':'#d7e2e0';c.lineWidth=1/z;c.beginPath();c.arc(.23,.12,.045,0,age.stage==='juvenile'?Math.PI*2:Math.PI*1.6);c.stroke();}
      if(o.infection){const [bx,by]=globalThis.EcoDisplayPlane.parasitePoint([0,0],'P',false);c.fillStyle='#19172b';c.beginPath();c.arc(bx,by,.1,0,7);c.fill();c.fillStyle='#ffba82';c.beginPath();c.arc(bx,by,.05,0,7);c.fill();if(o.infection.q){c.strokeStyle='#d8adff';c.lineWidth=Math.max(.025,.7/z);c.beginPath();c.arc(bx,by,.1,0,7);c.stroke();}}
      keepSprite('basal',basalSprites,key,image,4*1024*1024,256);
    }
    g.drawImage(image,x-image.width/unit/2,y-image.height/unit/2,image.width/unit,image.height/unit);
  }
  function creature(g, o, x, y, r, detail = true) {
    if(detail){
      g.save();
      const drawn=Art?.creature(g,{...o,renderEmphasis:false,renderLighting:true},x,y,r);
      g.restore();if(drawn)return;
    }
    symbol(g, o.species, x, y, r, symbolColor(S.spec(o)));
  }
  function food(g, o, x, y, r, env) {
    if (Art?.food(g, o, x, y, r, env)) return;
    symbol(g, o.species, x, y, r, symbolColor(S.spec(o)));
  }
  function producer(g,o,x,y,r,time=0){
    if(Art?.producer(g,o,x,y,r,time))return;
    symbol(g,o.species,x,y,r,symbolColor(S.spec(o)));
  }
  const bodyOffset=o=>o.slot==='main'?.18:o.slot==='producer'?(o.species==='freshwaterlight'?.10:.25):.03;
  let contactShadow=null;
  const markSprites=new Map(),markLabels={attack:'攻撃',defend:'防御',graze:'植物食',predate:'捕食',scavenge:'屍肉食',fungal:'分解食',absorb:'吸収',care:'育児',infection:'寄生',clear:'除去',birth:'出生',growth:'進化',death:'死亡'};
  const markColors={attack:'#ff9978',defend:'#9edfff',graze:'#b1e59a',predate:'#ffcb88',scavenge:'#d9ad91',fungal:'#d7bbef',absorb:'#b6e8dc',care:'#bce7b1',infection:'#d3a2ff',clear:'#eff7ed',birth:'#ffe3a0',growth:'#a7eeef',death:'#c6b7ad'};
  function actionKind(e,w){
    if(e.type==='information-effect'&&w?.config?.informationModel==='persistent/1')return null;
    if(e.type.startsWith('primary-'))return w?.config?.primaryParasiteModel==='primary/1'?({'primary-established':'infection','primary-transferred':'infection','primary-clear':'clear'}[e.type]||null):null;
    if(e.type.startsWith('hyper-'))return w?.config?.hyperParasiteModel==='hyper/1'?({'hyper-established':'infection','hyper-emerged':'growth','hyper-cleared':'clear'}[e.type]||null):null;
    return e.type==='feed'?(e.sourceType==='carcass'?'scavenge':e.sourceType==='plant'?(e.tag==='plant'?'graze':e.tag==='fungal'?'fungal':'predate'):'absorb'):e.type;
  }
  function markSprite(kind){
    if(markSprites.has(kind))return markSprites.get(kind);
    const c=document.createElement('canvas');c.width=112;c.height=34;const g=c.getContext('2d');
    g.fillStyle='#07232bf0';g.beginPath();g.roundRect(1,1,110,32,9);g.fill();g.strokeStyle=markColors[kind];g.lineWidth=2;g.stroke();
    g.fillStyle=markColors[kind];g.font='bold 21px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(markLabels[kind],56,18);
    markSprites.set(kind,c);return c;
  }
  function groundShadow(){
    if(contactShadow)return contactShadow;contactShadow=document.createElement('canvas');contactShadow.width=128;contactShadow.height=128;
    const g=contactShadow.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'#00131be0');r.addColorStop(1,'#00131b00');
    g.fillStyle=r;g.fillRect(0,0,128,128);return contactShadow;
  }
  function create(canvas) {
    const g = canvas.getContext("2d"),
      view = {
        scale: 10,
        mode: "auto",
        x: 0,
        y: 0,
        resources: true,
        planeSeparation: false,
        selectedEntity: null,
        grid: false,
        motion: true,
        ageEmphasis: false,
        emphasis: true,
        simplified: false,
        statusMarks: true,
        statusScope: "main",
        animate: false,
        duration: 260,
        selected: null,
        highlights: [],
        names: { basal:false, producer:false, prey:false, P:false, Q:false, resource:false },
      };
    const diagnostics = {
      mode: "detail",
      drawn: 0,
      motionActors: 0,
      selectedMotion: false,
      resources: 0,
      carcasses: 0,
      infectedHosts: 0,
      highParasites: 0,
    };
    const deathAppearances=new Map(),actionMarks=new Map();
    Art.ready.then(()=>{groundShadow();for(const kind of Object.keys(markLabels))markSprite(kind);});
    let livingById=new Map(),freeQById=new Map(),informationCells=new Map(),informationIndex=null,informationHitRegions=[],eventPlan=null,frameCandidates=null,objectIndex=null;
    let world = null,
      P = null,
      scene = null,
      geometryKey = null,
      lastTurn = -1,
      changedAt = 0,
      cache = null, overviewBounds=null,
      cacheKey = null,
      nearCache = null, nearRect = null,
      revision = 0,
      lastFrameKey = null,
      layout = null, layoutWorld = null, layoutEnabled = null, layoutDetail = null,
      basalLayer=null,
      previousActors = new Map(), previousCorpses = new Map(), hitRegions = [];
    let terrainWorker=null, terrainEpoch=0, terrainReady=false, terrainBusy=false,
      terrainRequest=null, terrainFailed=false, terrainMetrics=null;
    let fallbackNearToken=0,fallbackOverviewEpoch=null;
    function fallbackSurface(request){
      const epoch=terrainEpoch,overview=!!request.overview;
      if(overview&&fallbackOverviewEpoch===epoch)return;
      if(overview)fallbackOverviewEpoch=epoch;
      const token=overview?null:++fallbackNearToken,r=P.bounds,
        rect=overview?{x:-r.minX*24,y:-r.minY*24,scale:24,width:Math.ceil((r.maxX-r.minX)*24),height:Math.ceil((r.maxY-r.minY)*24),dpr:1}:request,
        c=document.createElement('canvas');c.width=Math.ceil(rect.width*rect.dpr);c.height=Math.ceil(rect.height*rect.dpr);
      const context=c.getContext('2d'),at=performance.now(),source=world,projection=P,surface=scene;
      context.scale(rect.dpr,rect.dpr);context.translate(rect.x,rect.y);context.scale(rect.scale,rect.scale);
      const visible=p=>p[0]*rect.scale+rect.x>=-rect.scale*2&&p[1]*rect.scale+rect.y>=-rect.scale*2&&p[0]*rect.scale+rect.x<=rect.width+rect.scale*2&&p[1]*rect.scale+rect.y<=rect.height+rect.scale*2;
      let x=0,y=0;
      const schedule=fn=>typeof requestIdleCallback==='function'?requestIdleCallback(fn,{timeout:100}):setTimeout(fn,0);
      const next=()=>{
        if(epoch!==terrainEpoch||(!overview&&token!==fallbackNearToken))return;
        let painted=false;
        for(let attempt=0;attempt<32&&y<source.config.height&&!painted;attempt++){
          const selected=[];for(let j=y;j<Math.min(y+4,source.config.height);j++)for(let i=x;i<Math.min(x+4,source.config.width);i++){const cell=j*source.config.width+i;if(overview||visible(projection.face(cell)[4]))selected.push(cell);}
          x+=4;if(x>=source.config.width){x=0;y+=4;}
          if(selected.length){surface.surface(context,null,true,rect.scale,selected);painted=true;}
        }
        if(y<source.config.height){schedule(next);return;}
        if(overview){
          const soft=document.createElement('canvas');soft.width=c.width;soft.height=c.height;const sg=soft.getContext('2d');sg.filter='blur(1.1px) saturate(.65) brightness(.72)';sg.drawImage(c,0,0);
          context.setTransform(1,0,0,1,0,0);context.globalCompositeOperation='copy';context.drawImage(soft,0,0);cache?.close?.();cache=c;overviewBounds=r;diagnostics.overviewBuildMs=performance.now()-at;
        }else if(request.key===cacheKey){nearCache?.close?.();nearCache=c;nearRect=rect;terrainMetrics=surface.metrics;diagnostics.terrainBuildMs=performance.now()-at;diagnostics.terrainPending=false;}
        diagnostics.terrainFallback=true;revision++;
      };
      schedule(next);
    }
    function failTerrain(){
      terrainFailed=true;terrainBusy=false;terrainWorker?.terminate();terrainWorker=null;cacheKey=null;diagnostics.terrainPending=false;revision++;
      if(!cache)fallbackSurface({overview:true});
    }
    function pumpTerrain(){
      if(!terrainReady||terrainBusy||!terrainRequest)return;
      const request=terrainRequest;terrainRequest=null;terrainBusy=true;
      diagnostics.terrainRequests=(diagnostics.terrainRequests||0)+1;
      terrainWorker.postMessage({type:"render",epoch:terrainEpoch,...request});
    }
    function resetTerrain(w){
      terrainEpoch++;fallbackNearToken++;fallbackOverviewEpoch=null;terrainWorker?.terminate();terrainWorker=null;
      nearCache?.close?.();nearCache=null;cache?.close?.();cache=null;overviewBounds=null;terrainReady=false;terrainBusy=false;
      terrainRequest=null;terrainMetrics=null;terrainFailed=false;
      diagnostics.terrainFallback=false;diagnostics.overviewBuildMs=0;diagnostics.terrainBuildMs=0;
      if(typeof OffscreenCanvas==="undefined"||typeof createImageBitmap==="undefined"||typeof Worker==="undefined"){failTerrain();return;}
      const epoch=terrainEpoch;
      try{
        terrainWorker=new Worker("ecology/terrain-worker.js");
        terrainWorker.onerror=e=>{if(epoch!==terrainEpoch)return;e.preventDefault?.();failTerrain();};
        terrainWorker.onmessage=({data:d})=>{
          if(epoch!==terrainEpoch||d.epoch!==epoch){d.bitmap?.close?.();return;}
          terrainBusy=false;
          if(d.type==='overview'){cache?.close?.();cache=d.bitmap;overviewBounds=d.bounds;diagnostics.overviewBuildMs=d.ms;revision++;return;}
          if(d.type==="error"){failTerrain();return;}
          if(d.key===cacheKey){nearCache?.close?.();nearCache=d.bitmap;nearRect=d.rect;terrainMetrics=d.metrics;diagnostics.terrainBuildMs=d.ms;diagnostics.terrainPending=false;revision++;}
          else d.bitmap?.close?.();
          pumpTerrain();
        };
        Promise.all(Object.entries(Art.images).filter(([key])=>key.startsWith("habitat-")).map(async([key,im])=>[key,await createImageBitmap(im)])).then(entries=>{
          if(epoch!==terrainEpoch||terrainFailed){for(const [,im]of entries)im.close();return;}
          const images=Object.fromEntries(entries);
          terrainWorker.postMessage({type:"init",epoch,world:{config:w.config,tiles:w.tiles},images},Object.values(images));
          terrainReady=true;pumpTerrain();
        }).catch(()=>{if(epoch===terrainEpoch)failTerrain();});
      }catch(e){failTerrain();}
    }
    function displayLayout(){
      const detail=view.scale>=24&&view.mode!=="overview"&&!view.simplified;
      if(layoutWorld!==world||layoutEnabled!==view.planeSeparation||layoutDetail!==detail){
        layout=globalThis.EcoDisplayPlane.create(world,P,view.planeSeparation,detail);
        layoutWorld=world;layoutEnabled=view.planeSeparation;layoutDetail=detail;
      }
      return layout;
    }
    function resize() {
      const b = canvas.getBoundingClientRect(),
        d = devicePixelRatio || 1,
        W = Math.max(1, Math.round(b.width * d)),
        H = Math.max(1, Math.round(b.height * d));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      g.setTransform(d, 0, 0, d, 0, 0);
      return b;
    }
    function setWorld(w, restartMotion = false) {
      revision++;livingById=new Map(w.organisms.map(o=>[o.id,o]));eventPlan=null;frameCandidates=null;
      freeQById=new Map(w.config.hyperParasiteModel==='hyper/1'?(w.searchQ||[]).filter(q=>S.HyperParasite?.is(q)).map(q=>[q.id,q]):[]);
      informationCells=new Map();informationIndex=null;
      if(S.PersistentInformation?.enabled(w))for(const record of w.informationField||[]){
        if(!(record.expires>w.turn&&record.amount>=S.PersistentInformation.settings(w).minimumAmount))continue;
        if(!informationCells.has(record.cell))informationCells.set(record.cell,{cell:record.cell,amount:0,origins:new Set(),records:0});
        const cell=informationCells.get(record.cell);cell.amount+=record.amount;cell.origins.add(record.originId);cell.records++;
      }
      const time=performance.now();
      if(world&&(w.turn<world.turn||w.config.seed!==world.config.seed))actionMarks.clear();
      for(const [key,m]of actionMarks)if(time-m.at>850)actionMarks.delete(key);
      for(const ev of w.events||[]){const kind=actionKind(ev,w);if(!markLabels[kind])continue;
        const key=[w.turn,ev.id,kind,ev.target||ev.source||''].join('|');
        if(!actionMarks.has(key)){if(actionMarks.size>=256)actionMarks.delete(actionMarks.keys().next().value);actionMarks.set(key,{id:ev.id,cell:ev.cell??livingById.get(ev.id)?.cell,kind,at:time});}
      }
      if(world && (w.turn<world.turn || w.config.seed!==world.config.seed))deathAppearances.clear();
      const deadIds=new Set(w.carcasses.map(a=>a.id));
      for(const id of deathAppearances.keys())if(!deadIds.has(id))deathAppearances.delete(id);
      for(const ev of w.events||[])if(ev.type==="death"&&ev.appearance){const id="c:"+ev.id+":"+w.turn;if(deadIds.has(id))deathAppearances.set(id,structuredClone(ev.appearance));}
      previousCorpses = new Map((world?.carcasses || []).map(o=>[o.id,o]));
      const sameSequence = world && w.config.seed === world.config.seed &&
        w.config.width === world.config.width && w.config.height === world.config.height &&
        w.config.mapFingerprint === world.config.mapFingerprint &&
        w.turn >= world.turn && w.turn <= world.turn + 1;
      previousActors = new Map(sameSequence ? [...previousActors, ...(world.organisms || []).map(o=>[o.id,o])] : []);
      // Keep only just-deceased actors carrying a confirmed action in this frame.
      const present = new Set(w.organisms.map(o=>o.id));
      const deaths = new Map((w.events || []).filter(e=>e.type === "death").map(e=>[e.id,e]));
      for (const [id,o] of previousActors) {
        if (present.has(id)) continue;
        const death = deaths.get(id);
        if (!death) previousActors.delete(id);
        else previousActors.set(id,{...o,...death.appearance,cell:death.cell});
      }
      world = w;
      const key = [
        Art.loaded,
        w.config.seed,
        w.config.width,
        w.config.height,
        w.config.mapFingerprint,
        JSON.stringify(w.config.mapResolved),
      ].join(":");
      if (key !== geometryKey) {
        P = globalThis.EcoProjection.build(w);
        scene = globalThis.EcoScenery.build(w, P);
        const projected=scene.objects.map(obj=>({obj,p:P.point(obj.x,obj.y)}));objectIndex=globalThis.EcoDisplayPlane.spatial(projected,a=>[a.p[0]-a.obj.size,a.p[1]-a.obj.size,a.p[0]+a.obj.size,a.p[1]+a.obj.size]);
        geometryKey = key;
        cache = null;
        cacheKey = null;
        resetTerrain(w);
      }
      if (lastTurn !== w.turn || restartMotion) {
        lastTurn = w.turn;
        changedAt = performance.now();
      }
    }
    function fit() {
      if (!world) return;
      const b = resize(),
        r = {...P.bounds,minY:P.bounds.minY-(view.planeSeparation?globalThis.EcoDisplayPlane.LIFT:0)};
      view.mode = "overview";
      view.scale = Math.min(
        (b.width - 40) / (r.maxX - r.minX),
        (b.height - 40) / (r.maxY - r.minY),
      );
      view.x = (b.width - (r.maxX + r.minX) * view.scale) / 2;
      view.y = (b.height - (r.maxY + r.minY) * view.scale) / 2;
    }
    function focus(cell, id = null) {
      if (!world) return;
      const b = resize(),
        [x, y] = S.xy(world, cell),
        p = displayLayout().entity(id || world.organisms.find(o=>o.cell===cell&&o.slot==="main")?.id)?.point || P.point(x + 0.5, y + 0.5);
      if(view.planeSeparation&&displayLayout().entity(id||world.organisms.find(o=>o.cell===cell&&o.slot==="main")?.id)?.elevated)p[1]+=globalThis.EcoDisplayPlane.LIFT/2;
      view.mode = "detail";
      view.scale = view.planeSeparation?Math.min(240,Math.max(48,(b.height-72)/(globalThis.EcoDisplayPlane.LIFT+1.8))):240;
      view.x = b.width / 2 - p[0] * view.scale;
      view.y = b.height / 2 - p[1] * view.scale;
    }
    function screen(cell, id = null) {
      const [x, y] = S.xy(world, cell),entity=displayLayout().entity(id),
        p = entity?.point.slice() || P.point(x + 0.5, y + 0.5),
        detail=view.scale>=24&&view.mode!=="overview"&&!view.simplified;
      if(detail&&entity?.host&&!entity.carcass)p[1]-=bodyOffset(entity.host);
      return [view.x + p[0] * view.scale, view.y + p[1] * view.scale];
    }
    function path(points) {
      g.beginPath();
      g.moveTo(...points[0]);
      for (const p of points.slice(1)) g.lineTo(...p);
      g.closePath();
    }
    function drawIfChanged(now = performance.now()) {
      const b = canvas.getBoundingClientRect();
      if(!b.width || !b.height)return false;
      const active = world && view.scale>=4 && view.motion && (
        (view.animate&&now-changedAt<view.duration&&(world.events||[]).some(e=>e.type!=='light')) ||
        [...actionMarks.values()].some(m=>now-m.at>=670&&now-m.at<850));
      const key = [
        revision,
        Art.loaded,
        b.width,
        b.height,
        devicePixelRatio || 1,
        JSON.stringify(view),
        active ? Math.floor(now / (1000 / 30)) : "settled",
      ].join("/");
      if (key === lastFrameKey) {
        diagnostics.skippedFrames = (diagnostics.skippedFrames || 0) + 1;
        return false;
      }
      lastFrameKey = key;
      draw();
      return true;
    }
    function draw() {
      const visibleRect=canvas.getBoundingClientRect();if(!visibleRect.width||!visibleRect.height)return;
      diagnostics.frames = (diagnostics.frames || 0) + 1;
      const b = resize();
      g.fillStyle = "#07171f";
      // CSS dimensions can be fractional while the backing bitmap is rounded.
      // Cover every backing pixel so repeated draws cannot accumulate edge alpha.
      g.save();g.setTransform(1,0,0,1,0,0);g.fillRect(0,0,canvas.width,canvas.height);g.restore();
      if (!world) return;
      hitRegions=[];informationHitRegions=[];
      const coordinates=displayLayout();
      const w = world,
        z = view.scale,
        near = z >= 24 && view.mode !== "overview",
        detail = near && !view.simplified,
        point = z < 4;
      symbolResolution=Math.max(4,Math.round(z*(devicePixelRatio||1)*4)/4);
      Object.assign(diagnostics, {
        mode: point ? "point" : detail ? "detail" : "simple",
        drawn: 0,
        motionActors: 0,
        selectedMotion: false,
        resources: 0,
        carcasses: 0,
        infectedHosts: 0,
        highParasites: 0,
        parasiteArt: 0,
        remainsArt: 0,
        carcassParasites: 0,
        deathSnapshots: 0,
        departedMotionActors: 0,
        cohabitingMain:0,
        motionKinds: {},
        statusBadges: 0,
        statusBadgesByGroup: {main:0,producer:0,basal:0,prey:0},
        nameLabels: { main:0, producer:0, basal:0, prey:0, P:0, Q:0, resource:0 },
        highlightedCells: [],
        criticalMarkers: 0,
        elevated: 0,
        selectedMotionEndpoints: null,
        informationFields: [],
      });
      const visible = (p, margin = 1) =>
        p[0] * z + view.x >= -z * margin &&
        p[1] * z + view.y >= -z * margin &&
        p[0] * z + view.x <= b.width + z * margin &&
        p[1] * z + view.y <= b.height + z * margin;
      const candidateKey=[revision,near,view.x,view.y,z,b.width,b.height].join('/');
      if(frameCandidates?.key!==candidateKey){const rect=[-view.x/z-3,-view.y/z-3,(b.width-view.x)/z+3,(b.height-view.y)/z+3];frameCandidates={key:candidateKey,organisms:near?coordinates.candidates(rect):w.organisms,resources:near?coordinates.resources(rect):w.resources,objects:near?objectIndex(rect).map(a=>a.obj):scene.objects};}
      diagnostics.candidateOrganisms=frameCandidates.organisms.length;
      const position = (cell, dx = 0.5, dy = 0.5) => {
        const [x, y] = S.xy(w, cell);
        return P.point(x + dx, y + dy);
      };
      const qPoint=(q,progress=1,move=null)=>{
        if(!move||move.from===undefined)return coordinates.entity(q.id).point;
        const [x,y]=S.xy(w,move.from),[tx,ty]=S.xy(w,q.cell),p=P.point(x+(tx-x)*progress+.5,y+(ty-y)*progress+.5);
        return [p[0]+.24,p[1]-.25];
      };
      const eventPoint=o=>freeQById.has(o.id)?qPoint(o):coordinates.anchor(o).point;
      g.save();
      g.translate(view.x, view.y);
      g.scale(z, z);
      if (near) {
        const sx=Math.floor(view.x/128)*128+128+(view.x-Math.floor(view.x)),sy=Math.floor(view.y/128)*128+128+(view.y-Math.floor(view.y));
        const key = [
          geometryKey,
          sx,
          sy,
          z,
          b.width,
          b.height,
          devicePixelRatio || 1,
        ].join("/");
        if (key !== cacheKey) {
          cacheKey = key;nearCache?.close?.();nearCache=null;
          terrainRequest={key,x:sx,y:sy,scale:z,width:b.width+256,height:b.height+256,dpr:devicePixelRatio||1};
          diagnostics.terrainPending=!terrainFailed;pumpTerrain();
          if(terrainFailed){diagnostics.terrainPending=true;fallbackSurface(terrainRequest);terrainRequest=null;}
        }
        if(nearCache)g.drawImage(nearCache,-nearRect.x/z,-nearRect.y/z,nearRect.width/z,nearRect.height/z);
        else if(cache&&overviewBounds)g.drawImage(cache,overviewBounds.minX,overviewBounds.minY,cache.width/24,cache.height/24);
      } else if(cache&&overviewBounds){g.drawImage(cache,overviewBounds.minX,overviewBounds.minY,cache.width/24,cache.height/24);}
      diagnostics.materialPixelsPerCell = near
        ? (terrainMetrics?.unit || scene.metrics.unit)
        : Math.max(8, Math.min(24, Math.floor(1800 / w.config.width)));
      diagnostics.paintedMaterials = terrainMetrics?.paintedMaterials || scene.metrics.paintedMaterials;
      if (view.grid && z >= 8) {
        g.strokeStyle = "#e9e4c326";
        g.lineWidth = 0.6 / z;
        for (let p = 0; p < w.tiles.length; p++) {
          const f = P.face(p);
          if (visible(f[4])) {
            path(f.slice(0, 4));
            g.stroke();
          }
        }
      }
      const age = view.animate
          ? Math.min(1, (performance.now() - changedAt) / view.duration)
          : 1,
        events = new Map(),
        departed = new Map();
      if (view.motion && !point && age < 1) {
        const planKey=[revision,view.x,view.y,z,view.selected,view.selectedEntity,b.width,b.height].join('/');
        if(eventPlan?.key===planKey){for(const [id,list]of eventPlan.events)events.set(id,list);for(const [id,o]of eventPlan.departed)departed.set(id,o);}
        else {
        const living = new Map([...livingById,...freeQById]),
          grouped = new Map();
        for (const ev of w.events) if (near && ev.type === "death" && !living.has(ev.id) && previousActors.has(ev.id)) {
          const o = previousActors.get(ev.id);departed.set(ev.id,o);living.set(ev.id,o);
        }
        for (const ev of w.events) {
          if(ev.type === "death"||ev.type === "light"||actionKind(ev,w)===null) continue;
          const o = living.get(ev.id);
          if (!o || !visible(eventPoint(o), 1.6)) continue;
          if (!grouped.has(ev.id)) grouped.set(ev.id, []);
          grouped.get(ev.id).push(ev);
        }
        // Keep interpolation and distinct confirmed actions within the existing budget.
        // Repeated feeding must not crowd out combat recorded later in the turn.
        const priority = (ev) => ({move:100,attack:90,defend:85,clear:80,
          infection:75,birth:70,growth:65,care:60,feed:50}[/^(primary|hyper)-/.test(ev.type)?actionKind(ev,w):ev.type] || 10);
        for (const [id, list] of grouped) {
          const seen = new Set();
          grouped.set(id, list.map((ev,index)=>({ev,index}))
            .sort((a,b)=>priority(b.ev)-priority(a.ev)||a.index-b.index)
            .filter(({ev})=>{
              const key=ev.type==='feed'?`feed:${ev.sourceType}:${ev.tag}`:/^(primary|hyper)-/.test(ev.type)?actionKind(ev,w):ev.type;
              if(seen.has(key))return false;
              seen.add(key);return true;
            }).slice(0,4).map(({ev})=>ev));
        }
        const distance = (id) => {
          const o = living.get(id),
            p = eventPoint(o);
          return Math.hypot(
            p[0] * z + view.x - b.width / 2,
            p[1] * z + view.y - b.height / 2,
          );
        };
        const order = [...grouped].sort((a, b) => {
          const sa = living.get(a[0]).cell === view.selected,
            sb = living.get(b[0]).cell === view.selected;
          return (
            Number(b[0] === view.selectedEntity) - Number(a[0] === view.selectedEntity) ||
            Number(sb) - Number(sa) ||
            distance(a[0]) - distance(b[0]) ||
            S.compare(a[0], b[0])
          );
        });
        for (const [id, list] of order.slice(0, 128)) events.set(id, list);
        eventPlan={key:planKey,events:new Map(events),departed:new Map(departed)};
        }
      }
      function actionEffects(o,list,r,cx,cy) {
        if (list.length) {
          diagnostics.motionActors++;
          if (o.cell === view.selected) diagnostics.selectedMotion = true;
        }
        for (const ev of list.slice(0, 4)) {
          if (ev.type === "move") continue;
          g.save();
          g.globalAlpha = 1 - age;
          const kind=actionKind(ev,w);
          if(kind===null){g.restore();continue;}
          diagnostics.motionKinds[kind]=(diagnostics.motionKinds[kind]||0)+1;
          g.strokeStyle=({attack:"#ffa47c",defend:"#9edfff",graze:"#b1e59a",predate:"#ffcb88",scavenge:"#d9ad91",fungal:"#d7bbef",absorb:"#b6e8dc",care:"#bce7b1",infection:"#d3a2ff",clear:"#eff7ed",birth:"#ffe3a0",growth:"#a7eeef"})[kind]||"#e9eab0";g.lineWidth=.025;
          if(["attack","feed","care"].includes(ev.type)){
            const targetId=ev.target||ev.source,
              target=livingById.get(targetId)||(previousActors.has(targetId)?{...previousActors.get(targetId),cell:ev.to??previousActors.get(targetId).cell}:null),
              corpse=coordinates.entity(targetId),oldCorpse=previousCorpses.get(targetId),resourceIndex=ev.sourceType==="resource"?resourceKinds.indexOf(String(ev.source).split(":").at(-1)):-1,
              sourcePoint=oldCorpse?position(ev.to??oldCorpse.cell,oldCorpse.slot==="food"?.22:oldCorpse.slot==="prey"?.52:.86,.86):resourceIndex>=0?position(ev.to??o.cell,.12+(resourceIndex%4)*.23,.12+Math.floor(resourceIndex/4)*.2):null,
              endpoint=target?coordinates.anchor(target,age,events.get(target.id)?.find(e=>e.type==='move')):null,
              t=endpoint?[endpoint.point[0],endpoint.point[1]-(detail?bodyOffset(target):0)]:corpse?.point||sourcePoint||position(ev.to??o.cell);
            if(o.id===view.selectedEntity)diagnostics.selectedMotionEndpoints={id:o.id,target:targetId,from:[cx,cy],to:t};
            g.beginPath();g.moveTo(cx,cy);
            if(ev.type==="attack")g.lineTo(...t);else g.quadraticCurveTo((cx+t[0])/2,Math.min(cy,t[1])-.22,...t);g.stroke();
            if(ev.type==="attack"){
              if(ev.actualDamage>0){g.beginPath();g.moveTo(t[0]-.07,t[1]-.09);g.lineTo(t[0]+.07,t[1]+.09);g.moveTo(t[0]+.07,t[1]-.09);g.lineTo(t[0]-.07,t[1]+.09);g.stroke();diagnostics.motionKinds.hit=(diagnostics.motionKinds.hit||0)+1;}
              if(ev.mitigated>0){g.strokeStyle="#a9e1ff";g.beginPath();g.arc(...t,.15,-2.5,-.6);g.stroke();diagnostics.motionKinds.block=(diagnostics.motionKinds.block||0)+1;}
            }else{
              const from=ev.type==="feed"?t:[cx,cy],to=ev.type==="feed"?[cx,cy]:t;
              for(let j=0;j<3;j++){const u=Math.max(0,age-j*.08);g.fillStyle=g.strokeStyle;g.beginPath();g.arc(from[0]+(to[0]-from[0])*u,from[1]+(to[1]-from[1])*u,.018,0,7);g.fill();}
            }
          }else if(ev.type==="defend"){
            g.beginPath();g.moveTo(cx-.12,cy-.10);g.lineTo(cx+.12,cy-.10);g.lineTo(cx+.10,cy+.06);g.lineTo(cx,cy+.15);g.lineTo(cx-.10,cy+.06);g.closePath();g.stroke();
          }else if(kind==="clear"){
            for(const d of [-1,1]){g.beginPath();g.moveTo(cx+d*.06,cy-.03);g.lineTo(cx+d*(.13+age*.12),cy-.15);g.stroke();}
          }else if(kind==="growth"){
            for(const dy of [0,.10]){g.beginPath();g.moveTo(cx-.10,cy+dy);g.lineTo(cx,cy-.10+dy);g.lineTo(cx+.10,cy+dy);g.stroke();}
          }else if(ev.type==="birth"){
            for(let j=0;j<6;j++){const t=j*Math.PI/3;g.beginPath();g.moveTo(cx+Math.cos(t)*.08,cy+Math.sin(t)*.08);g.lineTo(cx+Math.cos(t)*(.14+age*.10),cy+Math.sin(t)*(.14+age*.10));g.stroke();}
          }else{
            g.beginPath();g.ellipse(cx,cy,r+age*.2,(r+age*.2)*.6,0,0,Math.PI*2);g.stroke();
          }
          g.restore();
        }
      }
      const worldEvents=frameCandidates.worldEvents ||= (()=>{const m=new Map();for(const e of w.events){if(!m.has(e.id))m.set(e.id,[]);m.get(e.id).push(e);}return m;})();
      const annotations = [];
      const nameEnabled=(group,id)=>view.names[group]||(group==='producer'&&view.names.basal)||id===view.selectedEntity;
      if (view.resources)
        for (const record of (frameCandidates.resourcePoints ||= frameCandidates.resources.map(a=>{const kind=resourceKinds.indexOf(a.kind);return {a,p:position(a.cell,.12+(kind%4)*.23,.12+Math.floor(kind/4)*.2)};}))) {
          const {a,p}=record;
          if (!visible(p)) continue;
          diagnostics.resources++;
          const r = 0.05 + 0.04 * Math.min(1, a.q / (S.FOOD[a.kind].cap || 4));
          if (near && (view.names.resource || a.cell===view.selected)) {
            annotations.push(()=>{g.save();g.fillStyle="#fff1cd";g.font=".055px sans-serif";g.textAlign="center";g.fillText(S.FOOD[a.kind].name,p[0],p[1]-.10);g.restore();});
            diagnostics.nameLabels.resource++;
          }
          if (detail) Art.resource(g, a, ...p, r, w.tiles[a.cell].env, w.turn);
          else
            symbol(
              g,
              a.kind,
              ...p,
              r,
              a.kind === "info" ? "#8be9ff" : "#e5d4a1",
            );
        }
      const fieldPoint=field=>{const kind=resourceKinds.indexOf('info');return position(field.cell,.12+(kind%4)*.23,.12+Math.floor(kind/4)*.2);};
      if(view.resources&&informationCells.size)for(const field of (frameCandidates.information ||= near
        ? (informationIndex ||= globalThis.EcoDisplayPlane.spatial([...informationCells.values()],field=>{const p=fieldPoint(field);return [p[0]-.5,p[1]-.5,p[0]+.5,p[1]+.5];}))([-view.x/z-1,-view.y/z-1,(b.width-view.x)/z+1,(b.height-view.y)/z+1])
        : [...informationCells.values()])){
        const p=fieldPoint(field);
        if(!visible(p))continue;
        // Amount changes only the bounded footprint/particle count. The fixed
        // information colour never encodes truth, evidence, nutrition or E.
        const r=.05+.04*field.amount/(1+field.amount);
        if(detail)Art.resource(g,{kind:'info',informationField:true,amount:field.amount},...p,r,w.tiles[field.cell].env,w.turn);
        else symbol(g,'info',...p,r,'#8be9ff');
        informationHitRegions.push({cell:field.cell,x:p[0],y:p[1],r:Math.max(r,3/z)});
        diagnostics.informationFields.push({cell:field.cell,amount:field.amount,origins:field.origins.size,records:field.records,x:p[0]*z+view.x,y:p[1]*z+view.y});
        if(near&&(view.names.resource||field.cell===view.selected)){
          annotations.push(()=>{g.save();g.fillStyle='#fff1cd';g.font='.055px sans-serif';g.textAlign='center';g.fillText('情報量 '+Number(field.amount.toFixed(2))+' · '+field.origins.size+'由来',p[0],p[1]-.10);g.restore();});
          diagnostics.nameLabels.resource++;
        }
      }
      function corpsePayload(a){
        if(!a.infection || !(a.payloadExpires>w.turn))return;
        for(const [kind,o]of [["P",a.infection],["Q",a.infection.q]]){
          if(!o)continue;const p=coordinates.entity(o.id)?.point;if(!p)continue;
          if(detail)Art.parasite(g,o,...p,.065);
          else {g.strokeStyle=kind==="Q"?"#d6a8ff":"#ffb278";g.lineWidth=1/z;g.beginPath();g.arc(...p,.05,0,Math.PI*2);g.stroke();}
          diagnostics.carcassParasites++;hitRegions.push({id:o.id,cell:a.cell,main:false,x:p[0],y:p[1],rx:.07,ry:.07});
          if(near&&nameEnabled(kind,o.id))annotations.push(()=>{g.save();g.font=".055px sans-serif";g.fillStyle=kind==="Q"?"#dec3ff":"#ffd1a3";g.fillText(S.D.byId[o.species||"hyperparasite"].name+" · 死骸",p[0],p[1]-.08);g.restore();});
        }
      }
      for(const a of detail?[]:w.carcasses){
        const p=coordinates.entity(a.id)?.point;if(!p||!visible(p))continue;
        diagnostics.carcasses++;symbol(g,a.species,...p,.10,"#bda691");
        g.strokeStyle="#edb5a0";g.lineWidth=Math.max(.025,.7/z);g.beginPath();g.moveTo(p[0]-.10,p[1]+.07);g.lineTo(p[0]+.10,p[1]-.07);g.stroke();
        hitRegions.push({id:a.id,cell:a.cell,main:false,x:p[0],y:p[1],rx:.12,ry:.09});corpsePayload(a);
      }
      const main=coordinates.main,foodCells=coordinates.food,
        actorKey=String(view.motion&&age<1&&!point),activeEvents=events;
      let fixed=frameCandidates.fixed,dynamic=[];
      if(!fixed||frameCandidates.actorKey!==actorKey){
        fixed=[];const moving=[];
        for(const obj of frameCandidates.objects){const p=P.point(obj.x,obj.y);if(visible(p,2))fixed.push({depth:P.depth(obj.x,obj.y)-.05,obj,p});}
        if(detail)for(const a of w.carcasses){const dx=a.slot==='food'?.22:a.slot==='prey'?.52:a.slot==='producer'?.72:.86,p=position(a.cell,dx,.86),[x,y]=S.xy(w,a.cell);if(visible(p))fixed.push({carcass:a,p,depth:P.depth(x+dx,y+.86)});}
        for(const o of frameCandidates.organisms){const list=activeEvents.get(o.id)||[],ev=list.find(e=>e.type==='move');if(ev){moving.push(o);continue;}const a=coordinates.anchor(o);if(visible(a.point,1.6)||visible(a.ground,1.6))fixed.push({depth:a.depth,o,p:a.point,list,ground:a.ground,elevated:a.elevated,cohabit:a.cohabit,rank:a.rank,scale:a.scale,remnant:false});}
        fixed.sort((a,b)=>a.depth-b.depth);frameCandidates.fixed=fixed;frameCandidates.moving=moving;frameCandidates.actorKey=actorKey;
      }
      for(const o of [...frameCandidates.moving,...departed.values()]){const list=activeEvents.get(o.id)||[],ev=list.find(e=>e.type==='move'),a=coordinates.anchor(o,age,ev),remnant=departed.has(o.id);
        if(remnant&&!list.some(e=>['move','attack','defend','feed','care','clear'].includes(e.type)||(/^(primary|hyper)-/.test(e.type)&&actionKind(e,w))))continue;
        if(visible(a.point,1.6)||visible(a.ground,1.6))dynamic.push({depth:a.depth,o,p:a.point,list,ground:a.ground,elevated:a.elevated,cohabit:a.cohabit,rank:a.rank,scale:a.scale,remnant});}
      dynamic.sort((a,b)=>a.depth-b.depth);const actors=[];let fixedAt=0,movingAt=0;
      while(fixedAt<fixed.length||movingAt<dynamic.length){if(movingAt===dynamic.length||(fixedAt<fixed.length&&fixed[fixedAt].depth<=dynamic[movingAt].depth))actors.push(fixed[fixedAt++]);else actors.push(dynamic[movingAt++]);}
      const bodies = actors.filter((a) => a.o);
      // Overview symbols must remain above scenery; depth still orders detailed artwork.
      const ordered =
        !detail && view.emphasis
          ? [...actors.filter((a) => a.obj), ...bodies]
          : actors;
      const sequence=view.planeSeparation
        ? [...ordered.filter(a=>!a.elevated),...ordered.filter(a=>a.elevated)] : ordered;
      if(view.planeSeparation){
        g.fillStyle='#00151d40';
        for(const a of bodies)if(a.elevated&&visible(a.ground)){
          g.beginPath();g.ellipse(...a.ground,.32,.12,0,0,Math.PI*2);g.fill();
        }
      }
      // Every basal individual keeps its glyph and hit region. Cache the stationary paint,
      // while current action effects and all moving actors remain separate.
      const useBasalLayer=!near&&view.emphasis&&!view.planeSeparation,
        basalActors=useBasalLayer?(frameCandidates.basalActors ||= sequence.filter(a=>a.o&&!a.remnant&&a.o.slot!=='producer'&&['plant','fungus'].includes(S.spec(a.o).group))):[];
      let basalPainted=false;
      function paintBasalLayer(){
        if(basalPainted||!basalActors.length)return;basalPainted=true;
        const key=[geometryKey,view.x,view.y,z,b.width,b.height,devicePixelRatio||1].join('/');
        const ages=frameCandidates.ages ||= new Map();
        const identities=frameCandidates.basalIdentities ||= basalActors.map(a=>{const o=a.o;if(!ages.has(o.id))ages.set(o.id,S.ageInfo(o));return [o.id,o.species,o.cell,ages.get(o.id).stage,o.infection?.id,o.infection?.q?.id];});
        const valid=basalLayer?.key===key&&identities.length===basalLayer.identities.length&&identities.every((a,i)=>a.every((v,j)=>v===basalLayer.identities[i][j]));
        if(!valid){
          const image=document.createElement('canvas'),d=devicePixelRatio||1;image.width=Math.ceil(b.width*d);image.height=Math.ceil(b.height*d);const c=image.getContext('2d');c.setTransform(d*z,0,0,d*z,d*view.x,d*view.y);
          const hits=[];let infected=0,high=0;
          for(const actor of basalActors){const o=actor.o,[cx,cy]=actor.p;
            const age=ages.get(o.id);basalSprite(c,o,cx,cy,z,age);
            hits.push({id:o.id,cell:o.cell,main:false,x:cx,y:cy,rx:.22,ry:.21});
            if(o.infection){infected++;if(o.infection.q)high++;const [bx,by]=globalThis.EcoDisplayPlane.parasitePoint([cx,cy],'P',false);hits.push({id:o.infection.id,cell:o.cell,main:false,x:bx,y:by,rx:.065,ry:.065});if(o.infection.q)hits.push({id:o.infection.q.id,cell:o.cell,main:false,x:bx,y:by,rx:.115,ry:.115,min:.6});}
          }
          basalLayer={key,image,identities,hits,infected,high};diagnostics.basalLayerBuilds=(diagnostics.basalLayerBuilds||0)+1;
        }else diagnostics.basalLayerHits=(diagnostics.basalLayerHits||0)+1;
        g.drawImage(basalLayer.image,-view.x/z,-view.y/z,b.width/z,b.height/z);for(const h of basalLayer.hits)hitRegions.push(h);
        diagnostics.drawn+=basalActors.length;diagnostics.infectedHosts+=basalLayer.infected;diagnostics.highParasites+=basalLayer.high;
      }
      let upperStarted=false;
      for (const actor of sequence) {
        if(actor.elevated&&!upperStarted){for(const paint of annotations)paint();annotations.length=0;upperStarted=true;}
        const { p } = actor;
        if(actor.carcass){
          const a=actor.carcass;
          diagnostics.carcasses++;
          const appearance=deathAppearances.get(a.id);if(appearance)diagnostics.deathSnapshots++;
          if(Art.remains(g,appearance?{...a,appearance}:a,...p,.16,P.water(w.tiles[a.cell]),w.turn))diagnostics.remainsArt++;
          hitRegions.push({id:a.id,cell:a.cell,main:false,x:p[0],y:p[1],rx:.23,ry:.12});
          corpsePayload(a);
          continue;
        }
        if (actor.obj) {
          const a = actor.obj,
            t = w.tiles[a.cell];
          if (
            !near &&
            !["bush", "boulder", "log"].includes(t.cover) &&
            t.terrain !== "rock" &&
            a.index !== 6
          )
            continue;
          if (near) {
            Art.propShadow(g, a.index, ...p, a.size);
            const obscured = bodies.filter(
              (b) =>
                !b.elevated && b.depth < actor.depth &&
                Math.abs(b.p[0] - p[0]) < a.size * 0.42 &&
                b.p[1] < p[1] + 0.08 &&
                b.p[1] > p[1] - a.size * 0.8,
            );
            const holes = obscured.map((b) => ({
              x: b.p[0] - p[0],
              y: b.p[1] - bodyOffset(b.o) - p[1],
              radius: b.o.slot === "main" ? 0.47 : b.o.slot==='producer'?.36:0.28,
              selected: b.o.cell === view.selected,
            }));
            Art.prop(g, a.index, ...p, a.size, a.index === 9 ? 0.65 : 1, holes);
          } else {
            if (a.wall !== undefined) {
              const f = P.face(a.cell),
                j = a.wall === a.cell + w.config.width ? 2 : 1;
              g.strokeStyle = "#ebd3a6";
              g.lineWidth = 0.065;
              g.beginPath();
              g.moveTo(...f[j]);
              g.lineTo(...f[(j + 1) % 4]);
              g.stroke();
              continue;
            }
            if (t.cover === "log") {
              g.save();
              g.translate(...p);
              g.rotate(-0.35);
              g.fillStyle = "#564b32";
              g.fillRect(-0.32, -0.045, 0.64, 0.09);
              g.fillStyle = "#c6b67a";
              g.fillRect(-0.32, -0.045, 0.64, 0.025);
              g.restore();
              continue;
            }
            g.fillStyle =
              t.cover === "bush"
                ? "#294d3f"
                : t.terrain === "rock" || t.cover === "boulder"
                  ? "#77908b"
                  : "#9b9568";
            g.strokeStyle = "#d3dab14d";
            g.lineWidth = 0.025;
            g.beginPath();
            if (t.cover === "bush") {
              g.moveTo(p[0] - 0.18, p[1]);
              g.quadraticCurveTo(p[0] - 0.24, p[1] - 0.28, p[0], p[1] - 0.43);
              g.quadraticCurveTo(p[0] + 0.24, p[1] - 0.28, p[0] + 0.18, p[1]);
            } else {
              g.moveTo(p[0] - 0.22, p[1]);
              g.lineTo(p[0] - 0.03, p[1] - 0.3);
              g.lineTo(p[0] + 0.22, p[1]);
            }
            g.closePath();
            g.fill();
            g.stroke();
          }
          continue;
        }
        const { o, list } = actor;
        if(useBasalLayer){paintBasalLayer();if(!actor.remnant&&o.slot!=='producer'&&['plant','fungus'].includes(S.spec(o).group)){if(list.length)actionEffects(o,list,.13+.07*Math.min(1,S.edibleB(o)/15),p[0],p[1]);continue;}}
        if(!actor.remnant)diagnostics.drawn++;
        if(actor.elevated)diagnostics.elevated++;
        const isMain = o.slot === "main",isProducer=o.slot==='producer',
          overlap = main.has(o.cell) && (foodCells.has(o.cell)||coordinates.producer.has(o.cell)),
          r = isMain
            ? (0.23 + 0.035 * o.phase) *
              (overlap ? 0.85 : 1) *
              (0.9 + 0.2 * (o.dna?.body??.5))*(actor.scale||1)
            : isProducer?(0.20+0.025*Math.max(1,o.phase||1))*(main.has(o.cell)?.78:1):0.13 + 0.07 * Math.min(1, S.edibleB(o) / 15),
          cx = p[0],
          cy = p[1] - (detail ? bodyOffset(o) : 0),
          geometry=detail?(isProducer?Art.producerGeometry(o,r):o.species==='ryouki'?Art.ryoukiGeometry(o,r):null):null;
        if(actor.cohabit>1)diagnostics.cohabitingMain++;
        if(actor.remnant){
          // A confirmed past action, never a resurrected selectable organism.
          diagnostics.departedMotionActors++;
          g.save();g.globalAlpha=.55*(1-age);
          if(detail){if(isMain)creature(g,o,cx,cy,r,true);else if(isProducer)producer(g,o,cx,cy,r);else food(g,o,cx,cy,r,w.tiles[o.cell].env);}
          else symbol(g,o.species,cx,cy,isMain?.3:isProducer?.21:.17,symbolColor(S.spec(o)));
          g.restore();actionEffects(o,list,r,cx,cy);continue;
        }
        if(!actor.elevated&&!isProducer){
        if(detail){g.drawImage(groundShadow(),p[0]-r*.9,p[1]+.04-r*.23,r*1.8,r*.46);}
        else ellipseStamp(g,p[0],p[1]+.04,isMain?.38*(actor.scale||1):.22,isMain?.3*(actor.scale||1):.17,'#061922cc');
        }
        hitRegions.push({id:o.id,cell:o.cell,main:isMain,x:cx,y:cy,rx:geometry?Math.max(.07,geometry.rx):detail?r*1.65:isMain?.35*(actor.scale||1):isProducer?.25:.22,ry:geometry?Math.max(.07,geometry.ry):detail?r*1.55:isMain?.32*(actor.scale||1):isProducer?.25:.21});
        if (view.emphasis && (!detail || (!isMain&&!isProducer))) {
          if(!detail)ellipseStamp(g,cx,cy,isMain?.38*(actor.scale||1):.235,isMain?.29*(actor.scale||1):.185,'#02131cf0',isMain?'#f5e6a8b8':'#c5e9be99',Math.max(.018,(isMain?.85:.55)/z));
          else ellipseStamp(g,cx,p[1],r*1.06,r*.33,'#02131c99',isMain?'#f5e6a8b8':'#c5e9be99',Math.max(.018,(isMain?.85:.55)/z));
        }
        const displayed = detail&&view.emphasis ? { ...o, renderEmphasis: true } : o;
        if (detail) {
          if (isMain)
            creature(
              g,
              displayed,
              cx,
              cy,
              r,
              true,
            );
          else if(isProducer)producer(g,displayed,cx,cy,r);
          else food(g, displayed, cx, cy, r, w.tiles[o.cell].env);
        } else
          symbol(
            g,
            o.species,
            cx,
            cy,
            isMain ? (overlap ? 0.25 : 0.3)*(actor.scale||1) : isProducer?.21:0.17,
            symbolColor(S.spec(o)),
          );
        if(!detail&&actor.cohabit>1&&actor.rank===0){g.save();g.font=`bold ${Math.max(.10,9/z)}px sans-serif`;g.textAlign='center';g.lineWidth=3/z;g.strokeStyle='#071a22';g.fillStyle='#ffedb4';g.strokeText('×'+actor.cohabit,cx,cy-.23);g.fillText('×'+actor.cohabit,cx,cy-.23);g.restore();}
        const ages=frameCandidates.ages ||= new Map();if(!ages.has(o.id))ages.set(o.id,S.ageInfo(o));
        const a = ages.get(o.id),
          showStatus = view.statusMarks && near &&
            (view.statusScope === "all" || isMain || isProducer || o.id === view.selectedEntity) &&
            (z >= 100 || o.cell === view.selected);
        if (!showStatus && a.enabled && a.stage !== "adult" && (view.ageEmphasis || !detail)) {
          g.strokeStyle = a.stage === "juvenile" ? "#fff0b2" : "#d7e2e0";
          g.lineWidth = 1 / z;
          g.beginPath();
          g.arc(
            cx + 0.23,
            cy + 0.12,
            0.045,
            0,
            a.stage === "juvenile" ? Math.PI * 2 : Math.PI * 1.6,
          );
          g.stroke();
        }
        if (o.infection) {
          diagnostics.infectedHosts++;
          if (o.infection.q) diagnostics.highParasites++;
          if(near && (z>=100 || o.infection.id===view.selectedEntity || o.infection.q?.id===view.selectedEntity)) {
            const pName=nameEnabled("P",o.infection.id),qName=o.infection.q&&nameEnabled("Q",o.infection.q.id);
            if(pName)diagnostics.nameLabels.P++;
            if(qName)diagnostics.nameLabels.Q++;
            annotations.push(()=>{g.save();g.font=".055px sans-serif";g.textAlign="left";if(pName){const p=o.infection,state=w.config.primaryParasiteModel==='primary/1'&&p.primary?.version==='primary-state/1'?p.phase+'相 · 年齢'+(Number.isFinite(p.age)?p.age+'T':'未記録'):p.stage;g.fillStyle="#ffd1a3";g.fillText(S.D.byId[p.species].name+" P · "+state,cx+.1,cy-.43);}if(qName){const q=o.infection.q,state=w.config.hyperParasiteModel==='hyper/1'&&S.HyperParasite.is(q)?q.phase+'相 · 年齢'+(Number.isFinite(q.age)?q.age+'T':'未記録'):q.phase;g.fillStyle="#d9b9ff";g.fillText(S.D.byId.hyperparasite.name+" Q · "+state,cx+.1,cy-.51);}g.restore();});
          }
          const [bx, by] = globalThis.EcoDisplayPlane.parasitePoint([cx,cy],"P",detail,actor.rank,actor.cohabit);
          if (detail && Art.parasite(g, o.infection, bx, by, .105)) {
            diagnostics.parasiteArt++;
            hitRegions.push({id:o.infection.id,cell:o.cell,main:isMain,x:bx,y:by,rx:.10,ry:.10});
            if (o.infection.q) {
              const [qx,qy]=globalThis.EcoDisplayPlane.parasitePoint([cx,cy],"Q",true,actor.rank,actor.cohabit);
              // A quiet link denotes Q's attachment to P, not another free organism.
              g.strokeStyle="#bb9fdd88";g.lineWidth=.008;
              g.beginPath();g.moveTo(bx+.06,by-.03);g.lineTo(qx-.06,qy+.03);g.stroke();
              if(Art.parasite(g,o.infection.q,qx,qy,.11))diagnostics.parasiteArt++;
              hitRegions.push({id:o.infection.q.id,cell:o.cell,main:isMain,x:qx,y:qy,rx:.115,ry:.115});
            }
          } else {
          g.fillStyle = "#19172b";
          g.beginPath();
          g.arc(bx, by, 0.1, 0, 7);
          g.fill();
          g.fillStyle = "#ffba82";
          g.beginPath();
          g.arc(bx, by, 0.05, 0, 7);
          g.fill();
          hitRegions.push({id:o.infection.id,cell:o.cell,main:isMain,x:bx,y:by,rx:.065,ry:.065});
          if (o.infection.q) {
            hitRegions.push({id:o.infection.q.id,cell:o.cell,main:isMain,x:bx,y:by,rx:.115,ry:.115,min:.6});
            g.strokeStyle = "#d8adff";
            g.lineWidth = Math.max(0.025, 0.7 / z);
            g.beginPath();
            g.arc(bx, by, 0.1, 0, 7);
            g.stroke();
          }
          }
        }
        actionEffects(o,list,r,cx,cy);
        const nameGroup=isMain?"main":isProducer?"producer":S.spec(o).group==="prey"?"prey":"basal";
        const labelOffset=actor.cohabit>1?[[-.16,-.38],[.16,-.38],[0,.12]][actor.rank]:[0,r*.95],
          labelX=cx+labelOffset[0],nameY=cy+labelOffset[1],nameBaseline=actor.cohabit>1?nameY+.065:cy+r*1.23;
        if (near && (isMain || nameEnabled(nameGroup,o.id))) {
          diagnostics.nameLabels[nameGroup]++;
          annotations.push(() => {
          g.font = actor.cohabit>1?".045px sans-serif":".065px sans-serif";
          g.textAlign = "center";
          g.fillStyle = isMain ? "#071c25df" : "#123d2aef";
          const nameWidth=actor.cohabit>1?.52:.8;
          g.fillRect(labelX-nameWidth/2,nameY,nameWidth,actor.cohabit>1?.085:.13);
          g.fillStyle = "#fff1c9";
          const action = (worldEvents.get(o.id)||[]).find(
            (e) =>
              e.id === o.id &&
              ["attack", "feed", "defend", "care", "move", "birth"].includes(
                e.type,
              ),
          );
          const name = {
            attack: "攻撃",
            feed: "摂食",
            defend: "防御",
            care: "庇護",
            move: "移動",
            birth: "繁殖",
          };
          g.fillText(
            S.spec(o).name +
              " · " +
              ["I", "II", "III", "IV"][o.phase - 1] +
              (action ? " / " + name[action.type] : "")+(actor.cohabit>1?' · #'+(actor.rank+1)+' '+String(o.id).replace(/:ryouki$/,'').slice(-5):''),
            labelX,
            nameBaseline,
            nameWidth-.02,
          );
          });
        }
        if (showStatus) {
          annotations.push(() => {
          const sex = o.sex === "male" ? "♂" : o.sex === "female" ? "♀" : "—",
            stage = o.colony?.version === 'colony-state/1' ? "群落" : a.enabled ? ({ juvenile: "幼体", adult: "成体", elderly: "老齢" }[a.stage]) : "未判定",
            branch = o.phase >= 3 && Number.isInteger(o.branch3)
              ? "-" + ["A", "B", "C"][o.branch3] + (o.phase === 4 && Number.isInteger(o.branch4) ? o.branch4 + 1 : "") : "",
            phase = ["I", "II", "III", "IV"][o.phase - 1] + branch,
            y = actor.cohabit>1?nameY+.14:cy+r*1.23+.11;
          const badges = [
            { x: -0.34, w: 0.14, text: sex, color: o.sex === "male" ? "#a9e5ff" : o.sex === "female" ? "#ffcfdf" : "#d7d9d3" },
            { x: -0.18, w: 0.22, text: stage, color: a.stage === "juvenile" ? "#ffec9c" : a.stage === "elderly" ? "#ded5ef" : "#bde9cf" },
            { x: 0.06, w: 0.30, text: phase, color: "#fff0c9" },
          ];
          g.save();
          if(actor.cohabit>1){g.translate(labelX,y);g.scale(.7,.7);g.translate(-labelX,-y);}
          g.font = `${Math.max(0.055, 10 / z)}px sans-serif`;
          g.textAlign = "center"; g.textBaseline = "middle";
          for (const b of badges) {
            g.fillStyle = "#061a25f0"; g.fillRect(labelX+b.x,y-.055,b.w,.11);
            g.strokeStyle = b.color; g.lineWidth = 0.7 / z; g.strokeRect(labelX+b.x,y-.055,b.w,.11);
            g.fillStyle = b.color; g.fillText(b.text,labelX+b.x+b.w/2,y,b.w-.01);
          }
          if (o.HP <= .25*S.phenotype(w,o).maxHP || o.E < .15*S.phenotype(w,o).capE) {
            g.fillStyle = o.HP <= .25*S.phenotype(w,o).maxHP ? "#e2756f" : "#e6b66c";
            g.beginPath(); g.arc(cx - 0.28, cy - 0.27, 0.06, 0, Math.PI * 2); g.fill();
            g.fillStyle = "#07171f"; g.fillText("!", cx - 0.28, cy - 0.27);
            diagnostics.criticalMarkers++;
          }
          diagnostics.statusBadges++;
          diagnostics.statusBadgesByGroup[isMain?"main":isProducer?"producer":S.spec(o).group==="prey"?"prey":"basal"]++;
          g.restore();
          });
        }
      }
      for(const q of w.searchQ || []){
        const [x,y]=S.xy(w,q.cell),base=P.point(x+.5,y+.5),newQ=freeQById.has(q.id),list=newQ?(events.get(q.id)||[]):[],p=newQ?qPoint(q,age,list.find(e=>e.type==='move')):[base[0]+.24,base[1]-.25];
        if(detail&&Art.parasite(g,q,...p,.11))diagnostics.parasiteArt++;else symbol(g,"hyperparasite",...p,.09,"#ccadff");hitRegions.push({id:q.id,cell:q.cell,main:false,x:p[0],y:p[1],rx:.11,ry:.11});
        if(newQ)actionEffects(q,list,.11,...p);
        if(near && nameEnabled("Q",q.id)){diagnostics.nameLabels.Q++;g.save();g.fillStyle="#d9c6ff";g.font=".06px sans-serif";g.textAlign="center";g.fillText(S.D.byId.hyperparasite.name+(newQ?' Q · '+q.phase+'相 · 年齢'+(Number.isFinite(q.age)?q.age+'T':'未記録')+' · 自立':" · 探索"),newQ?p[0]-.24:base[0],newQ?p[1]-.13:base[1]-.38);g.restore();}
      }
      const marks=new Set(view.highlights||[]),markedCells=new Map();
      const mark=(cell,id)=>{if(!marks.has(id))return;if(!markedCells.has(cell))markedCells.set(cell,new Set());markedCells.get(cell).add(id);};
      for(const o of w.organisms){mark(o.cell,o.species);if(o.infection){mark(o.cell,o.infection.species);if(o.infection.q)mark(o.cell,o.infection.q.species||"hyperparasite");}}
      for(const q of w.searchQ||[])mark(q.cell,"hyperparasite");
      for(const [cell,ids]of markedCells){
        const face=P.face(cell).slice(0,4),cx=face.reduce((n,p)=>n+p[0],0)/4,cy=face.reduce((n,p)=>n+p[1],0)/4,
          ordered=S.D.species.filter(s=>ids.has(s.id)).map(s=>s.id);
        g.save();ordered.forEach((id,i)=>{
          const color=highlightColor(id),inset=Math.min(.32,i*3/z),f=face.map(p=>[p[0]+(cx-p[0])*inset,p[1]+(cy-p[1])*inset]);
          g.strokeStyle=color;g.lineWidth=2/z;
          if(z<24 && ordered.length>1){
            // At overview scale nested borders would coincide. Split the perimeter instead.
            const start=i*4/ordered.length,end=(i+1)*4/ordered.length,
              edgePoint=t=>{const k=Math.min(3,Math.floor(t)),u=t-k;return [face[k][0]+(face[(k+1)%4][0]-face[k][0])*u,face[k][1]+(face[(k+1)%4][1]-face[k][1])*u];};
            g.beginPath();g.moveTo(...edgePoint(start));for(let k=Math.floor(start)+1;k<end;k++)g.lineTo(...edgePoint(k));g.lineTo(...edgePoint(end));g.stroke();
          }else{path(f);g.globalAlpha=.10;g.fillStyle=color;g.fill();g.globalAlpha=1;g.stroke();}
        });g.restore();diagnostics.highlightedCells.push({cell,ids:ordered,colors:ordered.map(highlightColor),mode:z<24&&ordered.length>1?"split-perimeter":"nested"});
      }
      for (const annotate of annotations) annotate();
      diagnostics.actionMarks=[];
      if(view.motion&&!point){const now=performance.now(),marks=[...actionMarks.values()].filter(m=>now-m.at<850&&Number.isInteger(m.cell??livingById.get(m.id)?.cell));
        marks.sort((a,b)=>Number(b.id===view.selectedEntity)-Number(a.id===view.selectedEntity)||b.at-a.at);
        const slots=new Map();
        for(const m of marks.slice(0,64)){const o=livingById.get(m.id),p=o?coordinates.anchor(o).point:freeQById.has(m.id)?qPoint(freeQById.get(m.id)):position(m.cell);if(!visible(p,2))continue;
          const n=slots.get(m.id)||0;if(n>=3)continue;slots.set(m.id,n+1);
          const width=detail?Math.max(.18,46/z):Math.max(.30,20/z),height=width*34/112;
          const mx=S.clamp(p[0]-width/2,(-view.x+4)/z,(-view.x+b.width-4)/z-width),my=Math.max((-view.y+4)/z+2*(height+.025),p[1]-(detail?.40:.42))-n*(height+.025);
          g.save();g.globalAlpha=Math.min(1,(850-(now-m.at))/180);g.drawImage(markSprite(m.kind),mx,my,width,height);g.restore();
          diagnostics.actionMarks.push({id:m.id,kind:m.kind,x:mx*z+view.x,y:my*z+view.y});
        }
      }
      if (view.selected !== null) {
        const f = P.face(view.selected);
        path(f.slice(0, 4));
        g.fillStyle = "#ffe2a512";
        g.fill();
        g.strokeStyle = "#ffe3a0";
        g.lineWidth = 1.5 / z;
        g.stroke();
      }
      const selected=coordinates.entity(view.selectedEntity);
      if(selected?.elevated){
        g.save();g.strokeStyle='#f2d79c88';g.lineWidth=1/z;g.setLineDash([2/z,3/z]);
        g.beginPath();g.moveTo(...selected.ground);g.lineTo(...selected.point);g.stroke();g.restore();
      }
      g.restore();
    }
    function hitAt(clientX,clientY,groundOnly=false){
      const cell=cellAt(clientX,clientY);if(!world)return null;
      const b=canvas.getBoundingClientRect(),x=(clientX-b.left-view.x)/view.scale,y=(clientY-b.top-view.y)/view.scale;
      if(!groundOnly){
        const detail=view.scale>=24&&view.mode!=="overview"&&!view.simplified;
        let closest=null,best=Infinity;
        for(let i=hitRegions.length-1;i>=0;i--){
          const a=hitRegions[i],d=((x-a.x)/a.rx)**2+((y-a.y)/a.ry)**2;
          if(d<=1&&d>=(a.min||0)**2){
            if(!detail)return {cell:a.cell,id:a.id};
            if(d<best){best=d;closest=a;}
          }
        }
        if(closest)return {cell:closest.cell,id:closest.id};
        // Nonliving field references never compete with organism/carcass IDs.
        let field=null,distance=Infinity;
        for(const a of informationHitRegions){const d=(x-a.x)**2+(y-a.y)**2;if(d<=a.r*a.r&&d<distance){field=a;distance=d;}}
        if(field)return {cell:field.cell,id:null,kind:'information',information:true};
      }
      if(cell===null)return null;
      return {cell,id:groundOnly?world.organisms.find(o=>o.cell===cell&&o.slot!=='main')?.id:null,groundOnly};
    }
    function cellAt(clientX, clientY) {
      if (!world) return null;
      const b = canvas.getBoundingClientRect();
      return P.pick(
        (clientX - b.left - view.x) / view.scale,
        (clientY - b.top - view.y) / view.scale,
      );
    }
    function zoom(
      factor,
      x = canvas.clientWidth / 2,
      y = canvas.clientHeight / 2,
    ) {
      view.mode = "auto";
      const next = S.clamp(view.scale * factor, 1, 480),
        ratio = next / view.scale;
      view.x = x - (x - view.x) * ratio;
      view.y = y - (y - view.y) * ratio;
      view.scale = next;
    }
    return {
      view,
      diagnostics,
      get prepared(){return Art.loaded&&!!cache&&(view.scale<24||view.mode==='overview'||view.simplified||!!nearCache);},
      setWorld,
      draw,
      drawIfChanged,
      fit,
      focus,
      screen,
      cellAt,
      hitAt,
      deathAppearance: id=>{const a=deathAppearances.get(id);return a?structuredClone(a):null;},
      zoom,
      creature,
    };
  }
  return {
    create,
    creature,
    producer,
    food,
    symbol,
    symbolColor,
    highlightColor,
    symbolPaths,
    spriteMetrics,
    colors,
    assets: Art,
  };
});
