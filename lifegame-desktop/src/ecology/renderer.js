/* Rendering reads a settled world. Animation never changes biological state. */
(function (root, factory) {
  const api = factory(root.EcoState);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EcoRenderer = api;
})(globalThis, function (S) {
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
  function creature(g, o, x, y, r, detail = true) {
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
        x: 0,
        y: 0,
        resources: true,
        grid: false,
        motion: true,
        animate: false,
        duration: 260,
        selected: null,
      },
      cache = document.createElement("canvas");
    let world = null,
      lastTurn = -1,
      changedAt = 0,
      terrainKey = null;
    const diagnostics = { mode: "detail", drawn: 0, motionActors: 0 };
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
    function terrain(w) {
      const key = w.config.seed + ":" + w.config.width + ":" + w.config.height;
      if (terrainKey === key) return;
      terrainKey = key;
      cache.width = w.config.width * 12;
      cache.height = w.config.height * 12;
      const c = cache.getContext("2d");
      w.tiles.forEach((t, p) => {
        const [x, y] = S.xy(w, p),
          px = x * 12,
          py = y * 12;
        c.fillStyle = colors[t.env];
        c.globalAlpha = t.terrain === "deep" ? 0.23 : 0.14;
        c.fillRect(px, py, 12, 12);
        c.globalAlpha = 1;
        c.strokeStyle = colors[t.env] + "35";
        c.lineWidth = 0.6;
        if (t.terrain === "shallow" || t.terrain === "deep") {
          c.beginPath();
          c.moveTo(px + 2, py + 7);
          c.quadraticCurveTo(px + 5, py + 4, px + 10, py + 7);
          c.stroke();
        } else if (t.terrain === "rock") {
          c.beginPath();
          c.moveTo(px + 3, py + 8);
          c.lineTo(px + 6, py + 3);
          c.lineTo(px + 9, py + 8);
          c.stroke();
        } else if (t.terrain === "mud") {
          c.fillStyle = colors[t.env] + "30";
          c.fillRect(px + 2, py + 6, 5, 2);
        }
        if (t.cover === "boulder") {
          c.fillStyle = "#4d5554";
          c.beginPath();
          c.arc(px + 6, py + 6, 4, 0, 7);
          c.fill();
        } else if (t.cover === "log") {
          c.fillStyle = "#70634c";
          c.fillRect(px + 2, py + 4, 8, 3);
        } else if (t.cover === "bush") {
          c.fillStyle = "#69826066";
          c.beginPath();
          c.arc(px + 6, py + 6, 4, 0, 7);
          c.fill();
        }
        c.strokeStyle = "#bac0aa66";
        c.lineWidth = 1.3;
        for (const q of t.walls) {
          if (q === p + 1) {
            c.beginPath();
            c.moveTo(px + 12, py);
            c.lineTo(px + 12, py + 12);
            c.stroke();
          } else if (q === p + w.config.width) {
            c.beginPath();
            c.moveTo(px, py + 12);
            c.lineTo(px + 12, py + 12);
            c.stroke();
          }
        }
      });
    }
    function fit() {
      if (!world) return;
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
    function draw() {
      resize();
      const b = canvas.getBoundingClientRect();
      g.fillStyle = "#0b181c";
      g.fillRect(0, 0, b.width, b.height);
      if (!world) return;
      const w = world,
        z = view.scale;
      g.save();
      g.translate(view.x, view.y);
      g.scale(z, z);
      g.drawImage(cache, 0, 0, w.config.width, w.config.height);
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
        detail = z >= 12;
      diagnostics.mode = point ? "point" : detail ? "detail" : "simple";
      diagnostics.drawn = 0;
      diagnostics.motionActors = 0;
      if (view.resources)
        for (const a of w.resources) {
          if (!inView(a.cell)) continue;
          const [x, y] = S.xy(w, a.cell),
            env = w.tiles[a.cell].env;
          g.fillStyle =
            a.kind === "info"
              ? "#c5b4f8"
              : a.kind === "factor"
                ? "#f8d992"
                : a.kind === "mineral"
                  ? "#b6d9dc"
                  : a.kind === "droplet"
                    ? "#79bbe0"
                    : colors[env];
          const radius =
            0.09 + Math.min(1, a.q / (S.FOOD[a.kind].cap || 4)) * 0.19;
          if (a.kind === "info") {
            g.globalAlpha = Math.max(
              0.22,
              1 - (w.turn - (a.event?.time || a.created)) / 24,
            );
            g.beginPath();
            g.arc(x + 0.5, y + 0.5, radius * 1.8, 0, 7);
            g.strokeStyle = g.fillStyle;
            g.lineWidth = 0.04;
            g.stroke();
            g.globalAlpha = 1;
          }
          g.beginPath();
          if (a.kind === "mineral")
            g.rect(x + 0.5 - radius, y + 0.5 - radius, radius * 2, radius * 2);
          else g.arc(x + 0.5, y + 0.5, radius, 0, 7);
          g.fill();
        }
      for (const a of w.carcasses) {
        if (!inView(a.cell)) continue;
        const [x, y] = S.xy(w, a.cell);
        g.strokeStyle = "#ab8b75";
        g.lineWidth = 0.08;
        g.beginPath();
        g.moveTo(x + 0.25, y + 0.25);
        g.lineTo(x + 0.75, y + 0.75);
        g.moveTo(x + 0.25, y + 0.75);
        g.lineTo(x + 0.75, y + 0.25);
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
      for (const slot of ["food", "main"])
        for (const o of w.organisms) {
          if (o.slot !== slot || !inView(o.cell)) continue;
          diagnostics.drawn++;
          const [x, y] = S.xy(w, o.cell),
            list = events.get(o.id) || [],
            ev = list.find((e) => e.type === "move");
          let cx = x + 0.5,
            cy = y + 0.5;
          if (ev?.type === "move" && ev.from !== undefined) {
            const [u, v] = S.xy(w, ev.from);
            cx = u + 0.5 + (x - u) * age;
            cy = v + 0.5 + (y - v) * age;
          }
          const size =
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
          if (o.slot === "main") creature(g, o, cx, cy, size, detail);
          else if (point) {
            g.fillStyle = S.spec(o).color;
            g.fillRect(cx - 0.15, cy - 0.15, 0.3, 0.3);
          } else food(g, o, cx - 0.12, cy + 0.12, size, w.tiles[o.cell].env);
          if (o.infection && !point) {
            g.fillStyle = "#ec847a";
            g.beginPath();
            g.arc(x + 0.81, y + 0.18, 0.1, 0, 7);
            g.fill();
            if (o.infection.q) {
              g.strokeStyle = "#d2a6f4";
              g.lineWidth = 0.055;
              g.beginPath();
              g.arc(x + 0.81, y + 0.18, 0.16, 0, 7);
              g.stroke();
            }
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
        g.strokeStyle = "#eef3cf";
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
      const next = S.clamp(view.scale * factor, 1, 64),
        ratio = next / view.scale;
      view.x = x - (x - view.x) * ratio;
      view.y = y - (y - view.y) * ratio;
      view.scale = next;
    }
    return { view, diagnostics, setWorld, draw, fit, cellAt, zoom, creature };
  }
  return { create, creature, food, colors };
});
