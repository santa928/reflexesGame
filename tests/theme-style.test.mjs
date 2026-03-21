import test from "node:test";
import assert from "node:assert/strict";

import {
  NEON_THEME,
  computeBottomControlLayout,
  formatBreachLevel,
  formatUptime,
  getOverlayCopy,
  getTimeStyle,
} from "../src/themeStyle.js";

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
    headline: "SYSTEM STANDBY...",
    subline: "Await [ INITIATE ]",
  });
  assert.deepEqual(getOverlayCopy("finished"), {
    headline: "CONNECTION TERMINATED.",
    subline: "FINAL BREACH LEVEL",
  });
});

test("hud formatting uses breach level and uptime strings", () => {
  assert.equal(formatBreachLevel(0), "BREACH LEVEL 00");
  assert.equal(formatBreachLevel(7), "BREACH LEVEL 07");
  assert.equal(formatUptime(30000), "UPTIME 30.0s");
  assert.equal(formatUptime(4500), "UPTIME 4.5s");
});

test("bottom controls keep healthy margins on mobile portrait", () => {
  const layout = computeBottomControlLayout({
    width: 390,
    height: 844,
    columnWidth: 358,
    boardTop: 270,
    boardSize: 358,
    buttonBaseWidth: 280,
    buttonBaseHeight: 88,
  });

  assert.equal(layout.leftX < layout.rightX, true);
  assert.equal(layout.buttonWidth >= 170, true);
  assert.equal(layout.boardGap >= 40, true);
  assert.equal(layout.boardGap <= 60, true);
  assert.equal(layout.bottomMargin >= 46, true);
});

test("bottom controls avoid drifting too low on tablet portrait", () => {
  const layout = computeBottomControlLayout({
    width: 768,
    height: 1024,
    columnWidth: 600,
    boardTop: 276,
    boardSize: 512,
    buttonBaseWidth: 280,
    buttonBaseHeight: 88,
  });

  assert.equal(layout.buttonWidth <= 220, true);
  assert.equal(layout.boardGap >= 60, true);
  assert.equal(layout.boardGap <= 92, true);
  assert.equal(layout.bottomMargin >= 64, true);
  assert.equal(layout.buttonsY < 910, true);
});
