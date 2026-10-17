"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  P = require("../src/ecology/projection.js");
function world() {
  return {
    config: { width: 20, height: 14 },
    tiles: Array.from({ length: 280 }, (_, p) => ({
      terrain:
        p % 5 === 0
          ? "rock"
          : p % 7 === 0
            ? "deep"
            : p % 11 === 0
              ? "mud"
              : "plain",
    })),
  };
}
test("display relief selects every actual cell centre without changing world state", () => {
  const w = world(),
    before = JSON.stringify(w),
    p = P.build(w);
  for (let i = 0; i < w.tiles.length; i++)
    assert.equal(
      p.pick(...p.point((i % 20) + 0.5, Math.floor(i / 20) + 0.5)),
      i,
      "cell " + i,
    );
  assert.equal(JSON.stringify(w), before);
  assert.equal(p.pick(-100, -100), null);
});
test("shared terrain vertices agree, water stays level, and camera bounds cover cells", () => {
  const w = world(),
    p = P.build(w);
  for (let i = 0; i < w.tiles.length; i++) {
    const f = p.face(i);
    if (i % 20 < 19) {
      const b = p.face(i + 1);
      assert.deepEqual(f[1], b[0]);
      assert.deepEqual(f[2], b[3]);
    }
    if (p.water(w.tiles[i]))
      assert.equal(p.height((i % 20) + 0.5, Math.floor(i / 20) + 0.5), 0);
    for (const [x, y] of f) {
      assert(
        x >= p.bounds.minX &&
          x <= p.bounds.maxX &&
          y >= p.bounds.minY &&
          y <= p.bounds.maxY,
      );
    }
  }
});
test("base-plane camera projection and inverse are consistent at fractional coordinates", () => {
  const p = P.build(world());
  for (const v of [
    [0, 0],
    [4.27, 8.95],
    [20, 14],
  ]) {
    const a = p.inverse(...p.raw(...v));
    assert(Math.abs(a[0] - v[0]) < 1e-10 && Math.abs(a[1] - v[1]) < 1e-10);
  }
});
