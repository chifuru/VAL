/* Oblique terrain mesh and upright habitat objects. All anchors use actual cells. */
(function (root) {
  "use strict";
  const palette = [
    "#43877c",
    "#947c51",
    "#796c91",
    "#879461",
    "#becfcb",
    "#568252",
    "#c2b283",
    "#827257",
  ];
  const rgb = (h) => h.match(/[a-f\d]{2}/gi).map((x) => parseInt(x, 16));
  const hex = (a) =>
    "#" +
    a
      .map((x) =>
        Math.max(0, Math.min(255, Math.round(x)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  const noise = (p, k = 1) =>
    (((Math.sin(p * 71.17 + k * 21.9) * 43758.5453) % 1) + 1) % 1;
  function build(w, P) {
    const W = w.config.width,
      H = w.config.height,
      materials = root.EcoHabitat.create(w, P, root.EcoArt);
    const cells = Array.from({ length: w.tiles.length }, (_, p) => p).sort(
      (a, b) =>
        P.depth(a % W, Math.floor(a / W)) - P.depth(b % W, Math.floor(b / W)),
    );
    function triangle(g, src, dst, texture) {
      const [a, b, c] = src,
        [u, v, z] = dst,
        det = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
      const m00 =
          ((v[0] - u[0]) * (c[1] - a[1]) - (z[0] - u[0]) * (b[1] - a[1])) / det,
        m01 =
          ((z[0] - u[0]) * (b[0] - a[0]) - (v[0] - u[0]) * (c[0] - a[0])) / det,
        m10 =
          ((v[1] - u[1]) * (c[1] - a[1]) - (z[1] - u[1]) * (b[1] - a[1])) / det,
        m11 =
          ((z[1] - u[1]) * (b[0] - a[0]) - (v[1] - u[1]) * (c[0] - a[0])) / det;
      g.save();
      const center = [(u[0] + v[0] + z[0]) / 3, (u[1] + v[1] + z[1]) / 3],
        expanded = dst.map((p) => {
          const dx = p[0] - center[0],
            dy = p[1] - center[1],
            d = Math.hypot(dx, dy);
          return [p[0] + (dx / d) * 0.03, p[1] + (dy / d) * 0.03];
        });
      g.beginPath();
      g.moveTo(...expanded[0]);
      g.lineTo(...expanded[1]);
      g.lineTo(...expanded[2]);
      g.closePath();
      g.clip();
      g.transform(
        m00,
        m10,
        m01,
        m11,
        u[0] - m00 * a[0] - m01 * a[1],
        u[1] - m10 * a[0] - m11 * a[1],
      );
      const sx = Math.max(0, Math.min(...src.map((p) => p[0])) - 2),
        sy = Math.max(0, Math.min(...src.map((p) => p[1])) - 2),
        sw = Math.min(
          texture.width - sx,
          Math.max(...src.map((p) => p[0])) - sx + 2,
        ),
        sh = Math.min(
          texture.height - sy,
          Math.max(...src.map((p) => p[1])) - sy + 2,
        );
      g.drawImage(texture, sx, sy, sw, sh, sx, sy, sw, sh);
      g.restore();
    }
    function surface(g, visible, detail, scale) {
      const selected = cells.filter(
        (p) => !visible || visible(P.face(p)[4], 2),
      );
      if (!selected.length) return;
      const xs = selected.map((p) => p % W),
        ys = selected.map((p) => Math.floor(p / W)),
        x0 = Math.max(0, Math.min(...xs) - 1),
        y0 = Math.max(0, Math.min(...ys) - 1),
        x1 = Math.min(W, Math.max(...xs) + 2),
        y1 = Math.min(H, Math.max(...ys) + 2);
      const unit = detail
        ? Math.min(256, Math.max(128, Math.ceil(scale / 32) * 32))
        : Math.max(8, Math.min(24, Math.floor(1800 / W)));
      const patch = materials.make(
          { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
          unit,
        ),
        texture = patch.canvas;
      for (const p of selected) {
        const f = P.face(p),
          x = (p % W) - x0,
          y = Math.floor(p / W) - y0,
          src = [
            [x * unit, y * unit],
            [(x + 1) * unit, y * unit],
            [(x + 1) * unit, (y + 1) * unit],
            [x * unit, (y + 1) * unit],
            [(x + 0.5) * unit, (y + 0.5) * unit],
          ];
        for (let j = 0; j < 4; j++)
          triangle(
            g,
            [src[j], src[(j + 1) % 4], src[4]],
            [f[j], f[(j + 1) % 4], f[4]],
            texture,
          );
      }
    }
    const objects = [];
    for (let p = 0; p < w.tiles.length; p++) {
      const t = w.tiles[p],
        h = noise(p);
      let index = -1,
        size = 1;
      if (t.cover === "bush") {
        index = t.env === 4 ? 1 : [0, 0, 2, 3][Math.floor(noise(p, 33) * 4)];
        size = (index < 3 ? 1.6 : 1.0) * (0.85 + noise(p, 11) * 0.3);
      } else if (t.cover === "boulder") {
        index = t.env === 4 ? 12 : t.env === 1 ? 13 : 5;
        size = 1.15;
      } else if (t.cover === "log") {
        index = p % 2 ? 7 : 10;
        size = 1.3;
      } else if (t.terrain === "rock" && h < 0.38) {
        index = t.env === 2 ? 14 : 4;
        size = 1.5;
      } else if (
        t.terrain === "shallow" &&
        h < 0.42 &&
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => {
          const x = (p % W) + dx,
            y = Math.floor(p / W) + dy;
          return (
            x >= 0 && y >= 0 && x < W && y < H && !P.water(w.tiles[y * W + x])
          );
        })
      ) {
        index = 9;
        size = 0.85;
      } else if (t.terrain === "mud" && h < 0.12) {
        index = 8;
        size = 0.7;
      } else if (!P.water(t) && t.terrain !== "rock" && h < 0.22) {
        index = t.env === 6 ? 11 : 15;
        size = 0.7;
      }
      if (index >= 0)
        objects.push({
          cell: p,
          index,
          size,
          x: (p % W) + 0.5,
          y: Math.floor(p / W) + 0.68,
        });
      for (const q of t.walls || [])
        if (q === p + 1 || q === p + W)
          objects.push({
            cell: p,
            index: 6,
            wall: q,
            size: 1,
            x: (p % W) + (q === p + 1 ? 0.98 : 0.5),
            y: Math.floor(p / W) + (q === p + 1 ? 0.5 : 0.98),
          });
    }
    return { surface, objects, metrics: materials.metrics };
  }
  root.EcoScenery = { build, palette };
})(globalThis);
