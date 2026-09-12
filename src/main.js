import { buildArcadeButtonSpec, hexToNumber } from "./buttonStyle.js";
import {
  GAME_MODES,
  NEON_THEME,
  computeFinishOverlayLayout,
  computeHomeScreenLayout,
  computeHudLayout,
  computeLevelBannerLayout,
  computePauseMenuLayout,
  computeStatusTextLayout,
  computeTopRightControlLayout,
  formatBreachLevel,
  formatStartCountdownStatus,
  formatUptime,
  getContinuingHitStatusCopy,
  getGameModeCopy,
  getOverlayCopy,
  getPauseMenuCopy,
  getStartCountdownCopy,
  getTimeStyle,
} from "./themeStyle.js";
import {
  computeMissingSpawnReservations,
  getConcurrentTargetLimit,
  pickSpawnCellIndex,
} from "./spawnLogic.js";
import { NODE_VARIANTS, buildNodeTargetSpec } from "./targetStyle.js";
import { RoundClock } from "./roundClock.js";

const GAME_CONFIG = Object.freeze({
  gridSize: 3,
  gameDurationMs: 30000,
  startCountdownMs: 3000,
  countdownTickMs: 100,
  roundMsInitial: 1800,
  roundMsStep: 40,
  statusMessages: {
    ready: "ひかったら タッチ!",
    hit: ["ピカッ!", "やった!", "いいぞ!"],
    miss: ["おしい!", "あれれ?"],
    finish: "おしまい!",
  },
  tierConfigs: [
    {
      tier: 1,
      minScore: 0,
      targetCount: 1,
      roundMsMultiplier: 1,
      spawnDelayMs: 220,
      targetScale: 1,
      minRoundMs: 900,
      assistMsOnMiss: 80,
      badgeColor: 0x67e8f9,
      haloColor: 0x22d3ee,
    },
    {
      tier: 2,
      minScore: 10,
      targetCount: 1,
      roundMsMultiplier: 0.9,
      spawnDelayMs: 190,
      targetScale: 0.97,
      minRoundMs: 820,
      assistMsOnMiss: 70,
      badgeColor: 0x34d399,
      haloColor: 0x6ee7b7,
    },
    {
      tier: 3,
      minScore: 20,
      targetCount: 2,
      roundMsMultiplier: 0.84,
      spawnDelayMs: 220,
      targetScale: 0.93,
      minRoundMs: 760,
      assistMsOnMiss: 60,
      badgeColor: 0xfacc15,
      haloColor: 0xfde047,
    },
    {
      tier: 4,
      minScore: 30,
      targetCount: 3,
      roundMsMultiplier: 0.76,
      spawnDelayMs: 160,
      targetScale: 0.86,
      minRoundMs: 680,
      assistMsOnMiss: 50,
      badgeColor: 0xfb7185,
      haloColor: 0xfda4af,
    },
  ],
});

const AUDIO_CONFIG = Object.freeze({
  enabledByDefault: false,
  cues: {
    toggle: [{ frequencyHz: 660, durationMs: 70, volume: 0.028, wave: "triangle" }],
    hit: [
      { frequencyHz: 820, durationMs: 80, volume: 0.04, wave: "triangle" },
      { frequencyHz: 980, durationMs: 70, volume: 0.028, wave: "triangle", startOffsetMs: 40 },
    ],
    miss: [{ frequencyHz: 250, durationMs: 110, volume: 0.028, wave: "sine" }],
    levelUp: [
      { frequencyHz: 520, durationMs: 90, volume: 0.03, wave: "triangle" },
      { frequencyHz: 760, durationMs: 90, volume: 0.036, wave: "triangle", startOffsetMs: 60 },
      { frequencyHz: 1020, durationMs: 120, volume: 0.04, wave: "triangle", startOffsetMs: 120 },
    ],
    finish: [
      { frequencyHz: 620, durationMs: 100, volume: 0.03, wave: "sine" },
      { frequencyHz: 480, durationMs: 140, volume: 0.026, wave: "sine", startOffsetMs: 80 },
    ],
  },
});

const UI_FONT_STACK = "'Hiragino Maru Gothic ProN', 'Hiragino Sans', sans-serif";

