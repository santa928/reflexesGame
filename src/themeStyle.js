export const NEON_THEME = Object.freeze({
  palette: Object.freeze({
    background: "#0F172A",
    backgroundMid: "#172554",
    panel: "#111C37",
    panelSoft: "#16213F",
    hud: "#67E8F9",
    text: "#E2F3FF",
    success: "#34D399",
    warning: "#FB7185",
    level: "#FACC15",
    gridLine: "#1E293B",
    gridGlow: "#22D3EE",
    cellFill: "#0B1226",
    cellHot: "#10203D",
  }),
  layout: Object.freeze({
    maxBoardWidth: 600,
    boardCornerRadius: 34,
    cellGap: 12,
    dangerThresholdSec: 5,
  }),
});

export const GAME_MODES = Object.freeze({
  normal: "normal",
  serious: "serious",
});

const OVERLAY_COPY = Object.freeze({
  idle: Object.freeze({
    headline: "じゅんびちゅう...",
    subline: "スタートを おしてね",
    cta: "スタート",
  }),
  home: Object.freeze({
    headline: "ぴかぴかタッチ",
    subline: "ひかったら タッチ!",
    cta: "あそぶ！",
  }),
  countdown: Object.freeze({
    headline: "じゅんびしてね",
    subline: "",
    cta: "",
  }),
  playing: Object.freeze({
    headline: "",
    subline: "",
    cta: "",
  }),
  finished: Object.freeze({
    headline: "おしまい!",
    subline: "きみの てんすう",
    cta: "もういちど",
  }),
});

const MENU_COPY = Object.freeze({
  title: "メニュー",
  continueLabel: "つづける",
  homeLabel: "おうちへ",
});

const GAME_MODE_COPY = Object.freeze({
  [GAME_MODES.normal]: Object.freeze({
    key: GAME_MODES.normal,
    label: "ふつう",
    title: "ふつうモード",
    description: "ミスでも げんてん なし",
  }),
  [GAME_MODES.serious]: Object.freeze({
    key: GAME_MODES.serious,
    label: "しんけん",
    title: "しんけんモード",
    description: "ミスや みのがしで げんてん",
  }),
});

export function getTimeStyle(remainingSec) {
  const isUrgent = remainingSec <= NEON_THEME.layout.dangerThresholdSec;
  return {
    color: isUrgent ? NEON_THEME.palette.warning : NEON_THEME.palette.hud,
    isUrgent,
  };
}

export function getOverlayCopy(mode) {
  return OVERLAY_COPY[mode] ?? OVERLAY_COPY.idle;
}

export function getStartCountdownCopy(remainingMs) {
  const secondsLeft = Math.max(1, Math.ceil(Math.max(0, remainingMs) / 1000));
  return {
    headline: OVERLAY_COPY.countdown.headline,
    subline: String(secondsLeft),
  };
}

export function formatStartCountdownStatus(remainingMs) {
  const secondsLeft = Math.max(1, Math.ceil(Math.max(0, remainingMs) / 1000));
  return `${secondsLeft}びょうごに スタート!`;
}

export function getPauseMenuCopy(soundEnabled) {
  return {
    ...MENU_COPY,
    soundLabel: soundEnabled ? "おと: あり" : "おと: なし",
  };
}

export function getGameModeCopy(mode) {
  return GAME_MODE_COPY[mode] ?? GAME_MODE_COPY[GAME_MODES.normal];
}

export function formatBreachLevel(score) {
  return `てんすう ${String(score).padStart(2, "0")}`;
}

export function formatUptime(remainingMs) {
  return `じかん ${(Math.max(0, remainingMs) / 1000).toFixed(1)}びょう`;
}

/**
 * Compute the HUD panel height from the live text and badge metrics so the badge
 * never crosses the panel border on narrow portrait screens.
 */
export function computeHudLayout({
  width,
  topY,
  scoreHeight,
  timeHeight,
  badgeHeight,
}) {
  const isMobilePortrait = width < 480;
  const topPadding = isMobilePortrait ? 26 : 30;
  const bottomPadding = isMobilePortrait ? 24 : 28;
  const scoreGap = isMobilePortrait ? 8 : 10;
  const badgeGap = isMobilePortrait ? 14 : 16;
  const requiredHeight = topPadding + scoreHeight + scoreGap + timeHeight + badgeGap + badgeHeight + bottomPadding;
  const cardHeight = Math.max(170, Math.ceil(requiredHeight));
  const scoreY = topY + topPadding + scoreHeight * 0.5;
  const timeY = scoreY + scoreHeight * 0.5 + scoreGap + timeHeight * 0.5;
  const badgeY = timeY + timeHeight * 0.5 + badgeGap + badgeHeight * 0.5;

  return {
    topPadding,
    bottomPadding,
    scoreGap,
    badgeGap,
    requiredHeight,
    cardHeight,
    cardTop: topY,
    cardBottom: topY + cardHeight,
    scoreY,
    timeY,
    badgeY,
    badgeBottom: badgeY + badgeHeight * 0.5,
  };
}

