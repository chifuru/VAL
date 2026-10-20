/* Production artwork. Pure display transforms; never mutates the ecosystem. */
(function (root) {
  "use strict";
  const manifest = root.EcoVisualManifest,
    images = {},
    errors = [];
  let loaded = false;
  const ready = Promise.all(
    Object.entries(manifest.sheets).map(async ([key, entry]) => {
      const im = new Image();
      try {
        im.src = "assets/" + entry.file;
        await im.decode();
        images[key] = im;
      } catch {
        errors.push(entry.file);
      }
    }),
  ).then(() => {
    loaded = !errors.length;
    if(loaded){const c=document.createElement('canvas');c.width=c.height=1;const g=c.getContext('2d');for(let index=0;index<manifest.props.regions.length;index++)propShadow(g,index,0,0,1);}
  });
  const tint = [
    "#66d4c5",
    "#eebd79",
    "#bb9bdd",
    "#a6c68b",
    "#dfebe2",
    "#91bb78",
    "#dfcf9d",
    "#bea17e",
  ];
  function ellipse(g, x, y, a, b, angle = 0) {
    g.beginPath();
    g.ellipse(x, y, a, b, angle, 0, Math.PI * 2);
    g.fill();
  }
  const glowFrames=new Map();
  function glow(g,x,y,r,c){
    let image=glowFrames.get(c);if(!image){image=document.createElement('canvas');image.width=image.height=128;
      const n=image.getContext('2d'),a=n.createRadialGradient(64,64,0,64,64,64);a.addColorStop(0,c+'80');a.addColorStop(1,c+'00');n.fillStyle=a;n.fillRect(0,0,128,128);if(glowFrames.size>=16)glowFrames.delete(glowFrames.keys().next().value);glowFrames.set(c,image);}
    g.drawImage(image,x-r,y-r,r*2,r*2);
  }
  const variants = new Map(),framesClean = new Map(),cacheMetrics={bytes:{},evictions:{}};
  function cachedFrame(map,key){const value=map.get(key);if(value){map.delete(key);map.set(key,value);}return value;}
  function storeFrame(name,map,key,frame,megabytes,factor=1){
    map.set(key,frame);let bytes=0;for(const c of map.values())bytes+=c.width*c.height*4*factor;
    const limit=megabytes*1024*1024;
    while(bytes>limit&&map.size>1){const first=map.keys().next().value,c=map.get(first);map.delete(first);bytes-=c.width*c.height*4*factor;cacheMetrics.evictions[name]=(cacheMetrics.evictions[name]||0)+1;}
    cacheMetrics.bytes[name]=bytes;return frame;
  }
  // Atlas cells may contain isolated tips from a neighbour. Keep the central tissue
  // and its substantial attached components; source PNGs remain unchanged.
  let componentLabels=new Int32Array(0),componentQueue=new Int32Array(0);
  function cleanFrame(im, f, singleBody = false) {
    const key = im.src + "/" + f.join(",") + "/" + singleBody;
    if (framesClean.has(key)) return cachedFrame(framesClean,key);
    const c = document.createElement("canvas");
    c.width = f[2];
    c.height = f[3];
    const g = c.getContext("2d");
    g.drawImage(im, ...f, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height),
      W = c.width,
      H = c.height,
      labels = (componentLabels.length<W*H?(componentLabels=new Int32Array(W*H)):componentLabels).subarray(0,W*H),
      groups = [];
    labels.fill(0);if(componentQueue.length<W*H)componentQueue=new Int32Array(W*H);
    let n = 0;
    for (let p = 0; p < W * H; p++) {
      if (labels[p] || d.data[p * 4 + 3] < 30) continue;
      n++;
      const queue=componentQueue;let head=0,tail=1;queue[0]=p;labels[p]=n;
      let count=0,cx=0,cy=0;
      while(head<tail){const a=queue[head++],x=a%W,y=Math.floor(a/W);count++;cx+=x;cy+=y;
        if(x>0){const b=a-1;if(!labels[b]&&d.data[b*4+3]>=30){labels[b]=n;queue[tail++]=b;}}
        if(x<W-1){const b=a+1;if(!labels[b]&&d.data[b*4+3]>=30){labels[b]=n;queue[tail++]=b;}}
        if(y>0){const b=a-W;if(!labels[b]&&d.data[b*4+3]>=30){labels[b]=n;queue[tail++]=b;}}
        if(y<H-1){const b=a+W;if(!labels[b]&&d.data[b*4+3]>=30){labels[b]=n;queue[tail++]=b;}}
      }
      groups.push({ n, count, cx: cx / count, cy: cy / count });
    }
    const largest = Math.max(1, ...groups.map((a) => a.count)),
      keep = new Set(
        groups.filter((a) => singleBody ? a.count === largest : a.count >= largest * 0.06).map((a) => a.n),
      );
    // Only remove labelled disconnected fragments. Soft fringe pixels remain intact.
    for (let p = 0; p < W * H; p++)
      if (labels[p] && !keep.has(labels[p])) d.data[p * 4 + 3] = 0;
    g.putImageData(d, 0, 0);
    storeFrame('clean',framesClean,key,c,96);
    return c;
  }

  const anatomyTargets = new Set(["solar", "cephalopod", "crystal", "swarm", "precocial", "abyss", "myth", "recursive", "sail", "gravity", "manyeyes", "abyssshell", "parallel", "memory", "serpent", "antimeme", "valis", "jelly", "kelp", "whale", "plasma"]);
  const anatomyMetrics = { builds: 0, hits: 0, foldedTriangles: 0, maxTexturePixels: 0, limitedFrames: 0, minStrength: 1 };
  function anatomyPoints(o, stage) {
    const m=o.sex==="male"?1:0, f=o.sex==="female"?1:0,
      j=stage==="juvenile"?1:0, e=stage==="elderly"?1:0,
      points=[], at=(x,y,dx,dy,sx=.21,sy=.20)=>points.push([x,y,dx,dy,sx,sy]);
    if(o.species==="solar"){
      at(.44,.17,0,-.19*m+.055*f+.18*j+.12*e,.27,.16); // crown feathers
      at(.84,.53,.17*m-.15*f-.21*j,.10*e,.20,.29); // rear plumage
      at(.32,.58,-.14*f+.035*m, .025*f,.17,.20); // breast
      at(.66,.30, .04*m, .11*j+.075*e,.21,.17); // wing tips
      at(.43,.87,0,-.09*j+.06*e,.26,.12); // supports
    }else if(o.species==="cephalopod"){
      const hx=o.phase>=3?.24:.50,hy=o.phase>=3?.36:.28;
      at(hx-.13,hy,-.10*f+.035*m, .025*e,.16,.22);
      at(hx+.13,hy, .10*f-.035*m,-.035*j,.16,.22); // mantle depth
      at(.83,.64,.18*m-.08*f-.16*j,.14*e,.18,.23); // outer arms
      at(.25,.86,-.07*m+.08*j,-.16*j+.11*e,.20,.15);
      at(.61,.83,.07*m-.10*j,-.14*j+.13*e,.18,.15);
    }else if(o.species==="crystal"){
      at(.57,.18, .025*m,-.23*m+.065*f+.19*j+.085*e,.29,.16); // dorsal crystals
      at(.47,.55,-.09*f+.035*m,.02*f,.19,.20);
      at(.79,.51, .08*f-.025*m,0,.15,.23); // central crystal body
      at(.31,.88, .05*j,-.14*j+.08*e,.14,.12);
      at(.79,.86,-.04*j,-.12*j+.07*e,.14,.12); // crystal supports
    }else if(o.species==="swarm"){
      const queen=o.role==="queen"?1:0,worker=o.role==="worker"?1:0;
      at(.52,.14,0,-.22*queen-.12*m+.075*worker+.16*j+.08*e,.22,.13); // living signal cluster
      at(.50,.70,0,.20*queen-.10*worker-.035*m-.075*j+.08*e,.24,.17); // central lower ring
      at(.15,.55,-.13*queen-.08*worker-.20*m+.16*j,.035*worker+.09*e,.15,.25);
      at(.84,.55, .13*queen+.08*worker+.20*m-.16*j,.035*worker+.09*e,.15,.25); // lateral plates
      at(.50,.46,0,.065*queen-.025*worker,.20,.16); // torus remains connected and hollow
    }else if(o.species==="precocial"){
      at(.20,.35,-.13*m+.045*f+.05*j,.03*j+.04*e,.16,.17);
      at(.80,.36, .13*m-.045*f-.05*j,.03*j+.05*e,.16,.18); // outer plates
      at(.52,.53,0,.12*f-.035*m+.025*j,.23,.19); // central carapace
      at(.28,.87,0,-.045*j+.085*e,.15,.11);
      at(.75,.87,0,-.045*j+.085*e,.15,.11); // early juvenile already has developed supports
    }else if(o.species==="abyss"){
      at(0.18,0.72,-.15*m+.13*j,.12*e);
      at(0.82,0.75,.16*m-.14*j,.14*e);
      at(0.4,0.35,-.10*f,.06*j);
      at(0.64,0.36,.10*f,.05*e);

    }else if(o.species==="myth"){
      at(0.51,0.15,0,-.18*m+.14*j+.10*e);
      at(0.82,0.65,.16*m-.10*f-.17*j,.08*e);
      at(0.43,0.59,-.12*f,.035*f);
      at(0.22,0.38,.07*j,.12*j+.08*e);

    }else if(o.species==="recursive"){
      at(0.18,0.25,-.14*m+.16*j,.10*e);
      at(0.85,0.65,.16*m-.14*j,.13*e);
      at(0.43,0.48,-.10*f,.04*f);
      at(0.6,0.51,.10*f,-.04*f);

    }else if(o.species==="sail"){
      at(0.85,0.35,.18*m-.16*j,.09*e);
      at(0.4,0.4,-.10*f,.06*j);
      at(0.62,0.48,.11*f,.08*f);
      at(0.4,0.8,0,-.12*j+.10*e);

    }else if(o.species==="gravity"){
      at(0.15,0.5,-.15*m+.16*j,.08*e);
      at(0.85,0.5,.15*m-.16*j,.08*e);
      at(0.5,0.2,0,-.09*f+.12*j+.08*e);
      at(0.5,0.8,0,.09*f-.12*j+.10*e);

    }else if(o.species==="manyeyes"){
      at(0.14,0.3,-.15*m+.15*j,.10*e);
      at(0.88,0.6,.17*m-.15*j,.12*e);
      at(0.4,0.4,-.10*f,.04*f);
      at(0.6,0.43,.10*f,.04*e);

    }else if(o.species==="abyssshell"){
      at(0.18,0.42,-.18*m+.12*j,.06*e);
      at(0.65,0.45,.11*f,-.08*f+.07*j);
      at(0.55,0.2,0,.12*j+.08*e);
      at(0.66,0.82,0,-.08*j+.10*e);

    }else if(o.species==="parallel"){
      at(0.17,0.28,-.13*m+.15*j,.08*e);
      at(0.83,0.27,.13*m-.15*j,.08*e);
      at(0.2,0.78,-.10*m+.12*j,.12*e);
      at(0.8,0.79,.10*m-.12*j,.12*e);
      at(0.5,0.52,.10*f,.08*f);

    }else if(o.species==="memory"){
      at(0.85,0.32,.17*m-.14*j,.12*e);
      at(0.2,0.7,-.13*m+.12*j,.10*e);
      at(0.42,0.45,-.09*f,.07*j);
      at(0.62,0.62,.10*f,.08*f);

    }else if(o.species==="serpent"){
      at(0.45,0.18,.04*m,-.18*m+.15*j+.11*e);
      at(0.62,0.52,.10*f,.08*f);
      at(0.86,0.68,.10*m-.12*j,.07*e);
      at(0.32,0.65,-.06*f,.05*e);

    }else if(o.species==="antimeme"){
      at(0.85,0.45,.17*m-.15*j,.08*e);
      at(0.34,0.42,-.10*f,.07*j);
      at(0.57,0.57,.10*f,.05*f);
      at(0.5,0.82,0,-.12*j+.12*e);

    }else if(o.species==="valis"){
      at(0.72,0.18,.12*m-.12*j,-.13*m+.12*j+.12*e);
      at(0.32,0.55,-.10*f,.05*f);
      at(0.57,0.6,.11*f,.07*f);
      at(0.86,0.68,.12*m-.12*j,.10*e);

    }else if(o.species==="jelly"){
      at(0.3,0.3,-.10*f+.06*j,.08*e);
      at(0.7,0.3,.10*f-.06*j,.08*e);
      at(0.5,0.22,0,-.07*f+.10*j);
      at(0.4,0.8,-.05*m,.17*m-.18*j+.11*e);
      at(0.7,0.78,.05*m,.14*m-.16*j+.12*e);

    }else if(o.species==="kelp"){
      at(0.83,0.28,.15*m-.15*j,.10*e);
      at(0.35,0.57,-.11*f,.06*j);
      at(0.6,0.62,.11*f,.08*f);
      at(0.35,0.82,-.06*m+.07*j,.09*e);

    }else if(o.species==="whale"){
      at(0.55,0.18,0,-.17*m+.15*j+.10*e);
      at(0.9,0.58,.16*m-.14*j,.09*e);
      at(0.5,0.65,-.04*f,.13*f-.05*j);
      at(0.65,0.43,.04*m,.06*e);

    }else if(o.species==="plasma"){
      at(0.88,0.48,.19*m-.17*j,.08*e);
      at(0.29,0.45,-.10*f,.05*j);
      at(0.46,0.63,.10*f,.08*f);
      at(0.7,0.8,.08*m-.10*j,.13*e);

    }
    return points;
  }
  function anatomyFrame(canvas, image, o, stage) {
    const g=canvas.getContext("2d"),W=image.width,H=image.height,
      points=anatomyPoints(o,stage),N=12,padX=W*.18,padY=H*.18;
    g.save();g.translate(padX,padY);
    let strength=1;
    function vertex(x,y){
      const u=x/W,v=y/H,edge=.45+.55*16*u*(1-u)*v*(1-v);let dx=0,dy=0;
      for(const [cx,cy,px,py,sx,sy]of points){const w=Math.exp(-.5*(((u-cx)/sx)**2+((v-cy)/sy)**2));dx+=px*w;dy+=py*w;}
      return [x+dx*edge*W*strength,y+dy*edge*H*strength];
    }
    function triangle(s,t){
      const sx1=s[1][0]-s[0][0],sy1=s[1][1]-s[0][1],sx2=s[2][0]-s[0][0],sy2=s[2][1]-s[0][1],
        dx1=t[1][0]-t[0][0],dy1=t[1][1]-t[0][1],dx2=t[2][0]-t[0][0],dy2=t[2][1]-t[0][1],det=sx1*sy2-sx2*sy1,
        a=(dx1*sy2-dx2*sy1)/det,b=(dy1*sy2-dy2*sy1)/det,c=(dx2*sx1-dx1*sx2)/det,d=(dy2*sx1-dy1*sx2)/det,
        cx=(t[0][0]+t[1][0]+t[2][0])/3,cy=(t[0][1]+t[1][1]+t[2][1])/3;
      if((dx1*dy2-dx2*dy1)*det<=0)anatomyMetrics.foldedTriangles++;
      g.save();g.beginPath();
      // A small overlap avoids antialias cracks while keeping the existing painted tissue.
      t.forEach((p,i)=>{const x=cx+(p[0]-cx)*1.006,y=cy+(p[1]-cy)*1.006;i?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();g.clip();
      g.transform(a,b,c,d,t[0][0]-a*s[0][0]-c*s[0][1],t[0][1]-b*s[0][0]-d*s[0][1]);g.drawImage(image,0,0);g.restore();
    }
    const source=Array.from({length:(N+1)**2},(_,i)=>[i%(N+1)*W/N,Math.floor(i/(N+1))*H/N]),
      area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),
      triangles=[];
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const a=y*(N+1)+x,b=a+1,c=a+N+1,d=c+1;triangles.push([a,b,c],[d,c,b]);
    }
    let destination;
    // Bound local distortion by triangle area; never fold or collapse painted anatomy.
    for(let attempt=0;attempt<10;attempt++){
      destination=source.map(p=>vertex(...p));
      if(triangles.every(t=>area(...t.map(i=>destination[i]))/area(...t.map(i=>source[i]))>=.20))break;
      strength=attempt===8?0:strength*.75;
    }
    if(strength<1)anatomyMetrics.limitedFrames++;
    anatomyMetrics.minStrength=Math.min(anatomyMetrics.minStrength,strength);
    for(const t of triangles)triangle(t.map(i=>source[i]),t.map(i=>destination[i]));
    if(stage==="elderly"){
      g.globalCompositeOperation="source-atop";
      g.fillStyle=o.species==="solar"?"#bca6842e":o.species==="cephalopod"?"#a9bac330":"#bac5c52c";g.fillRect(-padX,-padY,W+2*padX,H+2*padY);
      const wear= o.species==="crystal"||o.species==="precocial";
      g.strokeStyle=wear?"#f3e4b567":"#cabfc544";g.lineWidth=Math.max(1,W/240);
      const count=wear?7:4;
      for(let i=0;i<count;i++){
        const x=W*(.2+i*.09),y=H*(wear?.24:.72);
        g.beginPath();g.moveTo(x,y);g.lineTo(x+W*.025,y+H*(wear?.08:.05));g.stroke();
      }
      g.globalCompositeOperation="source-over";
    }
    g.restore();anatomyMetrics.builds++;
  }
  function variant(o, im, f, singleBody = false) {
    im = cleanFrame(im, f, singleBody);
    f = [0, 0, im.width, im.height];
    const age = root.EcoState.ageInfo(o),
      stage = age.enabled ? age.stage : "adult",
      sex = o.sex || "none",
      key = [o.species, o.phase, o.branch3, o.branch4, stage, sex, o.role].join(
        "/",
      );
    if (variants.has(key)) { if(anatomyTargets.has(o.species))anatomyMetrics.hits++; return cachedFrame(variants,key); }
    const c = document.createElement("canvas");
    c.width = f[2];
    c.height = f[3];
    const g = c.getContext("2d"),
      W = c.width,
      H = c.height;
    if(anatomyTargets.has(o.species)){
      // Bound generated texture size; padding retains extended appendages without clipping.
      const scale=Math.min(1,360/im.width,360/im.height),skin=document.createElement("canvas");
      skin.width=Math.max(1,Math.round(im.width*scale));skin.height=Math.max(1,Math.round(im.height*scale));
      skin.getContext("2d").drawImage(im,0,0,skin.width,skin.height);
      c.width=Math.ceil(skin.width*1.36);c.height=Math.ceil(skin.height*1.36);
      anatomyMetrics.maxTexturePixels=Math.max(anatomyMetrics.maxTexturePixels,c.width*c.height);
      anatomyFrame(c,skin,o,stage);
      if(variants.size>=256)variants.delete(variants.keys().next().value);
      storeFrame('variants',variants,key,c,128,2);return c;
    }
    // Change tissue proportions, not only an external badge: juvenile appendages shorter,
    // males longer peripheral structures, females wider central body at every phase.
    const band = 3;
    for (let y = 0; y < H; y += band) {
      const h = Math.min(band, H - y),
        v = (y + h / 2) / H,
        core = Math.sin(Math.PI * v),
        k =
          stage === "juvenile"
            ? 0.65 + 0.35 * core
            : sex === "female"
              ? 0.83 + 0.17 * core
              : sex === "male"
                ? 1 - 0.15 * core
                : 0.94 + 0.06 * core;
      g.drawImage(im, f[0], f[1] + y, W, h, (W - W * k) / 2, y, W * k, h);
    }
    if (stage === "elderly") {
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = "#b8c3bd33";
      g.fillRect(0, 0, W, H);
      g.strokeStyle = "#fff0c138";
      g.lineWidth = W / 250;
      for (let i = 0; i < 13; i++) {
        const y = H * (0.12 + i * 0.06);
        g.beginPath();
        g.moveTo(W * 0.12, y);
        g.bezierCurveTo(
          W * 0.35,
          y - H * 0.05,
          W * 0.64,
          y + H * 0.03,
          W * 0.88,
          y - H * 0.02,
        );
        g.stroke();
      }
    }
    if (variants.size >= 256) variants.delete(variants.keys().next().value);
    storeFrame('variants',variants,key,c,128,2);
    return c;
  }
  // Color lighting is independent of pose, camera and biological state.
  // Bake it once per immutable sprite instead of opening filtered canvas layers
  // for every moving body on the full board.
  const litFrames = new WeakMap();
  function litFrame(frame) {
    let lit = litFrames.get(frame);
    if (!lit) {
      lit = document.createElement("canvas");
      lit.width = frame.width; lit.height = frame.height;
      const c = lit.getContext("2d");
      c.filter = 'brightness(1.13) contrast(1.07) saturate(1.10)';
      c.drawImage(frame, 0, 0);
      litFrames.set(frame, lit);
    }
    return lit;
  }
  const outlineFrames = new WeakMap();
  const outlineMetrics = { builds: 0, hits: 0 };
  function outlined(g, frame, x, y, width, height, enabled, lighting = false) {
    if (enabled) {
      let entry = outlineFrames.get(frame);
      if (!entry) {
        const pad = Math.max(3, Math.ceil(frame.width * 0.018));
        const c = document.createElement("canvas");
        c.width = frame.width + pad * 2;
        c.height = frame.height + pad * 2;
        const n = c.getContext("2d");
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          n.drawImage(frame, pad + Math.cos(a) * pad, pad + Math.sin(a) * pad);
        }
        n.globalCompositeOperation = "source-in";
        n.fillStyle = "#03131dee";
        n.fillRect(0, 0, c.width, c.height);
        n.globalCompositeOperation = "destination-out";
        n.drawImage(frame, pad, pad);
        entry = { image: c, pad };
        outlineFrames.set(frame, entry);
        outlineMetrics.builds++;
      } else outlineMetrics.hits++;
      const px = (width * entry.pad) / frame.width,
        py = (height * entry.pad) / frame.height;
      g.drawImage(lighting ? litFrame(entry.image) : entry.image, x - px, y - py, width + px * 2, height + py * 2);
    }
    g.drawImage(lighting ? litFrame(frame) : frame, x, y, width, height);
  }
  function creature(g, o, x, y, r) {
    const frames = manifest.creatures.regions[o.species],
      im = images[manifest.creatures.sheetBySpecies[o.species]];
    if (!frames || !im) return false;
    // Clamp presentation input to the actual lineage phase count (precocial ends at III).
    const phase = Math.max(1, Math.min(frames.length, o.phase || 1));
    let f =
        frames[phase - 1],
      source = im;
    const b = manifest.branches[o.species],
      useBranch = b && phase >= 3 && images[b.sheet];
    if (useBranch) {
      source = images[b.sheet];
      f =
        b.regions[
          phase === 3
            ? (o.branch3 ?? 0)
            : 3 + (o.branch3 ?? 0) * 2 + (o.branch4 ?? 0)
        ];
    }
    const age = root.EcoState.ageInfo(o),
      juvenile = age.enabled && age.stage === "juvenile",
      elder = age.enabled && age.stage === "elderly";
    const branchWidth =
      !b && o.phase >= 3
        ? o.branch3 === 0
          ? 1.08
          : o.branch3 === 1
            ? 0.87
            : 1.04
        : 1;
    const contain = (useBranch ? b.fit : manifest.creatures.fitBySpecies?.[o.species]) === "contain";
    const aspect = contain ? f[2] / f[3] : 1;
    const width =
        Math.min(1, aspect) *
        branchWidth *
        r *
        2.8 * (anatomyTargets.has(o.species)?1.36:1) *
        (0.94 + 0.12 * (o.dna?.appendage ?? 0.5)) *
        (!anatomyTargets.has(o.species) && o.sex === "female" ? 1.1 : 1),
      height =
        Math.min(1, 1 / aspect) *
        r *
        2.8 * (anatomyTargets.has(o.species)?1.36:1) *
        (anatomyTargets.has(o.species) ? juvenile ? o.species === "precocial" ? .94 : .88 : elder ? .97 : 1 : juvenile ? .77 : elder ? .94 : 1) *
        (!anatomyTargets.has(o.species) && o.sex === "male" ? 1.1 : 1);
    g.save();
    g.translate(x, y);
    if (o.renderPose) {
      g.rotate(o.renderPose.lean || 0);
      g.scale(1, o.renderPose.squash || 1);
    }
    if (Math.cos(((o.facing || 0) * Math.PI) / 4) < 0) g.scale(-1, 1);
    outlined(
      g,
      variant(o, source, f, contain),
      -width / 2,
      -height / 2,
      width,
      height,
      o.renderEmphasis,
      o.renderLighting,
    );
    // Every main lineage selects its own dedicated branch artwork.
    // Age/sex tissue transforms remain separate from branch identity.
    g.restore();
    return true;
  }
  const foodStates = new Map();
  const foodMetrics = { builds: 0, hits: 0, cached: 0 };
  function food(g, o, x, y, r, env) {
    const id=o.species, floating=id==="phytoplankton",
      frames=manifest.food.regions[floating?"algae":id], im=images["food-atlas"];
    if(!frames)return creature(g,o,x,y,r);
    if(!im)return false;
    const spec=root.EcoState.spec(o), age=root.EcoState.ageInfo(o),
      stage=age.enabled?age.stage:"adult", animal=spec.group==="prey",
      capacity=Math.max(1,o.colony?.version === 'colony-state/1' ? o.colony.baseB + o.colony.capacityB : spec.capacity[1]),
      stock=Math.max(0,Math.min(1,(Number.isFinite(o.B)?o.B:spec.initial[1])/capacity)),
      density=Math.min(3,Math.floor(stock*4)), phase=Math.max(1,Math.min(2,o.phase||1)),
      climate=[1,4,5,7].includes(env)?env:0,
      key=[id,phase,stage,density,climate].join("/");
    let frame=foodStates.get(key);
    if(!frame){
      const c=document.createElement("canvas");c.width=c.height=192;
      const n=c.getContext("2d"), f=frames[phase-1];
      // Separate cells are intentional in algae; animals/tufts keep a single body.
      const original=cleanFrame(im,f,id!=="algae"&&!floating);
      n.filter=stage==="elderly"?"saturate(.55) brightness(.89)":stage==="juvenile"?"saturate(1.08)":"none";
      if(floating){
        const cellFrame=cleanFrame(im,[56,146,114,108],true),
          count=2+density*2+(phase===2?2:0);
        for(let i=0;i<count;i++){
          const a=i*2.399,spread=12+Math.sqrt(i/count)*58,
            size=(phase===2?30:26)*(i%3===0?1:.70);
          n.drawImage(cellFrame,96+Math.cos(a)*spread-size/2,93+Math.sin(a)*spread*.65-size/2,size,size);
        }
      }else{
        const aspect=f[2]/f[3],W=168*Math.min(1,aspect),H=168*Math.min(1,1/aspect),
          body=animal?(.77+density*.075):1,
          juvenile=stage==="juvenile";
        if(animal){
          // Waterbug appendages trail sideways; grassbug supports drop below the body.
          for(let y0=0;y0<original.height;y0+=4){
            const h=Math.min(4,original.height-y0),v=(y0+h/2)/original.height,
              k=juvenile?(id==="waterbug"?.78+.22*Math.sin(Math.PI*v):.88+.12*Math.sin(Math.PI*v)):1,
              droop=stage==="elderly"?(id==="waterbug"?Math.sin(v*Math.PI)*8:(v>.5?(v-.5)*12:0)):0;
            n.drawImage(original,0,y0,original.width,h,96-W*body*k/2+droop,96-H/2+y0/original.height*H,W*body*k,h/original.height*H);
          }
        }else n.drawImage(original,96-W/2,96-H/2,W,H);
      }
      n.filter="none";
      if(!animal&&!floating){
        // Thin the actual peripheral tissue, rather than changing the organism count.
        n.globalCompositeOperation="destination-out";
        const holes=(3-density)*(id==="grass"?4:id==="fungus"?5:6);
        for(let i=0;i<holes;i++){
          const a=i*2.399,rx=id==="grass"?18:id==="fungus"?13:16,
            ry=id==="grass"?34:id==="fungus"?18:13;
          ellipse(n,96+Math.cos(a)*69,91+Math.sin(a)*59,rx,ry,a*.1);
        }
      }
      n.globalCompositeOperation="source-atop";
      const tint=climate===1?"#efbd6c21":climate===4?"#c5ecff30":climate===5?"#5ec8b620":climate===7?"#91857530":null;
      if(tint){n.fillStyle=tint;n.fillRect(0,0,192,192);}
      if(stage==="elderly"&&!animal){
        n.fillStyle="#c0a16f50";
        n.fillRect(0,0,192,42); // aged tips remain independent of grazed biomass
      }
      n.globalCompositeOperation="source-over";
      if(foodStates.size>=128)foodStates.delete(foodStates.keys().next().value);
      storeFrame('lower',foodStates,key,c,24);frame=c;foodMetrics.builds++;foodMetrics.cached=foodStates.size;
    }else foodMetrics.hits++;
    const ageScale=stage==="juvenile"?.78:stage==="elderly"?.94:1,
      size=r*(.93+.12*stock)*ageScale;
    g.save();g.translate(x,y);
    if(o.facing%2)g.scale(-1,1);
    outlined(g,frame,-size*1.3,-size*1.3,size*2.6,size*2.6,o.renderEmphasis);
    g.restore();return true;
  }
  // Parasite colonies use their actual lifecycle, never host age or sex transforms.
  function parasitePhase(p) {
    if (p.species === "hyperparasite") return Math.max(1, Math.min(3, p.phase || 1));
    return p.stage === "first" ? 1 : p.stage === "terminal" && p.counter >= 8 ? 3 : 2;
  }
  function parasite(g, p, x, y, r) {
    const phase = parasitePhase(p),
      f = manifest.creatures.regions[p.species]?.[phase - 1],
      im = images[manifest.creatures.sheetBySpecies[p.species]];
    if (!f || !im) return false;
    const frame = cleanFrame(im, f, true), aspect = f[2] / f[3],
      width = 2 * r * Math.min(1, aspect), height = 2 * r * Math.min(1, 1 / aspect);
    outlined(g, frame, x - width / 2, y - height / 2, width, height, true);
    return true;
  }
  const remainsFrames = new Map();
  function remains(g, a, x, y, r, water, turn) {
    const foodFrames = manifest.food.regions[a.species === "phytoplankton" ? "algae" : a.species],
      f = foodFrames?.[0] || manifest.creatures.regions[a.species]?.[0],
      im = images[foodFrames ? "food-atlas" : manifest.creatures.sheetBySpecies[a.species]];
    if (!f || !im) return false;
    // q is an absolute existing stock, not a guessed percentage of original biomass.
    const amount = Math.max(1, Math.min(4, Math.ceil(a.q || 1))),
      elapsed = Math.max(0, turn - a.created),
      duration = Math.max(1, (a.expires ?? a.created + 12) - a.created),
      weather = Math.min(2, Math.floor(elapsed / duration * 3)),
      key = [a.species, amount, weather, !!water, JSON.stringify(a.appearance||null)].join("/");
    let frame = remainsFrames.get(key);
    if (!frame) {
      let original=cleanFrame(im,f,true);
      if(a.appearance){const body=document.createElement("canvas");body.width=body.height=192;creature(body.getContext("2d"),a.appearance,96,96,58);original=body;}
      const c = document.createElement("canvas");
      c.width = 192; c.height = 192;
      const n = c.getContext("2d");
      n.filter = `grayscale(${.65 + weather * .12}) brightness(${.80 - weather * .08})`;
      n.drawImage(original, 0, 0, 192, 192); n.filter = "none";
      n.globalCompositeOperation = "source-atop";
      n.fillStyle = water ? "#568a9a48" : "#b18d6140";
      n.fillRect(0, 0, 192, 192);
      n.globalCompositeOperation = "destination-out";
      // Grazing removes tissue from the perimeter; time only changes surface weathering.
      for (let i = 0; i < (4 - amount) * 4; i++) {
        const angle = i * 2.399;
        ellipse(n, 96 + Math.cos(angle) * 81, 96 + Math.sin(angle) * 74, 23, 20);
      }
      n.globalCompositeOperation = "source-atop";
      n.fillStyle = "#dec9a12a";
      for (let i = 0; i < weather * 14; i++)
        ellipse(n, 12 + (i * 47 % 168), 12 + (i * 73 % 168), 2, 1);
      if (remainsFrames.size >= 256) remainsFrames.delete(remainsFrames.keys().next().value);
      storeFrame('remains',remainsFrames,key,c,32); frame = c;
    }
    const size = r * (1.3 + .18 * amount);
    g.save(); g.translate(x, y);
    g.fillStyle = water ? "#071d2f66" : "#07140c88";
    ellipse(g, 0, .02, size * .9, size * .28);
    g.rotate(a.slot === "food" ? -.12 : -.3);
    outlined(g, frame, -size, -size * .48, size * 2, size * .96, true);
    g.restore(); return true;
  }
  function resource(g, a, x, y, r, env, turn) {
    g.save();
    const n=Math.min(6,Math.max(1,Math.ceil(a.q))),
      c=({info:"#73e9ff",seed:"#d5cf83",spore:"#cf9aee",egg:"#ffddaa",organic:"#ba9374",mineral:"#a8d8ed",droplet:"#76d9f3",factor:"#f5c986"})[a.kind]||"#d6e5b5",
      habitat=["#78cee2","#f1a36a","#b9a8ff","#d0db89","#d6edff","#94d6a5","#d0ac7d","#ccdc7a"][env]||"#b5d0c5";
    if(a.kind==="info"){
      const elapsed=Math.max(0,turn-(a.event?.time??a.created??turn)),fresh=Math.max(0,1-Math.floor(elapsed/5)*.25);
      if(!fresh){g.restore();return;}
      g.globalAlpha=fresh;glow(g,x,y,r*(2+n*.12),c);g.strokeStyle=c;g.lineWidth=r*.09;
      for(let j=0;j<3;j++){g.beginPath();g.ellipse(x,y,r*(.8+j*.35),r*(.25+j*.12),j*.9-.5+env*.035,.2,Math.PI*1.8);g.stroke();}
      for(let j=0;j<n;j++){const t=j*2.399;g.fillStyle=j%2?habitat:"#edfcff";ellipse(g,x+Math.cos(t)*r*.65,y+Math.sin(t)*r*.24,r*.10,r*.10);}
      g.fillStyle="#edfcff";ellipse(g,x,y,r*.20,r*.20);
    }else{
      for(let j=0;j<n;j++){
        const u=x+Math.sin(j*8)*r*.6,v=y+Math.cos(j*5)*r*.4,k=r*(.34+j*.015);
        g.save();g.translate(u,v);g.rotate((env-3)*.035+j*.12);glow(g,0,0,k*1.7,c);g.fillStyle=c;g.strokeStyle=habitat;g.lineWidth=r*.075;
        g.beginPath();
        if(a.kind==="mineral"||a.kind==="factor"){
          g.moveTo(0,-k*1.5);g.lineTo(k,0);g.lineTo(0,k);g.lineTo(-k,0);g.closePath();g.fill();g.stroke();
          g.strokeStyle="#efffff";g.beginPath();g.moveTo(0,-k*1.4);g.lineTo(0,k*.7);g.stroke();
          if(a.kind==="factor"){g.strokeStyle=c;g.beginPath();g.ellipse(0,0,k*1.5,k*.5,-.6,0,Math.PI*2);g.stroke();}
        }else if(a.kind==="seed"){
          g.moveTo(0,-k*1.3);g.bezierCurveTo(k*1.4,-k*.2,k*.8,k,0,k);g.bezierCurveTo(-k*.8,k,-k*1.2,-k*.2,0,-k*1.3);g.fill();g.stroke();g.beginPath();g.moveTo(0,-k);g.lineTo(0,k*.7);g.stroke();
        }else if(a.kind==="spore"){
          ellipse(g,0,0,k*.65,k*.65);g.stroke();g.globalAlpha=.65;g.beginPath();g.ellipse(0,0,k,k,0,0,Math.PI*2);g.stroke();
        }else if(a.kind==="egg"){
          ellipse(g,0,0,k*.8,k*1.15);g.stroke();g.fillStyle="#fff6dd";ellipse(g,-k*.2,-k*.35,k*.22,k*.35);
        }else if(a.kind==="droplet"){
          g.moveTo(0,-k*1.5);g.bezierCurveTo(k*1.5,k*.3,k*.65,k*1.3,0,k);g.bezierCurveTo(-k*.9,k,-k,k*.1,0,-k*1.5);g.fill();g.stroke();g.fillStyle="#efffff";ellipse(g,-k*.25,0,k*.16,k*.35);
        }else{
          g.moveTo(-k,0);g.quadraticCurveTo(-k*.6,-k,k*.1,-k*.6);g.quadraticCurveTo(k*1.2,-k*.3,k*.8,k*.6);g.quadraticCurveTo(-k*.5,k,-k,0);g.fill();g.stroke();g.fillStyle=habitat;ellipse(g,0,0,k*.22,k*.16);
        }
        g.restore();
      }
    }
    g.restore();
  }
  const propVariants = new Map(),
    shadowFrames = new Map(), shadowStamps = new Map();
  function prop(g, index, x, y, width, alpha = 1, holes = []) {
    const im = images["habitat-props"],
      f = manifest.props.regions[index];
    if (!im || !f) return;
    const original = cleanFrame(im, f),
      height = (width * f[3]) / f[2];
    let frame = original;
    if (holes.length) {
      const key =
        index +
        "/" +
        holes
          .map((h) =>
            [h.x, h.y, h.radius, h.selected ? 1 : 0]
              .map((v) => Math.round(v * 20) / 20)
              .join(","),
          )
          .join(";");
      if (propVariants.has(key)) frame = propVariants.get(key);
      else {
        const c = document.createElement("canvas");
        c.width = original.width;
        c.height = original.height;
        const p = c.getContext("2d");
        p.drawImage(original, 0, 0);
        p.globalCompositeOperation = "destination-out";
        for (const h of holes) {
          const hx = (h.x / width + 0.5) * c.width,
            hy = (h.y / height + 0.9) * c.height,
            r = (h.radius / width) * c.width,
            fade = p.createRadialGradient(hx, hy, r * 0.45, hx, hy, r * 1.18);
          fade.addColorStop(0, h.selected ? "#000000f5" : "#000000eb");
          fade.addColorStop(0.65, "#000000d9");
          fade.addColorStop(1, "#0000");
          p.fillStyle = fade;
          p.fillRect(hx - r * 1.2, hy - r * 1.2, r * 2.4, r * 2.4);
        }
        if (propVariants.size >= 128)
          propVariants.delete(propVariants.keys().next().value);
        propVariants.set(key, c);
        frame = c;
      }
    }
    g.save();
    g.globalAlpha = alpha;
    g.drawImage(frame, x - width / 2, y - height * 0.9, width, height);
    g.restore();
  }
  function propShadow(g, index, x, y, width) {
    if ([3, 8, 9, 11, 15].includes(index)) return;
    const im = images["habitat-props"],
      f = manifest.props.regions[index];
    if (!im || !f) return;
    if (!shadowFrames.has(index)) {
      const original = cleanFrame(im, f),
        c = document.createElement("canvas");
      c.width = original.width;
      c.height = original.height;
      const s = c.getContext("2d");
      s.drawImage(original, 0, 0);
      s.globalCompositeOperation = "source-in";
      s.fillStyle = "#071e26";
      s.fillRect(0, 0, c.width, c.height);
      const baked=document.createElement("canvas");baked.width=c.width;baked.height=c.height;
      const bg=baked.getContext('2d');bg.filter='blur(3px)';bg.drawImage(c,0,0);shadowFrames.set(index,baked);
    }
    const height = (width * f[3]) / f[2];
    g.save();
    g.translate(x, y);
    g.transform(1, 0.18, -0.65, -0.2, 0, 0);
    g.globalAlpha = 0.28;
    g.drawImage(shadowFrames.get(index),-width/2,-height*.9,width,height);
    g.restore();
  }
  let warmSeed=null,warmScheduled=false,warmLatest=null,warmCurrent=null,warmCursor=0,warmExtras=[];
  const warmKeys=new Set();
  function warmWorld(w){
    warmLatest=w;if(warmScheduled)return;warmScheduled=true;
    const c=document.createElement('canvas');c.width=c.height=1;const g=c.getContext('2d'),schedule=fn=>typeof requestIdleCallback==='function'?requestIdleCallback(fn,{timeout:500}):setTimeout(fn,0);
    const next=()=>{
      if(!warmCurrent||warmSeed!==warmLatest.config.seed||warmCursor>=warmCurrent.organisms.length){if(warmCurrent===warmLatest){warmScheduled=false;return;}warmCurrent=warmLatest;warmCursor=0;if(warmSeed!==warmCurrent.config.seed){warmSeed=warmCurrent.config.seed;warmKeys.clear();}
        warmExtras=[];for(const species of [...(warmCurrent.config.enabled.P?['tideparasite','leafparasite']:[]),...(warmCurrent.config.enabled.Q?['hyperparasite']:[])])for(let i=0;i<3;i++)warmExtras.push({species,phase:i+1,stage:['first','middle','terminal'][i],counter:i===2?8:0});
      }
      while(warmExtras.length){const p=warmExtras.shift(),key='parasite/'+p.species+'/'+parasitePhase(p);if(!warmKeys.has(key)){warmKeys.add(key);parasite(g,p,0,0,1);schedule(next);return;}}
      for(let count=0;count<128&&warmCursor<warmCurrent.organisms.length;count++){
        const o=warmCurrent.organisms[warmCursor++],stage=root.EcoState.ageInfo(o).stage,env=warmCurrent.tiles[o.cell].env;let key,paint;
        if(o.slot==='main'){key=['m',o.species,o.phase,o.branch3,o.branch4,stage,o.sex,o.role].join('/');paint=()=>creature(g,{...o,renderLighting:true,renderEmphasis:false},0,0,1);}
        else {const spec=root.EcoState.spec(o),density=Math.min(3,Math.floor(Math.max(0,Math.min(1,o.B/Math.max(1,spec.capacity[1])))*4));key=['f',o.species,o.phase,stage,density,[1,4,5,7].includes(env)?env:0].join('/');paint=()=>food(g,o,0,0,1,env);}
        if(!warmKeys.has(key)){warmKeys.add(key);paint();break;}
      }
      if(warmKeys.size>4096)warmKeys.clear();schedule(next);
    };
    ready.then(()=>{if(loaded)schedule(next);else warmScheduled=false;});
  }
  root.EcoArt = {
    manifest,
    warmWorld,
    get warming(){return warmScheduled;},
    cacheMetrics,
    outlineMetrics,
    anatomyMetrics,
    anatomyTargets: [...anatomyTargets],
    images,
    errors,
    ready,
    tint,
    creature,
    food,
    foodMetrics,
    resource,
    parasitePhase,
    parasite,
    remains,
    prop,
    propShadow,
    get loaded() {
      return loaded;
    },
  };
})(globalThis);
