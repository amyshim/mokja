import Phaser from 'phaser';
import GameState, { CustomerData } from '../state/GameState';
import { ServingSystem } from '../systems/ServingSystem';
import { CookingSystem } from '../systems/CookingSystem';
import { RecipeSystem } from '../systems/RecipeSystem';
import { RECIPES, PrepStepType } from '../config/recipes';
import { saveGame } from '../state/persistence';

// --- Tile grid constants ---
const TILE = 25;
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
const F = 0; // floor (walkable)
const W = 1; // wall (non-walkable)
const T = 2; // table (non-walkable, interactable)
const C = 3; // chop station (non-walkable, interactable)
const B = 4; // boil station (non-walkable, interactable)
const M = 5; // combine station (non-walkable, interactable)
const P = 6; // path (walkable)
const X = 7; // exit (walkable, triggers transition)
const K = 8; // counter (non-walkable)

// Restaurant layout: dining area (top), counter, kitchen (bottom), exit
// prettier-ignore
const REST_MAP: number[][] = [
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W], // 0  north wall
  [F,F,T,T,F,F,F,F,T,T,F,F,F,F,F,F], // 1  tables 0, 1
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 2  aisle
  [F,F,F,F,T,T,F,F,F,T,T,F,F,F,F,F], // 3  tables 2, 3
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 4  aisle
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 5  dining floor (player spawn)
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 6  dining floor
  [K,K,K,K,F,F,F,F,F,F,F,F,K,K,K,K], // 7  counter (gap cols 4-11)
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 8  kitchen floor
  [F,C,C,F,F,F,B,B,F,F,F,M,M,F,F,F], // 9  stations
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 10 kitchen floor
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 11
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 12
  [F,F,F,F,F,F,F,P,F,F,F,F,F,F,F,F], // 13 path
  [F,F,F,F,F,F,F,X,F,F,F,F,F,F,F,F], // 14 exit
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W], // 15 south wall
];

// Table tile definitions: tableId → positions on map
interface TableTileDef {
  tableId: number;
  cols: [number, number];
  row: number;
}

const TABLE_TILES: TableTileDef[] = [
  { tableId: 0, cols: [2, 3], row: 1 },
  { tableId: 1, cols: [8, 9], row: 1 },
  { tableId: 2, cols: [4, 5], row: 3 },
  { tableId: 3, cols: [9, 10], row: 3 },
];

// Station tile definitions
interface StationTileDef {
  type: PrepStepType;
  cols: [number, number];
  row: number;
}

const STATION_TILES: StationTileDef[] = [
  { type: 'chop', cols: [1, 2], row: 9 },
  { type: 'boil', cols: [6, 7], row: 9 },
  { type: 'combine', cols: [11, 12], row: 9 },
];

function getTableIdAt(col: number, row: number): number | null {
  for (const t of TABLE_TILES) {
    if (row === t.row && (col === t.cols[0] || col === t.cols[1])) return t.tableId;
  }
  return null;
}

function getStationTypeAt(col: number, row: number): PrepStepType | null {
  for (const s of STATION_TILES) {
    if (row === s.row && (col === s.cols[0] || col === s.cols[1])) return s.type;
  }
  return null;
}

function isWalkable(col: number, row: number): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const t = REST_MAP[row][col];
  return t === F || t === P || t === X;
}

function tx(col: number): number { return col * TILE + TILE / 2; }
function ty(row: number): number { return row * TILE + TILE / 2; }

interface TableIndicator {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class ServeScene extends Phaser.Scene {
  // Map
  private tileImages: Phaser.GameObjects.Image[][] = [];
  private tableIndicators: Map<number, TableIndicator> = new Map();

  // Player
  private player!: Phaser.GameObjects.Image;
  private playerCol = 7;
  private playerRow = 5;
  private facing: Direction = 'up';
  private isMoving = false;

  // Facing highlight
  private facingHighlight!: Phaser.GameObjects.Rectangle;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // Cooking state
  private cookingCustomerId: string | null = null;
  private cookingStepIndex = 0;
  private cookingProgress = 0;
  private cookingTarget = 0;

  // Customer spawning
  private spawnedCount = 0;

