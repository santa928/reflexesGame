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

const OVERLAY_COPY = Object.freeze({
  idle: Object.freeze({
    headline: "SYSTEM STANDBY...",
    subline: "Await [ INITIATE ]",
  }),
  playing: Object.freeze({
    headline: "",
    subline: "",
  }),
  finished: Object.freeze({
    headline: "CONNECTION TERMINATED.",
    subline: "FINAL BREACH LEVEL",
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

export function formatBreachLevel(score) {
  return `BREACH LEVEL ${String(score).padStart(2, "0")}`;
}

export function formatUptime(remainingMs) {
  return `UPTIME ${(Math.max(0, remainingMs) / 1000).toFixed(1)}s`;
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
