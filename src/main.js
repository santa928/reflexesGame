import { buildArcadeButtonSpec, hexToNumber } from "./buttonStyle.js";
import {
  NEON_THEME,
  computeTopRightControlLayout,
  formatBreachLevel,
  formatUptime,
  getOverlayCopy,
  getPauseMenuCopy,
  getTimeStyle,
} from "./themeStyle.js";
import {
  computeMissingSpawnReservations,
  getConcurrentTargetLimit,
  pickSpawnCellIndex,
} from "./spawnLogic.js";
import { NODE_VARIANTS, buildNodeTargetSpec } from "./targetStyle.js";

const GAME_CONFIG = Object.freeze({
  gridSize: 3,
  gameDurationMs: 30000,
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
    this.cellCenters = [];
    this.cellZones = [];
    this.spawnTimers = [];
    this.spawnReservationCount = 0;
    this.gameTimer = null;
    this.countdownTickTimer = null;
    this.isRunning = false;
    this.score = 0;
    this.tier = 1;
    this.remainingTimeMs = GAME_CONFIG.gameDurationMs;
    this.countdownEndAt = 0;
    this.roundMsCurrent = GAME_CONFIG.roundMsInitial;
    this.audioEnabled = AUDIO_CONFIG.enabledByDefault;
    this.currentTierConfig = GAME_CONFIG.tierConfigs[0];
    this.activeTargets = [];
    this.lastSpawnCellIndices = [];
    this.nodeVariantPool = NODE_VARIANTS.map((variant) => variant.id);
    this.lastUrgentSecond = null;
    this.screenMode = "home";
    this.isMenuOpen = false;
    this.wasRunningBeforeMenu = false;
    this.decorations = {
      ambientOrbs: [],
      stars: [],
    };
  }

  create() {
    this.setupState();
    this.createBackdrop();
    this.createUi();
    this.createGrid();
    this.layout(this.scale.width, this.scale.height);
    this.goHome();
    this.scale.on("resize", this.onResize, this);
  }

  setupState() {
    const preservedAudioEnabled = this.audioEnabled;
    this.score = 0;
    this.tier = 1;
    this.currentTierConfig = this.getTierConfig(1);
    this.remainingTimeMs = GAME_CONFIG.gameDurationMs;
    this.countdownEndAt = 0;
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
    this.isMenuOpen = false;
    this.wasRunningBeforeMenu = false;
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

    this.levelBannerBackground = this.add.rectangle(0, 0, 360, 102, 0x081121, 0.92)
      .setStrokeStyle(3, hexToNumber(NEON_THEME.palette.level), 0.95);
    this.levelBannerText = this.add.text(0, 0, "レベルアップ!", {
      fontFamily: UI_FONT_STACK,
      fontSize: "38px",
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
    this.homeContainer = this.add.container(0, 0, [
      this.homeCardBackground,
      this.homeHeadline,
      this.homeSubline,
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

    this.restartButton = this.createButton({
      kind: "start",
      label: "もういちど",
      onPress: () => this.startGame(),
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
    this.menuDimmer.on("pointerdown", () => this.resumeGame());

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

  createGrid() {
    const totalCells = GAME_CONFIG.gridSize * GAME_CONFIG.gridSize;
    for (let i = 0; i < totalCells; i += 1) {
      const zone = this.add.zone(0, 0, 10, 10).setInteractive({ useHandCursor: false });
      zone.on("pointerdown", () => this.onCellPressed(i));
      this.cellZones.push(zone);
      this.cellCenters.push({ x: 0, y: 0, size: 0 });
    }
  }

  createButton({ kind, label, onPress, depth = 20 }) {
    const spec = buildArcadeButtonSpec({
      kind,
      labelText: label,
      soundEnabled: this.audioEnabled,
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
  }

  setButtonVisible(button, visible) {
    button.container.setVisible(visible);
    if (button.hitArea.input) {
      button.hitArea.input.enabled = visible;
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
    this.homeHeadline.setText(copy.headline);
    this.homeSubline.setText(copy.subline);
    this.updateButtonVisual(this.homePlayButton, copy.cta);
  }

  updateFinishedCopy() {
    const copy = getOverlayCopy("finished");
    this.overlayHeadline.setText(copy.headline);
    this.overlaySubline.setText(`${copy.subline}: ${String(this.score).padStart(2, "0")}`);
    this.updateButtonVisual(this.restartButton, copy.cta);
  }

  refreshMenuCopy() {
    const copy = getPauseMenuCopy(this.audioEnabled);
    this.menuTitle.setText(copy.title);
    this.updateButtonVisual(this.menuContinueButton, copy.continueLabel);
    this.updateButtonVisual(this.menuSoundButton, copy.soundLabel);
    this.updateButtonVisual(this.menuHomeButton, copy.homeLabel);
  }

  pauseGameplayRuntime() {
    this.remainingTimeMs = Math.max(0, this.countdownEndAt - this.time.now);
    this.spawnTimers.forEach((timer) => {
      timer.paused = true;
    });
    if (this.gameTimer) {
      this.gameTimer.paused = true;
    }
    if (this.countdownTickTimer) {
      this.countdownTickTimer.paused = true;
    }
    this.activeTargets.forEach((target) => {
      if (target.expireTimer) {
        target.expireTimer.paused = true;
      }
    });
  }

  resumeGameplayRuntime() {
    this.countdownEndAt = this.time.now + this.remainingTimeMs;
    this.spawnTimers.forEach((timer) => {
      timer.paused = false;
    });
    if (this.gameTimer) {
      this.gameTimer.paused = false;
    }
    if (this.countdownTickTimer) {
      this.countdownTickTimer.paused = false;
    }
    this.activeTargets.forEach((target) => {
      if (target.expireTimer) {
        target.expireTimer.paused = false;
      }
    });
  }

  getSnapshotMode() {
    if (this.isMenuOpen && this.screenMode === "playing") {
      return "paused";
    }
    return this.screenMode;
  }

  refreshScreenUi() {
    const isHome = this.screenMode === "home";
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

    this.updateFinishedCopy();
    this.overlayContainer.setVisible(isFinished && !showMenu);
    this.setButtonVisible(this.restartButton, isFinished && !showMenu);

    this.setButtonVisible(this.pauseButton, showGameChrome && !showMenu);

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
        zone.input.enabled = showGameChrome && !showMenu && this.isRunning;
      }
    });
  }

  openPauseMenu() {
    if (this.screenMode === "home" || this.isMenuOpen) {
      return;
    }
    this.wasRunningBeforeMenu = this.screenMode === "playing" && this.isRunning;
    if (this.wasRunningBeforeMenu) {
      this.pauseGameplayRuntime();
    }
    this.isMenuOpen = true;
    this.refreshMenuCopy();
    this.refreshScreenUi();
  }

  resumeGame() {
    if (!this.isMenuOpen) {
      return;
    }
    this.isMenuOpen = false;
    if (this.wasRunningBeforeMenu) {
      this.resumeGameplayRuntime();
    }
    this.wasRunningBeforeMenu = false;
    this.refreshScreenUi();
  }

  goHome() {
    this.resumeGame();
    this.clearTimers();
    this.clearActiveTargets(false);
    this.setupState();
    this.updateScoreText(false);
    this.updateTimeText();
    this.updateTierUi();
    this.setStatusText(GAME_CONFIG.statusMessages.ready, "#bae6fd");
    this.updateHomeCopy();
    this.refreshMenuCopy();
    this.refreshScreenUi();
  }

  startGame() {
    this.clearTimers();
    this.clearActiveTargets(false);
    this.isMenuOpen = false;
    this.wasRunningBeforeMenu = false;
    this.isRunning = true;
    this.screenMode = "playing";
    this.spawnReservationCount = 0;
    this.score = 0;
    this.tier = 1;
    this.currentTierConfig = this.getTierConfig(1);
    this.roundMsCurrent = this.getBaseRoundMs(this.currentTierConfig);
    this.remainingTimeMs = GAME_CONFIG.gameDurationMs;
    this.countdownEndAt = this.time.now + GAME_CONFIG.gameDurationMs;
    this.lastSpawnCellIndices = [];
    this.lastUrgentSecond = null;
    this.updateScoreText(false);
    this.updateTimeText();
    this.updateTierUi();
    this.setStatusText("スタート!", NEON_THEME.palette.hud);
    this.refreshMenuCopy();
    this.refreshScreenUi();

    this.gameTimer = this.time.delayedCall(GAME_CONFIG.gameDurationMs, () => this.finishGame());
    this.countdownTickTimer = this.time.addEvent({
      delay: GAME_CONFIG.countdownTickMs,
      loop: true,
      callback: () => this.updateRemainingTime(),
    });
    this.ensureTargetCapacity();
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

  scheduleSpawn(delayMs) {
    this.spawnReservationCount += 1;
    const spawnTimer = this.time.delayedCall(delayMs, () => {
      this.spawnTimers = this.spawnTimers.filter((timer) => timer !== spawnTimer);
      this.spawnReservationCount = Math.max(0, this.spawnReservationCount - 1);

      if (!this.isRunning) {
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
      spawnedAt: this.time.now,
    };
    target.expireTimer = this.time.delayedCall(lifespanMs, () => this.handleTargetExpired(target));
    this.activeTargets.push(target);
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

  handleHit(cellIndex) {
    if (!this.isRunning) {
      return;
    }

    const hitTarget = this.activeTargets.find((target) => target.cellIndex === cellIndex);
    if (!hitTarget) {
      return;
    }

    this.score += 1;

    const leveledUp = this.updateTierFromScore();
    this.updateScoreText(true);
    this.updateDifficulty(true);
    this.playCue(leveledUp ? "levelUp" : "hit");
    this.showSuccessBurst(this.cellCenters[cellIndex], this.currentTierConfig.badgeColor);
    this.removeTarget(hitTarget, true, true);
    this.ensureTargetCapacity();

    if (leveledUp) {
      this.playLevelUpFeedback();
    }

    this.setStatusText(
      leveledUp
        ? "レベルアップ!"
        : this.activeTargets.length > 0
          ? `あと ${this.activeTargets.length}こ!`
          : Phaser.Utils.Array.GetRandom(GAME_CONFIG.statusMessages.hit),
      leveledUp
        ? "#fde047"
        : this.activeTargets.length > 0
          ? "#a5f3fc"
          : NEON_THEME.palette.success,
    );
  }

  handleTargetExpired(target) {
    if (!this.isRunning || !this.activeTargets.includes(target)) {
      return;
    }

    this.updateDifficulty(false);
    this.playCue("miss");
    this.cameras.main.shake(90, 0.006);
    this.flashScreen(NEON_THEME.palette.warning, 0.14, 120);
    this.setStatusText(Phaser.Utils.Array.GetRandom(GAME_CONFIG.statusMessages.miss), NEON_THEME.palette.warning);
    this.showTapFeedback(this.cellCenters[target.cellIndex], hexToNumber(NEON_THEME.palette.warning));
    this.removeTarget(target, true, false);
    this.ensureTargetCapacity();
  }

  onCellPressed(cellIndex) {
    if (!this.isRunning || this.isMenuOpen) {
      return;
    }

    if (this.activeTargets.some((target) => target.cellIndex === cellIndex)) {
      this.handleHit(cellIndex);
      return;
    }

    this.cameras.main.shake(60, 0.004);
    this.showTapFeedback(this.cellCenters[cellIndex], hexToNumber(NEON_THEME.palette.warning));
    this.setStatusText("ざんねん!", NEON_THEME.palette.warning);
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
  }

  updateRemainingTime() {
    if (!this.isRunning) {
      return;
    }

    const msLeft = Math.max(0, this.countdownEndAt - this.time.now);
    this.remainingTimeMs = msLeft;
    this.updateTimeText();
    if (msLeft <= 0) {
      this.finishGame();
    }
  }

  updateTimeText() {
    const secondsLeft = Math.ceil(Math.max(0, this.remainingTimeMs) / 1000);
    const timeStyle = getTimeStyle(secondsLeft);
    this.timeText
      .setText(formatUptime(this.remainingTimeMs))
      .setColor(timeStyle.color)
      .setShadow(0, 0, timeStyle.color, 10, false, true);

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
    this.statusText.setText(message).setColor(color).setShadow(0, 0, color, 10, false, true);
  }

  finishGame() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.screenMode = "finished";
    this.remainingTimeMs = 0;
    this.updateTimeText();
    this.playCue("finish");
    this.clearTimers();
    this.clearActiveTargets(true);
    this.setStatusText(GAME_CONFIG.statusMessages.finish, NEON_THEME.palette.warning);
    this.refreshScreenUi();
  }

  playLevelUpFeedback() {
    if (this.levelBannerTween) {
      this.levelBannerTween.stop();
      this.levelBannerTween = null;
    }

    this.flashScreen("#facc15", 0.16, 160);
    this.levelBannerText.setText("レベルアップ!");
    this.levelBanner.setVisible(true).setAlpha(0).setScale(0.7);
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
        this.levelBannerTween = null;
      },
    });
  }

  toggleSound() {
    this.audioEnabled = !this.audioEnabled;
    this.refreshMenuCopy();
    if (this.audioEnabled) {
      this.playCue("toggle");
    }
  }

  getSoundLabel() {
    return this.audioEnabled ? "おと: あり" : "おと: なし";
  }

  playCue(name) {
    if (!this.audioEnabled) {
      return;
    }

    const cue = AUDIO_CONFIG.cues[name];
    if (!cue) {
      return;
    }

    cue.forEach((tone) => this.playTone(tone));
  }

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
    oscillator.start(now);
    oscillator.stop(now + release + 0.01);
  }

  showTapFeedback(cell, color) {
    if (!cell) {
      return;
    }

    const ring = this.add.circle(cell.x, cell.y, Math.max(14, cell.size * 0.12), color, 0)
      .setStrokeStyle(3, color, 0.92);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.8,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  showSuccessBurst(cell, color) {
    if (!cell) {
      return;
    }

    const ripple = this.add.circle(cell.x, cell.y, Math.max(14, cell.size * 0.12), color, 0.18)
      .setStrokeStyle(3, color, 0.92)
      .setBlendMode(Phaser.BlendModes.SCREEN);
    this.tweens.add({
      targets: ripple,
      scale: 2.2,
      alpha: 0,
      duration: 260,
      ease: "Quad.easeOut",
      onComplete: () => ripple.destroy(),
    });

    const burstCount = 6;
    for (let i = 0; i < burstCount; i += 1) {
      const angleDeg = (360 / burstCount) * i;
      const angle = Phaser.Math.DegToRad(angleDeg);
      const ray = this.add.rectangle(cell.x, cell.y, Math.max(8, cell.size * 0.06), 4, color, 0.95)
        .setAngle(angleDeg);
      const distance = Math.max(28, cell.size * 0.24);
      this.tweens.add({
        targets: ray,
        x: cell.x + Math.cos(angle) * distance,
        y: cell.y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 1.5,
        duration: 220,
        ease: "Quad.easeOut",
        onComplete: () => ray.destroy(),
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

  removeTarget(targetToRemove, animate, isHit = false) {
    if (!targetToRemove) {
      return;
    }

    this.activeTargets = this.activeTargets.filter((target) => target !== targetToRemove);
    if (targetToRemove.expireTimer) {
      targetToRemove.expireTimer.remove(false);
      targetToRemove.expireTimer = null;
    }
    this.stopTargetTweens(targetToRemove);

    if (!animate) {
      targetToRemove.container.destroy();
      return;
    }

    this.tweens.add({
      targets: targetToRemove.container,
      alpha: 0,
      scale: isHit ? 1.24 : 0.8,
      duration: isHit ? 180 : 140,
      ease: "Quad.easeOut",
      onComplete: () => {
        targetToRemove.container.destroy();
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
  }

  clearTimers() {
    this.clearSpawnTimers();
    this.clearCountdownTimers();
  }

  layout(width, height) {
    const w = Math.max(320, width);
    const h = Math.max(480, height);
    const columnWidth = Math.min(w - 32, NEON_THEME.layout.maxBoardWidth);
    const topArea = Math.max(254, h * 0.27);
    const bottomArea = Math.max(168, h * 0.2);
    const availableBoardHeight = Math.max(240, h - topArea - bottomArea - 30);
    const boardSize = Math.min(columnWidth, availableBoardHeight);
    const boardLeft = (w - boardSize) * 0.5;
    const boardTop = topArea + Math.max(12, (availableBoardHeight - boardSize) * 0.5);

    this.layoutBackdrop(w, h, boardLeft, boardTop, boardSize);

    const hudWidth = Math.min(columnWidth, w - 26);
    const hudX = w * 0.5;
    const hudTop = Math.max(18, h * 0.028);
    this.drawHud(hudX, hudTop, hudWidth);

    const scoreFontSize = Phaser.Math.Clamp(Math.round(w * 0.09), 36, 52);
    const timeFontSize = Phaser.Math.Clamp(Math.round(w * 0.05), 24, 32);
    const statusFontSize = Phaser.Math.Clamp(Math.round(w * 0.042), 20, 28);
    const badgeScale = Phaser.Math.Clamp(columnWidth / 520, 0.9, 1.08);
    const overlayHeadlineSize = Phaser.Math.Clamp(Math.round(w * 0.075), 28, 34);
    const overlaySublineSize = Phaser.Math.Clamp(Math.round(w * 0.042), 16, 20);
    const overlayCardWidth = Math.min(columnWidth * 0.96, 420);
    const levelBannerWidth = Math.min(columnWidth * 0.92, 440);
    const ctaScale = Phaser.Math.Clamp(columnWidth / 380, 0.74, 1);
    const menuScale = Phaser.Math.Clamp(columnWidth / 400, 0.72, 1);
    this.scoreText.setFontSize(scoreFontSize);
    this.timeText.setFontSize(timeFontSize);
    this.statusText.setFontSize(statusFontSize);
    this.levelBadgeText.setFontSize(Phaser.Math.Clamp(Math.round(w * 0.038), 18, 24));
    this.overlayHeadline.setFontSize(overlayHeadlineSize);
    this.overlaySubline.setFontSize(overlaySublineSize);
    this.overlayCardBackground.setSize(overlayCardWidth, 152);
    this.homeCardBackground.setSize(Math.min(columnWidth * 0.98, 430), 182);
    this.homeHeadline.setFontSize(overlayHeadlineSize);
    this.homeSubline.setFontSize(overlaySublineSize + 2);
    this.levelBannerBackground.setSize(levelBannerWidth, 102);
    this.levelBannerText.setFontSize(Phaser.Math.Clamp(Math.round(w * 0.045), 24, 30));
    this.menuCardBackground.setSize(Math.min(columnWidth * 0.98, 420), 280);
    this.menuTitle.setFontSize(Phaser.Math.Clamp(Math.round(w * 0.05), 24, 30));
    this.levelBadge.setScale(badgeScale);

    this.scoreText.setPosition(hudX, hudTop + 16);
    this.timeText.setPosition(hudX, this.scoreText.y + this.scoreText.height + 6);
    this.levelBadge.setPosition(hudX, this.timeText.y + this.timeText.height + 30);
    this.statusText.setPosition(hudX, this.levelBadge.y + 30, 0);
    this.levelBanner.setPosition(hudX, boardTop + boardSize * 0.44);
    this.overlayContainer.setPosition(hudX, boardTop + boardSize * 0.5);
    this.setButtonBaseScale(this.homePlayButton, ctaScale);
    this.setButtonBaseScale(this.restartButton, ctaScale);
    this.setButtonPosition(this.restartButton, hudX, this.overlayContainer.y + 128);

    const homeCenterY = Math.max(290, Math.round(h * 0.42));
    this.homeContainer.setPosition(hudX, homeCenterY);
    this.setButtonPosition(this.homePlayButton, hudX, homeCenterY + 138);

    const pauseLayout = computeTopRightControlLayout({
      width: w,
      buttonBaseWidth: this.pauseButton.baseWidth,
      buttonBaseHeight: this.pauseButton.baseHeight,
    });
    this.setButtonBaseScale(this.pauseButton, pauseLayout.buttonScale);
    this.setButtonPosition(this.pauseButton, pauseLayout.x, pauseLayout.y);

    const menuCenterY = Math.max(boardTop + boardSize * 0.5, Math.round(h * 0.47));
    const menuGap = 84 * menuScale;
    this.menuCard.setPosition(hudX, menuCenterY);
    this.setButtonBaseScale(this.menuContinueButton, menuScale);
    this.setButtonBaseScale(this.menuSoundButton, menuScale);
    this.setButtonBaseScale(this.menuHomeButton, menuScale);
    this.setButtonPosition(this.menuContinueButton, hudX, menuCenterY - menuGap * 0.18);
    this.setButtonPosition(this.menuSoundButton, hudX, menuCenterY + menuGap * 0.72);
    this.setButtonPosition(this.menuHomeButton, hudX, menuCenterY + menuGap * 1.62);

    const boardMetrics = this.drawBoard(boardLeft, boardTop, boardSize);
    for (let row = 0; row < GAME_CONFIG.gridSize; row += 1) {
      for (let col = 0; col < GAME_CONFIG.gridSize; col += 1) {
        const index = row * GAME_CONFIG.gridSize + col;
        const centerX = boardLeft + boardMetrics.padding + col * (boardMetrics.cellSize + boardMetrics.gap) + boardMetrics.cellSize * 0.5;
        const centerY = boardTop + boardMetrics.padding + row * (boardMetrics.cellSize + boardMetrics.gap) + boardMetrics.cellSize * 0.5;
        this.cellCenters[index] = { x: centerX, y: centerY, size: boardMetrics.cellSize };
        this.cellZones[index]
          .setPosition(centerX, centerY)
          .setSize(boardMetrics.cellSize * 1.08, boardMetrics.cellSize * 1.08)
          .setInteractive();
      }
    }

    this.flashOverlay.setSize(w, h);
    this.dangerOverlay.setSize(w, h);
    this.menuDimmer.setSize(w, h);
    this.syncActiveTargetsToLayout();
    this.refreshScreenUi();
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

  drawHud(centerX, topY, width) {
    this.hudGraphics.clear();
    this.hudGraphics.fillStyle(hexToNumber(NEON_THEME.palette.panel), 0.82);
    this.hudGraphics.fillRoundedRect(centerX - width * 0.5, topY, width, 170, 28);
    this.hudGraphics.lineStyle(2, hexToNumber(NEON_THEME.palette.gridGlow), 0.42);
    this.hudGraphics.strokeRoundedRect(centerX - width * 0.5, topY, width, 170, 28);
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

  snapshotState() {
    return {
      mode: this.getSnapshotMode(),
      overlayMode: this.getSnapshotMode(),
      screenMode: this.screenMode,
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
      })),
      buttons: {
        home: this.homePlayButton?.labelNode?.text ?? "",
        pause: this.pauseButton?.labelNode?.text ?? "",
        continue: this.menuContinueButton?.labelNode?.text ?? "",
        sound: this.menuSoundButton?.labelNode?.text ?? "",
        menuHome: this.menuHomeButton?.labelNode?.text ?? "",
        restart: this.restartButton?.labelNode?.text ?? "",
      },
    };
  }

  shutdown() {
    this.clearTimers();
    this.clearActiveTargets(false);
    this.scale.off("resize", this.onResize, this);
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
