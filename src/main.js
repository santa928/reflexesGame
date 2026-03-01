const GAME_CONFIG = Object.freeze({
  gridSize: 3,
  roundMsInitial: 1800,
  roundMsMin: 900,
  roundMsStep: 40,
  assistMsOnMiss: 80,
  spawnDelayMs: 220,
});

const AUDIO_CONFIG = Object.freeze({
  enabledByDefault: false,
  volumeHit: 0.06,
  volumeMiss: 0.05,
  toneHitHz: 780,
  toneMissHz: 220,
  toneDurationMs: 120,
});

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
    this.activeCellIndex = -1;
    this.roundTimer = null;
    this.nextSpawnTimer = null;
    this.targetPulseTween = null;
    this.isRunning = false;
    this.roundResolved = false;
    this.score = 0;
    this.roundMsCurrent = GAME_CONFIG.roundMsInitial;
    this.audioEnabled = AUDIO_CONFIG.enabledByDefault;
  }

  create() {
    this.setupState();
    this.createUi();
    this.createGrid();
    this.layout(this.scale.width, this.scale.height);
    this.scale.on("resize", this.onResize, this);
  }

  setupState() {
    this.score = 0;
    this.roundMsCurrent = GAME_CONFIG.roundMsInitial;
    this.activeCellIndex = -1;
    this.isRunning = false;
    this.roundResolved = false;
    this.audioEnabled = AUDIO_CONFIG.enabledByDefault;
  }

  createUi() {
    this.scoreText = this.add
      .text(0, 0, "スコア: 0", {
        fontFamily: "Noto Sans JP, sans-serif",
        fontSize: "56px",
        color: "#2a2f38",
        fontStyle: "700",
      })
      .setOrigin(0.5, 0);

    this.statusText = this.add
      .text(0, 0, "スタートを おしてね", {
        fontFamily: "Noto Sans JP, sans-serif",
        fontSize: "34px",
        color: "#41505f",
        fontStyle: "700",
      })
      .setOrigin(0.5, 0.5);

    this.startButton = this.createButton({
      label: "スタート",
      width: 280,
      height: 94,
      backgroundColor: 0x2f8f4e,
      onPress: () => this.startGame(),
    });

    this.soundButton = this.createButton({
      label: this.getSoundLabel(),
      width: 280,
      height: 94,
      backgroundColor: 0x3969c8,
      onPress: () => this.toggleSound(),
    });
  }

  createGrid() {
    this.boardGraphics = this.add.graphics();
    this.targetCircle = this.add.circle(0, 0, 24, 0xea2f3a).setVisible(false);
    this.targetHalo = this.add.circle(0, 0, 38, 0xff8d96, 0.4).setVisible(false);
    this.tapFeedbackCircle = this.add.circle(0, 0, 10, 0xffffff, 0).setVisible(false);

    const totalCells = GAME_CONFIG.gridSize * GAME_CONFIG.gridSize;
    for (let i = 0; i < totalCells; i += 1) {
      const zone = this.add.zone(0, 0, 10, 10).setInteractive({ useHandCursor: false });
      zone.on("pointerdown", () => this.onCellPressed(i));
      this.cellZones.push(zone);
      this.cellCenters.push({ x: 0, y: 0, size: 0 });
    }
  }

  createButton({ label, width, height, backgroundColor, onPress }) {
    const background = this.add
      .rectangle(0, 0, width, height, backgroundColor)
      .setStrokeStyle(4, 0xffffff, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Noto Sans JP, sans-serif",
        fontSize: "36px",
        color: "#ffffff",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    const container = this.add.container(0, 0, [background, text]);
    container.setSize(width, height);

    background.on("pointerdown", () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.96,
        scaleY: 0.96,
        yoyo: true,
        duration: 90,
      });
      onPress();
    });

    return { container, background, text };
  }

  startGame() {
    this.clearRoundTimers();
    this.isRunning = true;
    this.roundResolved = true;
    this.score = 0;
    this.roundMsCurrent = GAME_CONFIG.roundMsInitial;
    this.activeCellIndex = -1;
    this.updateScoreText();
    this.setStatusText("あかいまるを タップ！");
    this.startButton.text.setText("もういちど");
    this.spawnTarget();
  }

  spawnTarget() {
    if (!this.isRunning) {
      return;
    }

    const nextCellIndex = this.pickNextCellIndex();
    this.activeCellIndex = nextCellIndex;
    this.roundResolved = false;

    const center = this.cellCenters[nextCellIndex];
    const radius = Math.max(16, center.size * 0.2);
    this.targetCircle.setRadius(radius);
    this.targetCircle.setPosition(center.x, center.y);
    this.targetCircle.setVisible(true);

    this.targetHalo.setRadius(radius * 1.65);
    this.targetHalo.setPosition(center.x, center.y);
    this.targetHalo.setVisible(true);

    if (this.targetPulseTween) {
      this.targetPulseTween.stop();
    }
    this.targetPulseTween = this.tweens.add({
      targets: this.targetHalo,
      alpha: { from: 0.55, to: 0.2 },
      scale: { from: 1.0, to: 1.15 },
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.roundTimer = this.time.delayedCall(this.roundMsCurrent, () => this.handleMissTimeout());
  }

  handleHit(cellIndex) {
    if (!this.isRunning || this.roundResolved || cellIndex !== this.activeCellIndex) {
      return;
    }

    this.roundResolved = true;
    this.score += 1;
    this.updateScoreText();
    this.updateDifficulty(true);
    this.playTone(AUDIO_CONFIG.toneHitHz, AUDIO_CONFIG.volumeHit);
    this.setStatusText("いいね！");
    this.showTapFeedback(this.cellCenters[cellIndex], 0x7fdc8e);
    this.hideTarget();

    this.clearRoundTimers();
    this.nextSpawnTimer = this.time.delayedCall(GAME_CONFIG.spawnDelayMs, () => this.spawnTarget());
  }

  handleMissTimeout() {
    if (!this.isRunning || this.roundResolved) {
      return;
    }

    this.roundResolved = true;
    this.updateDifficulty(false);
    this.playTone(AUDIO_CONFIG.toneMissHz, AUDIO_CONFIG.volumeMiss);
    this.setStatusText("つぎ いくよ！");
    this.showTapFeedback(this.cellCenters[this.activeCellIndex], 0xff9f9f);
    this.hideTarget();

    this.clearRoundTimers();
    this.nextSpawnTimer = this.time.delayedCall(GAME_CONFIG.spawnDelayMs + 40, () => this.spawnTarget());
  }

  onCellPressed(cellIndex) {
    if (!this.isRunning || this.roundResolved) {
      return;
    }

    if (cellIndex === this.activeCellIndex) {
      this.handleHit(cellIndex);
      return;
    }

    this.showTapFeedback(this.cellCenters[cellIndex], 0xa2b0ff);
  }

  updateDifficulty(didHit) {
    if (didHit) {
      this.roundMsCurrent = Math.max(
        GAME_CONFIG.roundMsMin,
        this.roundMsCurrent - GAME_CONFIG.roundMsStep,
      );
      return;
    }

    this.roundMsCurrent = Math.min(
      GAME_CONFIG.roundMsInitial,
      this.roundMsCurrent + GAME_CONFIG.assistMsOnMiss,
    );
  }

  updateScoreText() {
    this.scoreText.setText(`スコア: ${this.score}`);
  }

  setStatusText(message) {
    this.statusText.setText(message);
  }

  toggleSound() {
    this.audioEnabled = !this.audioEnabled;
    this.soundButton.text.setText(this.getSoundLabel());
    if (this.audioEnabled) {
      this.playTone(660, 0.035, 70);
    }
  }

  getSoundLabel() {
    return this.audioEnabled ? "おと: ON" : "おと: OFF";
  }

  playTone(frequencyHz, gainAmount, durationMs = AUDIO_CONFIG.toneDurationMs) {
    if (!this.audioEnabled) {
      return;
    }

    const context = this.sound.context;
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const volume = Phaser.Math.Clamp(gainAmount, 0, 0.12);
    const release = Math.max(0.02, durationMs / 1000);

    oscillator.frequency.setValueAtTime(frequencyHz, now);
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
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

    this.tapFeedbackCircle
      .setPosition(cell.x, cell.y)
      .setRadius(Math.max(12, cell.size * 0.1))
      .setFillStyle(color, 0.6)
      .setScale(1)
      .setVisible(true);

    this.tweens.add({
      targets: this.tapFeedbackCircle,
      alpha: 0,
      scale: 1.8,
      duration: 180,
      onComplete: () => {
        this.tapFeedbackCircle.setVisible(false).setAlpha(1);
      },
    });
  }

  hideTarget() {
    if (this.targetPulseTween) {
      this.targetPulseTween.stop();
      this.targetPulseTween = null;
    }
    this.targetCircle.setVisible(false);
    this.targetHalo.setVisible(false).setScale(1).setAlpha(0.4);
  }

  pickNextCellIndex() {
    const max = GAME_CONFIG.gridSize * GAME_CONFIG.gridSize;
    if (max <= 1) {
      return 0;
    }

    let nextIndex = Phaser.Math.Between(0, max - 1);
    if (nextIndex === this.activeCellIndex) {
      nextIndex = (nextIndex + Phaser.Math.Between(1, max - 1)) % max;
    }
    return nextIndex;
  }

  clearRoundTimers() {
    if (this.roundTimer) {
      this.roundTimer.remove(false);
      this.roundTimer = null;
    }
    if (this.nextSpawnTimer) {
      this.nextSpawnTimer.remove(false);
      this.nextSpawnTimer = null;
    }
  }

  layout(width, height) {
    const w = Math.max(320, width);
    const h = Math.max(480, height);
    const topArea = Math.max(140, h * 0.17);
    const bottomArea = Math.max(180, h * 0.24);
    const availableBoardHeight = Math.max(220, h - topArea - bottomArea - 24);
    const boardSize = Math.min(w * 0.9, availableBoardHeight);
    const boardLeft = (w - boardSize) * 0.5;
    const boardTop = topArea + Math.max(8, (availableBoardHeight - boardSize) * 0.5);
    const cellSize = boardSize / GAME_CONFIG.gridSize;

    this.scoreText.setPosition(w * 0.5, Math.max(20, topArea * 0.08));
    this.statusText.setPosition(w * 0.5, topArea * 0.63);

    const buttonsY = h - bottomArea * 0.5;
    this.startButton.container.setPosition(w * 0.31, buttonsY);
    this.soundButton.container.setPosition(w * 0.69, buttonsY);

    this.boardGraphics.clear();
    this.boardGraphics.fillStyle(0xffffff, 0.9);
    this.boardGraphics.fillRoundedRect(boardLeft, boardTop, boardSize, boardSize, 24);
    this.boardGraphics.lineStyle(5, 0xeadcc6, 1);
    this.boardGraphics.strokeRoundedRect(boardLeft, boardTop, boardSize, boardSize, 24);

    this.boardGraphics.lineStyle(3, 0xe8d9bf, 1);
    for (let i = 1; i < GAME_CONFIG.gridSize; i += 1) {
      const lineX = boardLeft + i * cellSize;
      const lineY = boardTop + i * cellSize;
      this.boardGraphics.lineBetween(lineX, boardTop, lineX, boardTop + boardSize);
      this.boardGraphics.lineBetween(boardLeft, lineY, boardLeft + boardSize, lineY);
    }

    for (let row = 0; row < GAME_CONFIG.gridSize; row += 1) {
      for (let col = 0; col < GAME_CONFIG.gridSize; col += 1) {
        const index = row * GAME_CONFIG.gridSize + col;
        const centerX = boardLeft + col * cellSize + cellSize * 0.5;
        const centerY = boardTop + row * cellSize + cellSize * 0.5;
        this.cellCenters[index] = { x: centerX, y: centerY, size: cellSize };
        this.cellZones[index]
          .setPosition(centerX, centerY)
          .setSize(cellSize * 1.12, cellSize * 1.12)
          .setInteractive();
      }
    }

    if (this.activeCellIndex >= 0 && this.targetCircle.visible) {
      const center = this.cellCenters[this.activeCellIndex];
      const radius = Math.max(16, center.size * 0.2);
      this.targetCircle.setPosition(center.x, center.y).setRadius(radius);
      this.targetHalo.setPosition(center.x, center.y).setRadius(radius * 1.65);
    }
  }

  onResize(gameSize) {
    this.layout(gameSize.width, gameSize.height);
  }

  shutdown() {
    this.clearRoundTimers();
    this.hideTarget();
    this.scale.off("resize", this.onResize, this);
  }
}

const phaserConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#fff7e8",
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

window.addEventListener("resize", updateRotateHint);
window.addEventListener("orientationchange", updateRotateHint);

window.addEventListener("load", () => {
  // Phaser のスクリプト読み込み完了後にのみゲームを初期化する。
  if (!window.Phaser) {
    throw new Error("Phaser の読み込みに失敗しました。ネットワーク接続を確認してください。");
  }
  const game = new Phaser.Game(phaserConfig);
  updateRotateHint();
  // 最小スモークや将来のE2Eで参照できるよう、グローバルに公開する。
  window.__reflexesGame = game;
  window.__reflexesGameUi = {
    updateRotateHint,
  };
});
