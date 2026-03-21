import test from "node:test";
import assert from "node:assert/strict";

import { NEON_THEME, getOverlayCopy, getTimeStyle } from "../src/themeStyle.js";

test("neon theme keeps the dark arcade palette", () => {
  assert.equal(NEON_THEME.palette.background, "#0F172A");
  assert.equal(NEON_THEME.palette.hud, "#67E8F9");
  assert.equal(NEON_THEME.palette.success, "#34D399");
});

test("countdown switches to urgent color only in the final five seconds", () => {
  assert.equal(getTimeStyle(6).color, "#67E8F9");
  assert.equal(getTimeStyle(5).color, "#FB7185");
  assert.equal(getTimeStyle(1).isUrgent, true);
});

test("overlay copy exposes start and finish headlines", () => {
  assert.deepEqual(getOverlayCopy("idle"), {
    headline: "READY?",
    subline: "タップでスタート",
  });
  assert.deepEqual(getOverlayCopy("finished"), {
    headline: "TIME UP",
    subline: "リトライで再挑戦",
  });
});