function setGlow(target, color, blur = 10, distance = 0, alpha = 0.85) {
  target.setShadow(distance, 0, color, blur, false, true);
  target.setAlpha(alpha);
  return target;
}

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.scene.start("GameScene");
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.roundClock = new RoundClock();
    this.activeTones = new Set();
    this.roundEffects = new Set();
    this.keyboardCellIndex = 0;
    this.cellCenters = [];
    this.cellZones = [];
    this.spawnTimers = [];
    this.spawnReservationCount = 0;
    this.gameTimer = null;
    this.countdownTickTimer = null;
    this.startCountdownTimer = null;
    this.isRunning = false;
    this.score = 0;
    this.tier = 1;
    this.remainingTimeMs = GAME_CONFIG.gameDurationMs;
    this.countdownEndAt = 0;
    this.startCountdownEndAt = 0;
    this.roundMsCurrent = GAME_CONFIG.roundMsInitial;
    this.audioEnabled = AUDIO_CONFIG.enabledByDefault;
    this.currentTierConfig = GAME_CONFIG.tierConfigs[0];
    this.activeTargets = [];
    this.lastSpawnCellIndices = [];
    this.nodeVariantPool = NODE_VARIANTS.map((variant) => variant.id);
    this.lastUrgentSecond = null;
    this.screenMode = "home";
    this.selectedMode = "normal";
    this.isMenuOpen = false;
    this.wasRunningBeforeMenu = false;
    this.decorations = {
      ambientOrbs: [],
      stars: [],
    };
    this.domUi = {
      root: null,
      nodes: {},
    };
    this.isLevelBannerActive = false;
    this.statusColor = "#bae6fd";
  }

  /** Create one scene, its accessible controls and paired lifecycle listeners. */
  create() {
    this.setupState();
    this.createBackdrop();
    this.createUi();
    this.createDomUi();
    this.createGrid();
    this.layout(this.scale.width, this.scale.height);
    this.goHome();
    this.scale.on("resize", this.onResize, this);
    this.onDocumentHidden = () => {
      if (document.hidden) {
        this.stopTones();
        this.openPauseMenu();
      }
    };
    this.onPageHide = () => { this.stopTones(); this.openPauseMenu(); };
    document.addEventListener("visibilitychange", this.onDocumentHidden);
    window.addEventListener("pagehide", this.onPageHide);
    this.events.once("shutdown", this.shutdown, this);
  }

  /** Enforce deadlines each frame even when a Phaser timer notification is late. */
  update() {
    if (this.isMenuOpen) return;
    if (this.screenMode === "countdown" && this.roundClock.now() >= this.startCountdownEndAt) {
      this.beginGameplayRound();
    }
    if (!this.isRunning) return;
    if (this.roundClock.now() >= this.countdownEndAt) {
      this.finishGame();
      return;
    }
    [...this.activeTargets].forEach((target) => {
      if (this.roundClock.now() >= target.expiresAt) this.handleTargetExpired(target);
    });
  }

  setupState() {
    const preservedAudioEnabled = this.audioEnabled;
    const preservedMode = this.selectedMode ?? GAME_MODES.normal;
    this.score = 0;
    this.tier = 1;
    this.currentTierConfig = this.getTierConfig(1);
    this.remainingTimeMs = GAME_CONFIG.gameDurationMs;
    this.countdownEndAt = 0;
    this.startCountdownEndAt = 0;
    this.roundMsCurrent = this.getBaseRoundMs(this.currentTierConfig);
    this.isRunning = false;
    this.spawnTimers = [];
    this.spawnReservationCount = 0;
    this.audioEnabled = preservedAudioEnabled;
    this.activeTargets = [];
    this.lastSpawnCellIndices = [];
    this.nodeVariantPool = NODE_VARIANTS.map((variant) => variant.id);
    this.lastUrgentSecond = null;
    this.screenMode = "home";
    this.selectedMode = preservedMode;
    this.isMenuOpen = false;
    this.wasRunningBeforeMenu = false;
    this.isLevelBannerActive = false;
    this.statusColor = "#bae6fd";
  }

  createBackdrop() {
    this.backgroundGraphics = this.add.graphics();
    this.hudGraphics = this.add.graphics();
    this.boardGraphics = this.add.graphics();
    this.flashOverlay = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setOrigin(0).setDepth(60);
    this.dangerOverlay = this.add.rectangle(0, 0, 10, 10, hexToNumber(NEON_THEME.palette.warning), 0)
      .setOrigin(0)
      .setDepth(12);

    for (let i = 0; i < 4; i += 1) {
      const color = i % 2 === 0 ? 0x22d3ee : 0xfb7185;
      const orb = this.add.circle(0, 0, 40, color, 0.12).setBlendMode(Phaser.BlendModes.SCREEN);
      this.decorations.ambientOrbs.push(orb);
      this.tweens.add({
        targets: orb,
        y: "-=24",
        x: i % 2 === 0 ? "+=12" : "-=12",
        duration: 2400 + i * 180,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    for (let i = 0; i < 18; i += 1) {
      const star = this.add.circle(0, 0, 2 + (i % 3), 0xe2f3ff, 0.68).setDepth(1);
      this.decorations.stars.push(star);
      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 0.9 },
        duration: 900 + i * 70,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  createUi() {
    this.scoreText = setGlow(this.add.text(0, 0, "てんすう 00", {
      fontFamily: UI_FONT_STACK,
      fontSize: "54px",
      color: NEON_THEME.palette.text,
      fontStyle: "700",
    }).setOrigin(0.5, 0), "#22d3ee");

    this.timeText = setGlow(this.add.text(0, 0, "じかん 30.0びょう", {
      fontFamily: UI_FONT_STACK,
      fontSize: "32px",
      color: NEON_THEME.palette.hud,
      fontStyle: "700",
    }).setOrigin(0.5, 0), "#22d3ee", 8);

    this.levelBadgeBackground = this.add.rectangle(0, 0, 180, 48, this.currentTierConfig.badgeColor, 0.18)
      .setStrokeStyle(2, this.currentTierConfig.badgeColor, 0.9);
    this.levelBadgeText = this.add.text(0, 0, "レベル 1", {
      fontFamily: UI_FONT_STACK,
      fontSize: "24px",
      color: "#f8fafc",
      fontStyle: "700",
    }).setOrigin(0.5);
    this.levelBadge = this.add.container(0, 0, [this.levelBadgeBackground, this.levelBadgeText]).setDepth(18);

    this.statusText = this.add.text(0, 0, "ひかったら タッチ!", {
      fontFamily: UI_FONT_STACK,
      fontSize: "28px",
      color: "#b8e9ff",
      fontStyle: "700",
    }).setOrigin(0.5, 0).setDepth(18);
    this.statusText.setShadow(0, 0, "#22d3ee", 8, false, true);

    this.levelBannerBackground = this.add.rectangle(0, 0, 280, 44, 0x081121, 0.92)
      .setStrokeStyle(3, hexToNumber(NEON_THEME.palette.level), 0.95);
    this.levelBannerText = this.add.text(0, 0, "レベルアップ!", {
      fontFamily: UI_FONT_STACK,
      fontSize: "26px",
      color: "#fef08a",
      fontStyle: "700",
    }).setOrigin(0.5);
    this.levelBannerText.setShadow(0, 0, "#facc15", 14, false, true);
    this.levelBanner = this.add.container(0, 0, [this.levelBannerBackground, this.levelBannerText])
      .setVisible(false)
      .setAlpha(0)
      .setScale(0.7)
      .setDepth(50);
    this.levelBannerTween = null;

    this.homeCardBackground = this.add.rectangle(0, 0, 340, 190, 0x081121, 0.78)
      .setStrokeStyle(3, hexToNumber(NEON_THEME.palette.gridGlow), 0.9);
    this.homeHeadline = this.add.text(0, -34, "ぴかぴかタッチ", {
      fontFamily: UI_FONT_STACK,
      fontSize: "34px",
      color: "#f8fafc",
      fontStyle: "700",
    }).setOrigin(0.5);
    this.homeHeadline.setShadow(0, 0, "#22d3ee", 16, false, true);
    this.homeSubline = this.add.text(0, 34, "ひかったら タッチ!", {
      fontFamily: UI_FONT_STACK,
      fontSize: "18px",
      color: "#bae6fd",
      fontStyle: "700",
      align: "center",
    }).setOrigin(0.5);
    this.homeModeTitle = this.add.text(0, 78, "モード", {
      fontFamily: UI_FONT_STACK,
      fontSize: "18px",
      color: "#e2f3ff",
      fontStyle: "700",
      align: "center",
    }).setOrigin(0.5);
    this.homeModeHint = this.add.text(0, 112, "ミスでも げんてん なし", {
      fontFamily: UI_FONT_STACK,
      fontSize: "16px",
      color: "#bae6fd",
      fontStyle: "700",
      align: "center",
    }).setOrigin(0.5);
    this.homeModeHint.setShadow(0, 0, "#22d3ee", 8, false, true);
    this.homeContainer = this.add.container(0, 0, [
      this.homeCardBackground,
      this.homeHeadline,
      this.homeSubline,
      this.homeModeTitle,
      this.homeModeHint,
    ]).setDepth(45);
    this.homePulseTween = this.tweens.add({
      targets: this.homeContainer,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.overlayCardBackground = this.add.rectangle(0, 0, 320, 170, 0x081121, 0.76)
      .setStrokeStyle(3, hexToNumber(NEON_THEME.palette.gridGlow), 0.9);
    this.overlayHeadline = this.add.text(0, -28, "おしまい!", {
      fontFamily: UI_FONT_STACK,
      fontSize: "34px",
      color: "#f8fafc",
      fontStyle: "700",
    }).setOrigin(0.5);
    this.overlayHeadline.setShadow(0, 0, "#22d3ee", 16, false, true);
    this.overlaySubline = this.add.text(0, 34, "きみの てんすう", {
      fontFamily: UI_FONT_STACK,
      fontSize: "18px",
      color: "#bae6fd",
      fontStyle: "700",
      align: "center",
    }).setOrigin(0.5);
    this.overlayContainer = this.add.container(0, 0, [
      this.overlayCardBackground,
      this.overlayHeadline,
      this.overlaySubline,
    ]).setDepth(45);

    this.homePlayButton = this.createButton({
      kind: "start",
      label: "あそぶ！",
      onPress: () => this.startGame(),
      depth: 46,
    });

    this.homeNormalModeButton = this.createButton({
      kind: "mode",
      label: "ふつう",
      modeTone: GAME_MODES.normal,
      selected: true,
      onPress: () => this.selectGameMode(GAME_MODES.normal),
      depth: 46,
    });

    this.homeSeriousModeButton = this.createButton({
      kind: "mode",
      label: "しんけん",
      modeTone: GAME_MODES.serious,
      selected: false,
      onPress: () => this.selectGameMode(GAME_MODES.serious),
      depth: 46,
    });

    this.homeSoundButton = this.createButton({
      kind: "sound",
      label: this.getSoundLabel(),
      onPress: () => this.toggleSound(),
      depth: 46,
    });

    this.restartButton = this.createButton({
      kind: "start",
      label: "もういちど",
      onPress: () => this.startGame(),
      depth: 46,
    });

    this.finishHomeButton = this.createButton({
      kind: "start",
      label: "おうちへ",
      onPress: () => this.goHome(),
      depth: 46,
    });

    this.pauseButton = this.createButton({
      kind: "pause",
      label: "II",
      onPress: () => this.openPauseMenu(),
      depth: 48,
    });

    this.menuDimmer = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.72)
      .setOrigin(0)
      .setDepth(52)
      .setVisible(false)
      .setInteractive({ useHandCursor: false });

    this.menuCardBackground = this.add.rectangle(0, 0, 340, 280, 0x081121, 0.9)
      .setStrokeStyle(3, hexToNumber(NEON_THEME.palette.gridGlow), 0.94);
    this.menuTitle = this.add.text(0, -92, "メニュー", {
      fontFamily: UI_FONT_STACK,
      fontSize: "28px",
      color: "#f8fafc",
      fontStyle: "700",
    }).setOrigin(0.5);
    this.menuTitle.setShadow(0, 0, "#22d3ee", 12, false, true);
    this.menuCard = this.add.container(0, 0, [this.menuCardBackground, this.menuTitle])
      .setDepth(54)
      .setVisible(false);

    this.menuContinueButton = this.createButton({
      kind: "start",
      label: "つづける",
      onPress: () => this.resumeGame(),
      depth: 55,
    });

    this.menuSoundButton = this.createButton({
      kind: "sound",
      label: this.getSoundLabel(),
      onPress: () => this.toggleSound(),
      depth: 55,
    });

    this.menuHomeButton = this.createButton({
      kind: "start",
      label: "おうちへ",
      onPress: () => this.goHome(),
      depth: 55,
    });
  }

  /**
   * Creates a DOM overlay so browser-native text can stay crisp even though
   * Phaser 3 renders the main scene at a 1x backing buffer on HighDPI screens.
   */
  createDomUi() {
    const root = document.getElementById("game-ui-overlay");
    if (!root) {
      return;
    }

    root.replaceChildren();
    this.domUi.root = root;
    this.domUi.nodes = {};

    [
      ["score", "game-ui-text game-ui-hud-text"],
      ["time", "game-ui-text game-ui-hud-text"],
      ["badge", "game-ui-text game-ui-hud-text"],
      ["status", "game-ui-text game-ui-hud-text"],
      ["homeHeadline", "game-ui-text game-ui-card-copy"],
      ["homeSubline", "game-ui-text game-ui-card-copy"],
      ["homeModeTitle", "game-ui-text game-ui-card-copy"],
      ["homeModeHint", "game-ui-text game-ui-card-copy"],
      ["overlayHeadline", "game-ui-text game-ui-card-copy"],
      ["overlaySubline", "game-ui-text game-ui-card-copy"],
      ["menuTitle", "game-ui-text game-ui-card-copy"],
      ["levelBanner", "game-ui-text game-ui-card-copy"],
      ["buttonHomePlay", "game-ui-text game-ui-button-label"],
      ["buttonHomeNormal", "game-ui-text game-ui-button-label"],
      ["buttonHomeSerious", "game-ui-text game-ui-button-label"],
      ["buttonHomeSound", "game-ui-text game-ui-button-label"],
      ["buttonRestart", "game-ui-text game-ui-button-label"],
      ["buttonFinishHome", "game-ui-text game-ui-button-label"],
      ["buttonPause", "game-ui-text game-ui-button-label"],
      ["buttonMenuContinue", "game-ui-text game-ui-button-label"],
      ["buttonMenuSound", "game-ui-text game-ui-button-label"],
      ["buttonMenuHome", "game-ui-text game-ui-button-label"],
    ].forEach(([key, className]) => {
      const node = document.createElement(key.startsWith("button") ? "button" : "div");
      if (key.startsWith("button")) node.type = "button";
      node.className = `${className} game-ui-hidden`;
      node.dataset.uiKey = key;
      root.append(node);
      this.domUi.nodes[key] = node;
    });

    this.homePlayButton.domLabelKey = "buttonHomePlay";
    this.homeNormalModeButton.domLabelKey = "buttonHomeNormal";
    this.homeSeriousModeButton.domLabelKey = "buttonHomeSerious";
    this.homeSoundButton.domLabelKey = "buttonHomeSound";
    this.restartButton.domLabelKey = "buttonRestart";
    this.finishHomeButton.domLabelKey = "buttonFinishHome";
    this.pauseButton.domLabelKey = "buttonPause";
    this.menuContinueButton.domLabelKey = "buttonMenuContinue";
    this.menuSoundButton.domLabelKey = "buttonMenuSound";
    this.menuHomeButton.domLabelKey = "buttonMenuHome";

    this.uiButtons = [this.homePlayButton, this.homeNormalModeButton, this.homeSeriousModeButton,
      this.homeSoundButton, this.restartButton, this.finishHomeButton, this.pauseButton,
      this.menuContinueButton, this.menuSoundButton, this.menuHomeButton];
    this.uiButtons.forEach(button => {
      const node = this.domUi.nodes[button.domLabelKey];
      node.addEventListener("click", () => {
        if (node.disabled || node.hidden) return;
        this.playButtonPress(button);
        button.onPress();
      });
      // Native controls own input; the canvas now supplies their decoration only.
      button.hitArea.disableInteractive();
    });
    this.domUi.nodes.buttonPause.setAttribute("aria-label", "いちじていし");
    ["homeHeadline", "overlayHeadline"].forEach(key => {
      this.domUi.nodes[key].tabIndex = -1;
      this.domUi.nodes[key].setAttribute("role", "heading");
      this.domUi.nodes[key].setAttribute("aria-level", "1");
    });
    const instructions = document.createElement("p");
    instructions.id = "keyboard-help";
    instructions.className = "game-ui-sr-only";
    instructions.textContent = "ひかった マスを タッチ。キーボードは Tabでマスへ、やじるしでえらび、Enterかスペースでタッチ。Escapeでいちじていし。";
    root.append(instructions);
    for (let i = 0; i < 9; i += 1) {
      const node = document.createElement("button");
      node.type = "button";
      node.className = "game-ui-cell";
      node.dataset.cellIndex = String(i);
      node.setAttribute("aria-describedby", "keyboard-help");
      node.addEventListener("pointerdown", event => {
        if (event.button !== 0 || node.disabled) return;
        event.preventDefault();
        this.onCellPressed(i);
      });
      node.addEventListener("click", event => {
        // Keyboard/assistive clicks have detail 0. Pointerdown already scored taps.
        if (event.detail === 0) this.onCellPressed(i);
      });
      root.append(node);
      this.domUi.nodes[`cell${i}`] = node;
    }
    this.onUiKeydown = event => this.handleUiKeydown(event);
    root.addEventListener("keydown", this.onUiKeydown);

    [
      this.scoreText,
      this.timeText,
      this.levelBadgeText,
      this.statusText,
      this.levelBannerText,
      this.homeHeadline,
      this.homeSubline,
      this.homeModeTitle,
      this.homeModeHint,
      this.overlayHeadline,
      this.overlaySubline,
      this.menuTitle,
      this.homePlayButton.labelNode,
      this.homeNormalModeButton.labelNode,
      this.homeSeriousModeButton.labelNode,
      this.homeSoundButton.labelNode,
      this.restartButton.labelNode,
      this.finishHomeButton.labelNode,
      this.pauseButton.labelNode,
      this.menuContinueButton.labelNode,
      this.menuSoundButton.labelNode,
      this.menuHomeButton.labelNode,
    ].forEach((textNode) => textNode.setAlpha(0));
  }

  setDomText(key, text) {
    const node = this.domUi.nodes[key];
    if (!node) {
      return;
    }
    node.textContent = text ?? "";
  }

  /** Remove hidden controls from painting, hit testing and the focus order. */
  setDomVisible(key, visible) {
    const node = this.domUi.nodes[key];
    if (!node) {
      return;
    }
    node.classList.toggle("game-ui-hidden", !visible);
    node.hidden = !visible;
    if (node.tagName === "BUTTON") node.disabled = !visible;
  }

  /** Keep accessible controls aligned with the current stage and pause overlay. */
  syncDomVisibility() {
    const isHome = this.screenMode === "home";
    const isCountdown = this.screenMode === "countdown";
    const isFinished = this.screenMode === "finished";
    const showGameChrome = !isHome;
    const showMenu = this.isMenuOpen;

    this.setDomVisible("score", showGameChrome && !showMenu);
    this.setDomVisible("time", showGameChrome && !showMenu);
    this.setDomVisible("badge", showGameChrome && !showMenu);
    this.setDomVisible("status", showGameChrome && !showMenu && !this.isLevelBannerActive);
    this.setDomVisible("homeHeadline", isHome);
    this.setDomVisible("homeSubline", isHome);
    this.setDomVisible("homeModeTitle", isHome);
    this.setDomVisible("homeModeHint", isHome);
    this.setDomVisible("overlayHeadline", (isCountdown || isFinished) && !showMenu);
    this.setDomVisible("overlaySubline", (isCountdown || isFinished) && !showMenu);
    this.setDomVisible("menuTitle", showMenu);
    this.setDomVisible("levelBanner", this.isLevelBannerActive && !showMenu);
    this.setDomVisible("buttonHomePlay", isHome);
    this.setDomVisible("buttonHomeNormal", isHome);
    this.setDomVisible("buttonHomeSerious", isHome);
    this.setDomVisible("buttonHomeSound", isHome);
    this.setDomVisible("buttonRestart", isFinished && !showMenu);
    this.setDomVisible("buttonFinishHome", isFinished && !showMenu);
    this.setDomVisible("buttonPause", this.screenMode === "playing" && !showMenu);
    this.setDomVisible("buttonMenuContinue", showMenu);
    this.setDomVisible("buttonMenuSound", showMenu);
    this.setDomVisible("buttonMenuHome", showMenu);
    this.syncCellUi();
  }

  /** Expose a stable 3x3 roving focus grid without chasing the lit target. */
  syncCellUi() {
    const visible = this.screenMode === "playing" && this.isRunning && !this.isMenuOpen;
    this.cellCenters.forEach((cell, i) => {
      const node = this.domUi.nodes[`cell${i}`];
      if (!node) return;
      this.setDomVisible(`cell${i}`, visible);
      node.tabIndex = i === this.keyboardCellIndex ? 0 : -1;
      node.style.left = `${cell.x}px`;
      node.style.top = `${cell.y}px`;
      node.style.width = `${cell.size}px`;
      node.style.height = `${cell.size}px`;
      const lit = this.activeTargets.some(target => target.cellIndex === i);
      node.setAttribute("aria-label", `${Math.floor(i / 3) + 1}だんめ ${i % 3 + 1}こめ${lit ? " ひかっている" : ""}`);
    });
  }

  /** Transfer focus to a visible control after a user-driven stage change. */
  focusUi(key) {
    const node = this.domUi.nodes[key];
    if (node && !node.hidden) node.focus({ preventScroll: true });
  }

  /** Support native activation, bounded grid navigation and pause focus trapping. */
  handleUiKeydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.repeat && ["Enter", " ", "Escape"].includes(event.key)) {
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (this.isMenuOpen) this.resumeGame();
      else this.openPauseMenu();
      return;
    }
    if (this.isMenuOpen && event.key === "Tab") {
      const first = this.domUi.nodes.buttonMenuContinue;
      const last = this.domUi.nodes.buttonMenuHome;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
    if (!event.target.matches(".game-ui-cell")) return;
    const current = Number(event.target.dataset.cellIndex);
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const next = current + offsets[event.key];
    if (next < 0 || next > 8 || (Math.abs(offsets[event.key]) === 1 && Math.floor(next / 3) !== Math.floor(current / 3))) return;
    this.keyboardCellIndex = next;
    this.syncCellUi();
    this.focusUi(`cell${next}`);
  }

  getWorldMetrics(textNode) {
    const matrix = textNode.getWorldTransformMatrix();
    return {
      x: matrix.tx,
      y: matrix.ty,
      scaleX: Math.hypot(matrix.a, matrix.b),
      scaleY: Math.hypot(matrix.c, matrix.d),
    };
  }

  getTextFontSize(textNode) {
    const rawFontSize = textNode.style.fontSize;
    const parsed = Number.parseFloat(String(rawFontSize));
    return Number.isFinite(parsed) ? parsed : 16;
  }

  buildDomTransform(anchor = "center") {
    if (anchor === "top") {
      return "translate(-50%, 0)";
    }
    return "translate(-50%, -50%)";
  }

  syncDomFromPhaser(key, textNode, {
    anchor = "center",
    width = null,
    color = null,
    glowColor = null,
    glowBlur = 10,
  } = {}) {
    const node = this.domUi.nodes[key];
    if (!node || !textNode) {
      return;
    }

    const metrics = this.getWorldMetrics(textNode);
    const fontSize = this.getTextFontSize(textNode) * metrics.scaleY;
    const resolvedColor = color ?? textNode.style.color ?? NEON_THEME.palette.text;
    const resolvedGlowColor = glowColor ?? resolvedColor;

    this.setDomText(key, textNode.text);
    node.style.left = `${metrics.x}px`;
    node.style.top = `${metrics.y}px`;
    node.style.fontSize = `${fontSize}px`;
    node.style.color = resolvedColor;
    node.style.letterSpacing = `${textNode.letterSpacing ?? 0}px`;
    node.style.textShadow = `0 0 ${glowBlur}px ${resolvedGlowColor}`;
    node.style.transform = this.buildDomTransform(anchor);
    if (width) {
      node.style.width = `${width}px`;
    } else {
      node.style.width = "auto";
    }
  }

  /** Match each native button's full hit area to its canvas decoration. */
  syncDomButtonLabel(button) {
    if (!button?.domLabelKey) {
      return;
    }
    const node = this.domUi.nodes[button.domLabelKey];
    if (!node) {
      return;
    }

    const scaleX = button.container.scaleX || 1;
    const scaleY = button.container.scaleY || 1;
    const offsetX = (button.spec.label.offsetX ?? 0) * scaleX;
    const offsetY = ((button.spec.label.offsetY ?? 0) + button.frontLayer.y) * scaleY;

    this.setDomText(button.domLabelKey, button.spec.label.text);
    node.style.left = `${button.container.x + offsetX}px`;
    node.style.top = `${button.container.y + offsetY}px`;
    node.style.fontSize = `${button.spec.label.fontSize * scaleY}px`;
    node.style.color = button.spec.label.textColor;
    node.style.letterSpacing = `${button.spec.label.letterSpacing}px`;
    node.style.textShadow = `0 0 ${button.spec.label.glowBlur ?? 8}px ${button.spec.colors.glowColor}`;
    node.style.transform = this.buildDomTransform("center");
    node.style.width = `${button.spec.hitArea.width * scaleX}px`;
    node.style.height = `${button.spec.hitArea.height * scaleY}px`;
    if (button.kind === "mode") node.setAttribute("aria-pressed", String(button.selected));
    if (button.kind === "sound") node.setAttribute("aria-pressed", String(this.audioEnabled));
  }

  syncAllDomText() {
    this.syncDomFromPhaser("score", this.scoreText, {
      anchor: "top",
      glowColor: "#22d3ee",
      glowBlur: 12,
    });
    this.syncDomFromPhaser("time", this.timeText, {
      anchor: "top",
      color: this.timeColor,
      glowColor: this.timeColor,
      glowBlur: 10,
    });
    this.syncDomFromPhaser("badge", this.levelBadgeText, {
      color: "#f8fafc",
      glowColor: "#22d3ee",
      glowBlur: 8,
    });
    this.syncDomFromPhaser("status", this.statusText, {
      anchor: "top",
      color: this.statusColor,
      glowColor: this.statusColor,
      glowBlur: 10,
    });
    this.syncDomFromPhaser("homeHeadline", this.homeHeadline, {
      glowColor: "#22d3ee",
      glowBlur: 16,
    });
    this.syncDomFromPhaser("homeSubline", this.homeSubline, {
      glowColor: "#22d3ee",
      glowBlur: 8,
    });
    this.syncDomFromPhaser("homeModeTitle", this.homeModeTitle, {
      glowColor: "#22d3ee",
      glowBlur: 8,
    });
    this.syncDomFromPhaser("homeModeHint", this.homeModeHint, {
      glowColor: this.homeModeHint.style.color ?? "#bae6fd",
      glowBlur: 8,
    });
    this.syncDomFromPhaser("overlayHeadline", this.overlayHeadline, {
      glowColor: this.overlayHeadline.style.color ?? "#22d3ee",
      glowBlur: 16,
    });
    this.syncDomFromPhaser("overlaySubline", this.overlaySubline, {
      glowColor: this.overlaySubline.style.color ?? "#22d3ee",
      glowBlur: 12,
    });
    this.syncDomFromPhaser("menuTitle", this.menuTitle, {
      glowColor: "#22d3ee",
      glowBlur: 12,
    });
    this.syncDomFromPhaser("levelBanner", this.levelBannerText, {
      glowColor: "#facc15",
      glowBlur: 14,
    });
    [
      this.homePlayButton,
      this.homeNormalModeButton,
      this.homeSeriousModeButton,
      this.homeSoundButton,
      this.restartButton,
      this.finishHomeButton,
      this.pauseButton,
      this.menuContinueButton,
      this.menuSoundButton,
      this.menuHomeButton,
    ].forEach((button) => this.syncDomButtonLabel(button));
  }

  createGrid() {
    const totalCells = GAME_CONFIG.gridSize * GAME_CONFIG.gridSize;
    for (let i = 0; i < totalCells; i += 1) {
      const zone = this.add.zone(0, 0, 10, 10).setInteractive({ useHandCursor: false });
      zone.on("pointerdown", () => this.onCellPressed(i));
      this.cellZones.push(zone);
      this.cellCenters.push({ x: 0, y: 0, size: 0 });
    }
  }

  createButton({ kind, label, onPress, depth = 20, selected = false, modeTone = GAME_MODES.normal }) {
    const spec = buildArcadeButtonSpec({
      kind,
      labelText: label,
      soundEnabled: this.audioEnabled,
      selected,
      modeTone,
    });
    const glow = this.add.graphics().setAlpha(0.4);
    const shell = this.add.graphics();
    const core = this.add.graphics();
    const accent = this.add.graphics();
    const labelNode = this.add.text(0, 0, spec.label.text, {
      fontFamily: spec.label.fontFamily,
      fontSize: `${spec.label.fontSize}px`,
      color: spec.label.textColor,
      fontStyle: "700",
    }).setOrigin(0.5);
    labelNode
      .setLetterSpacing(spec.label.letterSpacing)
      .setPosition(spec.label.offsetX ?? 0, spec.label.offsetY ?? 0)
      .setShadow(0, 0, spec.colors.glowColor, spec.label.glowBlur ?? 10, false, true);
    const frontLayer = this.add.container(0, 0, [core, accent, labelNode]);
    const hitArea = this.add.rectangle(0, 0, spec.hitArea.width, spec.hitArea.height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    const container = this.add.container(0, 0, [glow, shell, frontLayer, hitArea]).setDepth(depth);
    container.setSize(spec.size.width, spec.size.height);

    const button = {
      onPress,
      kind,
      container,
      glow,
      shell,
      core,
      accent,
      labelNode,
      frontLayer,
      hitArea,
      baseWidth: spec.size.width,
      baseHeight: spec.size.height,
      baseScale: 1,
      pressTween: null,
      homePosition: { x: 0, y: 0 },
      isHovered: false,
      selected,
      modeTone,
      spec,
    };

    this.updateButtonVisual(button, label);

    hitArea.on("pointerover", () => {
      button.isHovered = true;
      this.refreshButtonRestingState(button);
    });
    hitArea.on("pointerout", () => {
      button.isHovered = false;
      this.refreshButtonRestingState(button);
    });
    hitArea.on("pointerdown", () => {
      this.playButtonPress(button);
      onPress();
    });

    return button;
  }

  drawButtonShell(graphics, body, fillColor, lineColor, alpha = 1) {
    graphics.clear();
    graphics.fillStyle(hexToNumber(fillColor), alpha);
    graphics.fillRoundedRect(body.x, body.y, body.width, body.height, body.radius);
    graphics.lineStyle(2, hexToNumber(lineColor), 0.95);
    graphics.strokeRoundedRect(body.x, body.y, body.width, body.height, body.radius);
  }

  updateButtonVisual(button, labelText = button.labelNode.text) {
    const spec = buildArcadeButtonSpec({
      kind: button.kind,
      labelText,
      soundEnabled: this.audioEnabled,
      selected: button.selected,
      modeTone: button.modeTone,
    });
    button.spec = spec;
    const { body, innerBody, accentBar } = spec.shape;
    this.drawButtonShell(button.shell, body, spec.colors.shellFill, spec.colors.outlineColor, 1);
    this.drawButtonShell(button.core, innerBody, spec.colors.coreFill, spec.colors.glowColor, 1);

    button.glow.clear();
    button.glow.lineStyle(5, hexToNumber(spec.colors.glowColor), button.isHovered ? 0.9 : 0.45);
    button.glow.strokeRoundedRect(body.x - 4, body.y - 4, body.width + 8, body.height + 8, body.radius + 6);

    button.accent.clear();
    button.accent.fillStyle(hexToNumber(spec.colors.accentColor), 1);
    button.accent.fillRoundedRect(
      accentBar.x,
      accentBar.y,
      accentBar.width,
      accentBar.height,
      accentBar.radius,
    );
    button.labelNode
      .setText(spec.label.text)
      .setFontFamily(spec.label.fontFamily)
      .setFontSize(spec.label.fontSize)
      .setColor(spec.label.textColor)
      .setLetterSpacing(spec.label.letterSpacing)
      .setPosition(spec.label.offsetX ?? 0, spec.label.offsetY ?? 0)
      .setShadow(0, 0, spec.colors.glowColor, spec.label.glowBlur ?? 10, false, true);
    this.refreshButtonRestingState(button);
    this.syncDomButtonLabel(button);
  }

  /** Canvas controls stay decorative once their native counterpart exists. */
  setButtonVisible(button, visible) {
    button.container.setVisible(visible);
    if (button.hitArea.input) {
      button.hitArea.input.enabled = visible && !button.domLabelKey;
    }
  }

  setButtonPosition(button, x, y) {
    button.homePosition.x = x;
    button.homePosition.y = y;
    this.refreshButtonRestingState(button);
  }

  refreshButtonRestingState(button) {
    const hoverScale = button.isHovered ? button.spec.interaction.hoverScale : 1;
    const hoverLiftY = button.isHovered ? button.spec.interaction.hoverLiftY : 0;
    button.container.setScale(button.baseScale * hoverScale);
    button.container.setPosition(button.homePosition.x, button.homePosition.y + hoverLiftY);
    button.glow.setAlpha(button.isHovered ? button.spec.interaction.glowAlpha : 0.35);
    if (!button.pressTween) {
      button.frontLayer.y = 0;
    }
    this.syncDomButtonLabel(button);
  }

  setButtonBaseScale(button, scale) {
    if (button.pressTween) {
      button.pressTween.stop();
      button.pressTween = null;
    }
    button.baseScale = scale;
    this.refreshButtonRestingState(button);
  }

  playButtonPress(button) {
    if (button.pressTween) {
      button.pressTween.stop();
      button.pressTween = null;
    }

    this.refreshButtonRestingState(button);
    const hoverScale = button.isHovered ? button.spec.interaction.hoverScale : 1;
    const pressedScale = button.baseScale * hoverScale * button.spec.interaction.pressScale;
    button.pressTween = this.tweens.add({
      targets: button.container,
      scaleX: pressedScale,
      scaleY: pressedScale,
      duration: 80,
      ease: "Quad.easeOut",
      yoyo: true,
      onStart: () => {
        button.frontLayer.y = button.spec.interaction.pressOffsetY;
        this.syncDomButtonLabel(button);
      },
      onComplete: () => {
        button.pressTween = null;
        button.frontLayer.y = 0;
        this.refreshButtonRestingState(button);
      },
    });
  }

  updateHomeCopy() {
    const copy = getOverlayCopy("home");
    const modeCopy = getGameModeCopy(this.selectedMode);
    this.homeHeadline.setText(copy.headline);
    this.homeSubline.setText(copy.subline);
    this.homeModeHint
      .setText(modeCopy.description)
      .setColor(this.selectedMode === "serious" ? NEON_THEME.palette.warning : "#bae6fd")
      .setShadow(
        0,
        0,
        this.selectedMode === "serious" ? NEON_THEME.palette.warning : "#22d3ee",
        8,
        false,
        true,
      );
    this.updateButtonVisual(this.homePlayButton, copy.cta);
    this.homeNormalModeButton.selected = this.selectedMode === GAME_MODES.normal;
    this.homeSeriousModeButton.selected = this.selectedMode === "serious";
    this.updateButtonVisual(this.homeNormalModeButton, getGameModeCopy(GAME_MODES.normal).label);
    this.updateButtonVisual(this.homeSeriousModeButton, getGameModeCopy(GAME_MODES.serious).label);
    this.updateButtonVisual(this.homeSoundButton, this.getSoundLabel());
    this.syncDomFromPhaser("homeHeadline", this.homeHeadline, {
      glowColor: "#22d3ee",
      glowBlur: 16,
    });
    this.syncDomFromPhaser("homeSubline", this.homeSubline, {
      glowColor: "#22d3ee",
      glowBlur: 8,
    });
    this.syncDomFromPhaser("homeModeTitle", this.homeModeTitle, {
      glowColor: "#22d3ee",
      glowBlur: 8,
    });
    this.syncDomFromPhaser("homeModeHint", this.homeModeHint, {
      color: this.homeModeHint.style.color ?? "#bae6fd",
      glowColor: this.homeModeHint.style.color ?? "#22d3ee",
      glowBlur: 8,
    });
  }

  refreshOverlayCopy() {
    if (this.screenMode === "countdown") {
      const copy = getStartCountdownCopy(this.startCountdownEndAt - this.roundClock.now());
      const headlineSize = Phaser.Math.Clamp(Math.round(this.scale.width * 0.05), 22, 28);
      const countSize = Phaser.Math.Clamp(Math.round(this.scale.width * 0.18), 68, 100);
      this.overlayHeadline
        .setText(copy.headline)
        .setPosition(0, -42)
        .setFontSize(headlineSize)
        .setColor("#bae6fd")
        .setShadow(0, 0, "#22d3ee", 14, false, true);
      this.overlaySubline
        .setText(copy.subline)
        .setPosition(0, 22)
        .setFontSize(countSize)
        .setColor("#f8fafc")
        .setShadow(0, 0, "#22d3ee", 18, false, true);
      this.syncDomFromPhaser("overlayHeadline", this.overlayHeadline, {
        glowColor: "#22d3ee",
        glowBlur: 14,
      });
      this.syncDomFromPhaser("overlaySubline", this.overlaySubline, {
        glowColor: "#22d3ee",
        glowBlur: 18,
      });
      return;
    }

    const copy = getOverlayCopy("finished");
    const headlineSize = Phaser.Math.Clamp(Math.round(this.scale.width * 0.075), 28, 34);
    const sublineSize = Phaser.Math.Clamp(Math.round(this.scale.width * 0.042), 16, 20);
    this.overlayHeadline
      .setText(copy.headline)
      .setPosition(0, -28)
      .setFontSize(headlineSize)
      .setColor("#f8fafc")
      .setShadow(0, 0, "#22d3ee", 16, false, true);
    this.overlaySubline
      .setText(`${copy.subline}: ${String(this.score).padStart(2, "0")}`)
      .setPosition(0, 34)
      .setFontSize(sublineSize)
      .setColor("#bae6fd")
      .setShadow(0, 0, "#22d3ee", 10, false, true);
    this.updateButtonVisual(this.restartButton, copy.cta);
    this.syncDomFromPhaser("overlayHeadline", this.overlayHeadline, {
      glowColor: "#22d3ee",
      glowBlur: 16,
    });
    this.syncDomFromPhaser("overlaySubline", this.overlaySubline, {
      glowColor: "#22d3ee",
      glowBlur: 10,
    });
  }

  refreshMenuCopy() {
    const copy = getPauseMenuCopy(this.audioEnabled);
    this.menuTitle.setText(copy.title);
    this.updateButtonVisual(this.menuContinueButton, copy.continueLabel);
    this.updateButtonVisual(this.menuSoundButton, copy.soundLabel);
    this.updateButtonVisual(this.menuHomeButton, copy.homeLabel);
    this.updateButtonVisual(this.homeSoundButton, copy.soundLabel);
    this.updateButtonVisual(this.finishHomeButton, copy.homeLabel);
    this.syncAllDomText();
  }

  /** Freeze the shared clock and timer notifications without changing the stage. */
  pauseGameplayRuntime() {
    this.roundClock.pause();
    if (this.isRunning) this.remainingTimeMs = Math.max(0, this.countdownEndAt - this.roundClock.now());
    this.spawnTimers.forEach((timer) => {
      timer.paused = true;
    });
    if (this.gameTimer) {
      this.gameTimer.paused = true;
    }
    if (this.countdownTickTimer) {
      this.countdownTickTimer.paused = true;
    }
    if (this.startCountdownTimer) this.startCountdownTimer.paused = true;
    this.stopTones();
    this.activeTargets.forEach((target) => {
      if (target.expireTimer) {
        target.expireTimer.paused = true;
      }
      [target.popTween, target.spinTween, target.pulseTween, target.scanTween].forEach(tween => {
        if (tween && !tween.isDestroyed() && tween.isPlaying()) tween.pause();
      });
    });
  }

  /** Resume notifications against the unchanged active-time deadlines. */
  resumeGameplayRuntime() {
    this.roundClock.resume();
    this.spawnTimers.forEach((timer) => {
      timer.paused = false;
    });
    if (this.gameTimer) {
      this.gameTimer.paused = false;
    }
    if (this.countdownTickTimer) {
      this.countdownTickTimer.paused = false;
    }
    if (this.startCountdownTimer) this.startCountdownTimer.paused = false;
    this.activeTargets.forEach((target) => {
      if (target.expireTimer) {
        target.expireTimer.paused = false;
      }
      [target.popTween, target.spinTween, target.pulseTween, target.scanTween].forEach(tween => {
        if (tween && !tween.isDestroyed() && tween.isPaused()) tween.resume();
      });
    });
  }

  getSnapshotMode() {
    if (this.isMenuOpen) {
      return "paused";
    }
    return this.screenMode;
  }

  refreshScreenUi() {
    const isHome = this.screenMode === "home";
    const isCountdown = this.screenMode === "countdown";
    const isFinished = this.screenMode === "finished";
    const showGameChrome = !isHome;
    const showMenu = this.isMenuOpen;

    this.hudGraphics.setVisible(showGameChrome);
    this.scoreText.setVisible(showGameChrome);
    this.timeText.setVisible(showGameChrome);
    this.levelBadge.setVisible(showGameChrome);
    this.statusText.setVisible(showGameChrome);
    this.boardGraphics.setVisible(showGameChrome);
    this.dangerOverlay.setVisible(showGameChrome);

    this.homeContainer.setVisible(isHome);
    this.setButtonVisible(this.homePlayButton, isHome);
    this.setButtonVisible(this.homeNormalModeButton, isHome);
    this.setButtonVisible(this.homeSeriousModeButton, isHome);
    this.setButtonVisible(this.homeSoundButton, isHome);

    this.refreshOverlayCopy();
    this.overlayContainer.setVisible((isCountdown || isFinished) && !showMenu);
    this.setButtonVisible(this.restartButton, isFinished && !showMenu);
    this.setButtonVisible(this.finishHomeButton, isFinished && !showMenu);

    this.setButtonVisible(this.pauseButton, this.screenMode === "playing" && !showMenu);

    this.menuDimmer.setVisible(showMenu);
    if (this.menuDimmer.input) {
      this.menuDimmer.input.enabled = showMenu;
    }
    this.menuCard.setVisible(showMenu);
    this.setButtonVisible(this.menuContinueButton, showMenu);
    this.setButtonVisible(this.menuSoundButton, showMenu);
    this.setButtonVisible(this.menuHomeButton, showMenu);

    this.cellZones.forEach((zone) => {
      if (zone.input) {
        zone.input.enabled = showGameChrome && !showMenu && this.isRunning && !this.domUi.root;
      }
    });
    this.syncDomVisibility();
  }

  /** Pause on request or page departure; returning alone never restarts a round. */
  openPauseMenu() {
    if (!["playing", "countdown"].includes(this.screenMode) || this.isMenuOpen) {
      return;
    }
    if (this.isRunning && this.roundClock.now() >= this.countdownEndAt) {
      this.finishGame();
      return;
    }
    this.wasRunningBeforeMenu = true;
    if (this.wasRunningBeforeMenu) {
      this.pauseGameplayRuntime();
    }
    this.isMenuOpen = true;
    this.refreshMenuCopy();
    this.refreshScreenUi();
    this.focusUi("buttonMenuContinue");
  }

  selectGameMode(mode) {
    if (!Object.values(GAME_MODES).includes(mode) || this.selectedMode === mode) {
      return;
    }
    this.selectedMode = mode;
    this.updateHomeCopy();
  }

  /** Explicitly resume the preserved preparation or play stage. */
  resumeGame() {
    if (!this.isMenuOpen || document.hidden) {
      return;
    }
    this.isMenuOpen = false;
    if (this.wasRunningBeforeMenu) {
      this.resumeGameplayRuntime();
    }
    this.wasRunningBeforeMenu = false;
    this.refreshScreenUi();
    this.focusUi(this.screenMode === "playing" ? "buttonPause" : "overlayHeadline");
  }

  /** Clear the prior round before returning to the reusable home controls. */
  goHome() {
    this.clearTimers();
    this.clearActiveTargets(false);
    this.clearRoundFeedback();
    this.stopTones();
    this.setupState();
    this.updateScoreText(false);
    this.updateTimeText();
    this.updateTierUi();
    this.setStatusText(GAME_CONFIG.statusMessages.ready, "#bae6fd");
    this.updateHomeCopy();
    this.refreshMenuCopy();
    this.refreshScreenUi();
    this.syncAllDomText();
    this.focusUi("buttonHomePlay");
  }

  /** Reset timers, effects and the active clock before a new countdown. */
  prepareRoundState() {
    this.clearTimers();
    this.clearActiveTargets(false);
    this.clearRoundFeedback();
    this.roundClock.reset();
    this.isMenuOpen = false;
    this.wasRunningBeforeMenu = false;
    this.isRunning = false;
    this.spawnReservationCount = 0;
    this.score = 0;
    this.tier = 1;
    this.currentTierConfig = this.getTierConfig(1);
    this.roundMsCurrent = this.getBaseRoundMs(this.currentTierConfig);
    this.remainingTimeMs = GAME_CONFIG.gameDurationMs;
    this.countdownEndAt = 0;
    this.startCountdownEndAt = 0;
    this.lastSpawnCellIndices = [];
    this.lastUrgentSecond = null;
    this.nodeVariantPool = NODE_VARIANTS.map((variant) => variant.id);
    this.updateScoreText(false);
    this.updateTimeText();
    this.updateTierUi();
  }

  /** Refresh preparation text from active time, never background wall time. */
  updateCountdownUi() {
    if (this.screenMode !== "countdown" || this.isMenuOpen) {
      return;
    }

    const msLeft = Math.max(0, this.startCountdownEndAt - this.roundClock.now());
    if (msLeft <= 0) {
      this.beginGameplayRound();
      return;
    }

    this.refreshOverlayCopy();
    this.setStatusText(formatStartCountdownStatus(msLeft), "#bae6fd");
  }

  /** Begin play once after the complete active preparation interval. */
  beginGameplayRound() {
    if (this.screenMode !== "countdown" || this.isMenuOpen || document.hidden) return;
    if (this.startCountdownTimer) {
      this.startCountdownTimer.remove(false);
      this.startCountdownTimer = null;
    }
    if (this.screenMode !== "countdown") {
      return;
    }

    this.isRunning = true;
    this.screenMode = "playing";
    this.remainingTimeMs = GAME_CONFIG.gameDurationMs;
    this.countdownEndAt = this.roundClock.now() + GAME_CONFIG.gameDurationMs;
    this.updateTimeText();
    this.setStatusText(`${getGameModeCopy(this.selectedMode).label}で スタート!`, NEON_THEME.palette.hud);
    this.refreshMenuCopy();
    this.refreshScreenUi();

    this.gameTimer = this.time.delayedCall(GAME_CONFIG.gameDurationMs, () => this.updateRemainingTime());
    this.countdownTickTimer = this.time.addEvent({
      delay: GAME_CONFIG.countdownTickMs,
      loop: true,
      callback: () => this.updateRemainingTime(),
    });
    this.ensureTargetCapacity();
    this.focusUi("cell0");
  }

  /** Accept start/retry only on their visible screens, preventing double starts. */
  startGame() {
    if (!["home", "finished"].includes(this.screenMode) || document.hidden) return;
    this.prepareRoundState();
    this.screenMode = "countdown";
    this.startCountdownEndAt = this.roundClock.now() + GAME_CONFIG.startCountdownMs;
    this.updateCountdownUi();
    this.refreshMenuCopy();
    this.refreshScreenUi();
    this.focusUi("overlayHeadline");

    this.startCountdownTimer = this.time.addEvent({
      delay: GAME_CONFIG.countdownTickMs,
      loop: true,
      callback: () => this.updateCountdownUi(),
    });
  }

  getTierConfig(tier) {
    return GAME_CONFIG.tierConfigs[Math.max(0, Math.min(GAME_CONFIG.tierConfigs.length - 1, tier - 1))];
  }

  getBaseRoundMs(tierConfig = this.currentTierConfig) {
    return Math.round(GAME_CONFIG.roundMsInitial * tierConfig.roundMsMultiplier);
  }

  ensureTargetCapacity() {
    if (!this.isRunning) {
      return;
    }

    const missingReservations = computeMissingSpawnReservations({
      tier: this.tier,
      activeCount: this.activeTargets.length,
      reservedCount: this.spawnReservationCount,
    });
    const projectedCountBase = this.activeTargets.length + this.spawnReservationCount;

    for (let offset = 0; offset < missingReservations; offset += 1) {
      const projectedCount = projectedCountBase + offset;
      const delayMs = projectedCount === 0 ? 0 : this.currentTierConfig.spawnDelayMs * projectedCount;
      this.scheduleSpawn(delayMs);
    }
  }

  /** TimerEvents notify; the active clock decides when a reservation is due. */
  scheduleSpawn(delayMs) {
    const dueAt = this.roundClock.now() + delayMs;
    this.spawnReservationCount += 1;
    const spawnTimer = this.time.delayedCall(delayMs, () => {
      this.spawnTimers = this.spawnTimers.filter((timer) => timer !== spawnTimer);
      this.spawnReservationCount = Math.max(0, this.spawnReservationCount - 1);

      if (!this.isRunning || this.isMenuOpen || this.roundClock.now() >= this.countdownEndAt) {
        return;
      }
      if (this.roundClock.now() < dueAt) {
        this.scheduleSpawn(dueAt - this.roundClock.now());
        return;
      }

      if (this.activeTargets.length >= getConcurrentTargetLimit(this.tier)) {
        return;
      }

      this.spawnSingleTarget();
      this.ensureTargetCapacity();
    });
    this.spawnTimers.push(spawnTimer);
  }

  spawnSingleTarget() {
    const cellIndex = pickSpawnCellIndex({
      totalCells: GAME_CONFIG.gridSize * GAME_CONFIG.gridSize,
      activeCellIndices: this.activeTargets.map((target) => target.cellIndex),
      recentCellIndices: this.lastSpawnCellIndices,
      random: () => Phaser.Math.FloatBetween(0, 0.999999),
    });

    if (cellIndex === null) {
      return null;
    }

    this.lastSpawnCellIndices = [...this.lastSpawnCellIndices.slice(-3), cellIndex];
    return this.createNodeTarget(cellIndex, {
      tier: this.tier,
      tierConfig: this.currentTierConfig,
      lifespanMs: this.roundMsCurrent,
    });
  }

  /** Create one target with a half-open active-time lifetime. */
  createNodeTarget(cellIndex, { tier = this.tier, tierConfig = this.currentTierConfig, lifespanMs = this.roundMsCurrent } = {}) {
    const center = this.cellCenters[cellIndex];
    const variantId = Phaser.Utils.Array.GetRandom(this.nodeVariantPool);
    const targetSpec = buildNodeTargetSpec({ variantId, tier });
    const container = this.add.container(center.x, center.y).setDepth(26);
    const glow = this.add.rectangle(0, 0, 10, 10, hexToNumber(targetSpec.palette.glowColor), targetSpec.geometry.glowDiamond.alpha)
      .setAngle(45)
      .setBlendMode(Phaser.BlendModes.ADD);
    const outer = this.add.rectangle(0, 0, 10, 10, 0x000000, 0)
      .setAngle(45)
      .setStrokeStyle(targetSpec.geometry.outerDiamond.strokeThickness, hexToNumber(targetSpec.palette.outerColor), 0.95)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.rectangle(0, 0, 10, 10, hexToNumber(targetSpec.palette.coreColor), targetSpec.geometry.coreDiamond.alpha)
      .setAngle(45)
      .setBlendMode(Phaser.BlendModes.ADD);
    const crosshairH = this.add.rectangle(0, 0, 10, 10, hexToNumber(targetSpec.palette.outerColor), targetSpec.geometry.crosshair.alpha)
      .setBlendMode(Phaser.BlendModes.ADD);
    const crosshairV = this.add.rectangle(0, 0, 10, 10, hexToNumber(targetSpec.palette.outerColor), targetSpec.geometry.crosshair.alpha)
      .setBlendMode(Phaser.BlendModes.ADD);
    container.add([glow, outer, core, crosshairH, crosshairV]);
    this.applyTargetVisualScale(
      {
        container,
        glow,
        outer,
        core,
        crosshairH,
        crosshairV,
        spec: targetSpec,
      },
      center,
      tierConfig.targetScale,
    );
    container.setScale(0.1).setAlpha(0);

    const popTween = this.tweens.add({
      targets: container,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.1, to: 1.08 },
      duration: 150,
      ease: "Back.easeOut",
      onComplete: () => {
        container.setScale(1);
      },
    });
    const spinTween = this.tweens.add({
      targets: [outer, glow],
      angle: "+=360",
      duration: targetSpec.motion.spinMs,
      repeat: -1,
      ease: "Linear",
    });
    const pulseTween = this.tweens.add({
      targets: [core, glow],
      scale: { from: 1, to: targetSpec.motion.pulseScaleMax },
      duration: targetSpec.motion.pulseMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    const scanTween = this.tweens.add({
      targets: [crosshairH, crosshairV],
      alpha: { from: 0.35, to: 1 },
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const target = {
      cellIndex,
      variantId,
      container,
      glow,
      outer,
      core,
      crosshairH,
      crosshairV,
      spec: targetSpec,
      popTween,
      spinTween,
      pulseTween,
      scanTween,
      scaleFactor: tierConfig.targetScale,
      expireTimer: null,
      spawnedAt: this.roundClock.now(),
      expiresAt: this.roundClock.now() + lifespanMs,
    };
    target.expireTimer = this.time.delayedCall(lifespanMs, () => this.handleTargetExpired(target));
    this.activeTargets.push(target);
    this.syncCellUi();
    return target;
  }

  applyTargetVisualScale(target, center, scaleFactor) {
    const size = center.size * scaleFactor;
    const glowSize = size * target.spec.geometry.glowDiamond.sizeRatio;
    const outerSize = size * target.spec.geometry.outerDiamond.sizeRatio;
    const coreSize = size * target.spec.geometry.coreDiamond.sizeRatio;
    const crossLength = size * target.spec.geometry.crosshair.lengthRatio;
    const crossThickness = Math.max(3, size * target.spec.geometry.crosshair.thicknessRatio);

    target.container.setPosition(center.x, center.y);
    target.glow.setSize(glowSize, glowSize);
    target.outer.setSize(outerSize, outerSize);
    target.core.setSize(coreSize, coreSize);
    target.crosshairH.setSize(crossLength, crossThickness);
    target.crosshairV.setSize(crossThickness, crossLength);
  }

  /** Award exactly one hit while both round and target are still alive. */
  handleHit(cellIndex) {
    if (!this.canAcceptBoardInput()) {
      return;
    }

    const hitTarget = this.activeTargets.find((target) => target.cellIndex === cellIndex);
    if (!hitTarget) {
      return;
    }
    if (this.roundClock.now() >= hitTarget.expiresAt) {
      this.handleTargetExpired(hitTarget);
      return;
    }

    const { increasedTier } = this.adjustScore(1, true);
    this.updateDifficulty(true);
    this.playCue(increasedTier ? "levelUp" : "hit");
    this.showSuccessBurst(this.cellCenters[cellIndex], this.currentTierConfig.badgeColor);
    this.removeTarget(hitTarget, true, true);
    this.ensureTargetCapacity();

    if (increasedTier) {
      this.playLevelUpFeedback();
    }

    const continuingHitCopy = getContinuingHitStatusCopy(this.activeTargets.length);
    this.setStatusText(
      increasedTier
        ? "レベルアップ!"
        : continuingHitCopy
          ? continuingHitCopy
          : Phaser.Utils.Array.GetRandom(GAME_CONFIG.statusMessages.hit),
      increasedTier
        ? "#fde047"
        : continuingHitCopy
          ? "#a5f3fc"
          : NEON_THEME.palette.success,
    );
  }

  /** Expire a live target once; round completion takes precedence over a miss. */
  handleTargetExpired(target) {
    if (!this.canAcceptBoardInput() || !this.activeTargets.includes(target)) {
      return;
    }
    const remaining = target.expiresAt - this.roundClock.now();
    if (remaining > 0) {
      target.expireTimer?.remove(false);
      target.expireTimer = this.time.delayedCall(remaining, () => this.handleTargetExpired(target));
      return;
    }

    this.updateDifficulty(false);
    this.playCue("miss");
    this.cameras.main.shake(90, 0.006);
    this.flashScreen(NEON_THEME.palette.warning, 0.14, 120);
    const didPenalty = this.selectedMode === "serious";
    if (didPenalty) {
      this.adjustScore(-1, true);
    }
    this.setStatusText(
      didPenalty ? "みのがし! -1" : Phaser.Utils.Array.GetRandom(GAME_CONFIG.statusMessages.miss),
      NEON_THEME.palette.warning,
    );
    this.showTapFeedback(this.cellCenters[target.cellIndex], hexToNumber(NEON_THEME.palette.warning));
    this.removeTarget(target, true, false);
    this.ensureTargetCapacity();
  }

  /** Share the exact same deadline gate between pointer and keyboard input. */
  canAcceptBoardInput() {
    if (!this.isRunning || this.isMenuOpen || document.hidden) return false;
    if (this.roundClock.now() >= this.countdownEndAt) {
      this.finishGame();
      return false;
    }
    return true;
  }

  /** Handle a visible cell without allowing stale input to affect another round. */
  onCellPressed(cellIndex) {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= this.cellCenters.length || !this.canAcceptBoardInput()) {
      return;
    }

    if (this.activeTargets.some((target) => target.cellIndex === cellIndex)) {
      this.handleHit(cellIndex);
      return;
    }

    if (this.selectedMode === "serious") {
      this.adjustScore(-1, true);
    }
    this.cameras.main.shake(60, 0.004);
    this.showTapFeedback(this.cellCenters[cellIndex], hexToNumber(NEON_THEME.palette.warning));
    this.setStatusText(
      this.selectedMode === "serious" ? "ざんねん! -1" : "ざんねん!",
      NEON_THEME.palette.warning,
    );
  }

  adjustScore(delta, animate = false) {
    const previousTier = this.tier;
    this.score = Math.max(0, this.score + delta);
    this.updateTierFromScore();
    this.updateScoreText(animate);
    return {
      increasedTier: this.tier > previousTier,
      decreasedTier: this.tier < previousTier,
    };
  }

  updateTierFromScore() {
    const nextTier = Math.min(4, Math.floor(this.score / 10) + 1);
    if (nextTier === this.tier) {
      return false;
    }

    this.tier = nextTier;
    this.currentTierConfig = this.getTierConfig(nextTier);
    const nextBaseRoundMs = this.getBaseRoundMs(this.currentTierConfig);
    this.roundMsCurrent = Phaser.Math.Clamp(
      Math.min(this.roundMsCurrent, nextBaseRoundMs),
      this.currentTierConfig.minRoundMs,
      nextBaseRoundMs,
    );
    this.updateTierUi();
    return true;
  }

  updateDifficulty(didHit) {
    const baseRoundMs = this.getBaseRoundMs();
    if (didHit) {
      this.roundMsCurrent = Math.max(
        this.currentTierConfig.minRoundMs,
        this.roundMsCurrent - GAME_CONFIG.roundMsStep,
      );
      return;
    }

    this.roundMsCurrent = Math.min(
      baseRoundMs,
      this.roundMsCurrent + this.currentTierConfig.assistMsOnMiss,
    );
  }

  updateScoreText(animate = false) {
    this.scoreText.setText(formatBreachLevel(this.score));
    this.syncDomFromPhaser("score", this.scoreText, {
      anchor: "top",
      glowColor: "#22d3ee",
      glowBlur: 12,
    });
    if (!animate) {
      return;
    }
    this.tweens.add({
      targets: this.scoreText,
      scaleX: 1.16,
      scaleY: 1.16,
      duration: 80,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  updateTierUi() {
    this.levelBadgeText.setText(`レベル ${this.tier}`);
    this.levelBadgeBackground.fillColor = this.currentTierConfig.badgeColor;
    this.levelBadgeBackground.setStrokeStyle(2, this.currentTierConfig.badgeColor, 0.95);
    this.syncDomFromPhaser("badge", this.levelBadgeText, {
      color: "#f8fafc",
      glowColor: "#22d3ee",
      glowBlur: 8,
    });
  }

  /** Derive the HUD from the same deadline used for scoring. */
  updateRemainingTime() {
    if (!this.isRunning || this.isMenuOpen) {
      return;
    }

    const msLeft = Math.max(0, this.countdownEndAt - this.roundClock.now());
    this.remainingTimeMs = msLeft;
    this.updateTimeText();
    if (msLeft <= 0) {
      this.finishGame();
    }
  }

  updateTimeText() {
    const secondsLeft = Math.ceil(Math.max(0, this.remainingTimeMs) / 1000);
    const timeStyle = getTimeStyle(secondsLeft);
    this.timeColor = timeStyle.color;
    this.timeText
      .setText(formatUptime(this.remainingTimeMs))
      .setColor(timeStyle.color)
      .setShadow(0, 0, timeStyle.color, 10, false, true);
    this.syncDomFromPhaser("time", this.timeText, {
      anchor: "top",
      color: timeStyle.color,
      glowColor: timeStyle.color,
      glowBlur: 10,
    });

    this.dangerOverlay.setAlpha(timeStyle.isUrgent && this.isRunning ? 0.05 : 0);
    if (timeStyle.isUrgent && this.isRunning && secondsLeft !== this.lastUrgentSecond) {
      this.lastUrgentSecond = secondsLeft;
      this.tweens.add({
        targets: this.timeText,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 120,
        yoyo: true,
        ease: "Quad.easeOut",
      });
      this.flashScreen(NEON_THEME.palette.warning, 0.08, 100);
    }
  }

  setStatusText(message, color = "#bae6fd") {
    this.statusColor = color;
    this.statusText.setText(message).setColor(color).setShadow(0, 0, color, 10, false, true);
    this.syncDomFromPhaser("status", this.statusText, {
      anchor: "top",
      color,
      glowColor: color,
      glowBlur: 10,
    });
  }

  /** Finish once; clearing leftover targets is never a scored miss. */
  finishGame() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.isMenuOpen = false;
    this.wasRunningBeforeMenu = false;
    this.screenMode = "finished";
    this.remainingTimeMs = 0;
    this.updateTimeText();
    this.playCue("finish");
    this.clearTimers();
    this.clearActiveTargets(false);
    this.clearRoundFeedback();
    this.setStatusText(GAME_CONFIG.statusMessages.finish, NEON_THEME.palette.warning);
    this.refreshScreenUi();
    this.layout(this.scale.width, this.scale.height);
    this.focusUi("buttonRestart");
  }

  playLevelUpFeedback() {
    if (this.levelBannerTween) {
      this.levelBannerTween.stop();
      this.levelBannerTween = null;
    }

    this.flashScreen("#facc15", 0.16, 160);
    this.levelBannerText.setText("レベルアップ!");
    this.isLevelBannerActive = true;
    this.statusText.setVisible(false);
    this.levelBanner.setVisible(true).setAlpha(0).setScale(0.7);
    this.syncDomFromPhaser("levelBanner", this.levelBannerText, {
      glowColor: "#facc15",
      glowBlur: 14,
    });
    this.syncDomVisibility();
    this.levelBannerTween = this.tweens.add({
      targets: this.levelBanner,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.7, to: 1.1 },
      duration: 180,
      ease: "Back.easeOut",
      yoyo: true,
      hold: 260,
      onComplete: () => {
        this.levelBanner.setVisible(false).setAlpha(0).setScale(0.7);
        this.statusText.setVisible(this.screenMode !== "home");
        this.isLevelBannerActive = false;
        this.syncDomVisibility();
        this.levelBannerTween = null;
      },
    });
  }

  /** Toggle sound from a user gesture, stopping any notes when muted. */
  toggleSound() {
    this.audioEnabled = !this.audioEnabled;
    if (!this.audioEnabled) this.stopTones();
    this.refreshMenuCopy();
    if (this.audioEnabled) {
      this.playCue("toggle");
    }
  }

  getSoundLabel() {
    return this.audioEnabled ? "おと: あり" : "おと: なし";
  }

  /** Never produce gameplay sounds after the document becomes hidden. */
  playCue(name) {
    if (!this.audioEnabled || document.hidden) {
      return;
    }

    const cue = AUDIO_CONFIG.cues[name];
    if (!cue) {
      return;
    }

    cue.forEach((tone) => this.playTone(tone));
  }

  /** Play a short user-enabled tone and release its audio nodes on completion. */
  playTone(tone) {
    const context = this.sound.context;
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime + ((tone.startOffsetMs ?? 0) / 1000);
    const release = Math.max(0.02, tone.durationMs / 1000);

    oscillator.frequency.setValueAtTime(tone.frequencyHz, now);
    oscillator.type = tone.wave ?? "sine";
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(tone.volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + release);

    oscillator.connect(gain);
    gain.connect(context.destination);
    this.activeTones.add(oscillator);
    oscillator.onended = () => {
      this.activeTones.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + release + 0.01);
  }

  /** Stop already scheduled notes on pause, departure or mute. */
  stopTones() {
    this.activeTones.forEach(oscillator => {
      try { oscillator.stop(); } catch { /* A completed oscillator is already silent. */ }
    });
    this.activeTones.clear();
  }

  /** Remove round-specific feedback so home/retry cannot inherit stale effects. */
  clearRoundFeedback() {
    this.levelBannerTween?.stop();
    this.levelBannerTween = null;
    this.isLevelBannerActive = false;
    this.levelBanner?.setVisible(false).setAlpha(0).setScale(0.7);
    this.roundEffects.forEach(effect => {
      this.tweens.killTweensOf(effect);
      effect.destroy();
    });
    this.roundEffects.clear();
    [this.scoreText, this.timeText, this.flashOverlay].forEach(node => this.tweens.killTweensOf(node));
    this.scoreText?.setScale(1);
    this.timeText?.setScale(1);
    this.flashOverlay?.setAlpha(0);
    this.cameras.main.resetFX();
  }

  /** Release a finished transient effect and its tracking entry. */
  destroyRoundEffect(effect) {
    this.roundEffects.delete(effect);
    effect.destroy();
  }

  showTapFeedback(cell, color) {
    if (!cell) {
      return;
    }

    const ring = this.add.circle(cell.x, cell.y, Math.max(14, cell.size * 0.12), color, 0)
      .setStrokeStyle(3, color, 0.92);
    this.roundEffects.add(ring);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.8,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => this.destroyRoundEffect(ring),
    });
  }

  showSuccessBurst(cell, color) {
    if (!cell) {
      return;
    }

    const ripple = this.add.circle(cell.x, cell.y, Math.max(14, cell.size * 0.12), color, 0.18)
      .setStrokeStyle(3, color, 0.92)
      .setBlendMode(Phaser.BlendModes.SCREEN);
    this.roundEffects.add(ripple);
    this.tweens.add({
      targets: ripple,
      scale: 2.2,
      alpha: 0,
      duration: 260,
      ease: "Quad.easeOut",
      onComplete: () => this.destroyRoundEffect(ripple),
    });

    const burstCount = 6;
    for (let i = 0; i < burstCount; i += 1) {
      const angleDeg = (360 / burstCount) * i;
      const angle = Phaser.Math.DegToRad(angleDeg);
      const ray = this.add.rectangle(cell.x, cell.y, Math.max(8, cell.size * 0.06), 4, color, 0.95)
        .setAngle(angleDeg);
      this.roundEffects.add(ray);
      const distance = Math.max(28, cell.size * 0.24);
      this.tweens.add({
        targets: ray,
        x: cell.x + Math.cos(angle) * distance,
        y: cell.y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 1.5,
        duration: 220,
        ease: "Quad.easeOut",
        onComplete: () => this.destroyRoundEffect(ray),
      });
    }
  }

  stopTargetTweens(target) {
    if (target.popTween) {
      target.popTween.stop();
    }
    if (target.spinTween) {
      target.spinTween.stop();
    }
    if (target.pulseTween) {
      target.pulseTween.stop();
    }
    if (target.scanTween) {
      target.scanTween.stop();
    }
  }

  /** Remove only this target, updating accessible cell state before any fade. */
  removeTarget(targetToRemove, animate, isHit = false) {
    if (!targetToRemove) {
      return;
    }

    this.activeTargets = this.activeTargets.filter((target) => target !== targetToRemove);
    this.syncCellUi();
    if (targetToRemove.expireTimer) {
      targetToRemove.expireTimer.remove(false);
      targetToRemove.expireTimer = null;
    }
    this.stopTargetTweens(targetToRemove);

    if (!animate) {
      targetToRemove.container.destroy();
      return;
    }

    this.roundEffects.add(targetToRemove.container);

    this.tweens.add({
      targets: targetToRemove.container,
      alpha: 0,
      scale: isHit ? 1.24 : 0.8,
      duration: isHit ? 180 : 140,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.destroyRoundEffect(targetToRemove.container);
      },
    });
  }

  clearActiveTargets(animate, hitCellIndex = null) {
    const targets = [...this.activeTargets];
    this.activeTargets = [];

    targets.forEach((target) => {
      const isHit = hitCellIndex !== null && target.cellIndex === hitCellIndex;
      this.removeTarget(target, animate, isHit);
    });
  }

  clearSpawnTimers() {
    this.spawnTimers.forEach((timer) => timer.remove(false));
    this.spawnTimers = [];
    this.spawnReservationCount = 0;
  }

  clearCountdownTimers() {
    if (this.gameTimer) {
      this.gameTimer.remove(false);
      this.gameTimer = null;
    }
    if (this.countdownTickTimer) {
      this.countdownTickTimer.remove(false);
      this.countdownTickTimer = null;
    }
    if (this.startCountdownTimer) {
      this.startCountdownTimer.remove(false);
      this.startCountdownTimer = null;
    }
  }

  clearTimers() {
    this.clearSpawnTimers();
    this.clearCountdownTimers();
  }

  /** Anchor the board below measured HUD/copy, then fit every screen's contents. */
  layout(width, height) {
    const w = Math.max(320, width);
    const h = Math.max(480, height);
    const columnWidth = Math.min(w - 32, NEON_THEME.layout.maxBoardWidth);
    const hudWidth = Math.min(columnWidth, w - 26);
    const hudX = w * 0.5;
    const hudTop = Math.max(18, h * 0.028);
    const scoreFontSize = Phaser.Math.Clamp(Math.round(w * 0.09), 36, 52);
    const timeFontSize = Phaser.Math.Clamp(Math.round(w * 0.05), 24, 32);
    const statusFontSize = Phaser.Math.Clamp(Math.round(w * 0.042), 20, 28);
    const badgeScale = Phaser.Math.Clamp(columnWidth / 520, 0.9, 1.08);
    const overlayHeadlineSize = Phaser.Math.Clamp(Math.round(w * 0.075), 28, 34);
    const overlaySublineSize = Phaser.Math.Clamp(Math.round(w * 0.042), 16, 20);
    this.scoreText.setFontSize(scoreFontSize);
    this.timeText.setFontSize(timeFontSize);
    this.statusText.setFontSize(statusFontSize);
    this.levelBadgeText.setFontSize(Phaser.Math.Clamp(Math.round(w * 0.038), 18, 24));
    this.homeHeadline.setFontSize(overlayHeadlineSize);
    this.homeSubline.setFontSize(overlaySublineSize + 2);
    this.homeModeTitle.setFontSize(Phaser.Math.Clamp(Math.round(w * 0.04), 16, 20));
    this.homeModeHint.setFontSize(Phaser.Math.Clamp(Math.round(w * 0.036), 14, 18));
    this.overlayHeadline.setFontSize(overlayHeadlineSize);
    this.overlaySubline.setFontSize(overlaySublineSize);
    this.menuTitle.setFontSize(Phaser.Math.Clamp(Math.round(w * 0.05), 24, 30));
    this.levelBadge.setScale(badgeScale);

    const hudLayout = computeHudLayout({
      width: w,
      topY: hudTop,
      scoreHeight: this.scoreText.height,
      timeHeight: this.timeText.height,
      badgeHeight: this.levelBadgeBackground.height * badgeScale,
    });
    const boardTop = hudLayout.cardBottom + Math.max(this.statusText.height, this.levelBannerText.height) + 26;
    const boardSize = Math.min(columnWidth, Math.max(0, h - boardTop - 24));
    const boardLeft = (w - boardSize) * 0.5;
    this.layoutBackdrop(w, h, boardLeft, boardTop, boardSize);
    this.drawHud(hudX, hudTop, hudWidth, hudLayout.cardHeight);
    this.scoreText.setPosition(hudX, hudLayout.scoreY);
    this.timeText.setPosition(hudX, hudLayout.timeY);
    this.levelBadge.setPosition(hudX, hudLayout.badgeY);
    let statusLayout = computeStatusTextLayout({
      width: w,
      hudBottom: hudLayout.cardBottom,
      boardTop,
      textHeight: this.statusText.height,
    });
    if (statusLayout.textScale < 0.999) {
      const adjustedStatusFontSize = Math.max(18, Math.floor(statusFontSize * statusLayout.textScale));
      this.statusText.setFontSize(adjustedStatusFontSize);
      statusLayout = computeStatusTextLayout({
        width: w,
        hudBottom: hudLayout.cardBottom,
        boardTop,
        textHeight: this.statusText.height,
      });
    }
    this.statusText.setPosition(hudX, statusLayout.y, 0);
    const levelBannerLayout = computeLevelBannerLayout({
      width: w,
      hudBottom: hudLayout.cardBottom,
      boardTop,
      textHeight: this.levelBannerText.height,
    });
    const baseLevelBannerFontSize = Phaser.Math.Clamp(Math.round(w * 0.04), 20, 26);
    if (levelBannerLayout.textScale < 0.999) {
      this.levelBannerText.setFontSize(Math.max(18, Math.floor(baseLevelBannerFontSize * levelBannerLayout.textScale)));
    } else {
      this.levelBannerText.setFontSize(baseLevelBannerFontSize);
    }
    this.levelBannerBackground.setSize(levelBannerLayout.width, levelBannerLayout.height);
    this.levelBanner.setPosition(hudX, levelBannerLayout.y);
    const finishLayout = computeFinishOverlayLayout({
      width: w,
      height: h,
      columnWidth,
      boardTop,
      boardSize,
      headlineHeight: this.overlayHeadline.height,
      sublineHeight: this.overlaySubline.height,
      buttonBaseWidth: this.restartButton.baseWidth,
      buttonBaseHeight: this.restartButton.baseHeight,
    });
    this.overlayCardBackground.setSize(finishLayout.cardWidth, finishLayout.cardHeight);
    this.overlayContainer.setPosition(hudX, finishLayout.centerY);
    this.setButtonBaseScale(this.restartButton, finishLayout.buttonScale);
    this.setButtonBaseScale(this.finishHomeButton, finishLayout.buttonScale);
    this.setButtonPosition(this.restartButton, hudX, finishLayout.restartButtonY);
    this.setButtonPosition(this.finishHomeButton, hudX, finishLayout.homeButtonY);

    const homeLayout = computeHomeScreenLayout({
      width: w,
      height: h,
      columnWidth,
      buttonBaseWidth: this.homePlayButton.baseWidth,
      buttonBaseHeight: this.homePlayButton.baseHeight,
      modeButtonBaseWidth: this.homeNormalModeButton.baseWidth,
      modeButtonBaseHeight: this.homeNormalModeButton.baseHeight,
      titleHeight: this.homeHeadline.height,
      sublineHeight: this.homeSubline.height,
      sectionLabelHeight: this.homeModeTitle.height,
      hintHeight: this.homeModeHint.height,
    });
    this.homeCardBackground.setSize(homeLayout.cardWidth, homeLayout.cardHeight);
    this.homeContainer.setPosition(hudX, homeLayout.cardCenterY);
    this.homeHeadline.setPosition(0, homeLayout.titleOffsetY);
    this.homeSubline.setPosition(0, homeLayout.sublineOffsetY);
    this.homeModeTitle.setPosition(0, homeLayout.sectionLabelOffsetY);
    this.homeModeHint.setPosition(0, homeLayout.hintOffsetY);
    const modeRowHalf = homeLayout.modeButtonWidth * 0.5 + homeLayout.modeButtonGap * 0.5;
    this.setButtonBaseScale(this.homeNormalModeButton, homeLayout.modeButtonScale);
    this.setButtonBaseScale(this.homeSeriousModeButton, homeLayout.modeButtonScale);
    this.setButtonBaseScale(this.homeSoundButton, homeLayout.soundButtonScale);
    this.setButtonBaseScale(this.homePlayButton, homeLayout.playButtonScale);
    this.setButtonPosition(this.homeNormalModeButton, hudX - modeRowHalf, homeLayout.modeRowY);
    this.setButtonPosition(this.homeSeriousModeButton, hudX + modeRowHalf, homeLayout.modeRowY);
    this.setButtonPosition(this.homeSoundButton, hudX, homeLayout.soundButtonY);
    this.setButtonPosition(this.homePlayButton, hudX, homeLayout.playButtonY);

    const pauseLayout = computeTopRightControlLayout({
      width: w,
      buttonBaseWidth: this.pauseButton.baseWidth,
      buttonBaseHeight: this.pauseButton.baseHeight,
    });
    this.setButtonBaseScale(this.pauseButton, pauseLayout.buttonScale);
    this.setButtonPosition(this.pauseButton, pauseLayout.x, pauseLayout.y);

    const menuLayout = computePauseMenuLayout({
      width: w,
      height: h,
      columnWidth,
      boardTop,
      boardSize,
      buttonBaseWidth: this.menuContinueButton.baseWidth,
      buttonBaseHeight: this.menuContinueButton.baseHeight,
      titleHeight: this.menuTitle.height,
    });
    this.menuCardBackground.setSize(menuLayout.cardWidth, menuLayout.cardHeight);
    this.menuTitle.setPosition(0, menuLayout.titleOffsetY);
    this.menuCard.setPosition(hudX, menuLayout.centerY);
    this.setButtonBaseScale(this.menuContinueButton, menuLayout.buttonScale);
    this.setButtonBaseScale(this.menuSoundButton, menuLayout.buttonScale);
    this.setButtonBaseScale(this.menuHomeButton, menuLayout.buttonScale);
    this.setButtonPosition(this.menuContinueButton, hudX, menuLayout.centerY + menuLayout.continueOffsetY);
    this.setButtonPosition(this.menuSoundButton, hudX, menuLayout.centerY + menuLayout.soundOffsetY);
    this.setButtonPosition(this.menuHomeButton, hudX, menuLayout.centerY + menuLayout.homeOffsetY);

    const boardMetrics = this.drawBoard(boardLeft, boardTop, boardSize);
    for (let row = 0; row < GAME_CONFIG.gridSize; row += 1) {
      for (let col = 0; col < GAME_CONFIG.gridSize; col += 1) {
        const index = row * GAME_CONFIG.gridSize + col;
        const centerX = boardLeft + boardMetrics.padding + col * (boardMetrics.cellSize + boardMetrics.gap) + boardMetrics.cellSize * 0.5;
        const centerY = boardTop + boardMetrics.padding + row * (boardMetrics.cellSize + boardMetrics.gap) + boardMetrics.cellSize * 0.5;
        this.cellCenters[index] = { x: centerX, y: centerY, size: boardMetrics.cellSize };
        this.cellZones[index]
          .setPosition(centerX, centerY)
          .setSize(boardMetrics.cellSize, boardMetrics.cellSize)
          .setInteractive();
      }
    }

    this.flashOverlay.setSize(w, h);
    this.dangerOverlay.setSize(w, h);
    this.menuDimmer.setSize(w, h);
    this.syncActiveTargetsToLayout();
    this.refreshOverlayCopy();
    this.refreshScreenUi();
    this.syncAllDomText();
  }

  layoutBackdrop(width, height, boardLeft, boardTop, boardSize) {
    this.backgroundGraphics.clear();
    this.backgroundGraphics.fillStyle(hexToNumber(NEON_THEME.palette.background), 1);
    this.backgroundGraphics.fillRect(0, 0, width, height);
    this.backgroundGraphics.fillStyle(hexToNumber(NEON_THEME.palette.backgroundMid), 0.32);
    this.backgroundGraphics.fillCircle(width * 0.18, height * 0.18, width * 0.18);
    this.backgroundGraphics.fillCircle(width * 0.84, boardTop + boardSize * 0.14, width * 0.14);
    this.backgroundGraphics.fillStyle(hexToNumber(NEON_THEME.palette.panelSoft), 0.6);
    this.backgroundGraphics.fillRoundedRect(10, 10, width - 20, height - 20, 30);
    this.backgroundGraphics.lineStyle(1, hexToNumber(NEON_THEME.palette.gridLine), 0.7);
    for (let i = 0; i < 6; i += 1) {
      const y = height * (0.12 + i * 0.12);
      this.backgroundGraphics.lineBetween(18, y, width - 18, y);
    }

    this.decorations.ambientOrbs.forEach((orb, index) => {
      const positions = [
        { x: width * 0.14, y: height * 0.22, radius: width * 0.07 },
        { x: width * 0.82, y: height * 0.18, radius: width * 0.06 },
        { x: width * 0.18, y: boardTop + boardSize * 0.9, radius: width * 0.05 },
        { x: width * 0.85, y: boardTop + boardSize * 0.82, radius: width * 0.05 },
      ];
      const spec = positions[index];
      orb.setPosition(spec.x, spec.y).setRadius(spec.radius);
    });

    this.decorations.stars.forEach((star, index) => {
      const x = 24 + ((index * 73) % Math.max(60, width - 48));
      const y = 28 + ((index * 97) % Math.max(80, boardTop - 36));
      star.setPosition(x, y);
    });
  }

  drawHud(centerX, topY, width, height) {
    this.hudGraphics.clear();
    this.hudGraphics.fillStyle(hexToNumber(NEON_THEME.palette.panel), 0.82);
    this.hudGraphics.fillRoundedRect(centerX - width * 0.5, topY, width, height, 28);
    this.hudGraphics.lineStyle(2, hexToNumber(NEON_THEME.palette.gridGlow), 0.42);
    this.hudGraphics.strokeRoundedRect(centerX - width * 0.5, topY, width, height, 28);
  }

  drawBoard(boardLeft, boardTop, boardSize) {
    const padding = Phaser.Math.Clamp(boardSize * 0.045, 16, 22);
    const gap = NEON_THEME.layout.cellGap;
    const cellSize = (boardSize - padding * 2 - gap * (GAME_CONFIG.gridSize - 1)) / GAME_CONFIG.gridSize;

    this.boardGraphics.clear();
    this.boardGraphics.fillStyle(hexToNumber(NEON_THEME.palette.panel), 0.96);
    this.boardGraphics.fillRoundedRect(boardLeft, boardTop, boardSize, boardSize, NEON_THEME.layout.boardCornerRadius);
    this.boardGraphics.lineStyle(3, hexToNumber(NEON_THEME.palette.gridGlow), 0.22);
    this.boardGraphics.strokeRoundedRect(boardLeft, boardTop, boardSize, boardSize, NEON_THEME.layout.boardCornerRadius);

    for (let row = 0; row < GAME_CONFIG.gridSize; row += 1) {
      for (let col = 0; col < GAME_CONFIG.gridSize; col += 1) {
        const cellX = boardLeft + padding + col * (cellSize + gap);
        const cellY = boardTop + padding + row * (cellSize + gap);
        const fillColor = (row + col) % 2 === 0 ? NEON_THEME.palette.cellFill : NEON_THEME.palette.cellHot;
        this.boardGraphics.fillStyle(hexToNumber(fillColor), 0.94);
        this.boardGraphics.fillRoundedRect(cellX, cellY, cellSize, cellSize, 18);
        this.boardGraphics.lineStyle(2, hexToNumber(NEON_THEME.palette.gridGlow), 0.48);
        this.boardGraphics.strokeRoundedRect(cellX, cellY, cellSize, cellSize, 18);
      }
    }

    return { padding, gap, cellSize };
  }

  syncActiveTargetsToLayout() {
    this.activeTargets.forEach((target) => {
      const center = this.cellCenters[target.cellIndex];
      this.applyTargetVisualScale(target, center, target.scaleFactor);
    });
  }

  flashScreen(color, alpha = 0.18, duration = 140) {
    this.flashOverlay.setFillStyle(hexToNumber(color), alpha).setAlpha(alpha);
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration,
      ease: "Quad.easeOut",
    });
  }

  onResize(gameSize) {
    this.layout(gameSize.width, gameSize.height);
  }

  /** Expose visible state and logical CSS-pixel coordinates for reproducible QA. */
  snapshotState() {
    return {
      coordinates: "canvas CSS pixels; origin top-left, x right, y down",
      mode: this.getSnapshotMode(),
      overlayMode: this.getSnapshotMode(),
      screenMode: this.screenMode,
      selectedMode: this.selectedMode,
      menuOpen: this.isMenuOpen,
      score: this.score,
      tier: this.tier,
      remainingTimeSec: Math.ceil(Math.max(0, this.remainingTimeMs) / 1000),
      roundMsCurrent: this.roundMsCurrent,
      spawnReservationCount: this.spawnReservationCount,
      status: this.statusText?.text ?? "",
      soundEnabled: this.audioEnabled,
      activeTargets: this.activeTargets.map((target) => ({
        cellIndex: target.cellIndex,
        variantId: target.variantId,
        ...this.cellCenters[target.cellIndex],
      })),
      buttons: {
        home: this.homePlayButton?.labelNode?.text ?? "",
        normalMode: this.homeNormalModeButton?.labelNode?.text ?? "",
        seriousMode: this.homeSeriousModeButton?.labelNode?.text ?? "",
        homeSound: this.homeSoundButton?.labelNode?.text ?? "",
        pause: this.pauseButton?.labelNode?.text ?? "",
        continue: this.menuContinueButton?.labelNode?.text ?? "",
        sound: this.menuSoundButton?.labelNode?.text ?? "",
        menuHome: this.menuHomeButton?.labelNode?.text ?? "",
        restart: this.restartButton?.labelNode?.text ?? "",
        finishHome: this.finishHomeButton?.labelNode?.text ?? "",
      },
    };
  }

  /** Pair every scene-owned listener and runtime resource with teardown. */
  shutdown() {
    this.clearTimers();
    this.clearActiveTargets(false);
    this.clearRoundFeedback();
    this.stopTones();
    document.removeEventListener("visibilitychange", this.onDocumentHidden);
    window.removeEventListener("pagehide", this.onPageHide);
    this.scale.off("resize", this.onResize, this);
    if (this.domUi.root) {
      this.domUi.root.removeEventListener("keydown", this.onUiKeydown);
      this.domUi.root.replaceChildren();
      this.domUi.nodes = {};
    }
  }
}

const phaserConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: NEON_THEME.palette.background,
  width: 768,
  height: 1024,
  scene: [BootScene, GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const rotateHintElement = document.getElementById("rotate-overlay");

function isTouchLikeDevice() {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function updateRotateHint() {
  if (!rotateHintElement) {
    return false;
  }
  const isLandscape = window.innerWidth > window.innerHeight;
  const shouldShow = isTouchLikeDevice() && isLandscape;
  rotateHintElement.classList.toggle("is-visible", shouldShow);
  return shouldShow;
}

/**
 * Registers the local app shell cache so the game can relaunch offline
 * after the first successful online visit.
 */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch((error) => {
    console.warn("Service worker registration failed", error);
  });
}

window.addEventListener("resize", updateRotateHint);
window.addEventListener("orientationchange", updateRotateHint);

window.addEventListener("load", () => {
  if (!window.Phaser) {
    throw new Error("Phaser の起動ファイルが見つかりません。配信アセットを確認してください。");
  }
  const game = new Phaser.Game(phaserConfig);
  updateRotateHint();
  registerServiceWorker();
  window.__reflexesGame = game;
  window.__reflexesGameUi = {
    updateRotateHint,
    getScene() {
      return game.scene.keys.GameScene ?? null;
    },
    renderGameToText() {
      const scene = game.scene.keys.GameScene;
      return JSON.stringify(scene ? scene.snapshotState() : { mode: "booting" });
    },
  };
  window.render_game_to_text = () => window.__reflexesGameUi.renderGameToText();
});
