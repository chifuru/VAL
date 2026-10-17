/* Paint-only assets and primitives. Never writes to an organism or world. */
(function (root) {
  "use strict";
  const manifest = root.EcoVisualManifest,
    images = {},
    errors = [];
  let loaded = false;
  const ready = Promise.all(
    ["creatures", "food", "terrain"].map(async (key) => {
      const image = new Image();
      try {
        image.src = "assets/" + manifest[key].file;
        await image.decode();
        images[key] = image;
      } catch {
        errors.push(manifest[key].file);
      }
    }),
  ).then(() => {
    loaded = errors.length === 0;
  });
  const tint = [
    "#56d6d2",
    "#ff9b4b",
    "#bf82ee",
    "#b6b7a0",
    "#b9e0ff",
    "#95bc55",
    "#e2c084",
    "#ae8a55",
  ];
  const ellipse = (g, x, y, a, b, angle = 0) => {
    g.beginPath();
    g.ellipse(x, y, a, b, angle, 0, Math.PI * 2);
    g.fill();
  };
  function glow(g, x, y, r, color) {
    const a = g.createRadialGradient(x, y, 0, x, y, r);
    a.addColorStop(0, color + "a0");
    a.addColorStop(1, color + "00");
    g.fillStyle = a;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  const ageFrames=new Map();
  function ageFrame(o,frame) {
    const a=root.EcoState.ageInfo(o);
    if(!a.enabled||a.stage==="adult")return null;
    const key=o.species+"/"+o.phase+"/"+a.stage;
    if(ageFrames.has(key))return ageFrames.get(key);
    const c=document.createElement("canvas");c.width=frame[2];c.height=frame[3];
    const g=c.getContext("2d"),[sx,sy,W,H]=frame;
    if(a.stage==="juvenile"){
      // Rounder body proportions: shorten outer appendage bands, retain core.
      const band=4;
      for(let y=0;y<H;y+=band){const h=Math.min(band,H-y),u=(y+h/2)/H,k=.72+.28*Math.sin(Math.PI*u);
        g.drawImage(images.creatures,sx,sy+y,W,h,(W-W*k)/2,y,W*k,h);}
    }else{
      g.drawImage(images.creatures,...frame,0,0,W,H);
      // Fine surface folds and pale edges, clipped to living tissue, not wounds.
      g.globalCompositeOperation="source-atop";g.strokeStyle="#f4e6b84d";g.lineWidth=Math.max(1,W/180);
      for(let i=0;i<12;i++){const y=H*(.15+i*.055);g.beginPath();g.moveTo(W*.12,y);g.bezierCurveTo(W*.38,y-H*.06,W*.6,y+H*.035,W*.86,y-H*.02);g.stroke();}
      g.fillStyle="#e0dccb26";for(let i=0;i<30;i++)g.fillRect((i*53%W),(i*79%H),Math.max(1,W*.008),Math.max(1,H*.008));
    }
    ageFrames.set(key,c);return c;
  }
  function creature(g, o, x, y, r, detail = true) {
    const id = o.species === "precocial" ? "abyssshell" : o.species,
      frames = manifest.creatures.regions[id];
    if (!images.creatures || !frames) return false;
    const frame = frames[Math.max(0, Math.min(3, o.phase - 1))];
    g.save();
    g.translate(x, y);
    g.rotate(((o.facing || 0) * Math.PI) / 4);
    if (o.phase >= 3)
      glow(
        g,
        0,
        0,
        r * 1.45,
        o.branch3 === 2 ? "#ffad70" : o.branch3 === 1 ? "#79c8ed" : "#92dea6",
      );
    const width = r * 2.65 * (0.9 + 0.2 * (o.dna.appendage ?? 0.5)),
      height = r * 2.65 * (1.08 - 0.16 * (o.dna.skin ?? 0.5));
    const age=root.EcoState.ageInfo(o),styled=ageFrame(o,frame);
    const aw=age.enabled&&age.stage==="juvenile"?.9:1,ah=age.enabled&&age.stage==="juvenile"?.76:age.enabled&&age.stage==="elderly"?.94:1;
    if(styled)g.drawImage(styled,-width*aw/2,-height*ah/2,width*aw,height*ah);
    else g.drawImage(images.creatures,...frame,-width/2,-height/2,width,height);
    if (detail) {
      g.lineWidth = r * 0.025;
      g.strokeStyle = "#ffe3a1";
      g.fillStyle = "#ffe3a1";
      if (o.sex === "male") {
        g.beginPath();
        g.moveTo(r * 0.26, -r * 0.62);
        g.lineTo(r * 0.33, -r * 0.76);
        g.lineTo(r * 0.41, -r * 0.66);
        g.stroke();
      } else if (o.sex === "female") {
        ellipse(g, -r * 0.2, r * 0.3, r * 0.07, r * 0.055);
        ellipse(g, -r * 0.31, r * 0.4, r * 0.07, r * 0.055);
      }
      if (o.branch4 !== null && o.branch4 !== undefined) {
        g.strokeStyle = o.branch4 === 0 ? "#d4f3b0" : "#ffe4a0";
        g.beginPath();
        g.arc(0, 0, r * 1.2, -0.7, Math.PI * (o.branch4 === 0 ? 1 : 1.7));
        g.stroke();
      }
      if (o.role === "queen") {
        g.strokeStyle = "#ffe39b";
        g.beginPath();
        g.moveTo(-r * 0.4, -r * 0.7);
        g.lineTo(-r * 0.2, -r);
        g.lineTo(0, -r * 0.78);
        g.lineTo(r * 0.2, -r);
        g.lineTo(r * 0.4, -r * 0.7);
        g.stroke();
      }
    }
    g.restore();
    return true;
  }
  function sprite(g, key, index, x, y, r) {
    if (!images.food) return false;
    const f = manifest.food.regions[key][index];
    g.drawImage(images.food, ...f, x - r, y - r, r * 2, r * 2);
    return true;
  }
  function food(g, o, x, y, r, env) {
    if (!images.food) return false;
    const id = o.species;
    g.save();
    if (id.includes("bug")) {
      g.translate(x, y);
      g.rotate(((o.facing || 0) * Math.PI) / 4);
      sprite(g, "life", id === "waterbug" ? 0 : 3, 0, 0, r * 1.2);
    } else if (["tideparasite", "leafparasite", "hyperparasite"].includes(id)) {
      glow(g, x, y, r * 1.5, id === "hyperparasite" ? "#ae8aff" : "#ffac7a");
      g.strokeStyle = id === "hyperparasite" ? "#d0b1ff" : "#ffce9e";
      g.lineWidth = r * 0.2;
      g.beginPath();
      for (let i = 0; i <= 32; i++) {
        const a = i * 0.24,
          rr = r * (0.2 + i / 50),
          px = x + Math.cos(a) * rr,
          py = y + Math.sin(a) * rr;
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.stroke();
    } else if (["algae", "moss", "grass"].includes(id) && o.B <= 2) {
      g.strokeStyle = "#6b8c63";
      g.lineWidth = r * 0.18;
      g.beginPath();
      g.moveTo(x, y + r * 0.55);
      g.lineTo(x, y - r * 0.1);
      g.stroke();
      g.fillStyle = "#a3bc75";
      ellipse(g, x, y - r * 0.14, r * 0.16, r * 0.23);
    } else if (id === "fungus") {
      for (let i = 0; i < 3; i++) {
        const px = x + (i - 1) * r * 0.6,
          py = y + (i % 2) * r * 0.2;
        g.fillStyle = "#d7c3a5";
        g.fillRect(px - r * 0.07, py, r * 0.14, r * 0.65);
        const a = g.createRadialGradient(
          px,
          py - r * 0.2,
          0,
          px,
          py - r * 0.2,
          r * 0.65,
        );
        a.addColorStop(0, "#e8baff");
        a.addColorStop(1, "#67416e");
        g.fillStyle = a;
        g.beginPath();
        g.ellipse(px, py, r * 0.6, r * 0.34, 0, Math.PI, Math.PI * 2);
        g.fill();
      }
    } else {
      const leaves = id === "moss" ? 8 : id === "grass" ? 5 : 4;
      g.strokeStyle = "#728e4f";
      g.lineWidth = r * 0.07;
      for (let i = 0; i < leaves; i++) {
        const angle = (i / leaves) * Math.PI * 2,
          px = x + Math.cos(angle) * r * 0.43,
          py = y + Math.sin(angle) * r * 0.34;
        const a = g.createLinearGradient(px, py + r * 0.4, px, py - r * 0.6);
        a.addColorStop(0, id === "algae" ? "#256b5f" : "#35592c");
        a.addColorStop(
          0.55,
          env === 1
            ? "#c49c5c"
            : env === 2
              ? "#a49bd6"
              : env === 7
                ? "#9b9c60"
                : id === "algae"
                  ? "#7ecdb1"
                  : "#9dbb60",
        );
        a.addColorStop(1, env === 4 ? "#e5eedc" : "#d1db86");
        g.fillStyle = a;
        ellipse(
          g,
          px,
          py,
          r * (id === "moss" ? 0.35 : 0.2),
          r * (id === "moss" ? 0.3 : 0.8),
          angle + 0.5,
        );
        g.beginPath();
        g.moveTo(x, y + r * 0.5);
        g.lineTo(px, py - r * 0.35);
        g.stroke();
      }
      if (env === 0 || env === 5) {
        g.strokeStyle = "#8fe1d066";
        g.lineWidth = r * 0.06;
        g.beginPath();
        g.ellipse(x, y + r * 0.5, r * 1.15, r * 0.28, 0, 0, 7);
        g.stroke();
      }
      if (env === 4) {
        g.fillStyle = "#e5f6fa";
        for (let i = 0; i < 4; i++)
          ellipse(
            g,
            x + Math.sin(i * 4) * r * 0.7,
            y + Math.cos(i * 2) * r * 0.6,
            r * 0.08,
            r * 0.04,
          );
      }
    }
    g.restore();
    return true;
  }
  function resource(g, a, x, y, r, env, turn) {
    g.save();
    if (a.kind === "info") {
      g.globalAlpha = Math.max(
        0.28,
        1 - (turn - (a.event?.time ?? a.created)) / 24,
      );
      glow(g, x, y, r * 2.6, "#bc65ff");
      g.strokeStyle = "#d7b6ff";
      g.lineWidth = r * 0.13;
      g.beginPath();
      g.ellipse(x, y, r * 1.2, r * 0.48, -0.35, 0, 7);
      g.stroke();
      glow(g, x, y, r * 0.8, "#f4d4ff");
      g.fillStyle = "#f6e5ff";
      ellipse(g, x, y, r * 0.23, r * 0.23);
    } else if (a.kind === "mineral")
      sprite(g, "mineral", env === 1 ? 1 : env === 2 ? 2 : 0, x, y, r * 1.7);
    else if (a.kind === "droplet") {
      const c = g.createLinearGradient(x - r, y - r, x + r, y + r);
      c.addColorStop(0, "#d9faff");
      c.addColorStop(0.5, "#5ac4f1");
      c.addColorStop(1, "#265293");
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(x, y - r);
      g.bezierCurveTo(
        x + r * 1.5,
        y + r * 0.9,
        x - r * 1.5,
        y + r * 0.9,
        x,
        y - r,
      );
      g.fill();
    } else if (a.kind === "factor") {
      glow(g, x, y, r * 2, "#e4ce70");
      g.strokeStyle = "#ffe6a0";
      g.lineWidth = r * 0.1;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.stroke();
      g.beginPath();
      g.moveTo(x - r * 0.7, y);
      g.lineTo(x + r * 0.7, y);
      g.stroke();
    } else {
      g.fillStyle =
        a.kind === "egg"
          ? "#ffe0a1"
          : a.kind === "spore"
            ? "#d8a7e6"
            : "#9ec566";
      for (let i = 0; i < Math.min(5, Math.ceil(a.q)); i++) {
        ellipse(
          g,
          x + Math.sin(i * 3) * r * 0.6,
          y + Math.cos(i * 3) * r * 0.5,
          r * 0.45,
          r * 0.5,
          i,
        );
      }
    }
    g.restore();
  }
  root.EcoArt = {
    manifest,
    ready,
    errors,
    images,
    tint,
    creature,
    food,
    resource,
    get loaded() {
      return loaded;
    },
  };
})(globalThis);
