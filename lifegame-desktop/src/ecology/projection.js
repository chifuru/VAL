/* Display-only relief and oblique camera. Never stored in a biological world. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EcoProjection = api;
})(globalThis, function () {
  "use strict";
  const angle = 0.2,
    ca = Math.cos(angle),
    sa = Math.sin(angle),
    tilt = 0.72,
    lift = 0.95;
  const water = (t) => t.terrain === "deep" || t.terrain === "shallow";
  const noise = (x, y) =>
    Math.sin(x * 1.731 + y * 0.671) * Math.cos(y * 1.219 - x * 0.413);
  function build(w) {
    const W = w.config.width,
      H = w.config.height,
      heights = new Float32Array(W * H),
      vertices = new Float32Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = w.tiles[y * W + x];
        heights[y * W + x] = water(t)
          ? 0
          : t.terrain === "rock"
            ? 0.48 + 0.06 * noise(x * 0.37, y * 0.41)
            : t.terrain === "mud"
              ? 0.07
              : 0.17 + 0.065 * noise(x * 0.12, y * 0.12) + 0.02 * noise(x * 0.45, y * 0.45);
      }
    for (let y = 0; y <= H; y++)
      for (let x = 0; x <= W; x++) {
        let count = 0,
          sum = 0,
          wet = false;
        for (const [dx, dy] of [
          [-1, -1],
          [0, -1],
          [-1, 0],
          [0, 0],
        ]) {
          const u = x + dx,
            v = y + dy;
          if (u < 0 || v < 0 || u >= W || v >= H) continue;
          const p = v * W + u;
          wet = wet || water(w.tiles[p]);
          count++;
          sum += heights[p];
        }
        vertices[y * (W + 1) + x] = wet ? 0 : sum / Math.max(1, count);
      }
    const raw = (x, y, h = 0) => [
      x * ca - y * sa,
      (x * sa + y * ca) * tilt - h * lift,
    ];
    function corners(p) {
      const x = p % W,
        y = Math.floor(p / W);
      return [
        vertices[y * (W + 1) + x],
        vertices[y * (W + 1) + x + 1],
        vertices[(y + 1) * (W + 1) + x + 1],
        vertices[(y + 1) * (W + 1) + x],
      ];
    }
    function height(x, y) {
      const u = Math.max(0, Math.min(W - 1, Math.floor(x))),
        v = Math.max(0, Math.min(H - 1, Math.floor(y))),
        p = v * W + u;
      if (water(w.tiles[p])) return 0;
      const a = x - u,
        b = y - v,
        [h0, h1, h2, h3] = corners(p),
        c = heights[p];
      if (b <= a && b <= 1 - a)
        return (1 - a - b) * h0 + (a - b) * h1 + 2 * b * c;
      if (a >= b && a >= 1 - b)
        return (a - b) * h1 + (a + b - 1) * h2 + 2 * (1 - a) * c;
      if (b >= a && b >= 1 - a)
        return (a + b - 1) * h2 + (b - a) * h3 + 2 * (1 - b) * c;
      return (b - a) * h3 + (1 - a - b) * h0 + 2 * a * c;
    }
    const point = (x, y) => raw(x, y, height(x, y));
    function face(p) {
      const x = p % W,
        y = Math.floor(p / W),
        h = water(w.tiles[p]) ? [0, 0, 0, 0] : corners(p);
      return [
        raw(x, y, h[0]),
        raw(x + 1, y, h[1]),
        raw(x + 1, y + 1, h[2]),
        raw(x, y + 1, h[3]),
        raw(x + 0.5, y + 0.5, heights[p]),
      ];
    }
    function inverse(a, b) {
      const y = b / tilt;
      return [a * ca + y * sa, -a * sa + y * ca];
    }
    const depth = (x, y) => x * sa + y * ca;
    function contains(q, a, b) {
      let inside = false;
      for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
        const [x, y] = q[i],
          [u, v] = q[j];
        if (y > b !== v > b && a < ((u - x) * (b - y)) / (v - y) + x)
          inside = !inside;
      }
      return inside;
    }
    function pick(a, b) {
      const [ix, iy] = inverse(a, b),
        candidates = [];
      for (let y = Math.floor(iy) - 2; y <= Math.floor(iy) + 3; y++)
        for (let x = Math.floor(ix) - 2; x <= Math.floor(ix) + 3; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const p = y * W + x,
            f = face(p);
          if (
            [0, 1, 2, 3].some((i) =>
              contains([f[i], f[(i + 1) % 4], f[4]], a, b),
            )
          )
            candidates.push(p);
        }
      candidates.sort(
        (a, b) =>
          depth(b % W, Math.floor(b / W)) - depth(a % W, Math.floor(a / W)),
      );
      return candidates[0] ?? null;
    }
    const outline = [raw(0, 0), raw(W, 0), raw(W, H), raw(0, H)],
      bounds = {
        minX: Math.min(...outline.map((p) => p[0])) - 0.6,
        maxX: Math.max(...outline.map((p) => p[0])) + 0.6,
        minY: -1.7,
        maxY: Math.max(...outline.map((p) => p[1])) + 0.5,
      };
    return {
      W,
      H,
      heights,
      vertices,
      raw,
      point,
      height,
      face,
      inverse,
      pick,
      depth,
      bounds,
      water,
    };
  }
  return { build, angle, tilt, lift };
});
