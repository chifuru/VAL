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
      algae:
        "M-.8 .7 Q-.6 -.4 -.3 -.8 M0 .8 Q-.2 -.1 .2 -.75 M.5 .7 Q.8 0 .6 -.5",
      moss: "M-.85 .5 Q-.6 -.5 -.25 .2 Q0 -.8 .3 .1 Q.7 -.4 .85 .5 Z",
      grass:
        "M0 .9 V-.75 M0 .1 Q-.9 -.6 -.7 -.15 Q-.4 .3 0 .45 M0 -.2 Q.8 -.8 .7 -.25 Q.4 .1 0 .1",
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
    symbolCache = new Map();
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
  function symbol(g, id, x, y, r, color = "#e8e4be") {
    if (!symbolPaths[id]) return false;
    if (!symbolCache.has(id)) symbolCache.set(id, new Path2D(symbolPaths[id]));
    g.save();
    g.translate(x, y);
    g.scale(r, r);
    g.lineJoin = "round";
    g.lineCap = "round";
    const path = symbolCache.get(id);
    g.strokeStyle = "#041820";
    g.lineWidth = 0.48;
    g.stroke(path);
    g.strokeStyle = color;
    g.lineWidth = 0.19;
    g.stroke(path);
    g.restore();
    return true;
  }
  function creature(g, o, x, y, r, detail = true) {
    if (detail && Art?.creature(g, o, x, y, r)) return;
    symbol(g, o.species, x, y, r, symbolColor(S.spec(o)));
  }
  function food(g, o, x, y, r, env) {
    if (Art?.food(g, o, x, y, r, env)) return;
    symbol(g, o.species, x, y, r, symbolColor(S.spec(o)));
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
    let world = null,
      P = null,
      scene = null,
      geometryKey = null,
      lastTurn = -1,
      changedAt = 0,
      cache = null,
      cacheKey = null,
      nearCache = null;
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
    function setWorld(w) {
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
        geometryKey = key;
        cache = null;
        cacheKey = null;
      }
      if (lastTurn !== w.turn) {
        lastTurn = w.turn;
        changedAt = performance.now();
      }
    }
    function fit() {
      if (!world) return;
      const b = resize(),
        r = P.bounds;
      view.mode = "overview";
      view.scale = Math.min(
        (b.width - 40) / (r.maxX - r.minX),
        (b.height - 40) / (r.maxY - r.minY),
      );
      view.x = (b.width - (r.maxX + r.minX) * view.scale) / 2;
      view.y = (b.height - (r.maxY + r.minY) * view.scale) / 2;
    }
    function focus(cell) {
      if (!world) return;
      const b = resize(),
        [x, y] = S.xy(world, cell),
        p = P.point(x + 0.5, y + 0.5);
      view.mode = "detail";
      view.scale = 240;
      view.x = b.width / 2 - p[0] * view.scale;
      view.y = b.height / 2 - p[1] * view.scale;
    }
    function screen(cell) {
      const [x, y] = S.xy(world, cell),
        p = P.point(x + 0.5, y + 0.5);
      return [view.x + p[0] * view.scale, view.y + p[1] * view.scale];
    }
    function path(points) {
      g.beginPath();
      g.moveTo(...points[0]);
      for (const p of points.slice(1)) g.lineTo(...p);
      g.closePath();
    }
    function draw() {
      const b = resize();
      g.fillStyle = "#07171f";
      g.fillRect(0, 0, b.width, b.height);
      if (!world) return;
      const w = world,
        z = view.scale,
        detail = view.mode === "detail" || (view.mode === "auto" && z >= 24),
        point = z < 4;
      Object.assign(diagnostics, {
        mode: point ? "point" : detail ? "detail" : "simple",
        drawn: 0,
        motionActors: 0,
        selectedMotion: false,
        resources: 0,
        carcasses: 0,
        infectedHosts: 0,
        highParasites: 0,
      });
      const visible = (p, margin = 1) =>
        p[0] * z + view.x >= -z * margin &&
        p[1] * z + view.y >= -z * margin &&
        p[0] * z + view.x <= b.width + z * margin &&
        p[1] * z + view.y <= b.height + z * margin;
      const position = (cell, dx = 0.5, dy = 0.5) => {
        const [x, y] = S.xy(w, cell);
        return P.point(x + dx, y + dy);
      };
      g.save();
      g.translate(view.x, view.y);
      g.scale(z, z);
      if (detail) {
        const key = [
          geometryKey,
          view.x,
          view.y,
          z,
          b.width,
          b.height,
          devicePixelRatio || 1,
        ].join("/");
        if (key !== cacheKey) {
          cacheKey = key;
          nearCache = document.createElement("canvas");
          const d = devicePixelRatio || 1;
          nearCache.width = Math.round(b.width * d);
          nearCache.height = Math.round(b.height * d);
          const n = nearCache.getContext("2d");
          n.scale(d, d);
          n.translate(view.x, view.y);
          n.scale(z, z);
          scene.surface(n, visible, true, z);
        }
        g.drawImage(
          nearCache,
          -view.x / z,
          -view.y / z,
          b.width / z,
          b.height / z,
        );
      } else {
        if (!cache) {
          const r = P.bounds,
            u = 24;
          cache = document.createElement("canvas");
          cache.width = Math.ceil((r.maxX - r.minX) * u);
          cache.height = Math.ceil((r.maxY - r.minY) * u);
          const c = cache.getContext("2d");
          c.scale(u, u);
          c.translate(-r.minX, -r.minY);
          scene.surface(c, null, false, u);
          c.setTransform(1, 0, 0, 1, 0, 0);
          const soft = document.createElement("canvas");
          soft.width = cache.width;
          soft.height = cache.height;
          const sg = soft.getContext("2d");
          sg.filter = "blur(1.1px) saturate(.65) brightness(.72)";
          sg.drawImage(cache, 0, 0);
          c.globalCompositeOperation = "copy";
          c.drawImage(soft, 0, 0);
          c.globalCompositeOperation = "source-over";
        }
        const r = P.bounds;
        g.drawImage(cache, r.minX, r.minY, cache.width / 24, cache.height / 24);
      }
      diagnostics.materialPixelsPerCell = detail
        ? scene.metrics.unit
        : Math.max(8, Math.min(24, Math.floor(1800 / w.config.width)));
      diagnostics.paintedMaterials = scene.metrics.paintedMaterials;
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
        events = new Map();
      if (view.motion && !point && age < 1) {
        const living = new Map(w.organisms.map((o) => [o.id, o])),
          grouped = new Map();
        for (const ev of w.events) {
          const o = living.get(ev.id);
          if (!o || !visible(position(o.cell), 1.6)) continue;
          if (!grouped.has(ev.id)) grouped.set(ev.id, []);
          if (grouped.get(ev.id).length < 4) grouped.get(ev.id).push(ev);
        }
        const distance = (id) => {
          const o = living.get(id),
            p = position(o.cell);
          return Math.hypot(
            p[0] * z + view.x - b.width / 2,
            p[1] * z + view.y - b.height / 2,
          );
        };
        const order = [...grouped].sort((a, b) => {
          const sa = living.get(a[0]).cell === view.selected,
            sb = living.get(b[0]).cell === view.selected;
          return (
            Number(sb) - Number(sa) ||
            distance(a[0]) - distance(b[0]) ||
            S.compare(a[0], b[0])
          );
        });
        for (const [id, list] of order.slice(0, 128)) events.set(id, list);
      }
      if (view.resources)
        for (const a of w.resources) {
          const kind = Object.keys(S.FOOD).indexOf(a.kind),
            p = position(
              a.cell,
              0.12 + (kind % 4) * 0.23,
              0.12 + Math.floor(kind / 4) * 0.2,
            );
          if (!visible(p)) continue;
          diagnostics.resources++;
          const r = 0.05 + 0.04 * Math.min(1, a.q / (S.FOOD[a.kind].cap || 4));
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
      for (const a of w.carcasses) {
        const p = position(a.cell, 0.86, 0.86);
        if (!visible(p)) continue;
        diagnostics.carcasses++;
        g.strokeStyle = "#e5b798";
        g.lineWidth = Math.max(0.025, 0.7 / z);
        g.beginPath();
        g.moveTo(p[0] - 0.06, p[1] - 0.04);
        g.lineTo(p[0] + 0.06, p[1] + 0.04);
        g.moveTo(p[0] - 0.06, p[1] + 0.04);
        g.lineTo(p[0] + 0.06, p[1] - 0.04);
        g.stroke();
      }
      const actors = [],
        main = new Set(
          w.organisms.filter((o) => o.slot === "main").map((o) => o.cell),
        ),
        foodCells = new Set(
          w.organisms.filter((o) => o.slot === "food").map((o) => o.cell),
        );
      for (const obj of scene.objects) {
        const p = P.point(obj.x, obj.y);
        if (visible(p, 2))
          actors.push({ depth: P.depth(obj.x, obj.y) - 0.05, obj, p });
      }
      for (const o of w.organisms) {
        const overlap = main.has(o.cell) && foodCells.has(o.cell),
          ox = overlap ? (o.slot === "main" ? 0.67 : 0.2) : 0.5,
          oy = overlap ? (o.slot === "main" ? 0.44 : 0.81) : 0.55;
        let [x, y] = S.xy(w, o.cell);
        const list = events.get(o.id) || [],
          ev = list.find((e) => e.type === "move");
        if (ev?.from !== undefined) {
          const [u, v] = S.xy(w, ev.from);
          x = u + (x - u) * age;
          y = v + (y - v) * age;
        }
        const p = P.point(x + ox, y + oy);
        if (!visible(p, 1.6)) continue;
        actors.push({ depth: P.depth(x + ox, y + oy), o, p, list });
      }
      actors.sort((a, b) => a.depth - b.depth);
      const bodies = actors.filter((a) => a.o);
      for (const actor of actors) {
        const { p } = actor;
        if (actor.obj) {
          const a = actor.obj,
            t = w.tiles[a.cell];
          if (
            !detail &&
            !["bush", "boulder", "log"].includes(t.cover) &&
            t.terrain !== "rock" &&
            a.index !== 6
          )
            continue;
          if (detail) {
            Art.propShadow(g, a.index, ...p, a.size);
            const obscured = bodies.filter(
              (b) =>
                b.depth < actor.depth &&
                Math.abs(b.p[0] - p[0]) < a.size * 0.42 &&
                b.p[1] < p[1] + 0.08 &&
                b.p[1] > p[1] - a.size * 0.8,
            );
            const holes = obscured.map((b) => ({
              x: b.p[0] - p[0],
              y: b.p[1] - (b.o.slot === "main" ? 0.2 : 0.04) - p[1],
              radius: b.o.slot === "main" ? 0.47 : 0.28,
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
        diagnostics.drawn++;
        const isMain = o.slot === "main",
          overlap = main.has(o.cell) && foodCells.has(o.cell),
          r = isMain
            ? (0.23 + 0.035 * o.phase) *
              (overlap ? 0.85 : 1) *
              (0.9 + 0.2 * o.dna.body)
            : 0.13 + 0.07 * Math.min(1, S.edibleB(o) / 15),
          cx = p[0],
          cy = p[1] - (detail ? (isMain ? 0.18 : 0.03) : 0);
        g.fillStyle = detail ? "#00132360" : "#061922cc";
        g.beginPath();
        g.ellipse(
          p[0],
          p[1] + 0.04,
          detail ? r * 0.9 : isMain ? 0.38 : 0.22,
          detail ? r * 0.23 : isMain ? 0.3 : 0.17,
          0,
          0,
          7,
        );
        g.fill();
        if (detail) {
          if (isMain)
            creature(
              g,
              list.length
                ? {
                    ...o,
                    renderPose: {
                      lean: list.some((e) => e.type === "attack")
                        ? Math.sin(age * Math.PI) * 0.15
                        : 0,
                      squash: list.some((e) => e.type === "feed")
                        ? 1 - Math.sin(age * Math.PI) * 0.07
                        : 1,
                    },
                  }
                : o,
              cx,
              cy,
              r,
              true,
            );
          else food(g, o, cx, cy, r, w.tiles[o.cell].env);
        } else
          symbol(
            g,
            o.species,
            cx,
            cy,
            isMain ? (overlap ? 0.25 : 0.3) : 0.17,
            symbolColor(S.spec(o)),
          );
        const a = S.ageInfo(o);
        if (a.enabled && a.stage !== "adult" && (view.ageEmphasis || !detail)) {
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
          const bx = cx + 0.23,
            by = cy - 0.26;
          g.fillStyle = "#19172b";
          g.beginPath();
          g.arc(bx, by, 0.1, 0, 7);
          g.fill();
          g.fillStyle = "#ffba82";
          g.beginPath();
          g.arc(bx, by, 0.05, 0, 7);
          g.fill();
          if (o.infection.q) {
            g.strokeStyle = "#d8adff";
            g.lineWidth = Math.max(0.025, 0.7 / z);
            g.beginPath();
            g.arc(bx, by, 0.1, 0, 7);
            g.stroke();
          }
        }
        if (list.length) {
          diagnostics.motionActors++;
          if (o.cell === view.selected) diagnostics.selectedMotion = true;
        }
        for (const ev of list.slice(0, 4)) {
          if (ev.type === "move") continue;
          g.save();
          g.globalAlpha = 1 - age;
          g.strokeStyle =
            ev.type === "attack"
              ? "#ffaf84"
              : ev.type === "infection"
                ? "#d6a3ff"
                : "#e9eab0";
          g.lineWidth = 0.035;
          if (["attack", "feed", "care"].includes(ev.type)) {
            const t = position(ev.to ?? o.cell);
            g.beginPath();
            g.moveTo(cx, cy);
            g.quadraticCurveTo(
              (cx + t[0]) / 2,
              Math.min(cy, t[1]) - 0.22,
              ...t,
            );
            g.stroke();
            for (let j = 0; j < 3; j++) {
              g.fillStyle = g.strokeStyle;
              g.beginPath();
              g.arc(
                cx + (t[0] - cx) * age,
                cy + (t[1] - cy) * age - j * 0.04,
                0.018,
                0,
                7,
              );
              g.fill();
            }
          } else {
            g.beginPath();
            g.ellipse(
              cx,
              cy,
              r + age * 0.2,
              (r + age * 0.2) * 0.6,
              0,
              0,
              Math.PI * 2,
            );
            g.stroke();
          }
          g.restore();
        }
        if (detail && (isMain || o.cell === view.selected)) {
          g.font = ".065px sans-serif";
          g.textAlign = "center";
          g.fillStyle = "#071c25df";
          g.fillRect(cx - 0.4, cy + r * 0.95, 0.8, 0.13);
          g.fillStyle = "#fff1c9";
          const action = w.events.find(
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
              (action ? " / " + name[action.type] : ""),
            cx,
            cy + r * 1.23,
          );
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
      g.restore();
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
      setWorld,
      draw,
      fit,
      focus,
      screen,
      cellAt,
      zoom,
      creature,
    };
  }
  return {
    create,
    creature,
    food,
    symbol,
    symbolColor,
    symbolPaths,
    colors,
    assets: Art,
  };
});
