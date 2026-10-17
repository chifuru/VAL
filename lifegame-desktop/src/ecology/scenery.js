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
      base = w.tiles.map((t) =>
        rgb(
          P.water(t)
            ? t.terrain === "deep"
              ? "#17465b"
              : "#307e89"
            : t.terrain === "rock"
              ? "#6c7973"
              : t.terrain === "mud"
                ? "#697455"
                : palette[t.env],
        ),
      );
    const vertex = (x, y) => {
      const a = [0, 0, 0];
      let n = 0;
      for (const [dx, dy] of [
        [-1, -1],
        [0, -1],
        [-1, 0],
        [0, 0],
      ]) {
        const u = x + dx,
          v = y + dy;
        if (u < 0 || v < 0 || u >= W || v >= H) continue;
        const c = base[v * W + u];
        for (let j = 0; j < 3; j++) a[j] += c[j];
        n++;
      }
      return a.map((v) => v / n);
    };
    const vertices = Array.from({ length: (W + 1) * (H + 1) }, (_, i) =>
      vertex(i % (W + 1), Math.floor(i / (W + 1))),
    );
    const cells = Array.from({ length: w.tiles.length }, (_, p) => p).sort(
      (a, b) =>
        P.depth(a % W, Math.floor(a / W)) - P.depth(b % W, Math.floor(b / W)),
    );
    const unit = Math.max(10, Math.min(40, Math.floor(1600 / W))),
      texture = document.createElement("canvas");
    texture.width = W * unit;
    texture.height = H * unit;
    const tx = texture.getContext("2d"),
      pixels = tx.createImageData(texture.width, texture.height);
    const smooth = (t) => t * t * (3 - 2 * t),
      mix = (a, b, t) => a + (b - a) * t;
    function value(x, y, k = 0) {
      const u = Math.floor(x),
        v = Math.floor(y),
        a = smooth(x - u),
        b = smooth(y - v);
      return mix(
        mix(noise(u + v * 3571, k), noise(u + 1 + v * 3571, k), a),
        mix(noise(u + (v + 1) * 3571, k), noise(u + 1 + (v + 1) * 3571, k), a),
        b,
      );
    }
    const at = (x, y) =>
      Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x));
    for (let py = 0; py < texture.height; py++)
      for (let px = 0; px < texture.width; px++) {
        const fx = (px + 0.5) / unit - 0.5,
          fy = (py + 0.5) / unit - 0.5,
          x = Math.floor(fx),
          y = Math.floor(fy),
          a = fx - x,
          b = fy - y,
          ids = [at(x, y), at(x + 1, y), at(x, y + 1), at(x + 1, y + 1)],
          weights = [(1 - a) * (1 - b), a * (1 - b), (1 - a) * b, a * b];
        let wet = 0,
          deep = 0;
        const land = [0, 0, 0];
        for (let j = 0; j < 4; j++) {
          const t = w.tiles[ids[j]];
          wet += (P.water(t) ? 1 : 0) * weights[j];
          deep += (t.terrain === "deep" ? 1 : 0) * weights[j];
          const c = rgb(
            t.terrain === "rock"
              ? "#768780"
              : t.terrain === "mud"
                ? "#687554"
                : palette[t.env],
          );
          for (let ch = 0; ch < 3; ch++) land[ch] += c[ch] * weights[j];
        }
        const n =
            value((px / unit) * 1.6, (py / unit) * 1.6) * 0.55 +
            value((px / unit) * 7, (py / unit) * 7, 3) * 0.3 +
            value((px / unit) * 28, (py / unit) * 28, 7) * 0.15,
          coast = Math.max(0, Math.min(1, (wet - 0.43) / 0.14)),
          sand = Math.max(0, 1 - Math.abs(wet - 0.46) / 0.14) * 0.55;
        const water = [
            mix(47, 18, deep),
            mix(132, 65, deep),
            mix(143, 87, deep),
          ],
          shore = [166, 167, 120],
          i = (py * texture.width + px) * 4;
        for (let ch = 0; ch < 3; ch++) {
          const dry = mix(land[ch], shore[ch], sand),
            c =
              mix(dry, water[ch], coast) + (n - 0.5) * (coast > 0.9 ? 16 : 32);
          pixels.data[i + ch] = c;
        }
        if (Math.abs(wet - 0.51) < 0.012) {
          pixels.data[i] += 30;
          pixels.data[i + 1] += 38;
          pixels.data[i + 2] += 28;
        }
        pixels.data[i + 3] = 255;
      }
    tx.putImageData(pixels, 0, 0);
    function triangle(g, src, dst) {
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
      for (const p of cells) {
        const f = P.face(p);
        if (visible && !visible(f[4], 2)) continue;
        const x = p % W,
          y = Math.floor(p / W),
          t = w.tiles[p],
          wet = P.water(t),
          c = base[p],
          corners = [
            vertices[y * (W + 1) + x],
            vertices[y * (W + 1) + x + 1],
            vertices[(y + 1) * (W + 1) + x + 1],
            vertices[(y + 1) * (W + 1) + x],
          ];
        const src = [
          [x * unit, y * unit],
          [(x + 1) * unit, y * unit],
          [(x + 1) * unit, (y + 1) * unit],
          [x * unit, (y + 1) * unit],
          [(x + 0.5) * unit, (y + 0.5) * unit],
        ];
        // Texture the continuous material onto the relief, without visible triangle colours.
        for (let j = 0; j < 4; j++)
          triangle(
            g,
            [src[j], src[(j + 1) % 4], src[4]],
            [f[j], f[(j + 1) % 4], f[4]],
          );
        if (!detail) continue;
        if (wet) {
          g.strokeStyle = t.terrain === "deep" ? "#93d6d914" : "#cdf5e530";
          g.lineWidth = 0.006;
          for (let j = 0; j < 4; j++) {
            const u = x + noise(p, j) * 0.7,
              v = y + 0.1 + j * 0.21,
              a = P.point(u, v),
              b = P.point(u + 0.22, v + 0.025);
            g.beginPath();
            g.moveTo(...a);
            g.quadraticCurveTo((a[0] + b[0]) / 2, a[1] - 0.012, ...b);
            g.stroke();
          }
        } else {
          for (let j = 0; j < 15; j++) {
            const u = x + 0.05 + noise(p, j) * 0.9,
              v = y + 0.05 + noise(p + 123, j) * 0.9,
              a = P.point(u, v),
              h = 0.025 + noise(p + 42, j) * 0.06;
            g.strokeStyle = j % 3 === 0 ? "#e4d9a238" : "#1d412b30";
            g.lineWidth = 0.005;
            g.beginPath();
            g.moveTo(...a);
            g.quadraticCurveTo(
              a[0] - 0.015,
              a[1] - h * 0.7,
              a[0] + 0.012,
              a[1] - h,
            );
            g.stroke();
          }
        }
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
        index = 4;
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
    return { surface, objects };
  }
  root.EcoScenery = { build, palette };
})(globalThis);
