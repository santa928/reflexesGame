import test from "node:test";
import assert from "node:assert/strict";

import {
  GAME_MODES,
  NEON_THEME,
  computeBottomControlLayout,
  computeHudLayout,
  computePauseMenuLayout,
  computeTopRightControlLayout,
  formatBreachLevel,
  formatUptime,
  getGameModeCopy,
  getOverlayCopy,
  getPauseMenuCopy,
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
    headline: "じゅんびちゅう...",
    subline: "スタートを おしてね",
    cta: "スタート",
  });
  assert.deepEqual(getOverlayCopy("home"), {
    headline: "ぴかぴかタッチ",
    subline: "ひかったら タッチ!",
    cta: "あそぶ！",
  });
  assert.deepEqual(getOverlayCopy("finished"), {
    headline: "おしまい!",
    subline: "きみの てんすう",
    cta: "もういちど",
  });
});

test("game mode copy exposes normal and serious labels", () => {
  assert.equal(GAME_MODES.normal, "normal");
  assert.equal(GAME_MODES.serious, "serious");
  assert.deepEqual(getGameModeCopy("normal"), {
    key: "normal",
    label: "ふつう",
    title: "ふつうモード",
    description: "ミスでも げんてん なし",
  });
  assert.deepEqual(getGameModeCopy("serious"), {
    key: "serious",
    label: "しんけん",
    title: "しんけんモード",
    description: "ミスや みのがしで げんてん",
  });
});

test("pause menu copy exposes continue, sound toggle, and home labels", () => {
  assert.deepEqual(getPauseMenuCopy(false), {
    title: "メニュー",
    continueLabel: "つづける",
    soundLabel: "おと: なし",
    homeLabel: "おうちへ",
  });
  assert.equal(getPauseMenuCopy(true).soundLabel, "おと: あり");
});

test("hud formatting uses breach level and uptime strings", () => {
  assert.equal(formatBreachLevel(0), "てんすう 00");
  assert.equal(formatBreachLevel(7), "てんすう 07");
  assert.equal(formatUptime(30000), "じかん 30.0びょう");
  assert.equal(formatUptime(4500), "じかん 4.5びょう");
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

test("top-right pause control keeps a safe tap zone on mobile portrait", () => {
  const layout = computeTopRightControlLayout({
    width: 390,
    height: 844,
    buttonBaseWidth: 96,
    buttonBaseHeight: 96,
  });

  assert.equal(layout.x > 320, true);
  assert.equal(layout.y < 80, true);
  assert.equal(layout.buttonScale > 0.5, true);
  assert.equal(layout.hitAreaWidth >= 60, true);
  assert.equal(layout.hitAreaHeight >= 60, true);
});

test("hud layout keeps the level badge inside the panel on mobile portrait", () => {
  const layout = computeHudLayout({
    width: 390,
    topY: 24,
    scoreHeight: 52,
    timeHeight: 30,
    badgeHeight: 44,
  });

  assert.equal(layout.cardHeight >= layout.requiredHeight, true);
  assert.equal(layout.badgeBottom <= layout.cardBottom - layout.bottomPadding, true);
  assert.equal(layout.cardHeight > 170, true);
});

test("pause menu layout keeps all three buttons inside the card on mobile portrait", () => {
  const layout = computePauseMenuLayout({
    width: 390,
    height: 844,
    columnWidth: 358,
    boardTop: 270,
    boardSize: 358,
    buttonBaseWidth: 280,
    buttonBaseHeight: 88,
  });

  assert.equal(layout.cardHeight >= layout.requiredHeight, true);
  assert.equal(layout.homeButtonBottom <= layout.cardBottom - layout.bottomPadding, true);
  assert.equal(layout.buttonScale <= 1, true);
  assert.equal(layout.cardTop >= layout.safeTop, true);
});

test("pause menu layout stays fully inside the viewport on tablet portrait", () => {
  const layout = computePauseMenuLayout({
    width: 768,
    height: 1024,
    columnWidth: 600,
    boardTop: 276,
    boardSize: 512,
    buttonBaseWidth: 280,
    buttonBaseHeight: 88,
  });

  assert.equal(layout.cardTop >= layout.safeTop, true);
  assert.equal(layout.cardBottom <= 1024 - layout.safeBottom, true);
  assert.equal(layout.homeButtonBottom <= layout.cardBottom - layout.bottomPadding, true);
});
