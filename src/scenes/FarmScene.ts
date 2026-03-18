import Phaser from 'phaser';
import GameState from '../state/GameState';
import { FarmSystem } from '../systems/FarmSystem';
import { TimeSystem } from '../systems/TimeSystem';
import { CROPS } from '../config/crops';
import { saveGame } from '../state/persistence';

// --- Tile grid constants ---
const TILE = 48;
const COLS = 16;
const ROWS = 16;

type Direction = 'up' | 'down' | 'left' | 'right';

const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  up:    { dx: 0,  dy: -1 },
  down:  { dx: 0,  dy: 1 },
  left:  { dx: -1, dy: 0 },
  right: { dx: 1,  dy: 0 },
};

// Tile types
const G = 0; // grass (walkable)
const P = 1; // plot (not walkable, interactable)
const R = 3; // path (walkable)
const X = 4; // exit (walkable, triggers transition)

// Open farm: plot rows with grass aisles between them, no fence
// 4 rows of 6 plots = 24 total, every plot reachable from above/below
// prettier-ignore
const FARM_MAP: number[][] = [
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G], // 0
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G], // 1
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G], // 2
  [G,G,G,G,G,P,P,P,P,P,P,G,G,G,G,G], // 3  plots 0-5
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G], // 4  aisle
  [G,G,G,G,G,P,P,P,P,P,P,G,G,G,G,G], // 5  plots 6-11
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G], // 6  aisle
  [G,G,G,G,G,P,P,P,P,P,P,G,G,G,G,G], // 7  plots 12-17
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G], // 8  aisle
  [G,G,G,G,G,P,P,P,P,P,P,G,G,G,G,G], // 9  plots 18-23
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G], // 10
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G], // 11 (player spawn)
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G], // 12
  [G,G,G,G,G,G,G,R,G,G,G,G,G,G,G,G], // 13 path
  [G,G,G,G,G,G,G,X,G,G,G,G,G,G,G,G], // 14 exit
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G], // 15
];

// Plot layout: 4 rows of 6 at cols 5-10, rows 3/5/7/9 (stride 2)
const PLOT_START_COL = 5;
const PLOT_START_ROW = 3;
const PLOT_COLS = 6;
const PLOT_ROW_STRIDE = 2;
const PLOT_ROW_COUNT = 4;
const TOTAL_PLOTS = PLOT_COLS * PLOT_ROW_COUNT; // 24

function getPlotIndex(col: number, row: number): number | null {
  if (col < PLOT_START_COL || col >= PLOT_START_COL + PLOT_COLS) return null;
  if (row < PLOT_START_ROW) return null;

  const rowOffset = row - PLOT_START_ROW;
  if (rowOffset % PLOT_ROW_STRIDE !== 0) return null;

  const plotRow = rowOffset / PLOT_ROW_STRIDE;
  if (plotRow < 0 || plotRow >= PLOT_ROW_COUNT) return null;

  return plotRow * PLOT_COLS + (col - PLOT_START_COL);
}

function isWalkable(col: number, row: number): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const t = FARM_MAP[row][col];
  return t === G || t === R || t === X;
}

function tx(col: number): number { return col * TILE + TILE / 2; }
function ty(row: number): number { return row * TILE + TILE / 2; }

// Action menu option
interface MenuOption {
  label: string;
  action: () => void;
  isMessage?: boolean;
}

export class FarmScene extends Phaser.Scene {
  // Map
  private tileImages: Phaser.GameObjects.Image[][] = [];
  private cropOverlays: Map<number, Phaser.GameObjects.Rectangle> = new Map();

  // Player
  private player!: Phaser.GameObjects.Image;
  private playerCol = 7;
  private playerRow = 10;
  private facing: Direction = 'up';
  private isMoving = false;

  // Facing highlight (yellow border on faced plot)
  private facingHighlight!: Phaser.GameObjects.Rectangle;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;

  // Action popup menu
  private menuOpen = false;
  private menuOptions: MenuOption[] = [];
  private menuCursor = 0;
  private menuContainer: Phaser.GameObjects.Container | null = null;
  private menuOptionTexts: Phaser.GameObjects.Text[] = [];
  private menuArrow: Phaser.GameObjects.Text | null = null;
  private menuOriginY = 0; // stored for arrow updates

