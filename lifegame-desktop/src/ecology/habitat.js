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
  function canvas(W, H) {
    const c = document.createElement("canvas");
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
      grad.addColorStop(0.08, "#000");
      grad.addColorStop(0.92, "#000");
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
      cache = new Map(),
      metrics = {
        unit: 0,
        patchPixels: 0,
        cacheHits: 0,
        builds: 0,
        paintedMaterials: 0,
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
          mix = biome(t);
        r.wet += (P.water(t) ? 1 : 0) * q;
        r.deep += (t.terrain === "deep" ? 1 : 0) * q;
        r.forest += mix[1] * q;
        r.rock += mix[2] * q;
        r.earth += mix[3] * q;
        r.frost += (t.env === 4 ? 1 : 0) * q;
        r.hot += (t.env === 1 ? 1 : 0) * q;
        r.info += (t.env === 2 ? 1 : 0) * q;
        r.flow += (isFlow(t) ? 1 : 0) * q;
        r.corrosion += (t.env === 7 ? 1 : 0) * q;
      }
      return r;
    }
    function quilt(g, name, rect, unit) {
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
        size = period * 1.28;
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
        return cache.get(key);
      }
      metrics.unit = unit;
      metrics.builds++;
      const width = rect.w * unit,
        height = rect.h * unit,
        c = canvas(width, height),
        g = c.getContext("2d"),
        land = canvas(width, height),
        l = land.getContext("2d"),
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
          "frost",
          "hot",
          "info",
          "corrosion",
        ],
        data = Object.fromEntries(
          fields.map((k) => [k, mg.createImageData(mw, mh)]),
        );
      for (let py = 0; py < mh; py++)
        for (let px = 0; px < mw; px++) {
          const x = rect.x + (px + 0.5) / mu,
            y = rect.y + (py + 0.5) / mu,
            r = sample(x, y),
            wet = smooth((r.wet - 0.36) / 0.28),
            coast = clamp(1 - Math.abs(r.wet - 0.42) / 0.21),
            n = hash(Math.floor(x * 9), Math.floor(y * 9));
          const values = {
            dry: 1 - wet,
            forest: r.forest,
            rock: r.rock,
            earth: r.earth,
            deep: r.deep,
            flow: r.flow * (w.config.mapResolved?.id === "river" ? 0.72 : 0.27),
            shore: coast * (0.5 + n * 0.2),
            frost: r.frost,
            hot: r.hot,
            info: r.info,
            corrosion: r.corrosion,
          };
          const i = (py * mw + px) * 4;
          for (const k of fields) {
            const d = data[k].data;
            d[i] = d[i + 1] = d[i + 2] = 255;
            d[i + 3] = Math.round(clamp(values[k]) * 255);
          }
        }
      function applyMask(target, k) {
        mg.putImageData(data[k], 0, 0);
        target.globalCompositeOperation = "destination-in";
        target.drawImage(mask, 0, 0, width, height);
        target.globalCompositeOperation = "source-over";
      }
      function layer(target, name, field) {
        s.clearRect(0, 0, width, height);
        quilt(s, name, rect, unit);
        applyMask(s, field);
        target.drawImage(scratch, 0, 0);
      }
      quilt(g, "water", rect, unit);
      layer(g, "rapids", "flow");
      layer(g, "deep", "deep");
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
      layer(g, "earth", "shore");
      metrics.patchPixels = width * height;
      metrics.paintedMaterials = names.filter(
        (n) => art.images["habitat-" + n],
      ).length;
      const result = { canvas: c, rect, unit };
      if (cache.size >= 3) cache.delete(cache.keys().next().value);
      cache.set(key, result);
      return result;
    }
    return { make, metrics, sample };
  }
  root.EcoHabitat = { create };
})(globalThis);
