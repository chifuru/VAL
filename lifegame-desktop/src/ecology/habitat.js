/* Painted surface quilting and splat masks. No biological state is written. */
(function (root) {
  "use strict";
  const feathered = new WeakMap(),
    names = [
      "meadow",
      "forest",
      "rock",
      "earth",
      "water",
      "rapids",
      "deep",
      "frost",
      "thermal",
      "signal",
      "corrosion",
    ];
  const clamp = (v) => Math.max(0, Math.min(1, v)),
    smooth = (v) => {
      v = clamp(v);
      return v * v * (3 - 2 * v);
    };
  const hash = (x, y, k = 0) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + k * 71.31) * 43758.5453;
    return n - Math.floor(n);
  };
  // Continuous world-space variation: broad patches cross cell and cache boundaries.
  const field = (x, y) => .5 + .26 * Math.sin(x * .83 + y * .37)
    + .14 * Math.cos(y * 1.13 - x * .29)
    + .08 * Math.sin(x * 2.1 + y * 1.7);
  function canvas(W, H) {
    const c = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(1,1);
    c.width = Math.max(1, Math.round(W));
    c.height = Math.max(1, Math.round(H));
    return c;
  }
  function feather(im) {
    if (feathered.has(im)) return feathered.get(im);
    const c = canvas(1024, 1024),
      g = c.getContext("2d");
    g.drawImage(im, 0, 0, 1024, 1024);
    g.globalCompositeOperation = "destination-in";
    for (const vertical of [false, true]) {
      const grad = g.createLinearGradient(
        0,
        0,
        vertical ? 0 : 1024,
        vertical ? 1024 : 0,
      );
      grad.addColorStop(0, "#0000");
      // Wide cross-fades pair with overlapping world-space stamps below.
      // Keep source detail sharp; only the stamp boundary changes opacity.
      grad.addColorStop(0.22, "#000");
      grad.addColorStop(0.78, "#000");
      grad.addColorStop(1, "#0000");
      g.fillStyle = grad;
      g.fillRect(0, 0, 1024, 1024);
    }
    feathered.set(im, c);
    return c;
  }
  function create(w, P, art) {
    const W = w.config.width,
      H = w.config.height,
      cache = new Map(), maskCache=new Map(), maskSupport=new WeakMap(),
      maskBudget=24*1024*1024, imageBudget=96*1024*1024,
      cacheBytes={images:0,masks:0},
      metrics = {
        unit: 0,
        patchPixels: 0,
        cacheHits: 0,
        builds: 0,
        paintedMaterials: 0,
        quiltCalls: 0,
        skippedLayers: 0,
        skippedOverlays: 0,
        skippedLandPatches: 0,
      };
    const tile = (x, y) =>
      w.tiles[
        Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x))
      ];
    const biome = (t) => {
      if (t.terrain === "rock") return [0, 0, 1, 0];
      if (t.terrain === "mud") return [0, 0.35, 0, 0.65];
      const sets = [
          [0.7, 0.3, 0, 0],
          [0.1, 0, 0.1, 0.8],
          [0.15, 0.7, 0.15, 0],
          [0.95, 0.05, 0, 0],
          [0.35, 0, 0.65, 0],
          [0.2, 0.8, 0, 0],
          [0.5, 0, 0, 0.5],
          [0, 0, 0.7, 0.3],
        ],
        b = [...sets[t.env]];
      if (t.cover === "bush") {
        const transfer = Math.min(0.28, b[0]);
        b[0] -= transfer;
        b[1] += transfer;
      }
      return b;
    };
    // Smooth only the painted material field; water, walls and ecology stay exact.
    const materialFields = ["forest", "rock", "earth", "frost", "hot", "info", "corrosion"],
      material = new WeakMap(),
      kernel = [0.18, 0.64, 0.18];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const r = Object.fromEntries(materialFields.map(k => [k, 0]));
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const t = tile(x + i, y + j), b = biome(t), q = kernel[i + 1] * kernel[j + 1],
          values = [b[1], b[2], b[3], +(t.env === 4), +(t.env === 1), +(t.env === 2), +(t.env === 7)];
        materialFields.forEach((k, n) => r[k] += values[n] * q);
      }
      material.set(tile(x, y), r);
    }
    function relief(x, y) {
      const h = (a, b) => P.height(Math.max(0.001, Math.min(W - 0.001, a)), Math.max(0.001, Math.min(H - 0.001, b))),
        dx = (h(x + 0.35, y) - h(x - 0.35, y)) / 0.7,
        dy = (h(x, y + 0.35) - h(x, y - 0.35)) / 0.7;
      return { shade: Math.min(0.45, Math.max(0, 0.045 - 1.4 * (dx + dy))),
        light: Math.min(0.26, Math.max(0, 1.4 * (dx + dy))) };
    }
    const isFlow = (t) => t.terrain === "shallow";
    function sample(x, y) {
      const u = Math.floor(x - 0.5),
        v = Math.floor(y - 0.5),
        a = x - 0.5 - u,
        b = y - 0.5 - v,
        ts = [tile(u, v), tile(u + 1, v), tile(u, v + 1), tile(u + 1, v + 1)],
        ws = [(1 - a) * (1 - b), a * (1 - b), (1 - a) * b, a * b],
        r = {
          wet: 0,
          deep: 0,
          forest: 0,
          rock: 0,
          earth: 0,
          frost: 0,
          hot: 0,
          info: 0,
          flow: 0,
          corrosion: 0,
        };
      for (let i = 0; i < 4; i++) {
        const t = ts[i],
          q = ws[i],
          mix = material.get(t);
        r.wet += (P.water(t) ? 1 : 0) * q;
        r.deep += (t.terrain === "deep" ? 1 : 0) * q;
        for (const k of materialFields) r[k] += mix[k] * q;
        r.flow += (isFlow(t) ? 1 : 0) * q;

      }
      const w0 = +P.water(ts[0]), w1 = +P.water(ts[1]),
        w2 = +P.water(ts[2]), w3 = +P.water(ts[3]);
      r.wetDx = (w1 - w0) * (1 - b) + (w3 - w2) * b;
      r.wetDy = (w2 - w0) * (1 - a) + (w3 - w1) * a;
      return r;
    }
    function quilt(g, name, rect, unit) {
      metrics.quiltCalls++;
      const im = art.images["habitat-" + name],
        fallback = {
          meadow: "#7d9450",
          forest: "#304a32",
          rock: "#66776c",
          earth: "#a79668",
          water: "#258c9f",
          rapids: "#55b9c0",
          deep: "#123f64",
          frost: "#d9e4e6",
          thermal: "#9b743d",
          signal: "#645c87",
          corrosion: "#70514d",
        }[name];
      g.fillStyle = fallback;
      g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      if (!im) return;
      const patch = feather(im),
        period = ["water", "rapids", "deep"].includes(name) ? 3.6 : 2.8,
        // Cover diagonal joins as well as horizontal/vertical neighbors.
        size = period * 1.55;
      for (
        let y = Math.floor(rect.y / period) - 2;
        y <= Math.ceil((rect.y + rect.h) / period) + 1;
        y++
      )
        for (
          let x = Math.floor(rect.x / period) - 2;
          x <= Math.ceil((rect.x + rect.w) / period) + 1;
          x++
        ) {
          const px =
              (x * period - rect.x + (hash(x, y, 8) - 0.5) * 0.18) * unit,
            py = (y * period - rect.y + (hash(x, y, 9) - 0.5) * 0.18) * unit,
            s = size * unit;
          g.save();
          g.translate(px, py);
          if (!["water", "rapids", "deep"].includes(name)) {
            if (hash(x, y, 1) > 0.5) g.scale(-1, 1);
            g.rotate((Math.floor(hash(x, y, 2) * 4) * Math.PI) / 2);
          }
          g.drawImage(patch, -s / 2, -s / 2, s, s);
          g.restore();
        }
    }
    function make(rect, unit) {
      const key = [rect.x, rect.y, rect.w, rect.h, unit, art.loaded].join("/");
      if (cache.has(key)) {
        metrics.cacheHits++;
        metrics.unit = unit;
        metrics.patchPixels =
          cache.get(key).canvas.width * cache.get(key).canvas.height;
        const hit=cache.get(key);cache.delete(key);cache.set(key,hit);return hit;
      }
      metrics.unit = unit;
      metrics.builds++;
      const width = rect.w * unit,
        height = rect.h * unit,
        c = canvas(width, height),
        g = c.getContext("2d"),
        scratch = canvas(width, height),
        s = scratch.getContext("2d"),
        mu = Math.min(20, unit),
        mw = rect.w * mu,
        mh = rect.h * mu,
        mask = canvas(mw, mh),
        mg = mask.getContext("2d");
      const fields = [
          "dry",
          "forest",
          "rock",
          "earth",
          "deep",
          "flow",
          "shore",
          "shallows",
          "wetbank",
          "bankshade",
          "banklight",
          "frost",
          "hot",
          "info",
          "corrosion",
          "shade",
          "light",
        ],
        maskKey=[rect.x,rect.y,rect.w,rect.h,mu].join("/"),
        data = maskCache.get(maskKey) || Object.fromEntries(
          fields.map((k) => [k, new Uint8Array(mw*mh)]),
        ), activeFields=maskSupport.get(data)||new Set();
      if(!maskCache.has(maskKey)){
      for (let py = 0; py < mh; py++)
        for (let px = 0; px < mw; px++) {
          const x = rect.x + (px + 0.5) / mu,
            y = rect.y + (py + 0.5) / mu,
            r = sample(x, y),
            lighting = relief(x, y),
            wet = smooth((r.wet - 0.36) / 0.28),
            coast = clamp(1 - Math.abs(r.wet - 0.42) / 0.21),
            n = field(x, y),
            // Shore bands follow the exact water field; no new biological water/obstacles.
            shelf = smooth(r.wet / .32) * (1 - smooth((r.wet - .68) / .3)),
            bank = smooth(r.wet / .17) * (1 - smooth((r.wet - .48) / .15)),
            gradX = r.wetDx,
            gradY = r.wetDy,
            facing = (gradX + gradY) / (Math.hypot(gradX, gradY) + .001);
          const values = {
            dry: 1 - wet,
            forest: clamp(r.forest * (.72 + .55 * n)),
            rock: r.rock,
            earth: clamp(r.earth * (.7 + .6 * (1 - n))),
            deep: r.deep,
            flow: r.flow * (w.config.mapResolved?.id === "river" ? 0.72 : 0.27),
            shore: coast * (.45 + n * .22),
            shallows: shelf * wet * (1 - r.deep * .65) * .38,
            wetbank: bank * (1 - wet) * .28,
            bankshade: coast * Math.max(0, facing) * .24,
            banklight: coast * Math.max(0, -facing) * .22,
            frost: r.frost,
            hot: r.hot,
            info: r.info,
            corrosion: r.corrosion,
            shade: lighting.shade * (1 - wet) + coast * 0.14,
            light: lighting.light * (1 - wet),
          };
          const i=py*mw+px;for(const k of fields){const alpha=Math.round(clamp(values[k])*255);data[k][i]=alpha;if(alpha!==0)activeFields.add(k);}
        }
      maskSupport.set(data,activeFields);
      const bytes=mw*mh*fields.length;if(bytes<=maskBudget){maskCache.set(maskKey,data);cacheBytes.masks+=bytes;
      while(cacheBytes.masks>maskBudget&&maskCache.size>1){const k=maskCache.keys().next().value,d=maskCache.get(k);maskCache.delete(k);cacheBytes.masks-=d.dry.byteLength*fields.length;}
      }
      }
      const maskImage=mg.createImageData(mw,mh);
      function paintMask(k){
        const alpha=data[k],d=maskImage.data,color=['shade','bankshade'].includes(k)?[9,24,33]:k==='light'?[255,237,196]:k==='banklight'?[194,201,148]:k==='shallows'?[111,181,167]:k==='wetbank'?[46,65,49]:[255,255,255];
        for(let i=0;i<alpha.length;i++){const p=i*4;d[p]=color[0];d[p+1]=color[1];d[p+2]=color[2];d[p+3]=alpha[i];}mg.putImageData(maskImage,0,0);
      }
      function applyMask(target, k) {
        paintMask(k);
        target.globalCompositeOperation = "destination-in";
        target.drawImage(mask, 0, 0, width, height);
        target.globalCompositeOperation = "source-over";
      }
      function layer(target, name, field) {
        // Only the exact all-zero quantized mask is empty. Faint/partial masks
        // retain the existing quilting and interpolation unchanged.
        if(!activeFields.has(field)){metrics.skippedLayers++;return;}
        s.clearRect(0, 0, width, height);
        quilt(s, name, rect, unit);
        applyMask(s, field);
        target.drawImage(scratch, 0, 0);
      }
      quilt(g, "water", rect, unit);
      layer(g, "rapids", "flow");
      layer(g, "deep", "deep");
      if(activeFields.has("dry")){
        const land=canvas(width,height),l=land.getContext("2d");
        quilt(l, "meadow", rect, unit);
        layer(l, "forest", "forest");
        layer(l, "rock", "rock");
        layer(l, "earth", "earth");
        layer(l, "frost", "frost");
        layer(l, "thermal", "hot");
        layer(l, "signal", "info");
        layer(l, "corrosion", "corrosion");
        applyMask(l, "dry");
        g.drawImage(land, 0, 0);
      }else metrics.skippedLandPatches++;
      layer(g, "earth", "shore");
      for (const k of ["shallows", "wetbank", "shade", "bankshade", "light", "banklight"]) {
        if(!activeFields.has(k)){metrics.skippedOverlays++;continue;}
        paintMask(k);
        g.drawImage(mask, 0, 0, width, height);
      }
      metrics.patchPixels = width * height;
      metrics.paintedMaterials = names.filter(
        (n) => art.images["habitat-" + n],
      ).length;
      const result = { canvas: c, rect, unit };
      cache.set(key,result);cacheBytes.images+=c.width*c.height*4;
      while(cacheBytes.images>imageBudget&&cache.size>1){const k=cache.keys().next().value,a=cache.get(k);cache.delete(k);cacheBytes.images-=a.canvas.width*a.canvas.height*4;}
      metrics.cachedImageBytes=cacheBytes.images;metrics.cachedMaskBytes=cacheBytes.masks;
      return result;
    }
    return { make, metrics, sample, relief };
  }
  root.EcoHabitat = { create };
})(globalThis);