  // HUD elements
  private hudDay!: Phaser.GameObjects.Text;
  private hudWallet!: Phaser.GameObjects.Text;
  private hudInv!: Phaser.GameObjects.Text;
  private hudPrompt!: Phaser.GameObjects.Text;
  private hudMsg!: Phaser.GameObjects.Text;
  private msgTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'Farm' });
  }

  create(): void {
    TimeSystem.processOfflineGrowth();
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // Reset state on scene entry
    this.isMoving = false;
    this.playerCol = 7;
    this.playerRow = 11;
    this.facing = 'up';
    this.menuOpen = false;
    this.menuContainer = null;
    this.cropOverlays.clear();

    this.setupInput();
    this.renderMap();
    this.createPlayer();
    this.createHUD();
    this.refreshPlots();
    this.updateHUD();
  }

  update(): void {
    if (!this.isMoving && !this.menuOpen) {
      this.handleMovement();
    }
    this.updatePrompt();
  }

  // ============================
  // Input
  // ============================

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey('W'),
      A: this.input.keyboard!.addKey('A'),
      S: this.input.keyboard!.addKey('S'),
      D: this.input.keyboard!.addKey('D'),
    };

    // Action
    this.input.keyboard!.addKey('SPACE').on('down', () => this.handleAction());
    this.input.keyboard!.addKey('ENTER').on('down', () => this.handleAction());

    // Escape to close menu
    this.input.keyboard!.addKey('ESC').on('down', () => {
      if (this.menuOpen) this.closeMenu();
    });

    // Dev: 0 to skip a day
    this.input.keyboard!.addKey('ZERO').on('down', () => {
      if (this.menuOpen) return;
      TimeSystem.devSkipDays(1);
      this.refreshPlots();
      this.showMsg('DEV: Skipped 1 day');
    });
  }

  // ============================
  // Map Rendering
  // ============================

  private renderMap(): void {
    this.tileImages = [];

    for (let row = 0; row < ROWS; row++) {
      this.tileImages[row] = [];
      for (let col = 0; col < COLS; col++) {
        const cx = tx(col);
        const cy = ty(row);
        const t = FARM_MAP[row][col];

        let key: string;
        switch (t) {
          case P: key = 'tile_dirt'; break;
          case R: key = 'tile_path'; break;
          case X: key = 'tile_exit'; break;
          default: key = 'tile_grass'; break;
        }

        const img = this.add.image(cx, cy, key);
        this.tileImages[row][col] = img;

        // Add crop overlay rectangle for plot tiles
        if (t === P) {
          const plotIdx = getPlotIndex(col, row);
          if (plotIdx !== null) {
            const overlay = this.add.rectangle(cx, cy, 23, 23, 0x000000, 0);
            this.cropOverlays.set(plotIdx, overlay);
          }
        }
      }
    }

    // Exit label on the map
    this.add.text(tx(7), ty(14) + 2, 'EXIT', {
      fontSize: '11px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5);
  }

  // ============================
  // Player
  // ============================

  private createPlayer(): void {
    this.facingHighlight = this.add.rectangle(0, 0, TILE - 3, TILE - 3, 0xFFFF00, 0)
      .setStrokeStyle(3, 0xFFFF00, 0.6);

    this.player = this.add.image(tx(this.playerCol), ty(this.playerRow), `player_${this.facing}`);
    this.updateFacingHighlight();
  }

  private handleMovement(): void {
    let dir: Direction | null = null;

    if (this.cursors.up.isDown || this.wasd.W.isDown) dir = 'up';
    else if (this.cursors.down.isDown || this.wasd.S.isDown) dir = 'down';
    else if (this.cursors.left.isDown || this.wasd.A.isDown) dir = 'left';
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dir = 'right';

    if (!dir) return;

    // Always update facing direction (even if blocked)
    this.facing = dir;
    this.player.setTexture(`player_${dir}`);
    this.updateFacingHighlight();

    // Check if target tile is walkable
    const { dx, dy } = DIR_DELTA[dir];
    const newCol = this.playerCol + dx;
    const newRow = this.playerRow + dy;

    if (!isWalkable(newCol, newRow)) return;

    // Move with tween
    this.isMoving = true;
    this.playerCol = newCol;
    this.playerRow = newRow;

    this.tweens.add({
      targets: this.player,
      x: tx(newCol),
      y: ty(newRow),
      duration: 130,
      ease: 'Linear',
      onComplete: () => {
        this.isMoving = false;
        this.updateFacingHighlight();

        // Auto-transition on exit tile
        if (FARM_MAP[newRow][newCol] === X) {
          saveGame();
          this.scene.start('Menu');
        }
      },
    });
  }

  private updateFacingHighlight(): void {
    const { dx, dy } = DIR_DELTA[this.facing];
    const fc = this.playerCol + dx;
    const fr = this.playerRow + dy;

    const isPlot = fc >= 0 && fc < COLS && fr >= 0 && fr < ROWS && FARM_MAP[fr][fc] === P;

    this.facingHighlight.setPosition(tx(fc), ty(fr));
    this.facingHighlight.setAlpha(isPlot ? 1 : 0);
  }

  // ============================
  // Interaction
  // ============================

  private handleAction(): void {
    // If menu is open, confirm selection
    if (this.menuOpen) {
      this.confirmMenuSelection();
      return;
    }

    const { dx, dy } = DIR_DELTA[this.facing];
    const fc = this.playerCol + dx;
    const fr = this.playerRow + dy;

    if (fc < 0 || fc >= COLS || fr < 0 || fr >= ROWS) return;

    if (FARM_MAP[fr][fc] === P) {
      const idx = getPlotIndex(fc, fr);
      if (idx !== null) this.openPlotMenu(idx);
    }
  }

  // ============================
  // Action Popup Menu
  // ============================

  private openPlotMenu(plotIdx: number): void {
    const state = GameState.getInstance();
    const status = FarmSystem.getPlotStatus(plotIdx);
    const options: MenuOption[] = [];

    if (status === 'empty') {
      // Offer to plant each unlocked crop
      for (const cropId of state.data.unlockedCrops) {
        const crop = CROPS[cropId];
        if (!crop) continue;
        options.push({
          label: `Plant ${crop.name}`,
          action: () => {
            if (FarmSystem.plant(plotIdx, cropId)) {
              this.showMsg(`Planted ${crop.name}`);
            }
            this.refreshPlots();
            this.updateHUD();
          },
        });
      }
    } else if (status === 'growing') {
      options.push({
        label: 'Water',
        action: () => {
          if (FarmSystem.water(plotIdx)) {
            this.showMsg('Watered! (2x yield)');
          }
          this.refreshPlots();
          this.updateHUD();
        },
      });
    } else if (status === 'watered') {
      // Nothing actionable — just info
      options.push({
        label: 'Already watered',
        action: () => {},
        isMessage: true,
      });
    } else if (status === 'ready') {
      options.push({
        label: 'Harvest',
        action: () => {
          const result = FarmSystem.harvest(plotIdx);
          if (result) {
            this.showMsg(`Harvested ${result.quantity}x ${CROPS[result.cropId].name}!`);
          }
          this.refreshPlots();
          this.updateHUD();
        },
      });
    }

    options.push({
      label: 'Cancel',
      action: () => {},
    });

    this.showMenu(options);
  }

  private showMenu(options: MenuOption[]): void {
    this.menuOptions = options;
    this.menuCursor = options.findIndex(o => !o.isMessage);
    if (this.menuCursor < 0) this.menuCursor = 0;
    this.menuOpen = true;
    this.menuOptionTexts = [];

    // Menu dimensions
    const lineH = 32;
    const padX = 20;
    const padY = 14;
    const arrowW = 22;
    const menuW = 220;
    const menuH = padY * 2 + options.length * lineH;
    const mapW = COLS * TILE;
    const mapH = ROWS * TILE;

    // Position near the player — offset to the right, vertically centered
    const playerPx = tx(this.playerCol);
    const playerPy = ty(this.playerRow);
    let menuX = playerPx + TILE;
    let menuY = playerPy - menuH / 2;

    // Clamp: keep fully inside the map area
    const margin = 6;
    if (menuX + menuW / 2 > mapW - margin) menuX = playerPx - TILE - menuW;
    if (menuX - menuW / 2 < margin) menuX = margin + menuW / 2;
    if (menuY < margin) menuY = margin;
    if (menuY + menuH > mapH - margin) menuY = mapH - margin - menuH;

    this.menuOriginY = menuY;

    this.menuContainer = this.add.container(0, 0).setDepth(200);

    // Shadow
    const shadow = this.add.rectangle(
      menuX + 4, menuY + 4 + menuH / 2,
      menuW, menuH, 0x000000, 0.3,
    );
    this.menuContainer.add(shadow);

    // Background
    const bg = this.add.rectangle(
      menuX, menuY + menuH / 2,
      menuW, menuH, 0xFFF8E7,
    ).setStrokeStyle(3, 0x4A3728);
    this.menuContainer.add(bg);

    // Inner border (double border like Pokemon)
    const inner = this.add.rectangle(
      menuX, menuY + menuH / 2,
      menuW - 8, menuH - 8, 0xFFF8E7, 0,
    ).setStrokeStyle(1, 0xC4A882);
    this.menuContainer.add(inner);

    // Option labels
    for (let i = 0; i < options.length; i++) {
      const optY = menuY + padY + i * lineH + lineH / 2;
      const isMsg = options[i].isMessage;
      const text = this.add.text(
        menuX - menuW / 2 + padX + (isMsg ? 0 : arrowW),
        optY,
        options[i].label,
        {
          fontSize: '18px',
          fontFamily: 'monospace',
          color: isMsg ? '#9E8E7E' : '#4A3728',
          fontStyle: isMsg ? 'italic' : 'normal',
        },
      ).setOrigin(0, 0.5);
      this.menuOptionTexts.push(text);
      this.menuContainer.add(text);
    }

    // Cursor arrow
    const arrowY = menuY + padY + this.menuCursor * lineH + lineH / 2;
    this.menuArrow = this.add.text(menuX - menuW / 2 + padX, arrowY, '\u25B6', {
      fontSize: '16px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0, 0.5);
    this.menuContainer.add(this.menuArrow);

    // Capture arrow keys for menu navigation while open
    this.cursors.up.on('down', this.menuUp, this);
    this.cursors.down.on('down', this.menuDown, this);
    this.wasd.W.on('down', this.menuUp, this);
    this.wasd.S.on('down', this.menuDown, this);
  }

  private menuUp = (): void => {
    if (!this.menuOpen) return;
    const n = this.menuOptions.length;
    let next = (this.menuCursor - 1 + n) % n;
    while (this.menuOptions[next].isMessage && next !== this.menuCursor) {
      next = (next - 1 + n) % n;
    }
    this.menuCursor = next;
    this.updateMenuArrow();
  };

  private menuDown = (): void => {
    if (!this.menuOpen) return;
    const n = this.menuOptions.length;
    let next = (this.menuCursor + 1) % n;
    while (this.menuOptions[next].isMessage && next !== this.menuCursor) {
      next = (next + 1) % n;
    }
    this.menuCursor = next;
    this.updateMenuArrow();
  };

  private updateMenuArrow(): void {
    if (!this.menuArrow) return;
    const padY = 14;
    const lineH = 32;
    const arrowY = this.menuOriginY + padY + this.menuCursor * lineH + lineH / 2;
    this.menuArrow.setY(arrowY);

    // Highlight selected option (messages stay muted)
    for (let i = 0; i < this.menuOptionTexts.length; i++) {
      if (this.menuOptions[i]?.isMessage) continue;
      this.menuOptionTexts[i].setColor(i === this.menuCursor ? '#8B6914' : '#4A3728');
    }
  }

  private confirmMenuSelection(): void {
    const option = this.menuOptions[this.menuCursor];
    this.closeMenu();
    if (option) option.action();
  }

  private closeMenu(): void {
    this.menuOpen = false;

    // Remove navigation listeners
    this.cursors.up.off('down', this.menuUp, this);
    this.cursors.down.off('down', this.menuDown, this);
    this.wasd.W.off('down', this.menuUp, this);
    this.wasd.S.off('down', this.menuDown, this);

    if (this.menuContainer) {
      this.menuContainer.destroy(true);
      this.menuContainer = null;
    }
    this.menuArrow = null;
    this.menuOptionTexts = [];
    this.menuOptions = [];
  }

  // ============================
  // Plot Visuals
  // ============================

  private refreshPlots(): void {
    const state = GameState.getInstance();

    for (let i = 0; i < TOTAL_PLOTS; i++) {
      const plot = state.data.farm.plots[i];
      if (!plot) continue;
      const plotRow = Math.floor(i / PLOT_COLS);
      const row = PLOT_START_ROW + plotRow * PLOT_ROW_STRIDE;
      const col = PLOT_START_COL + (i % PLOT_COLS);
      const tileImg = this.tileImages[row]?.[col];
      const overlay = this.cropOverlays.get(i);

      if (!tileImg || !overlay) continue;

      if (!plot.cropId) {
        tileImg.setTexture('tile_dirt');
        overlay.setFillStyle(0x000000, 0);
      } else if (plot.ready) {
        tileImg.setTexture(plot.wateredToday ? 'tile_dirt_wet' : 'tile_dirt');
        overlay.setFillStyle(this.cropColor(plot.cropId), 1);
        overlay.setSize(24, 24);
      } else if (plot.wateredToday) {
        tileImg.setTexture('tile_dirt_wet');
        overlay.setFillStyle(this.seedColor(plot.cropId), 1);
        overlay.setSize(15, 15);
      } else {
        tileImg.setTexture('tile_dirt');
        overlay.setFillStyle(this.seedColor(plot.cropId), 1);
        overlay.setSize(12, 12);
      }
    }
  }

  private cropColor(id: string): number {
    switch (id) {
      case 'rice': return 0xF5F5DC;
      default: return 0xC8A960; // barley
    }
  }

  private seedColor(id: string): number {
    switch (id) {
      case 'rice': return 0xB8D4B8;
      default: return 0xD4AA70; // barley seed
    }
  }

  // ============================
  // HUD
  // ============================

  private createHUD(): void {
    const w = this.cameras.main.width;
    const panelY = ROWS * TILE;
    const panelH = this.cameras.main.height - panelY;

    // Background
    this.add.rectangle(w / 2, panelY + panelH / 2, w, panelH, 0x1a1a2e);
    this.add.rectangle(w / 2, panelY, w, 3, 0x333355);

    // Row 1: Day + Wallet
    this.hudDay = this.add.text(15, panelY + 15, '', {
      fontSize: '21px', fontFamily: 'monospace', color: '#ffffff',
    });
    this.hudWallet = this.add.text(w - 15, panelY + 15, '', {
      fontSize: '21px', fontFamily: 'monospace', color: '#FFD700',
    }).setOrigin(1, 0);

    // Row 2: Inventory
    this.hudInv = this.add.text(15, panelY + 48, '', {
      fontSize: '17px', fontFamily: 'monospace', color: '#cccccc',
      wordWrap: { width: w - 30 },
    });

    // Row 3: Context prompt
    this.hudPrompt = this.add.text(w / 2, panelY + 110, '', {
      fontSize: '21px', fontFamily: 'monospace', color: '#FFD700',
    }).setOrigin(0.5);

    // Row 4: Action message
    this.hudMsg = this.add.text(w / 2, panelY + 150, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#4CAF50',
    }).setOrigin(0.5);

    // Controls hint
    this.add.text(w / 2, panelY + 222, 'Arrows/WASD: Move | Space: Interact', {
      fontSize: '14px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5);
    this.add.text(w / 2, panelY + 243, 'Esc: Close menu | 0: Dev skip day', {
      fontSize: '14px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5);
  }

  private updateHUD(): void {
    const state = GameState.getInstance();

    this.hudDay.setText(`Day ${state.data.day}`);
    this.hudWallet.setText(`$${state.data.wallet}`);

    const inv = state.data.inventory;
    const lines = Object.entries(inv)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => `${CROPS[id]?.name || id}: ${qty}`)
      .join(' | ');
    this.hudInv.setText(`Inv: ${lines || '(empty)'}`);
  }

  private updatePrompt(): void {
    if (this.menuOpen) {
      this.hudPrompt.setText('');
      return;
    }

    const { dx, dy } = DIR_DELTA[this.facing];
    const fc = this.playerCol + dx;
    const fr = this.playerRow + dy;

    if (fc < 0 || fc >= COLS || fr < 0 || fr >= ROWS) {
      this.hudPrompt.setText('');
      return;
    }

    const t = FARM_MAP[fr][fc];

    if (t === P) {
      const idx = getPlotIndex(fc, fr);
      if (idx !== null) {
        const status = FarmSystem.getPlotStatus(idx);
        const statusLabel: Record<string, string> = {
          empty: 'Empty plot',
          growing: 'Growing...',
          watered: 'Watered',
          ready: 'Ready!',
        };
        this.hudPrompt.setText(`[Space] ${statusLabel[status] || status}`);
        return;
      }
    }

    if (t === X) {
      this.hudPrompt.setText('>> Walk here to exit');
      return;
    }

    this.hudPrompt.setText('');
  }

  private showMsg(text: string): void {
    this.hudMsg.setText(text);
    if (this.msgTimer) this.msgTimer.destroy();
    this.msgTimer = this.time.delayedCall(2500, () => this.hudMsg.setText(''));
  }
}
