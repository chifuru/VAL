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
  function glow(g, x, y, r, c) {
    const a = g.createRadialGradient(x, y, 0, x, y, r);
    a.addColorStop(0, c + "80");
    a.addColorStop(1, c + "00");
    g.fillStyle = a;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const variants = new Map(),
    framesClean = new Map();
  // Atlas cells may contain isolated tips from a neighbour. Keep the central tissue
  // and its substantial attached components; source PNGs remain unchanged.
  function cleanFrame(im, f) {
    const key = im.src + "/" + f.join(",");
    if (framesClean.has(key)) return framesClean.get(key);
    const c = document.createElement("canvas");
    c.width = f[2];
    c.height = f[3];
    const g = c.getContext("2d");
    g.drawImage(im, ...f, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height),
      W = c.width,
      H = c.height,
      labels = new Int32Array(W * H),
      groups = [];
    let n = 0;
    for (let p = 0; p < W * H; p++) {
      if (labels[p] || d.data[p * 4 + 3] < 30) continue;
      n++;
      const queue = [p];
      labels[p] = n;
      let count = 0,
        cx = 0,
        cy = 0;
      for (let q = 0; q < queue.length; q++) {
        const a = queue[q],
          x = a % W,
          y = Math.floor(a / W);
        count++;
        cx += x;
        cy += y;
        for (const b of [
          x > 0 ? a - 1 : -1,
          x < W - 1 ? a + 1 : -1,
          y > 0 ? a - W : -1,
          y < H - 1 ? a + W : -1,
        ])
          if (b >= 0 && !labels[b] && d.data[b * 4 + 3] >= 30) {
            labels[b] = n;
            queue.push(b);
          }
      }
      groups.push({ n, count, cx: cx / count, cy: cy / count });
    }
    const largest = Math.max(1, ...groups.map((a) => a.count)),
      keep = new Set(
        groups.filter((a) => a.count >= largest * 0.06).map((a) => a.n),
      );
    // Only remove labelled disconnected fragments. Soft fringe pixels remain intact.
    for (let p = 0; p < W * H; p++)
      if (labels[p] && !keep.has(labels[p])) d.data[p * 4 + 3] = 0;
    g.putImageData(d, 0, 0);
    framesClean.set(key, c);
    return c;
  }

  function variant(o, im, f) {
    im = cleanFrame(im, f);
    f = [0, 0, im.width, im.height];
    const age = root.EcoState.ageInfo(o),
      stage = age.enabled ? age.stage : "adult",
      sex = o.sex || "none",
      key = [o.species, o.phase, o.branch3, o.branch4, stage, sex, o.role].join(
        "/",
      );
    if (variants.has(key)) return variants.get(key);
    const c = document.createElement("canvas");
    c.width = f[2];
    c.height = f[3];
    const g = c.getContext("2d"),
      W = c.width,
      H = c.height;
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
    variants.set(key, c);
    return c;
  }
  const outlineFrames = new WeakMap();
  const outlineMetrics = { builds: 0, hits: 0 };
  function outlined(g, frame, x, y, width, height, enabled) {
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
      g.drawImage(entry.image, x - px, y - py, width + px * 2, height + py * 2);
    }
    g.drawImage(frame, x, y, width, height);
  }
  function creature(g, o, x, y, r) {
    const frames = manifest.creatures.regions[o.species],
      im = images[manifest.creatures.sheetBySpecies[o.species]];
    if (!frames || !im) return false;
    let f =
        frames[Math.max(0, Math.min(frames.length - 1, (o.phase || 1) - 1))],
      source = im;
    const b = manifest.branches[o.species];
    if (b && o.phase >= 3 && images[b.sheet]) {
      source = images[b.sheet];
      f =
        b.regions[
          o.phase === 3
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
    const width =
        branchWidth *
        r *
        2.8 *
        (0.94 + 0.12 * (o.dna?.appendage ?? 0.5)) *
        (o.sex === "female" ? 1.1 : 1),
      height =
        r *
        2.8 *
        (juvenile ? 0.77 : elder ? 0.94 : 1) *
        (o.sex === "male" ? 1.1 : 1);
    g.save();
    g.translate(x, y);
    if (o.renderPose) {
      g.rotate(o.renderPose.lean || 0);
      g.scale(1, o.renderPose.squash || 1);
    }
    if (Math.cos(((o.facing || 0) * Math.PI) / 4) < 0) g.scale(-1, 1);
    outlined(
      g,
      variant(o, source, f),
      -width / 2,
      -height / 2,
      width,
      height,
      o.renderEmphasis,
    );
    // Family-specific branch structure is in the solar/jelly artwork; other families
    // use tissue width/crest proportions, without fake shared rings or combat effects.
    if (o.species === "swarm" && o.role === "queen") {
      g.fillStyle = "#ffe1a6";
      for (let j = 0; j < 3; j++)
        ellipse(g, (j - 1) * r * 0.13, -r * 0.18, r * 0.045, r * 0.07);
    }
    g.restore();
    return true;
  }
  function food(g, o, x, y, r, env) {
    const f = manifest.food.regions[o.species];
    if (!f) {
      return creature(g, o, x, y, r);
    }
    const im = images["food-atlas"];
    if (!im) return false;
    const q = Math.max(0.3, Math.min(1, (o.B || 3) / 10)),
      size = r * (0.85 + 0.25 * q),
      frame = f[Math.min(1, (o.phase || 1) - 1)];
    g.save();
    g.translate(x, y);
    if (o.facing % 2) g.scale(-1, 1);
    outlined(
      g,
      cleanFrame(im, frame),
      -size * 1.3,
      -size * 1.3,
      size * 2.6,
      size * 2.6,
      o.renderEmphasis,
    );
    if (env === 4) {
      g.globalAlpha = 0.25;
      glow(g, 0, 0, size, "#d6f6ff");
    }
    g.restore();
    return true;
  }
  function resource(g, a, x, y, r, env, turn) {
    g.save();
    const n = Math.min(6, Math.max(1, Math.ceil(a.q))),
      colors = {
        info: "#73e9ff",
        seed: "#d5cf83",
        spore: "#cf9aee",
        egg: "#ffddaa",
        organic: "#ba9374",
        mineral: "#a8d8ed",
        droplet: "#76d9f3",
        factor: "#f5c986",
      },
      c = colors[a.kind] || "#d6e5b5";
    if (a.kind === "info") {
      g.globalAlpha = Math.max(
        0.35,
        1 - (turn - (a.event?.time ?? a.created ?? turn)) / 28,
      );
      glow(g, x, y, r * 3, c);
      g.strokeStyle = c;
      g.lineWidth = r * 0.09;
      for (let j = 0; j < 3; j++) {
        g.beginPath();
        g.ellipse(
          x,
          y,
          r * (0.8 + j * 0.35),
          r * (0.25 + j * 0.12),
          j * 0.9 - 0.5,
          0.2,
          Math.PI * 1.8,
        );
        g.stroke();
      }
      g.fillStyle = "#edfcff";
      ellipse(g, x, y, r * 0.2, r * 0.2);
    } else {
      g.fillStyle = c;
      g.strokeStyle = c;
      g.lineWidth = r * 0.08;
      for (let j = 0; j < n; j++) {
        const u = x + Math.sin(j * 8) * r * 0.6,
          v = y + Math.cos(j * 5) * r * 0.4,
          s = r * (0.34 + j * 0.015);
        glow(g, u, v, s * 2, c);
        if (a.kind === "mineral" || a.kind === "factor") {
          g.beginPath();
          g.moveTo(u, v - s * 1.5);
          g.lineTo(u + s, v);
          g.lineTo(u, v + s);
          g.lineTo(u - s, v);
          g.closePath();
          g.fill();
          g.strokeStyle = "#efffff";
          g.beginPath();
          g.moveTo(u, v - s * 1.4);
          g.lineTo(u, v + s * 0.7);
          g.stroke();
        } else
          ellipse(
            g,
            u,
            v,
            s * (a.kind === "spore" ? 0.5 : 0.7),
            s,
            a.kind === "seed" ? 0.5 : 0,
          );
      }
    }
    g.restore();
  }
  const propVariants = new Map(),
    shadowFrames = new Map();
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
      shadowFrames.set(index, c);
    }
    const height = (width * f[3]) / f[2];
    g.save();
    g.translate(x, y);
    g.transform(1, 0.18, -0.65, -0.2, 0, 0);
    g.globalAlpha = 0.28;
    g.filter = "blur(2px)";
    g.drawImage(
      shadowFrames.get(index),
      -width / 2,
      -height * 0.9,
      width,
      height,
    );
    g.restore();
  }
  root.EcoArt = {
    manifest,
    outlineMetrics,
    images,
    errors,
    ready,
    tint,
    creature,
    food,
    resource,
    prop,
    propShadow,
    get loaded() {
      return loaded;
    },
  };
})(globalThis);
