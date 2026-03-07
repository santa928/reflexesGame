const BASE_SIZE = Object.freeze({
  width: 280,
  height: 94,
});

const BASE_SHAPE = Object.freeze({
  baseRect: Object.freeze({
    x: -112,
    y: -20,
    width: 224,
    height: 54,
    radius: 26,
  }),
  topPuffs: Object.freeze([
    Object.freeze({ x: -72, y: -6, radius: 24 }),
    Object.freeze({ x: 0, y: -18, radius: 34 }),
    Object.freeze({ x: 72, y: -6, radius: 24 }),
  ]),
  bottomPuffs: Object.freeze([
    Object.freeze({ x: -54, y: 28, radius: 18 }),
    Object.freeze({ x: 0, y: 34, radius: 16 }),
    Object.freeze({ x: 54, y: 28, radius: 18 }),
  ]),
  sheen: Object.freeze([
    Object.freeze({ x: -56, y: -18, width: 34, height: 16, alpha: 0.3 }),
    Object.freeze({ x: 8, y: -28, width: 56, height: 20, alpha: 0.22 }),
  ]),
});

const KIND_CONFIG = Object.freeze({
  start: Object.freeze({
    defaultLabel: "スタート",
    icon: "🐾",
    frontFill: "#FFFFFF",
    shadowFill: "#B3D4E0",
    outlineColor: "#8CB9CC",
    focusOutlineColor: 0xffd76a,
  }),
  soundOff: Object.freeze({
    defaultLabel: "おと OFF",
    icon: "🔇",
    frontFill: "#F7FBFF",
    shadowFill: "#B8CAE4",
    outlineColor: "#93B0D8",
    focusOutlineColor: 0xffd76a,
  }),
  soundOn: Object.freeze({
    defaultLabel: "おと ON",
    icon: "🎵",
    frontFill: "#F6FFFC",
    shadowFill: "#9DD9CE",
    outlineColor: "#69B9AB",
    focusOutlineColor: 0xffd76a,
  }),
});

export function hexToNumber(hex) {
  return Number.parseInt(hex.replace("#", ""), 16);
}

export function buildCloudButtonSpec({ kind, labelText, soundEnabled = false }) {
  const resolvedKind = kind === "sound" ? (soundEnabled ? "soundOn" : "soundOff") : "start";
  const config = KIND_CONFIG[resolvedKind];

  return {
    kind,
    size: BASE_SIZE,
    shape: BASE_SHAPE,
    colors: {
      frontFill: config.frontFill,
      shadowFill: config.shadowFill,
      outlineColor: config.outlineColor,
      sheenFill: "#FFFFFF",
    },
    layers: {
      shadow: { offsetY: 8 },
      front: { offsetY: 0 },
    },
    label: {
      icon: config.icon,
      text: labelText ?? config.defaultLabel,
      textColor: "#5C4033",
      textStrokeColor: "#FFFFFF",
      textStrokeThickness: 6,
      fontFamily: "'Arial Rounded MT Bold', 'Hiragino Maru Gothic ProN', 'Hiragino Sans', sans-serif",
      fontSize: 30,
      iconFontFamily:
        "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, 'Hiragino Sans', sans-serif",
      iconFontSize: 34,
    },
    interaction: {
      hoverScale: 1.03,
      pressScale: 0.95,
      pressOffsetY: 6,
      hoverLiftY: -2,
      focusOutlineColor: config.focusOutlineColor,
    },
  };
}
