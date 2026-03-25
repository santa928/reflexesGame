import test from "node:test";
import assert from "node:assert/strict";

import { buildArcadeButtonSpec } from "../src/buttonStyle.js";

test("start button uses arcade capsule geometry and cyan accent", () => {
  const spec = buildArcadeButtonSpec({ kind: "start", soundEnabled: false });

  assert.equal(spec.label.text, "スタート");
  assert.equal(spec.shape.body.radius, 30);
  assert.equal(spec.shape.innerBody.height, 54);
  assert.equal(spec.shape.accentBar.x, -40);
  assert.equal(spec.shape.accentBar.y, 12);
  assert.equal(spec.shape.accentBar.width, 80);
  assert.equal(spec.shape.accentBar.height, 6);
  assert.equal(spec.colors.accentColor, "#67E8F9");
});

test("sound button switches accent and label with audio state", () => {
  const offSpec = buildArcadeButtonSpec({ kind: "sound", soundEnabled: false });
  const onSpec = buildArcadeButtonSpec({ kind: "sound", soundEnabled: true });

  assert.equal(offSpec.label.text, "おと: なし");
  assert.equal(onSpec.label.text, "おと: あり");
  assert.equal(offSpec.colors.accentColor, "#FB7185");
  assert.equal(onSpec.colors.accentColor, "#34D399");
  assert.notEqual(offSpec.colors.coreFill, onSpec.colors.coreFill);
});

test("hover and press motion stays fast and arcade-like", () => {
  const spec = buildArcadeButtonSpec({ kind: "start", soundEnabled: false });

  assert.equal(spec.interaction.hoverScale, 1.04);
  assert.equal(spec.interaction.pressScale, 0.96);
  assert.equal(spec.interaction.pressOffsetY, 4);
  assert.equal(spec.label.fontFamily, "'Hiragino Maru Gothic ProN', 'Hiragino Sans', sans-serif");
  assert.equal(spec.label.fontSize, 24);
  assert.equal(spec.label.letterSpacing, 4);
  assert.equal(spec.label.offsetY, -4);
  assert.equal(spec.interaction.glowAlpha, 0.6);
});

test("pause button uses a compact square body with a larger hit area", () => {
  const spec = buildArcadeButtonSpec({ kind: "pause", soundEnabled: false });

  assert.equal(spec.label.text, "II");
  assert.equal(spec.size.width, 96);
  assert.equal(spec.size.height, 96);
  assert.equal(spec.hitArea.width >= 60, true);
  assert.equal(spec.hitArea.height >= 60, true);
  assert.equal(spec.shape.body.width, 68);
  assert.equal(spec.shape.body.height, 68);
  assert.equal(spec.shape.body.radius, 24);
  assert.equal(spec.colors.accentColor, "#67E8F9");
});