/**
 * Keep short status copy inside the narrow strip between HUD and board. When
 * the strip gets too tight, recommend shrinking the text before it touches the
 * board.
 */
export function computeStatusTextLayout({
  width,
  hudBottom,
  boardTop,
  textHeight,
}) {
  const isMobilePortrait = width < 480;
  const topGap = isMobilePortrait ? 10 : 8;
  const bottomGap = isMobilePortrait ? 10 : 8;
  const availableHeight = Math.max(0, boardTop - hudBottom);
  const maxTextHeight = Math.max(0, availableHeight - topGap - bottomGap);
  const textScale = textHeight > 0 && maxTextHeight > 0
    ? Math.min(1, maxTextHeight / textHeight)
    : 1;
  const effectiveTextHeight = textHeight * textScale;
  const preferredY = hudBottom + topGap;
  const maxY = boardTop - bottomGap - effectiveTextHeight;
  const y = Math.max(hudBottom, Math.min(preferredY, maxY));

  return {
    topGap,
    bottomGap,
    availableHeight,
    maxTextHeight,
    textScale,
    effectiveTextHeight,
    y,
    bottom: y + effectiveTextHeight,
  };
}

/**
 * Compute a compact toast-style level-up banner that lives below the HUD and
 * stays above the board even on tight portrait screens.
 */
export function computeLevelBannerLayout({
  width,
  hudBottom,
  boardTop,
  textHeight,
}) {
  const isMobilePortrait = width < 480;
  const topGap = isMobilePortrait ? 8 : 10;
  const bottomGap = isMobilePortrait ? 8 : 10;
  const verticalPadding = isMobilePortrait ? 6 : 8;
  const availableHeight = Math.max(0, boardTop - hudBottom - topGap - bottomGap);
  const maxTextHeight = Math.max(0, availableHeight - verticalPadding * 2);
  const textScale = textHeight > 0 && maxTextHeight > 0
    ? Math.min(1, maxTextHeight / textHeight)
    : 1;
  const effectiveTextHeight = textHeight * textScale;
  const desiredHeight = effectiveTextHeight + verticalPadding * 2;
  const slackHeight = Math.max(16, availableHeight);
  const maxHudOverlap = isMobilePortrait ? 12 : 18;
  const targetHeight = Math.max(isMobilePortrait ? 28 : 24, desiredHeight);
  const height = Math.min(targetHeight, slackHeight + maxHudOverlap);
  const overlapIntoHud = Math.max(0, height - slackHeight);
  const widthPadding = isMobilePortrait ? 32 : 120;
  const widthCap = isMobilePortrait ? 280 : 320;
  const bannerWidth = Math.min(width - widthPadding, widthCap);
  const y = hudBottom + topGap + height * 0.5 - overlapIntoHud;

  return {
    topGap,
    bottomGap,
    verticalPadding,
    availableHeight,
    maxTextHeight,
    textScale,
    effectiveTextHeight,
    height,
    overlapIntoHud,
    width: Math.max(180, Math.floor(bannerWidth)),
    y,
    bottom: y + height * 0.5,
  };
}

/**
 * Compute a pause menu card that fits its title and three buttons inside the
 * visible viewport, instead of relying on fixed card heights and guessed gaps.
 */
