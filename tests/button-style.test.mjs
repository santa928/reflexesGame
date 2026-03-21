import test from "node:test";
import assert from "node:assert/strict";

import { buildArcadeButtonSpec } from "../src/buttonStyle.js";

test("start button uses arcade capsule geometry and cyan accent", () => {
  const spec = buildArcadeButtonSpec({ kind: "start", soundEnabled: false });

  assert.equal(spec.label.text, "[ INITIATE ]");
  assert.equal(spec.shape.body.radius, 30);
  assert.equal(spec.shape.innerBody.height, 54);
  assert.equal(spec.shape.accentBar.width, 56);
  assert.equal(spec.colors.accentColor, "#67E8F9");
});

test("sound button switches accent and label with audio state", () => {
  const offSpec = buildArcadeButtonSpec({ kind: "sound", soundEnabled: false });
  const onSpec = buildArcadeButtonSpec({ kind: "sound", soundEnabled: true });

  assert.equal(offSpec.label.text, "[ AUDIO OFF ]");
  assert.equal(onSpec.label.text, "[ AUDIO ON ]");
  assert.equal(offSpec.colors.accentColor, "#FB7185");
  assert.equal(onSpec.colors.accentColor, "#34D399");
  assert.notEqual(offSpec.colors.coreFill, onSpec.colors.coreFill);
});

test("hover and press motion stays fast and arcade-like", () => {
  const spec = buildArcadeButtonSpec({ kind: "start", soundEnabled: false });

  assert.equal(spec.interaction.hoverScale, 1.04);
  assert.equal(spec.interaction.pressScale, 0.96);
  assert.equal(spec.interaction.pressOffsetY, 4);
  assert.equal(spec.label.fontFamily, "'Courier New', 'Arial Black', sans-serif");
});
