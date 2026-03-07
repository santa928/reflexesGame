import test from "node:test";
import assert from "node:assert/strict";

import { buildCloudButtonSpec } from "../src/buttonStyle.js";

test("start button uses cloud puffs and animal accent", () => {
  const spec = buildCloudButtonSpec({ kind: "start", soundEnabled: false });

  assert.equal(spec.label.icon, "🐾");
  assert.equal(spec.shape.topPuffs.length, 3);
  assert.equal(spec.shape.bottomPuffs.length, 3);
  assert.equal(spec.layers.shadow.offsetY, 8);
  assert.equal(spec.interaction.pressOffsetY, 6);
});

test("sound button switches icon and label with audio state", () => {
  const offSpec = buildCloudButtonSpec({ kind: "sound", soundEnabled: false });
  const onSpec = buildCloudButtonSpec({ kind: "sound", soundEnabled: true });

  assert.equal(offSpec.label.icon, "🔇");
  assert.equal(offSpec.label.text, "おと OFF");
  assert.equal(onSpec.label.icon, "🎵");
  assert.equal(onSpec.label.text, "おと ON");
  assert.notEqual(offSpec.colors.frontFill, onSpec.colors.frontFill);
});

test("hover and focus styles stay soft and readable", () => {
  const spec = buildCloudButtonSpec({ kind: "start", soundEnabled: false });

  assert.equal(spec.interaction.hoverScale, 1.03);
  assert.equal(spec.interaction.focusOutlineColor, 0xffd76a);
  assert.equal(spec.label.textColor, "#5C4033");
});