export function computePauseMenuLayout({
  width,
  height,
  columnWidth,
  boardTop,
  boardSize,
  buttonBaseWidth,
  buttonBaseHeight,
  titleHeight = width < 480 ? 34 : 38,
}) {
  const isMobilePortrait = width < 480;
  const cardWidth = Math.min(columnWidth * 0.98, 420);
  const safeTop = isMobilePortrait ? 28 : 36;
  const safeBottom = isMobilePortrait ? 28 : 40;
  const sidePadding = isMobilePortrait ? 26 : 32;
  const topPadding = isMobilePortrait ? 34 : 38;
  const bottomPadding = isMobilePortrait ? 28 : 34;
  const titleGap = isMobilePortrait ? 24 : 28;
  const buttonGap = isMobilePortrait ? 18 : 22;
  const rawScale = Math.min(Math.max(columnWidth / 400, 0.72), 1);
  const maxScaleByWidth = (cardWidth - sidePadding * 2) / buttonBaseWidth;
  const availableCardHeight = height - safeTop - safeBottom;
  const chromeHeight = topPadding + titleHeight + titleGap + bottomPadding + buttonGap * 2;
  const maxScaleByHeight = (availableCardHeight - chromeHeight) / (buttonBaseHeight * 3);
  const unclampedScale = Math.min(rawScale, maxScaleByWidth, 1);
  const buttonScale = Math.max(0.56, Math.min(unclampedScale, maxScaleByHeight));
  const buttonHeight = buttonBaseHeight * buttonScale;
  const requiredHeight = Math.ceil(
    topPadding
      + titleHeight
      + titleGap
      + buttonHeight * 3
      + buttonGap * 2
      + bottomPadding,
  );
  const cardHeight = Math.max(280, requiredHeight);
  const preferredCenterY = Math.max(boardTop + boardSize * 0.5, Math.round(height * 0.47));
  const minCenterY = safeTop + cardHeight * 0.5;
  const maxCenterY = height - safeBottom - cardHeight * 0.5;
  const centerY = Math.min(Math.max(preferredCenterY, minCenterY), maxCenterY);
  const cardTop = centerY - cardHeight * 0.5;
  const cardBottom = centerY + cardHeight * 0.5;
  const titleOffsetY = -cardHeight * 0.5 + topPadding + titleHeight * 0.5;
  const continueOffsetY = titleOffsetY + titleHeight * 0.5 + titleGap + buttonHeight * 0.5;
  const soundOffsetY = continueOffsetY + buttonHeight + buttonGap;
  const homeOffsetY = soundOffsetY + buttonHeight + buttonGap;

  return {
    safeTop,
    safeBottom,
    cardWidth,
    cardHeight,
    requiredHeight,
    centerY,
    cardTop,
    cardBottom,
    topPadding,
    bottomPadding,
    titleGap,
    buttonGap,
    buttonScale,
    buttonHeight,
    titleOffsetY,
    continueOffsetY,
    soundOffsetY,
    homeOffsetY,
    homeButtonBottom: centerY + homeOffsetY + buttonHeight * 0.5,
  };
}

export function computeBottomControlLayout({
  width,
  height,
  columnWidth,
  boardTop,
  boardSize,
  buttonBaseWidth,
  buttonBaseHeight,
}) {
  const isMobilePortrait = width < 480;
  const desiredButtonWidth = Math.min(
    columnWidth * (isMobilePortrait ? 0.45 : 0.38),
    220,
  );
  const desiredButtonHeight = Math.min(Math.max(height * 0.08, 68), 84);
  const minScale = isMobilePortrait ? 0.62 : 0.74;
  const buttonScale = Math.min(
    Math.max(
      Math.min(desiredButtonWidth / buttonBaseWidth, desiredButtonHeight / buttonBaseHeight),
      minScale,
    ),
    1,
  );
  const buttonWidth = buttonBaseWidth * buttonScale;
  const buttonHeight = buttonBaseHeight * buttonScale;
  const buttonGap = Math.min(
    Math.max(columnWidth * (isMobilePortrait ? 0.04 : 0.05), 16),
    32,
  );
  const rowWidth = buttonWidth * 2 + buttonGap;
  const leftX = width * 0.5 - rowWidth * 0.5 + buttonWidth * 0.5;
  const rightX = width * 0.5 + rowWidth * 0.5 - buttonWidth * 0.5;

  const boardBottom = boardTop + boardSize;
  const availableBottomSpace = height - boardBottom;
  const boardGap = Math.min(
    Math.max(availableBottomSpace * 0.28, isMobilePortrait ? 40 : 60),
    isMobilePortrait ? 60 : 92,
  );
  const safeBottom = isMobilePortrait ? 46 : 64;
  const preferredY = boardBottom + boardGap + buttonHeight * 0.5;
  const buttonsY = Math.min(preferredY, height - safeBottom - buttonHeight * 0.5);
  const bottomMargin = height - (buttonsY + buttonHeight * 0.5);

  return {
    buttonScale,
    buttonWidth,
    buttonHeight,
    buttonGap,
    boardGap,
    safeBottom,
    buttonsY,
    bottomMargin,
    leftX,
    rightX,
  };
}

export function computeTopRightControlLayout({
  width,
  buttonBaseWidth,
  buttonBaseHeight,
}) {
  const isMobilePortrait = width < 480;
  const desiredSize = isMobilePortrait ? 52 : 60;
  const safeTop = isMobilePortrait ? 20 : 24;
  const safeRight = isMobilePortrait ? 16 : 24;
  const buttonScale = Math.min(Math.max(desiredSize / buttonBaseWidth, 0.5), 0.9);
  const buttonWidth = buttonBaseWidth * buttonScale;
  const buttonHeight = buttonBaseHeight * buttonScale;
  const hitAreaWidth = Math.max(60, buttonWidth);
  const hitAreaHeight = Math.max(60, buttonHeight);

  return {
    buttonScale,
    buttonWidth,
    buttonHeight,
    hitAreaWidth,
    hitAreaHeight,
    x: width - safeRight - buttonWidth * 0.5,
    y: safeTop + buttonHeight * 0.5,
  };
}