  // HUD
  private hudTitle!: Phaser.GameObjects.Text;
  private hudEarnings!: Phaser.GameObjects.Text;
  private hudPrompt!: Phaser.GameObjects.Text;
  private hudCookingInfo!: Phaser.GameObjects.Text;
  private hudProgressBg!: Phaser.GameObjects.Rectangle;
  private hudProgressBar!: Phaser.GameObjects.Rectangle;
  private hudMsg!: Phaser.GameObjects.Text;
  private msgTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'Serve' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    const state = GameState.getInstance();

    // Reset state
    this.cookingCustomerId = null;
    this.cookingStepIndex = 0;
    this.cookingProgress = 0;
    this.isMoving = false;
    this.playerCol = 7;
    this.playerRow = 5;
    this.facing = 'up';
    this.spawnedCount = 0;
    this.tableIndicators.clear();

    // Reset tables & customers for new service
    for (const table of state.data.restaurant.tables) {
      table.occupied = false;
      table.dirty = false;
    }
    state.data.restaurant.customers = [];

    this.setupInput();
    this.renderMap();
    this.createPlayer();
    this.createHUD();
    this.updateTableIndicators();

    // Start spawning customers
    this.scheduleNextSpawn();
  }

  update(_time: number, delta: number): void {
    if (!this.isMoving) {
      this.handleMovement();
    }
    this.updatePrompt();
    this.handleBoilHold(delta);
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

    this.spaceKey = this.input.keyboard!.addKey('SPACE');
    this.spaceKey.on('down', () => this.handleAction());
    this.input.keyboard!.addKey('ENTER').on('down', () => this.handleAction());
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
        const t = REST_MAP[row][col];

        let key: string;
        switch (t) {
          case W: key = 'tile_wall'; break;
          case T: key = 'tile_table'; break;
          case C: key = 'tile_chop'; break;
          case B: key = 'tile_boil'; break;
          case M: key = 'tile_combine'; break;
          case K: key = 'tile_counter'; break;
          case P: key = 'tile_path'; break;
          case X: key = 'tile_exit'; break;
          default: key = 'tile_floor'; break;
        }

        const img = this.add.image(cx, cy, key);
        this.tileImages[row][col] = img;
      }
    }

    // Station labels on the map
    for (const s of STATION_TILES) {
      const midX = (tx(s.cols[0]) + tx(s.cols[1])) / 2;
      const labelText = s.type === 'combine' ? 'MIX' : s.type.toUpperCase();
      this.add.text(midX, ty(s.row), labelText, {
        fontSize: '7px', fontFamily: 'monospace', color: '#222222',
      }).setOrigin(0.5);
    }

    // Table customer indicators (overlays)
    for (const t of TABLE_TILES) {
      const midX = (tx(t.cols[0]) + tx(t.cols[1])) / 2;
      const midY = ty(t.row);

      const bg = this.add.rectangle(midX, midY, 40, 16, 0x000000, 0);
      const label = this.add.text(midX, midY, '', {
        fontSize: '8px', fontFamily: 'monospace', color: '#FFFFFF',
      }).setOrigin(0.5);

      this.tableIndicators.set(t.tableId, { bg, label });
    }

    // Exit label
    this.add.text(tx(7), ty(14) + 1, 'EXIT', {
      fontSize: '7px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5);
  }

  // ============================
  // Player
  // ============================

  private createPlayer(): void {
    this.facingHighlight = this.add.rectangle(0, 0, TILE - 2, TILE - 2, 0xFFFF00, 0)
      .setStrokeStyle(2, 0xFFFF00, 0.6);

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

    this.facing = dir;
    this.player.setTexture(`player_${dir}`);
    this.updateFacingHighlight();

    const { dx, dy } = DIR_DELTA[dir];
    const newCol = this.playerCol + dx;
    const newRow = this.playerRow + dy;

    if (!isWalkable(newCol, newRow)) return;

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

        // Exit tile → close service
        if (REST_MAP[newRow][newCol] === X) {
          saveGame();
          this.scene.start('Accounting');
        }
      },
    });
  }

  private updateFacingHighlight(): void {
    const { dx, dy } = DIR_DELTA[this.facing];
    const fc = this.playerCol + dx;
    const fr = this.playerRow + dy;

    if (fc < 0 || fc >= COLS || fr < 0 || fr >= ROWS) {
      this.facingHighlight.setAlpha(0);
      return;
    }

    const t = REST_MAP[fr][fc];
    const isInteractable = t === T || t === C || t === B || t === M;

    this.facingHighlight.setPosition(tx(fc), ty(fr));
    this.facingHighlight.setAlpha(isInteractable ? 1 : 0);
  }

  // ============================
  // Interaction
  // ============================

  private handleAction(): void {
    const { dx, dy } = DIR_DELTA[this.facing];
    const fc = this.playerCol + dx;
    const fr = this.playerRow + dy;

    if (fc < 0 || fc >= COLS || fr < 0 || fr >= ROWS) return;

    const t = REST_MAP[fr][fc];

    // Table interaction
    if (t === T) {
      const tableId = getTableIdAt(fc, fr);
      if (tableId !== null) this.interactTable(tableId);
      return;
    }

    // Station interaction
    if (t === C || t === B || t === M) {
      const stationType = getStationTypeAt(fc, fr);
      if (stationType) this.interactStation(stationType);
      return;
    }
  }

  private interactTable(tableId: number): void {
    const state = GameState.getInstance();
    const table = state.data.restaurant.tables.find(t => t.id === tableId);
    if (!table) return;

    // Clean dirty table
    if (table.dirty) {
      ServingSystem.cleanTable(tableId);
      this.showMsg('Table cleaned!');
      this.updateTableIndicators();
      this.scheduleNextSpawn();
      this.checkServiceDone();
      return;
    }

    const customer = ServingSystem.getCustomerAtTable(tableId);
    if (!customer) return;

    if (customer.status === 'seated') {
      // Take order
      const recipeId = ServingSystem.takeOrder(customer.id);
      if (recipeId) {
        const recipe = RECIPES[recipeId];
        this.showMsg(`Order: ${recipe?.name}`);
      } else {
        // No ingredients — customer leaves
        customer.status = 'served';
        ServingSystem.vacateTable(tableId);
        this.showMsg('No ingredients! Customer left.');
        this.checkServiceDone();
        this.scheduleNextSpawn();
      }
      this.updateTableIndicators();
      return;
    }

    if (customer.status === 'ordered') {
      // Start cooking
      const success = ServingSystem.startCooking(customer.id);
      if (success) {
        this.startCooking(customer.id);
        this.showMsg('Cooking started! Go to the kitchen.');
      } else {
        this.showMsg('Kitchen busy — finish current dish first!');
      }
      this.updateTableIndicators();
      return;
    }

    if (customer.status === 'ready') {
      // Serve
      const revenue = ServingSystem.serveCustomer(customer.id);
      if (revenue !== null) {
        const recipe = customer.orderedRecipeId ? RECIPES[customer.orderedRecipeId] : null;
        this.showMsg(`Served ${recipe?.name}! +$${revenue}`);
        ServingSystem.vacateTable(tableId);
        this.updateTableIndicators();
        this.updateHUD();
        this.checkServiceDone();
      }
      return;
    }

    if (customer.status === 'cooking') {
      this.showMsg('Still cooking — go to the kitchen!');
    }
  }

  private interactStation(stationType: PrepStepType): void {
    if (!this.cookingCustomerId) {
      this.showMsg('Nothing to cook right now.');
      return;
    }

    const customer = this.getCustomer(this.cookingCustomerId);
    if (!customer || !customer.orderedRecipeId) return;

    const steps = CookingSystem.getPrepSteps(customer.orderedRecipeId);
    const step = steps[this.cookingStepIndex];
    if (!step) return;

    // Wrong station
    if (step.type !== stationType) {
      const correctName = step.type === 'combine' ? 'MIX' : step.type.toUpperCase();
      this.showMsg(`Wrong station! Go to ${correctName}.`);
      return;
    }

    // Chop: tap 5 times
    if (step.type === 'chop') {
      this.cookingProgress += this.cookingTarget / 5;
      this.updateCookingProgress();
      if (this.cookingProgress >= this.cookingTarget) {
        this.advanceCookingStep();
      }
      return;
    }

    // Combine: tap 3 times
    if (step.type === 'combine') {
      this.cookingProgress += this.cookingTarget / 3;
      this.updateCookingProgress();
      if (this.cookingProgress >= this.cookingTarget) {
        this.advanceCookingStep();
      }
      return;
    }

    // Boil: handled by hold in update loop — no tap action
  }

  private handleBoilHold(delta: number): void {
    if (!this.spaceKey.isDown || !this.cookingCustomerId) return;

    const customer = this.getCustomer(this.cookingCustomerId);
    if (!customer || !customer.orderedRecipeId) return;

    const steps = CookingSystem.getPrepSteps(customer.orderedRecipeId);
    const step = steps[this.cookingStepIndex];
    if (!step || step.type !== 'boil') return;

    // Must be facing a boil station
    const { dx, dy } = DIR_DELTA[this.facing];
    const fc = this.playerCol + dx;
    const fr = this.playerRow + dy;
    const facedStation = getStationTypeAt(fc, fr);
    if (facedStation !== 'boil') return;

    this.cookingProgress += delta / 1000;
    this.updateCookingProgress();
    if (this.cookingProgress >= this.cookingTarget) {
      this.advanceCookingStep();
    }
  }

  // ============================
  // Cooking State
  // ============================

  private startCooking(customerId: string): void {
    this.cookingCustomerId = customerId;
    this.cookingStepIndex = 0;
    this.cookingProgress = 0;
    this.loadCookingStep();
  }

  private loadCookingStep(): void {
    const customer = this.getCustomer(this.cookingCustomerId!);
    if (!customer || !customer.orderedRecipeId) return;

    const steps = CookingSystem.getPrepSteps(customer.orderedRecipeId);
    const step = steps[this.cookingStepIndex];
    if (!step) return;

    this.cookingTarget = step.duration;
    this.cookingProgress = 0;
    this.updateCookingProgress();
    this.updateHUD();
  }

  private advanceCookingStep(): void {
    const customer = this.getCustomer(this.cookingCustomerId!);
    if (!customer || !customer.orderedRecipeId) return;

    const steps = CookingSystem.getPrepSteps(customer.orderedRecipeId);
    this.cookingStepIndex++;
    this.cookingProgress = 0;

    if (this.cookingStepIndex >= steps.length) {
      // All steps complete
      ServingSystem.finishCooking(customer.id);
      const recipe = RECIPES[customer.orderedRecipeId];
      this.showMsg(`${recipe?.name} ready! Serve at the table.`);
      this.cookingCustomerId = null;
      this.updateTableIndicators();
      this.updateHUD();
    } else {
      this.loadCookingStep();
      const nextStep = steps[this.cookingStepIndex];
      const stationName = nextStep.type === 'combine' ? 'MIX' : nextStep.type.toUpperCase();
      this.showMsg(`Next: ${nextStep.label} — go to ${stationName}`);
    }
  }

  private updateCookingProgress(): void {
    const ratio = Math.min(this.cookingProgress / this.cookingTarget, 1);
    const w = this.cameras.main.width;
    this.hudProgressBar.width = 216 * ratio;
    this.hudProgressBar.x = w / 2 - 108 + this.hudProgressBar.width / 2;
    this.hudProgressBg.setVisible(true);
    this.hudProgressBar.setVisible(true);
  }

  // ============================
  // Customer Spawning
  // ============================

  private scheduleNextSpawn(): void {
    if (!RecipeSystem.canFulfillAnyMenuItem()) {
      this.checkServiceDone();
      return;
    }

    const tableId = ServingSystem.getAvailableTable();
    if (tableId !== null) {
      const delay = this.spawnedCount === 0 ? 500 : Phaser.Math.Between(3000, 5000);
      this.time.delayedCall(delay, () => this.spawnCustomerAtTable());
    } else {
      this.time.delayedCall(1000, () => this.scheduleNextSpawn());
    }
  }

  private spawnCustomerAtTable(): void {
    const tableId = ServingSystem.getAvailableTable();
    if (tableId === null) {
      this.scheduleNextSpawn();
      return;
    }

    if (!RecipeSystem.canFulfillAnyMenuItem()) {
      this.checkServiceDone();
      return;
    }

    const customer = ServingSystem.spawnCustomer(tableId);
    ServingSystem.seatAtTable(customer.id, tableId);
    this.spawnedCount++;

    this.updateTableIndicators();
    this.scheduleNextSpawn();
  }

  // ============================
  // Table Indicators
  // ============================

  private updateTableIndicators(): void {
    const state = GameState.getInstance();

    for (const [tableId, indicator] of this.tableIndicators) {
      const table = state.data.restaurant.tables.find(t => t.id === tableId);
      const customer = ServingSystem.getCustomerAtTable(tableId);

      if (table?.dirty) {
        indicator.bg.setFillStyle(0x8B6914, 0.8);
        indicator.label.setText('DIRTY').setColor('#FFFFFF');
      } else if (customer) {
        switch (customer.status) {
          case 'seated':
            indicator.bg.setFillStyle(0x4488CC, 0.8);
            indicator.label.setText('?').setColor('#FFFFFF');
            break;
          case 'ordered': {
            indicator.bg.setFillStyle(0xD4AA50, 0.8);
            const recipe = customer.orderedRecipeId ? RECIPES[customer.orderedRecipeId] : null;
            indicator.label.setText(recipe?.name?.slice(0, 6) || '...').setColor('#222222');
            break;
          }
          case 'cooking':
            indicator.bg.setFillStyle(0xCC6600, 0.8);
            indicator.label.setText('...').setColor('#FFFFFF');
            break;
          case 'ready':
            indicator.bg.setFillStyle(0x4CAF50, 0.9);
            indicator.label.setText('SERVE!').setColor('#FFFFFF');
            break;
          default:
            indicator.bg.setFillStyle(0x000000, 0);
            indicator.label.setText('');
        }
      } else {
        indicator.bg.setFillStyle(0x000000, 0);
        indicator.label.setText('');
      }
    }
  }

  // ============================
  // Service State
  // ============================

  private checkServiceDone(): void {
    const state = GameState.getInstance();
    const hasActive = state.data.restaurant.customers.some(c => c.status !== 'served');
    const hasDirty = state.data.restaurant.tables.some(t => t.dirty);

    if (!hasActive && !hasDirty && !RecipeSystem.canFulfillAnyMenuItem()) {
      this.showMsg('All done! Walk to EXIT to close.');
    }
  }

  private getCustomer(id: string): CustomerData | null {
    const state = GameState.getInstance();
    return state.data.restaurant.customers.find(c => c.id === id) || null;
  }

  // ============================
  // HUD
  // ============================

  private createHUD(): void {
    const w = this.cameras.main.width;
    const panelY = ROWS * TILE; // 400
    const panelH = this.cameras.main.height - panelY; // 200
    const state = GameState.getInstance();

    // Background
    this.add.rectangle(w / 2, panelY + panelH / 2, w, panelH, 0x1a1a2e);
    this.add.rectangle(w / 2, panelY, w, 2, 0x333355);

    // Row 1: Title + Earnings
    this.hudTitle = this.add.text(10, panelY + 10, `Day ${state.data.day} — Service`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
    });
    this.hudEarnings = this.add.text(w - 10, panelY + 10, '$0', {
      fontSize: '14px', fontFamily: 'monospace', color: '#FFD700',
    }).setOrigin(1, 0);

    // Row 2: Cooking info
    this.hudCookingInfo = this.add.text(10, panelY + 32, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#D4C4A8',
      wordWrap: { width: w - 20 },
    });

    // Row 3: Progress bar
    this.hudProgressBg = this.add.rectangle(w / 2, panelY + 62, 220, 14, 0x333333)
      .setVisible(false);
    this.hudProgressBar = this.add.rectangle(w / 2 - 109, panelY + 62, 2, 10, 0x6B8E5A)
      .setVisible(false);

    // Row 4: Context prompt
    this.hudPrompt = this.add.text(w / 2, panelY + 92, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#FFD700',
    }).setOrigin(0.5);

    // Row 5: Action message
    this.hudMsg = this.add.text(w / 2, panelY + 118, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#4CAF50',
    }).setOrigin(0.5);

    // Controls hints
    this.add.text(w / 2, panelY + 168, 'Arrows/WASD: Move | Space: Act', {
      fontSize: '9px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5);
    this.add.text(w / 2, panelY + 182, 'Walk to EXIT to close service', {
      fontSize: '9px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5);
  }

  private updateHUD(): void {
    const state = GameState.getInstance();
    this.hudEarnings.setText(`$${state.data.dayResults.revenue}`);

    if (this.cookingCustomerId) {
      const customer = this.getCustomer(this.cookingCustomerId);
      if (customer?.orderedRecipeId) {
        const recipe = RECIPES[customer.orderedRecipeId];
        const steps = CookingSystem.getPrepSteps(customer.orderedRecipeId);
        const step = steps[this.cookingStepIndex];
        if (step) {
          const stationName = step.type === 'combine' ? 'MIX' : step.type.toUpperCase();
          this.hudCookingInfo.setText(
            `Cooking: ${recipe?.name} | Step ${this.cookingStepIndex + 1}/${steps.length}: ${step.label}\n` +
            `Go to ${stationName} station | ${step.type === 'boil' ? 'HOLD Space' : 'TAP Space'}`
          );
        }
      }
    } else {
      this.hudCookingInfo.setText('');
      this.hudProgressBg.setVisible(false);
      this.hudProgressBar.setVisible(false);
    }
  }

  private updatePrompt(): void {
    const { dx, dy } = DIR_DELTA[this.facing];
    const fc = this.playerCol + dx;
    const fr = this.playerRow + dy;

    if (fc < 0 || fc >= COLS || fr < 0 || fr >= ROWS) {
      this.hudPrompt.setText('');
      return;
    }

    const t = REST_MAP[fr][fc];

    // Table prompt
    if (t === T) {
      const tableId = getTableIdAt(fc, fr);
      if (tableId !== null) {
        const state = GameState.getInstance();
        const table = state.data.restaurant.tables.find(tb => tb.id === tableId);
        const customer = ServingSystem.getCustomerAtTable(tableId);

        if (table?.dirty) {
          this.hudPrompt.setText('[Space] Clean table');
        } else if (customer) {
          switch (customer.status) {
            case 'seated':
              this.hudPrompt.setText('[Space] Take order');
              break;
            case 'ordered':
              this.hudPrompt.setText('[Space] Start cooking');
              break;
            case 'cooking':
              this.hudPrompt.setText('Cooking in progress...');
              break;
            case 'ready':
              this.hudPrompt.setText('[Space] Serve dish!');
              break;
            default:
              this.hudPrompt.setText('');
          }
        } else {
          this.hudPrompt.setText('Empty table');
        }
        return;
      }
    }

    // Station prompt
    if (t === C || t === B || t === M) {
      const stationType = getStationTypeAt(fc, fr);
      if (stationType && this.cookingCustomerId) {
        const customer = this.getCustomer(this.cookingCustomerId);
        if (customer?.orderedRecipeId) {
          const steps = CookingSystem.getPrepSteps(customer.orderedRecipeId);
          const step = steps[this.cookingStepIndex];
          if (step && step.type === stationType) {
            if (step.type === 'boil') {
              this.hudPrompt.setText('[Hold Space] Boil');
            } else if (step.type === 'chop') {
              this.hudPrompt.setText('[Space] Chop');
            } else {
              this.hudPrompt.setText('[Space] Mix');
            }
            return;
          }
        }
      }
      if (stationType) {
        const label = stationType === 'combine' ? 'Mix' : stationType.charAt(0).toUpperCase() + stationType.slice(1);
        this.hudPrompt.setText(`${label} station`);
      }
      return;
    }

    if (t === X) {
      this.hudPrompt.setText('>> Walk here to close service');
      return;
    }

    this.hudPrompt.setText('');
  }

  private showMsg(text: string): void {
    this.hudMsg.setText(text);
    if (this.msgTimer) this.msgTimer.destroy();
    this.msgTimer = this.time.delayedCall(3000, () => this.hudMsg.setText(''));
    this.updateHUD();
  }
}
