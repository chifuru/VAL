/* Rendering reads a settled world. Animation never changes biological state. */
(function (root, factory) {
  const api = factory(root.EcoState, root.EcoArt);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EcoRenderer = api;
})(globalThis, function (S, Art) {
  "use strict";
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
  // Cartographic symbols, shared by board and legend. Shape is independent of biology.
  const symbolPaths = {
    abyss:"M-.7 .6 Q-1 -.7 0 -.7 Q1 -.7 .7 .6 M-.45 .25 Q-.8 1 -.95 .5 M0 .3 Q.15 1 .4 .65 M.4 .2 Q1 .8 .9 .2",
    myth:"M-1 .4 L-.4 -.45 L0 .1 L.4 -.7 L1 .2 L.2 .45 L0 .9 Z",
    recursive:"M-.8 -.7 H.1 V-.1 H.8 V.7 H-.1 V.1 H-.8 Z M-.45 -.4 L.45 .4",
    sail:"M0 -.9 L.9 .5 H-.8 Z M0 -.9 V.7 M-.85 .8 H.85",
    gravity:"M-.85 0 A.85 .4 -30 1 0 .85 0 A.85 .4 -30 1 0 -.85 0 M0 -.45 V.45 M-.25 0 H.25",
    crystal:"M0 -.95 L.7 -.25 L.5 .7 L0 1 L-.5 .7 L-.7 -.25 Z M0 -.95 V1 M-.7 -.25 H.7",
    manyeyes:"M0 -.8 A.8 .8 0 1 0 .01 -.8 M-.6 -.2 H-.3 M.3 -.2 H.6 M-.15 .4 H.15",
    abyssshell:"M-.8 .5 Q-.8 -1 0 -.8 Q.8 -1 .8 .5 Z M-.35 .4 V-.4 M0 .4 V-.65 M.35 .4 V-.4",
    parallel:"M-.7 -.8 V.8 M0 -.8 V.8 M.7 -.8 V.8 M-.9 -.45 H.9 M-.9 .45 H.9",
    memory:"M-.8 0 A.8 .8 0 1 1 0 .8 H-.4 V.1 H.35 V-.35 H-.25",
    serpent:"M-.7 .7 C.8 1 -1 -.4 .2 -.4 C1 -.4 .9 -1 .35 -.8 M.35 -.8 L.4 -.5",
    solar:"M0 -.6 A.6 .6 0 1 0 .01 -.6 M0 -.8 V-1 M0 .8 V1 M-.8 0 H-1 M.8 0 H1 M-.6 -.6 L-.8 -.8 M.6 -.6 L.8 -.8 M-.6 .6 L-.8 .8 M.6 .6 L.8 .8",
    antimeme:"M-.8 -.3 V-.8 H-.3 M.3 -.8 H.8 V-.3 M.8 .3 V.8 H.3 M-.3 .8 H-.8 V.3 M-.2 -.1 L.2 .1",
    valis:"M0 -.9 L.9 0 L0 .9 L-.9 0 Z M0 -.35 L.35 0 L0 .35 L-.35 0 Z",
    jelly:"M-.85 0 Q-.7 -1 0 -.8 Q.7 -1 .85 0 Z M-.5 0 Q-.8 .55 -.5 .9 M0 0 Q.3 .55 0 .95 M.5 0 Q.8 .55 .5 .9",
    kelp:"M0 .9 V-.8 M0 -.5 Q-1 -.9 -.6 -.2 Q-.2 .1 0 -.2 M0 .2 Q1 -.3 .65 .4 Q.2 .8 0 .5",
    whale:"M-.8 -.1 Q0 -1 .8 -.15 L1 -.5 V.5 L.7 .2 Q0 1 -.8 .1 Z",
    swarm:"M-.8 0 Q-.8 -.65 0 -.65 Q.8 -.65 .8 0 Q.8 .65 0 .65 Q-.8 .65 -.8 0 M-.8 0 H.8 M-.5 .5 L-.8 .9 M.5 .5 L.8 .9",
    plasma:"M-.6 -.75 L.1 -.4 L.5 -1 L.4 -.1 L.95 .2 L.25 .4 L-.2 1 L-.25 .2 L-.9 .05 Z",
    cephalopod:"M-.5 -.15 Q-.7 -.95 0 -.95 Q.7 -.95 .5 -.15 M-.5 -.15 Q-1 .8 -.5 .8 Q0 .8 -.15 .1 M.15 .1 Q0 .8 .5 .8 Q1 .8 .5 -.15",
    precocial:"M-.95 .4 L-.7 -.4 L0 -.75 L.7 -.4 L.95 .4 Z M-.7 -.4 L-.25 .4 M.7 -.4 L.25 .4 M-.95 .7 H.95",
    algae:"M-.8 .7 Q-.6 -.4 -.3 -.8 M0 .8 Q-.2 -.1 .2 -.75 M.5 .7 Q.8 0 .6 -.5",
    moss:"M-.85 .5 Q-.6 -.5 -.25 .2 Q0 -.8 .3 .1 Q.7 -.4 .85 .5 Z",
    grass:"M0 .9 V-.75 M0 .1 Q-.9 -.6 -.7 -.15 Q-.4 .3 0 .45 M0 -.2 Q.8 -.8 .7 -.25 Q.4 .1 0 .1",
    fungus:"M-.9 0 Q-.8 -1 0 -.9 Q.8 -1 .9 0 Z M-.2 0 V.8 H.2 V0",
    waterbug:"M0 -.8 L.6 0 L0 .8 L-.6 0 Z M-.5 -.2 L-1 -.5 M.5 -.2 L1 -.5 M-.5 .2 L-1 .5 M.5 .2 L1 .5",
    grassbug:"M-.25 -.7 H.25 V.7 H-.25 Z M-.25 -.4 L-.9 -.7 M.25 -.4 L.9 -.7 M-.25 .3 L-.9 .65 M.25 .3 L.9 .65",
    info:"M0 -1 L.65 0 L0 1 L-.65 0 Z M0 -.45 V.45",
    seed:"M-.5 .7 Q-1 -.8 .6 -.7 Q1 .8 -.5 .7 M-.3 .4 L.4 -.45",
    spore:"M0 -.9 V.9 M-.8 -.45 L.8 .45 M-.8 .45 L.8 -.45",
    egg:"M0 -.9 C-1 -.4 -.8 .85 0 .85 C.8 .85 1 -.4 0 -.9 Z",
    organic:"M-.85 .1 L-.35 -.55 L.2 -.1 L.8 -.55 L.6 .65 L-.4 .8 Z",
    mineral:"M-.7 -.5 H.5 L.9 .1 L.4 .7 H-.5 L-.9 0 Z",
    droplet:"M0 -.95 Q-1 .3 -.55 .65 Q0 1.1 .55 .65 Q1 .3 0 -.95 Z",
    factor:"M-.8 -.6 H.8 L-.8 .6 H.8 M0 -.8 V.8",
  }, symbolCache=new Map();
  function symbolColor(s){
    if(s.group!=="main")return s.group==="plant"?"#d0ef9b":s.group==="fungus"?"#e5c0ff":"#ffd18a";
    const channels=s.color.match(/[0-9a-f]{2}/gi).map(h=>Math.round(parseInt(h,16)*.6+255*.4));
    return "rgb("+channels.join(",")+")";
  }
  function symbol(g,id,x,y,r,color="#e8e4be") {
    if(!symbolPaths[id])return false;
    if(!symbolCache.has(id))symbolCache.set(id,new Path2D(symbolPaths[id]));
    g.save();g.translate(x,y);g.scale(r,r);g.lineJoin="round";g.lineCap="round";
    const path=symbolCache.get(id);g.strokeStyle="#041820";g.lineWidth=.48;g.stroke(path);
    g.strokeStyle=color;g.lineWidth=.19;g.stroke(path);g.restore();return true;
  }
  function creature(g, o, x, y, r, detail = true) {
    if (detail && Art?.creature(g, o, x, y, r, detail)) return;
    const s = S.spec(o),
      n = S.D.main.findIndex((a) => a.id === o.species),
      phase = o.phase;
    g.save();
    g.translate(x, y);
    g.rotate(((o.facing || 0) * Math.PI) / 4);
    g.strokeStyle = s.color;
    g.fillStyle = s.color;
    g.lineWidth = Math.max(0.7, r * 0.11);
    if (!detail) {
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      g.restore();
      return;
    }
    const angle = (j, k) => (j * Math.PI * 2) / k,
      legs = (k, len) => {
        for (let j = 0; j < k; j++) {
          const a = angle(j, k);
          g.beginPath();
          g.moveTo(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45);
          g.lineTo(Math.cos(a) * r * len, Math.sin(a) * r * len);
          g.stroke();
        }
      },
      oval = (a, b) => {
        g.beginPath();
        g.ellipse(0, 0, r * a, r * b, 0, 0, Math.PI * 2);
        g.fill();
      };
    const kind = n % 20;
    if (kind === 0 || kind === 19) {
      legs(6, 1.2);
      oval(0.58, 0.8);
    } else if (kind === 1 || kind === 3) {
      g.beginPath();
      g.moveTo(-r, -r);
      g.lineTo(r * 0.9, 0);
      g.lineTo(-r, r);
      g.lineTo(-r * 0.35, 0);
      g.closePath();
      g.fill();
      oval(0.65, 0.3);
    } else if (kind === 2 || kind === 8) {
      legs(kind === 2 ? 4 : 8, 1.1);
      oval(0.65, 0.65);
    } else if (kind === 4 || kind === 9) {
      oval(0.55, 0.55);
      g.beginPath();
      g.ellipse(0, 0, r * 1.15, r * 0.65, 0.7, 0, Math.PI * 2);
      g.stroke();
    } else if (kind === 5) {
      g.beginPath();
      g.moveTo(0, -r);
      g.lineTo(r * 0.7, 0);
      g.lineTo(0, r);
      g.lineTo(-r * 0.7, 0);
      g.closePath();
      g.fill();
      legs(4, 1.15);
    } else if (kind === 6) {
      legs(7, 1.15);
      oval(0.75, 0.75);
    } else if (kind === 7 || n === 20) {
      oval(0.85, 0.7);
      g.strokeStyle = "#17282a";
      for (let j = -1; j < 2; j++) {
        g.beginPath();
        g.moveTo(j * r * 0.35, -r * 0.6);
        g.lineTo(j * r * 0.35, r * 0.6);
        g.stroke();
      }
    } else if (kind === 10) {
      g.beginPath();
      g.moveTo(-r, 0);
      g.bezierCurveTo(-r, -r, r, r, r, -r * 0.2);
      g.lineWidth = r * 0.55;
      g.stroke();
      legs(phase >= 3 ? 5 : 3, 1);
    } else if (kind === 11 || kind === 18) {
      legs(kind === 11 ? 10 : 12, 1.2);
      oval(0.55, 0.55);
    } else if (kind === 12) {
      g.globalAlpha = 0.65;
      oval(0.9, 0.5);
      g.setLineDash([r * 0.2, r * 0.2]);
      g.strokeRect(-r, -r * 0.6, r * 2, r * 1.2);
    } else if (kind === 13) {
      g.beginPath();
      g.moveTo(-r, 0);
      g.lineTo(0, -r * 0.8);
      g.lineTo(r, 0);
      g.lineTo(0, r * 0.8);
      g.closePath();
      g.stroke();
      oval(0.3, 0.3);
    } else if (kind === 14) {
      g.beginPath();
      g.arc(0, 0, r * 0.85, Math.PI, Math.PI * 2);
      g.fill();
      for (let j = -1; j < 2; j++) {
        g.beginPath();
        g.moveTo(j * r * 0.5, 0);
        g.quadraticCurveTo(j * r * 0.7, r * 0.5, j * r * 0.5, r);
        g.stroke();
      }
    } else if (kind === 15) {
      legs(5, 1.05);
      oval(0.4, 0.4);
      g.fillStyle = "#acd98c";
      for (let j = 0; j < 4; j++) {
        const a = angle(j, 4);
        g.beginPath();
        g.ellipse(
          Math.cos(a) * r * 0.65,
          Math.sin(a) * r * 0.65,
          r * 0.45,
          r * 0.2,
          a,
          0,
          Math.PI * 2,
        );
        g.fill();
      }
    } else if (kind === 16) {
      oval(0.95, 0.5);
      g.beginPath();
      g.moveTo(-r * 0.7, 0);
      g.lineTo(-r * 1.2, -r * 0.5);
      g.lineTo(-r * 1.2, r * 0.5);
      g.closePath();
      g.fill();
    } else if (kind === 17) {
      legs(8, 1.15);
      oval(0.5, 0.85);
    }
    if (phase >= 3) {
      g.strokeStyle =
        o.branch3 === 2 ? "#f5bd79" : o.branch3 === 1 ? "#b1dcf0" : "#d2edb4";
      g.beginPath();
      g.arc(0, 0, r * 0.9, 0, Math.PI * (phase === 4 ? 2 : 1.2));
      g.stroke();
    }
    if (o.branch4 !== null) {
      g.fillStyle = "#eef9e9";
      g.fillRect(-r * 0.2, r * 0.35, r * 0.22 * (o.branch4 + 1), r * 0.15);
    }
    g.fillStyle = "#102b2c";
    const eyes = kind === 6 ? 5 : 2;
    for (let j = 0; j < eyes; j++) {
      const a = angle(j, eyes);
      g.beginPath();
      g.arc(
        r * 0.3 + Math.cos(a) * r * 0.18,
        Math.sin(a) * r * 0.2,
        r * 0.09,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
    // Small, repeatable sexual difference: male crest, female two flank spots.
    g.strokeStyle = "#f9e8c1";
    g.fillStyle = "#f9e8c1";
    if (o.sex === "male") {
      g.beginPath();
      g.moveTo(r * 0.5, -r * 0.35);
      g.lineTo(r * 0.9, -r * 0.65);
      g.stroke();
    } else if (o.sex === "female") {
      for (const y of [-0.42, 0.42]) {
        g.beginPath();
        g.arc(-r * 0.12, r * y, r * 0.07, 0, 7);
        g.fill();
      }
    }
    if (o.species === "swarm") {
      g.strokeStyle = "#eee5bb";
      g.lineWidth = r * 0.1;
      if (o.role === "queen") {
        g.beginPath();
        g.ellipse(-r * 0.1, 0, r * 0.65, r * 0.9, 0, 0, 7);
        g.stroke();
      } else if (o.role === "worker") {
        g.fillStyle = "#eee5bb";
        g.fillRect(r * 0.35, -r * 0.15, r * 0.22, r * 0.3);
      } else {
        g.beginPath();
        g.moveTo(r * 0.3, 0);
        g.lineTo(r * 1.3, -r * 0.6);
        g.stroke();
      }
    }
    g.restore();
  }
  function food(g, o, x, y, r, env) {
    if (Art?.food(g, o, x, y, r, env)) return;
    g.save();
    g.translate(x, y);
    const id = o.species;
    g.fillStyle =
      id === "fungus"
        ? "#c09bc8"
        : id.includes("bug")
          ? "#e8c476"
          : colors[env];
    g.strokeStyle = g.fillStyle;
    g.lineWidth = Math.max(1, r * 0.12);
    if (id.includes("bug")) {
      for (let j = -1; j < 2; j++) {
        g.beginPath();
        g.moveTo(-r * 0.8, r * j * 0.4);
        g.lineTo(r * 0.8, r * j * 0.4);
        g.stroke();
      }
      g.beginPath();
      g.ellipse(0, 0, r * 0.4, r * 0.7, id === "waterbug" ? 0.6 : 0, 0, 7);
      g.fill();
    } else if (id === "fungus") {
      g.beginPath();
      g.arc(0, 0, r * 0.8, Math.PI, 0);
      g.fill();
      g.fillRect(-r * 0.15, 0, r * 0.3, r * 0.7);
    } else if (id === "grass") {
      for (let j = -1; j < 2; j++) {
        g.beginPath();
        g.moveTo(0, r * 0.7);
        g.quadraticCurveTo(j * r * 0.9, 0, j * r * 0.6, -r);
        g.stroke();
      }
    } else if (id === "moss") {
      for (let j = 0; j < 4; j++) {
        g.beginPath();
        g.arc(
          Math.cos(j * 2) * r * 0.4,
          Math.sin(j * 2) * r * 0.4,
          r * 0.4,
          0,
          7,
        );
        g.fill();
      }
    } else {
      for (let j = 0; j < 3; j++) {
        g.beginPath();
        g.ellipse((j - 1) * r * 0.5, 0, r * 0.22, r * 0.85, 0.3, 0, 7);
        g.fill();
      }
    }
    g.globalAlpha = 0.65;
    g.lineWidth = Math.max(0.7, r * 0.08);
    g.strokeStyle = env === 4 ? "#e3f4f1" : env === 1 ? "#d9ad77" : colors[env];
    g.beginPath();
    if (env === 0 || env === 5) {
      g.ellipse(0, r * 0.4, r * 1.05, r * 0.28, 0, 0, 7);
    } else if (env === 4) {
      g.moveTo(-r, -r);
      g.lineTo(r, r);
      g.moveTo(-r, r);
      g.lineTo(r, -r);
    } else if (env === 1 || env === 7) {
      g.setLineDash([r * 0.25, r * 0.15]);
      g.arc(0, 0, r, 0, 7);
    } else if (env === 2) {
      g.rect(-r, -r, r * 2, r * 2);
    }
    g.stroke();
    g.restore();
  }
  function create(canvas) {
    const g = canvas.getContext("2d"),
      view = {
        scale: 10,
        mode: "auto",
        x: 0,
        y: 0,
        resources: true,
        grid: false,
        motion: true,
        ageEmphasis: false,
        animate: false,
        duration: 260,
        selected: null,
      },
      cache = document.createElement("canvas");
    let world = null,
      lastTurn = -1,
      changedAt = 0,
      terrainKey = null;
    const diagnostics = { mode: "detail", drawn: 0, motionActors: 0, resources:0, carcasses:0, infectedHosts:0, highParasites:0 };
    function resize() {
      const box = canvas.getBoundingClientRect(),
        dpr = devicePixelRatio || 1;
      const width = Math.max(1, Math.round(box.width * dpr)),
        height = Math.max(1, Math.round(box.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function terrain(w){
      const key=w.config.seed+":"+w.config.width+":"+w.config.height+":"+Art?.loaded+":"+(w.config.mapFingerprint||"");
      if(terrainKey===key)return;terrainKey=key;
      const painted=globalThis.EcoScenery.paint(w,Art);cache.width=painted.width;cache.height=painted.height;
      cache.getContext("2d").drawImage(painted,0,0);
    }
    function fit() {
      if (!world) return;
      view.mode="overview";
      resize();
      const b = canvas.getBoundingClientRect();
      view.scale = Math.min(
        (b.width - 24) / world.config.width,
        (b.height - 24) / world.config.height,
      );
      view.x = (b.width - world.config.width * view.scale) / 2;
      view.y = (b.height - world.config.height * view.scale) / 2;
    }
    function setWorld(w) {
      world = w;
      terrain(w);
      if (lastTurn !== w.turn) {
        lastTurn = w.turn;
        changedAt = performance.now();
      }
    }
    function ageMark(o,x,y,r,z){
      const a=S.ageInfo(o);if(!a.enabled||a.stage==="adult")return;
      g.save();g.strokeStyle=a.stage==="juvenile"?"#fff1bf":"#dbe7e5";g.fillStyle=g.strokeStyle;
      g.lineWidth=(view.ageEmphasis?1.9:1.1)/z;
      g.beginPath();g.arc(x,y,r,a.stage==="elderly"?.35:0,a.stage==="elderly"?Math.PI*1.8:Math.PI*2);g.stroke();
      if(a.stage==="juvenile"){g.beginPath();g.arc(x-r*.7,y+r*.7,Math.max(.035,1.2/z),0,Math.PI*2);g.fill();}
      else {g.beginPath();g.moveTo(x+r*.64,y+r*.35);g.lineTo(x+r*.84,y+r*.48);g.stroke();}
      g.restore();
    }
    function draw() {
      resize();
      const b = canvas.getBoundingClientRect();
      g.fillStyle = "#0b181c";
      g.fillRect(0, 0, b.width, b.height);
      if (!world) return;
      const w = world,
        z = view.scale;
      terrain(w);
      g.save();
      g.translate(view.x, view.y);
      g.scale(z, z);
      g.drawImage(cache, 0, 0, w.config.width, w.config.height);
      if(view.mode==="overview"||(view.mode==="auto"&&z<24)){g.fillStyle="#031b2452";g.fillRect(0,0,w.config.width,w.config.height);}
      globalThis.EcoScenery.props(g,w,Art,view,b);
      if (view.grid && z >= 8) {
        g.strokeStyle = "#b7d3c015";
        g.lineWidth = 0.5 / z;
        g.beginPath();
        for (let x = 0; x <= w.config.width; x++) {
          g.moveTo(x, 0);
          g.lineTo(x, w.config.height);
        }
        for (let y = 0; y <= w.config.height; y++) {
          g.moveTo(0, y);
          g.lineTo(w.config.width, y);
        }
        g.stroke();
      }
      const inView = (p) => {
          const [x, y] = S.xy(w, p);
          return (
            x * z + view.x >= -z &&
            y * z + view.y >= -z &&
            x * z + view.x <= b.width &&
            y * z + view.y <= b.height
          );
        },
        point = z < 4,
        detail = view.mode==="detail"||(view.mode==="auto"&&z>=24);
      diagnostics.mode = point ? "point" : detail ? "detail" : "simple";
      diagnostics.drawn = 0;
      diagnostics.motionActors = 0;
      diagnostics.resources=0;diagnostics.carcasses=0;diagnostics.infectedHosts=0;diagnostics.highParasites=0;
      if (view.resources)
        for (const a of w.resources) {
          if (!inView(a.cell)) continue;
          const [x, y] = S.xy(w, a.cell),
            env = w.tiles[a.cell].env;
          const radius =
            0.12 + Math.min(1, a.q / (S.FOOD[a.kind].cap || 4)) * 0.23;
          diagnostics.resources++;
          const kind=Object.keys(S.FOOD).indexOf(a.kind),rx=x+.12+(kind%4)*.24,ry=y+.10+Math.floor(kind/4)*.18;
          if(detail&&Art)Art.resource(g,a,rx,ry,radius*.40,env,w.turn);
          else symbol(g,a.kind,rx,ry,.055+.025*Math.min(1,a.q/(S.FOOD[a.kind].cap||4)),a.kind==="info"?"#8be9ff":S.FOOD[a.kind].tag==="mineral"?"#d3ddec":"#e9d4a1");
        }
      for (const a of w.carcasses) {
        if (!inView(a.cell)) continue;
        const [x, y] = S.xy(w, a.cell);
        diagnostics.carcasses++;
        g.strokeStyle = "#d4ac92";
        g.lineWidth = Math.max(.045,.7/z);
        g.beginPath();
        g.moveTo(x + 0.69, y + 0.69);
        g.lineTo(x + 0.91, y + 0.91);
        g.moveTo(x + 0.69, y + 0.91);
        g.lineTo(x + 0.91, y + 0.69);
        g.stroke();
      }
      const age = view.animate
          ? Math.min(1, (performance.now() - changedAt) / view.duration)
          : 1,
        events = new Map();
      if (view.motion && !point && age < 1) {
        const byId = new Map();
        for (const event of w.events) {
          if (!inView(event.cell)) continue;
          if (!byId.has(event.id)) byId.set(event.id, []);
          byId.get(event.id).push(event);
        }
        const center = [
          (b.width / 2 - view.x) / z,
          (b.height / 2 - view.y) / z,
        ];
        const ordered = [...byId].sort((a, b) => {
          const ca = a[1][0].cell,
            cb = b[1][0].cell;
          if (ca === view.selected && cb !== view.selected) return -1;
          if (cb === view.selected && ca !== view.selected) return 1;
          const da = S.xy(w, ca),
            db = S.xy(w, cb);
          return (
            Math.hypot(da[0] - center[0], da[1] - center[1]) -
              Math.hypot(db[0] - center[0], db[1] - center[1]) ||
            S.compare(a[0], b[0])
          );
        });
        for (const [id, list] of ordered.slice(0, 128)) events.set(id, list);
      }
      const occupiedMain=new Set(w.organisms.filter(o=>o.slot==="main").map(o=>o.cell)), occupiedFood=new Set(w.organisms.filter(o=>o.slot==="food").map(o=>o.cell));
      for (const slot of ["food", "main"])
        for (const o of w.organisms) {
          if (o.slot !== slot || !inView(o.cell)) continue;
          diagnostics.drawn++;
          const [x, y] = S.xy(w, o.cell),
            list = events.get(o.id) || [],
            ev = list.find((e) => e.type === "move");
          const overlapped = occupiedMain.has(o.cell) && occupiedFood.has(o.cell);
          const ox=overlapped?(slot==="main"?.66:.24):.5, oy=detail?(overlapped?(slot==="main"?.35:.76):.5):(slot==="main"?.55:.76);
          let cx = x + ox, cy = y + oy;
          if (ev?.type === "move" && ev.from !== undefined) {
            const [u, v] = S.xy(w, ev.from);
            cx = u + ox + (x - u) * age;
            cy = v + oy + (y - v) * age;
          }
          const size = (overlapped ? .68 : .86) *
            (o.slot === "main"
              ? 0.24 + 0.045 * o.phase
              : 0.15 +
                0.1 *
                  Math.min(
                    1,
                    S.edibleB(o) /
                      ((S.spec(o).capacity?.[1] || 20) -
                        (S.spec(o).group === "plant" ? S.PLANT_BASE : 0)),
                  )) * (o.slot === "main" ? 0.9 + 0.2 * o.dna.body : 1);
          g.save();g.fillStyle=detail?"#00111944":slot==="main"?"#071c20aa":"#122b2266";
          g.strokeStyle=slot==="main"?"#e7d5a65c":"#b8d79a70";g.lineWidth=.7/z;
          g.beginPath();g.ellipse(cx,cy+(detail?size*.55:.025),size*(detail?.85:1.3),size*(detail?.28:1.15),0,0,7);g.fill();if(!detail)g.stroke();g.restore();
          if(detail){
            if(slot==="main")creature(g,o,cx,cy,size,true);
            else food(g,o,cx,cy,size,w.tiles[o.cell].env);
          }else{
            const color=symbolColor(S.spec(o));
            symbol(g,o.species,cx,cy,slot==="main"?(overlapped?.27:.32):Math.min(.20,size*1.12),color);
          }
          // Keep age in the same cell, away from the body at overview scale.
          ageMark(o,detail?cx:x+(slot==="main"?.82:.10),detail?cy:y+(slot==="main"?.77:.90),detail?Math.min(.43,size*1.35):.065,z);
          if(o.infection){
            diagnostics.infectedHosts++;
            if(o.infection.q)diagnostics.highParasites++;
            const bx=cx+.19,by=cy-.22;
            g.fillStyle="#161421";g.beginPath();g.arc(bx,by,.115,0,7);g.fill();
            g.fillStyle="#ffbc8f";g.beginPath();g.arc(bx,by,.065,0,7);g.fill();
            if(o.infection.q){g.strokeStyle="#d3afff";g.lineWidth=Math.max(.035,.55/z);g.beginPath();g.arc(bx,by,.11,0,7);g.stroke();}
          }
          if (list.length) diagnostics.motionActors++;
          for (const ev of list) {
            if (
              ["birth", "growth", "infection", "defend", "light"].includes(
                ev.type,
              )
            ) {
              g.strokeStyle = {
                birth: "#c5e2a4",
                growth: "#f1dd98",
                infection: "#dba6db",
                defend: "#8fcbdb",
                light: "#f3e0a1",
              }[ev.type];
              g.globalAlpha = 1 - age;
              g.lineWidth = 0.05;
              g.beginPath();
              g.arc(cx, cy, 0.3 + age * 0.3, 0, 7);
              g.stroke();
              g.globalAlpha = 1;
            }
            if (["attack", "feed", "care"].includes(ev.type)) {
              const target = ev.to === undefined ? o.cell : ev.to,
                [tx, ty] = S.xy(w, target);
              g.strokeStyle =
                ev.type === "attack"
                  ? "#ffb288"
                  : ev.type === "care"
                    ? "#94e3b3"
                    : "#f3e0a1";
              g.lineWidth = 0.07;
              g.globalAlpha = 1 - age;
              g.beginPath();
              g.moveTo(cx, cy);
              g.lineTo(tx + 0.5, ty + 0.5);
              g.stroke();
              g.globalAlpha = 1;
            }
          }
        }
      if (view.selected !== null) {
        const [x, y] = S.xy(w, view.selected);
        g.fillStyle = "#f5ce5c20";
        g.fillRect(x, y, 1, 1);
        g.strokeStyle = "#ffe3a0";
        g.lineWidth = 1.5 / z;
        g.strokeRect(x + 0.03, y + 0.03, 0.94, 0.94);
      }
      g.restore();
    }
    function cellAt(clientX, clientY) {
      if (!world) return null;
      const b = canvas.getBoundingClientRect(),
        x = Math.floor((clientX - b.left - view.x) / view.scale),
        y = Math.floor((clientY - b.top - view.y) / view.scale);
      return x < 0 ||
        y < 0 ||
        x >= world.config.width ||
        y >= world.config.height
        ? null
        : S.index(world, x, y);
    }
    function zoom(
      factor,
      x = canvas.clientWidth / 2,
      y = canvas.clientHeight / 2,
    ) {
      view.mode="auto";
      const next = S.clamp(view.scale * factor, 1, 320),
        ratio = next / view.scale;
      view.x = x - (x - view.x) * ratio;
      view.y = y - (y - view.y) * ratio;
      view.scale = next;
    }
    return { view, diagnostics, setWorld, draw, fit, cellAt, zoom, creature };
  }
  return { create, creature, food, symbol, symbolColor, symbolPaths, colors, assets: Art };
});
