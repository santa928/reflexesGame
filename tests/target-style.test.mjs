import test from "node:test";
import assert from "node:assert/strict";

import { NODE_VARIANTS, buildNodeTargetSpec } from "../src/targetStyle.js";

test("cyber node variants expose stable ids and neon palette", () => {
  assert.equal(NODE_VARIANTS.length, 5);
  assert.deepEqual(
    NODE_VARIANTS.map((variant) => variant.id),
    ["alpha", "beta", "gamma", "delta", "omega"],
  );
});

test("node target spec uses diamond geometry and additive glow", () => {
  const spec = buildNodeTargetSpec({ variantId: "alpha", tier: 1 });

  assert.equal(spec.geometry.outerDiamond.sizeRatio, 0.62);
  assert.equal(spec.geometry.coreDiamond.sizeRatio, 0.3);
  assert.equal(spec.geometry.crosshair.lengthRatio, 0.18);
  assert.equal(spec.motion.spinMs, 2200);
  assert.equal(spec.render.blendMode, "ADD");
});

test("higher tiers tighten timing and increase intensity", () => {
  const early = buildNodeTargetSpec({ variantId: "gamma", tier: 1 });
  const late = buildNodeTargetSpec({ variantId: "gamma", tier: 4 });

  assert.equal(late.motion.spinMs < early.motion.spinMs, true);
  assert.equal(late.motion.pulseScaleMax > early.motion.pulseScaleMax, true);
  assert.equal(late.palette.flashColor, "#F8FAFC");
});
