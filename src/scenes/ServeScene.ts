import Phaser from 'phaser';
import GameState, { CustomerData } from '../state/GameState';
import { ServingSystem } from '../systems/ServingSystem';
import { CookingSystem, HeldItem } from '../systems/CookingSystem';
import { RecipeSystem } from '../systems/RecipeSystem';
import { RECIPES } from '../config/recipes';
import { saveGame } from '../state/persistence';

// --- Tile grid constants ---
const TILE = 32;
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
const F = 0;  // floor (walkable)
const W = 1;  // wall (non-walkable)
const T = 2;  // table (non-walkable, interactable)
const K = 8;  // counter (non-walkable)
const P = 6;  // path (walkable)
const X = 7;  // exit (walkable, triggers transition)
// Kitchen station types
const S = 10; // barley bin
const O = 11; // oven
const V = 12; // stove
const U = 13; // cup storage
const L = 14; // kitchen table (surface)
const RB = 15; // rice bin
const SK = 16; // sink
const BW = 17; // bowl station
const TR = 18; // trash bin

// Restaurant layout: dining area (top), counter, kitchen (bottom), exit
// 3 tables with 2 seats each, spread across row 1
// prettier-ignore
const REST_MAP: number[][] = [
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W], // 0  north wall
  [F,F,T,T,F,F,F,T,T,F,F,F,T,T,F,F], // 1  tables 0, 1, 2
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 2  seats / aisle
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 3  dining floor
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 4  dining floor
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 5  dining floor (player spawn)
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 6  dining floor
  [K,K,K,K,F,F,F,F,F,F,F,F,K,K,K,K], // 7  counter (gap cols 4-11)
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 8  kitchen floor
  [S,RB,F,O,F,V,V,V,V,F,U,BW,F,SK,F,TR], // 9  stations
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 10 kitchen floor
  [F,L,F,L,F,F,F,F,L,F,L,F,F,F,F,F], // 11 kitchen tables (4)
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 12
  [F,F,F,F,F,F,F,P,F,F,F,F,F,F,F,F], // 13 path
  [F,F,F,F,F,F,F,X,F,F,F,F,F,F,F,F], // 14 exit
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W], // 15 south wall
];

// Table tile definitions: tableId -> positions on map
interface TableTileDef {
  tableId: number;
  cols: [number, number];
  row: number;
}

const TABLE_TILES: TableTileDef[] = [
  { tableId: 0, cols: [2, 3], row: 1 },
  { tableId: 1, cols: [7, 8], row: 1 },
  { tableId: 2, cols: [12, 13], row: 1 },
];

// Kitchen table tile positions -> index
interface KitchenTableTileDef {
  index: number;
  col: number;
  row: number;
}

const KITCHEN_TABLE_TILES: KitchenTableTileDef[] = [
  { index: 0, col: 1, row: 11 },
  { index: 1, col: 3, row: 11 },
  { index: 2, col: 8, row: 11 },
  { index: 3, col: 10, row: 11 },
];

// --- Customer seat positions per table ---
interface SeatDef {
  col: number;
  row: number;
  facing: Direction;
}

const TABLE_SEATS: Record<number, SeatDef[]> = {
  0: [
    { col: 2, row: 2, facing: 'up' },
    { col: 3, row: 2, facing: 'up' },
  ],
  1: [
    { col: 7, row: 2, facing: 'up' },
    { col: 8, row: 2, facing: 'up' },
  ],
  2: [
    { col: 12, row: 2, facing: 'up' },
    { col: 13, row: 2, facing: 'up' },
  ],
};

// --- Customer appearance ---
interface CustomerAppearance {
  skinColor: number;
  hairColor: number;
  shirtColor: number;
}

const SKIN_TONES = [0xFFDBAC, 0xF1C27D, 0xE0AC69, 0xC68642, 0x8D5524];
const HAIR_COLORS = [0x2C1B18, 0x4A3728, 0x8B6914, 0x090806, 0xB55239, 0xD4A574];
const SHIRT_COLORS = [0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xFFA07A, 0x98D8C8, 0xF7DC6F, 0xBB8FCE, 0x82E0AA, 0x6C5CE7, 0xFD79A8];

const ENTRANCE_COL = 7;
const ENTRANCE_ROW = 14;

// --- Utility functions ---

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAppearance(): CustomerAppearance {
  return {
    skinColor: pickRandom(SKIN_TONES),
    hairColor: pickRandom(HAIR_COLORS),
    shirtColor: pickRandom(SHIRT_COLORS),
  };
}

function getTableIdAt(col: number, row: number): number | null {
  for (const t of TABLE_TILES) {
    if (row === t.row && (col === t.cols[0] || col === t.cols[1])) return t.tableId;
  }
  return null;
}

// Stove tile positions -> index
interface StoveTileDef {
  index: number;
  col: number;
  row: number;
}

const STOVE_TILES: StoveTileDef[] = [];
// Auto-populate from REST_MAP
(() => {
  let idx = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (REST_MAP[r][c] === V) {
        STOVE_TILES.push({ index: idx++, col: c, row: r });
      }
    }
  }
})();

type StationType = 'barley_bin' | 'rice_bin' | 'oven' | 'stove' | 'cups' | 'sink' | 'ktable' | 'bowl' | 'trash';

function getStationAt(col: number, row: number): { type: StationType; index?: number } | null {
  const tile = REST_MAP[row]?.[col];
  if (tile === S) return { type: 'barley_bin' };
  if (tile === RB) return { type: 'rice_bin' };
  if (tile === O) return { type: 'oven' };
  if (tile === V) {
    const st = STOVE_TILES.find(t => t.col === col && t.row === row);
    if (st) return { type: 'stove', index: st.index };
    return { type: 'stove', index: 0 };
  }
  if (tile === U) return { type: 'cups' };
  if (tile === SK) return { type: 'sink' };
  if (tile === BW) return { type: 'bowl' };
  if (tile === TR) return { type: 'trash' };
  if (tile === L) {
    const kt = KITCHEN_TABLE_TILES.find(t => t.col === col && t.row === row);
    if (kt) return { type: 'ktable', index: kt.index };
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

function findPath(startCol: number, startRow: number, endCol: number, endRow: number): { col: number; row: number }[] {
  if (startCol === endCol && startRow === endRow) return [{ col: startCol, row: startRow }];

  const visited = new Set<string>();
  const queue: { col: number; row: number; path: { col: number; row: number }[] }[] = [];

  visited.add(`${startCol},${startRow}`);
  queue.push({ col: startCol, row: startRow, path: [{ col: startCol, row: startRow }] });

  while (queue.length > 0) {
    const { col, row, path } = queue.shift()!;

    for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
      const { dx, dy } = DIR_DELTA[dir];
      const nc = col + dx;
      const nr = row + dy;
      const key = `${nc},${nr}`;

      if (!visited.has(key) && isWalkable(nc, nr)) {
        const newPath = [...path, { col: nc, row: nr }];
        if (nc === endCol && nr === endRow) return newPath;
        visited.add(key);
        queue.push({ col: nc, row: nr, path: newPath });
      }
    }
  }

  return [];
}

// --- Interfaces ---

interface MemberAvatar {
  sprite: Phaser.GameObjects.Image;
  textureBaseKey: string;
  seatCol: number;
  seatRow: number;
  seatFacing: Direction;
}

// Speech bubble indicator per customer
interface OrderIndicator {
  bubble: Phaser.GameObjects.Graphics;
  customerId: string;
  tableId: number;
}

// Item display names (for kitchen table labels)
const ITEM_NAMES: Record<string, string> = {
  barley: 'Barley',
  roasted_barley: 'Roasted Barley',
  empty_cup: 'Empty Cup',
  barley_tea: 'Barley Tea',
  tray: 'Tray',
  rice: 'Rice',
  washed_rice: 'Washed Rice',
  barley_rice: 'Barley Rice',
  bowl: 'Bowl',
};

// Item indicator colors
const ITEM_COLORS: Record<string, number> = {
  barley: 0xD4AA70,
  roasted_barley: 0x8B6914,
  empty_cup: 0xEEEEDD,
  barley_tea: 0xC8A960,
  rice: 0xB8D4B8,
  washed_rice: 0xCCDDCC,
  barley_rice: 0xC4956A,
  bowl: 0xF0E6D2,
};

// --- Scene ---

export class ServeScene extends Phaser.Scene {
  // Map
  private tileImages: Phaser.GameObjects.Image[][] = [];

  // Dirty table indicators (on the table tile)
  private dirtyIndicators: Map<number, Phaser.GameObjects.Graphics> = new Map();

  // Station overlays
  private ovenOverlay!: Phaser.GameObjects.Rectangle;
  private ovenProgressBg!: Phaser.GameObjects.Rectangle;
  private ovenProgressBar!: Phaser.GameObjects.Rectangle;
  private ovenLabel!: Phaser.GameObjects.Text;
  private stoveLabels: Phaser.GameObjects.Text[] = [];
  private sinkLabel!: Phaser.GameObjects.Text;
  private trashLabel!: Phaser.GameObjects.Text;
  private ktableOverlays: Phaser.GameObjects.Rectangle[] = [];
  private ktableLabels: Phaser.GameObjects.Text[] = [];

  // Rice bin / sink station labels (hidden when locked)
  private riceBinStationLabel?: Phaser.GameObjects.Text;
  private sinkStationLabel?: Phaser.GameObjects.Text;

  // Player
  private player!: Phaser.GameObjects.Image;
  private playerCol = 7;
  private playerRow = 5;
  private facing: Direction = 'up';
  private isMoving = false;

  // Held-item indicator (rendered above player)
  private heldIndicator!: Phaser.GameObjects.Graphics;

  // Facing highlight
  private facingHighlight!: Phaser.GameObjects.Rectangle;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // Hold-space state (for stove boil, sink wash, trash discard)
  private isHoldingStove = false;
  private isHoldingSink = false;
  private isHoldingTrash = false;

  // Customer spawning
  private spawnedCount = 0;

  // Customer avatars
  private customerAvatars: Map<string, MemberAvatar[]> = new Map();

  // Order indicators (speech bubbles above customers)
  private orderIndicators: Map<string, OrderIndicator> = new Map();

  // HUD
  private hudTitle!: Phaser.GameObjects.Text;
  private hudEarnings!: Phaser.GameObjects.Text;
  private hudHeld!: Phaser.GameObjects.Text;
  private hudKitchenStatus!: Phaser.GameObjects.Text;
  private hudPrompt!: Phaser.GameObjects.Text;
  private hudMsg!: Phaser.GameObjects.Text;
  private hudBoilBg!: Phaser.GameObjects.Rectangle;
  private hudBoilBar!: Phaser.GameObjects.Rectangle;
  private msgTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'Serve' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    const state = GameState.getInstance();

    // Reset state
    CookingSystem.reset();
    this.isMoving = false;
    this.isHoldingStove = false;
    this.isHoldingSink = false;
    this.isHoldingTrash = false;
    this.playerCol = 7;
    this.playerRow = 5;
    this.facing = 'up';
    this.spawnedCount = 0;
    this.customerAvatars.clear();
    this.orderIndicators.clear();
    this.dirtyIndicators.clear();
    this.ktableOverlays = [];
    this.ktableLabels = [];

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
    this.updateStationOverlays();

    // Start spawning customers
    this.scheduleNextSpawn();

    // Cleanup customer textures on shutdown
    this.events.on('shutdown', () => {
      for (const [, avatars] of this.customerAvatars) {
        for (const avatar of avatars) {
          for (const dir of ['up', 'down', 'left', 'right']) {
            const key = `${avatar.textureBaseKey}_${dir}`;
            if (this.textures.exists(key)) this.textures.remove(key);
          }
        }
      }
      this.customerAvatars.clear();
    });
  }

  update(_time: number, delta: number): void {
    const deltaSec = delta / 1000;

    if (!this.isMoving) {
      this.handleMovement();
    }

    // Update oven timer
    CookingSystem.updateOven(deltaSec);

    // Handle stove hold (boil tea or cook rice)
    this.handleStoveHold(deltaSec);

    // Handle sink hold (wash rice)
    this.handleSinkHold(deltaSec);

    // Handle trash hold (discard held item)
    this.handleTrashHold(deltaSec);

    this.updatePrompt();
    this.updateStationOverlays();
    this.updateHeldIndicator();
    this.updateOrderIndicators();
    this.updateDirtyIndicators();
    this.updateHUD();
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

    // R key no longer discards — use the trash bin station instead
  }

  // ============================
  // Map Rendering
  // ============================

  private renderMap(): void {
    this.tileImages = [];
    const state = GameState.getInstance();
    const riceUnlocked = state.isCropUnlocked('rice');

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
          case K: key = 'tile_counter'; break;
          case P: key = 'tile_path'; break;
          case X: key = 'tile_exit'; break;
          case S: key = 'tile_bin'; break;
          case RB: key = riceUnlocked ? 'tile_rice_bin' : 'tile_floor'; break;
          case O: key = 'tile_oven'; break;
          case V: key = 'tile_stove'; break;
          case U: key = 'tile_cups'; break;
          case SK: key = riceUnlocked ? 'tile_sink' : 'tile_floor'; break;
          case BW: key = riceUnlocked ? 'tile_bowls' : 'tile_floor'; break;
          case TR: key = 'tile_trash'; break;
          case L: key = 'tile_ktable'; break;
          default: key = 'tile_floor'; break;
        }

        const img = this.add.image(cx, cy, key);
        this.tileImages[row][col] = img;
      }
    }

    // Station labels
    const labelStyle = { fontSize: '8px', fontFamily: 'monospace', color: '#FFFFFF' };
    this.add.text(tx(0), ty(9) + 1, 'BIN', labelStyle).setOrigin(0.5);
    if (riceUnlocked) {
      this.riceBinStationLabel = this.add.text(tx(1), ty(9) + 1, 'RICE', labelStyle).setOrigin(0.5);
    }
    this.add.text(tx(3), ty(9) + 1, 'OVEN', labelStyle).setOrigin(0.5);
    // Stove labels generated per-stove below
    this.add.text(tx(10), ty(9) + 1, 'CUPS', { fontSize: '8px', fontFamily: 'monospace', color: '#222222' }).setOrigin(0.5);
    if (riceUnlocked) {
      this.add.text(tx(11), ty(9) + 1, 'BOWL', labelStyle).setOrigin(0.5);
      this.sinkStationLabel = this.add.text(tx(13), ty(9) + 1, 'SINK', labelStyle).setOrigin(0.5);
    }
    this.add.text(tx(15), ty(9) + 1, 'TRASH', { fontSize: '6px', fontFamily: 'monospace', color: '#FFFFFF' }).setOrigin(0.5);

    // Oven progress overlay
    const ovenX = tx(3);
    const ovenY = ty(9);
    this.ovenOverlay = this.add.rectangle(ovenX, ovenY - 12, 24, 5, 0x000000, 0).setDepth(15);
    this.ovenProgressBg = this.add.rectangle(ovenX, ovenY - 12, 24, 5, 0x333333, 0.8).setDepth(15);
    this.ovenProgressBar = this.add.rectangle(ovenX - 12, ovenY - 12, 0, 5, 0x44CC44).setDepth(16).setOrigin(0, 0.5);
    this.ovenLabel = this.add.text(ovenX, ovenY - 20, '', {
      fontSize: '7px', fontFamily: 'monospace', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(16);

    // Stove label overlays (one per stove)
    this.stoveLabels = [];
    for (const st of STOVE_TILES) {
      const sx = tx(st.col);
      const sy = ty(st.row);
      const lbl = this.add.text(sx, sy - 16, '', {
        fontSize: '7px', fontFamily: 'monospace', color: '#FFFFFF',
      }).setOrigin(0.5).setDepth(16);
      this.stoveLabels.push(lbl);
    }

    // Sink label overlay
    const sinkX = tx(13);
    const sinkY = ty(9);
    this.sinkLabel = this.add.text(sinkX, sinkY - 16, '', {
      fontSize: '7px', fontFamily: 'monospace', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(16);

    // Trash label overlay
    const trashX = tx(15);
    const trashY = ty(9);
    this.trashLabel = this.add.text(trashX, trashY - 16, '', {
      fontSize: '7px', fontFamily: 'monospace', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(16);

    // Kitchen table overlays
    for (const kt of KITCHEN_TABLE_TILES) {
      const ktx = tx(kt.col);
      const kty = ty(kt.row);
      const overlay = this.add.rectangle(ktx, kty, 20, 20, 0x000000, 0).setDepth(15);
      const label = this.add.text(ktx, kty, '', {
        fontSize: '6px', fontFamily: 'monospace', color: '#FFFFFF',
      }).setOrigin(0.5).setDepth(16);
      this.ktableOverlays.push(overlay);
      this.ktableLabels.push(label);
    }

    // Exit label
    this.add.text(tx(7), ty(14) + 1, 'EXIT', {
      fontSize: '8px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5);
  }

  // ============================
  // Player
  // ============================

  private createPlayer(): void {
    this.facingHighlight = this.add.rectangle(0, 0, TILE - 2, TILE - 2, 0xFFFF00, 0)
      .setStrokeStyle(2, 0xFFFF00, 0.6)
      .setDepth(10);

    this.player = this.add.image(tx(this.playerCol), ty(this.playerRow), `player_${this.facing}`)
      .setDepth(11);

    this.heldIndicator = this.add.graphics().setDepth(12);

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

        // Exit tile -> close service
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
    const isInteractable = t === T || t === S || t === RB || t === O || t === V || t === U || t === SK || t === L || t === BW || t === TR;

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

    // Table interaction (customer tables)
    if (t === T) {
      const tableId = getTableIdAt(fc, fr);
      if (tableId !== null) this.interactTable(tableId);
      return;
    }

    // Kitchen station interactions
    const station = getStationAt(fc, fr);
    if (station) {
      this.interactStation(station);
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
      this.scheduleNextSpawn();
      this.checkServiceDone();
      return;
    }

    const customer = ServingSystem.getCustomerAtTable(tableId);
    if (!customer) return;

    if (customer.status === 'seated') {
      // Take order for the whole group at once
      const recipeId = ServingSystem.takeOrder(customer.id);
      if (recipeId) {
        const recipe = RECIPES[recipeId];
        const count = customer.servingsNeeded;
        this.showMsg(`Order: ${count}x ${recipe?.name}`);
      } else {
        // No ingredients — customer leaves
        customer.status = 'served';
        this.removeOrderIndicator(customer.id);
        this.startCustomerWalkOut(customer.id);
        ServingSystem.vacateTable(tableId);
        this.showMsg('No ingredients! Customer left.');
        this.checkServiceDone();
        this.scheduleNextSpawn();
      }
      return;
    }

    if (customer.status === 'ordered') {
      const recipeId = customer.orderedRecipeId!;
      // Serve one portion at a time — check player is holding the right item
      if (CookingSystem.canServe(recipeId)) {
        CookingSystem.serveOne(recipeId);
        const result = ServingSystem.serveCustomer(customer.id);
        if (result !== null) {
          const recipe = RECIPES[recipeId];
          const remaining = customer.servingsNeeded - customer.servingsDelivered;
          if (result.allDone) {
            this.showMsg(`Served ${recipe?.name}! +$${result.revenue}`);
            this.removeOrderIndicator(customer.id);
            this.startCustomerWalkOut(customer.id);
            ServingSystem.vacateTable(tableId);
            this.checkServiceDone();
          } else {
            this.showMsg(`Served 1 ${recipe?.name} (+$${result.revenue}) — ${remaining} more`);
          }
        }
      } else {
        const recipe = RECIPES[recipeId];
        this.showMsg(`Need ${recipe?.name} to serve!`);
      }
      return;
    }
  }

  private interactStation(station: { type: StationType; index?: number }): void {
    let err: string | null = null;

    switch (station.type) {
      case 'barley_bin':
        err = CookingSystem.interactBarleyBin();
        if (!err) this.showMsg('Picked up barley');
        break;
      case 'rice_bin':
        err = CookingSystem.interactRiceBin();
        if (!err) this.showMsg('Picked up rice');
        break;
      case 'oven':
        err = CookingSystem.interactOven();
        if (!err) {
          if (CookingSystem.oven.state === 'roasting') this.showMsg('Roasting barley...');
          else if (CookingSystem.heldItem === 'roasted_barley') this.showMsg('Picked up roasted barley');
        }
        break;
      case 'stove': {
        const si = station.index ?? 0;
        err = CookingSystem.interactStove(si);
        if (!err) {
          const s = CookingSystem.stoves[si];
          if (s.state === 'has_roasted_barley') this.showMsg('Added barley to stove');
          else if (s.state === 'has_washed_rice') this.showMsg('Added washed rice to stove');
          else if (s.state === 'has_rice_and_barley') this.showMsg('Added barley — ready to cook!');
          else if (s.state === 'boiling_tea') this.showMsg('Hold Space to boil!');
          else if (s.state === 'cooking_rice') this.showMsg('Hold Space to cook!');
          else if (CookingSystem.heldItem === 'barley_rice') this.showMsg('Picked up Barley Rice!');
          else {
            const remaining = s.cupsRemaining;
            if (s.state === 'empty' && remaining <= 0) {
              this.showMsg('Filled cup! Stove empty.');
            } else if (s.state === 'hot_with_tea') {
              this.showMsg(`Filled cup! (${remaining} left)`);
            }
          }
        }
        break;
      }
      case 'sink':
        err = CookingSystem.interactSink();
        if (!err) {
          if (CookingSystem.sink.state === 'washing') this.showMsg('Hold Space to wash rice!');
          else if (CookingSystem.heldItem === 'washed_rice') this.showMsg('Picked up washed rice');
        }
        break;
      case 'cups': {
        err = CookingSystem.interactCups();
        if (!err) {
          if (CookingSystem.heldItem === 'tray') {
            this.showMsg(`Tray: ${CookingSystem.trayTotal} cups`);
          } else {
            this.showMsg('Picked up empty cup');
          }
        }
        break;
      }
      case 'bowl':
        err = CookingSystem.interactBowls();
        if (!err) this.showMsg('Picked up bowl');
        break;
      case 'trash':
        if (CookingSystem.heldItem === null) {
          err = 'Nothing to discard!';
        } else {
          err = 'Hold Space to discard';
        }
        break;
      case 'ktable':
        if (station.index !== undefined) {
          err = CookingSystem.interactKitchenTable(station.index);
          if (!err) {
            if (CookingSystem.heldItem) {
              this.showMsg('Picked up item');
            } else {
              this.showMsg('Placed item on table');
            }
          }
        }
        break;
    }

    if (err) this.showMsg(err);
  }

  private handleStoveHold(deltaSec: number): void {
    const { dx, dy } = DIR_DELTA[this.facing];
    const fc = this.playerCol + dx;
    const fr = this.playerRow + dy;
    const station = getStationAt(fc, fr);

    if (station?.type === 'stove' && station.index !== undefined) {
      const si = station.index;
      if (CookingSystem.isStoveHoldState(si) && this.spaceKey.isDown) {
        this.isHoldingStove = true;
        const done = CookingSystem.updateStoveBoil(si, deltaSec);
        if (done) {
          this.isHoldingStove = false;
          const stove = CookingSystem.stoves[si];
          if (stove.state === 'hot_with_tea') {
            this.showMsg('Tea ready! Fill cups here.');
          } else if (stove.state === 'has_barley_rice') {
            this.showMsg(`Barley Rice cooked! x${stove.servingsRemaining} servings.`);
          }
        }
      } else if (!this.spaceKey.isDown && this.isHoldingStove) {
        this.isHoldingStove = false;
      }
    } else if (!this.spaceKey.isDown && this.isHoldingStove) {
      this.isHoldingStove = false;
    }
  }

  private handleSinkHold(deltaSec: number): void {
    if (CookingSystem.isSinkHoldState() && this.spaceKey.isDown) {
      const { dx, dy } = DIR_DELTA[this.facing];
      const fc = this.playerCol + dx;
      const fr = this.playerRow + dy;
      const station = getStationAt(fc, fr);
      if (station?.type === 'sink') {
        this.isHoldingSink = true;
        const done = CookingSystem.updateSinkWash(deltaSec);
        if (done) {
          this.isHoldingSink = false;
          this.showMsg('Rice washed! Pick it up.');
        }
      }
    } else if (CookingSystem.isSinkHoldState() && !this.spaceKey.isDown && this.isHoldingSink) {
      this.isHoldingSink = false;
    }
  }

  private handleTrashHold(deltaSec: number): void {
    const { dx, dy } = DIR_DELTA[this.facing];
    const fc = this.playerCol + dx;
    const fr = this.playerRow + dy;
    const station = getStationAt(fc, fr);

    if (station?.type === 'trash' && CookingSystem.heldItem !== null && this.spaceKey.isDown) {
      this.isHoldingTrash = true;
      const done = CookingSystem.updateTrashHold(deltaSec);
      if (done) {
        this.isHoldingTrash = false;
        this.showMsg('Discarded!');
      }
    } else {
      if (this.isHoldingTrash) {
        CookingSystem.resetTrashHold();
        this.isHoldingTrash = false;
      }
    }
  }

  // ============================
  // Held-Item Indicator
  // ============================

  private updateHeldIndicator(): void {
    this.heldIndicator.clear();

    const held = CookingSystem.heldItem;
    if (!held) return;

    const px = this.player.x;
    const py = this.player.y - 18;

    if (held === 'tray') {
      const total = CookingSystem.trayTotal;
      const slotW = 6;
      const slotH = 6;
      const gap = 1;
      const totalW = total * slotW + (total - 1) * gap;
      const startX = px - totalW / 2;

      let drawn = 0;
      for (let i = 0; i < CookingSystem.trayFilled; i++) {
        const sx = startX + drawn * (slotW + gap);
        this.heldIndicator.fillStyle(0xC8A960, 1);
        this.heldIndicator.fillRect(sx, py - slotH / 2, slotW, slotH);
        this.heldIndicator.lineStyle(1, 0x000000, 0.4);
        this.heldIndicator.strokeRect(sx, py - slotH / 2, slotW, slotH);
        drawn++;
      }
      for (let i = 0; i < CookingSystem.trayEmpty; i++) {
        const sx = startX + drawn * (slotW + gap);
        this.heldIndicator.fillStyle(0xEEEEDD, 1);
        this.heldIndicator.fillRect(sx, py - slotH / 2, slotW, slotH);
        this.heldIndicator.lineStyle(1, 0x000000, 0.4);
        this.heldIndicator.strokeRect(sx, py - slotH / 2, slotW, slotH);
        drawn++;
      }
    } else {
      const color = ITEM_COLORS[held] || 0x666666;
      this.heldIndicator.fillStyle(color, 1);
      this.heldIndicator.fillCircle(px, py, 4);
      this.heldIndicator.lineStyle(1, 0x000000, 0.5);
      this.heldIndicator.strokeCircle(px, py, 4);
    }
  }

  // ============================
  // Order Indicators (Speech Bubbles)
  // ============================

  private createOrderIndicator(customerId: string, tableId: number): void {
    const bubble = this.add.graphics().setDepth(30);
    this.orderIndicators.set(customerId, { bubble, customerId, tableId });
  }

  private removeOrderIndicator(customerId: string): void {
    const indicator = this.orderIndicators.get(customerId);
    if (indicator) {
      indicator.bubble.destroy();
      this.orderIndicators.delete(customerId);
    }
  }

  private updateOrderIndicators(): void {
    const state = GameState.getInstance();

    for (const customer of state.data.restaurant.customers) {
      // Skip walking and served customers
      if (customer.status === 'walking' || customer.status === 'served') {
        // Remove indicator if exists
        if (this.orderIndicators.has(customer.id)) {
          this.removeOrderIndicator(customer.id);
        }
        continue;
      }

      // Create indicator if it doesn't exist
      if (!this.orderIndicators.has(customer.id)) {
        this.createOrderIndicator(customer.id, customer.tableId);
      }

      const indicator = this.orderIndicators.get(customer.id);
      if (!indicator) continue;

      // Position centered over the table (between the two table tiles)
      const tableDef = TABLE_TILES.find(t => t.tableId === customer.tableId);
      if (!tableDef) continue;
      const bx = (tx(tableDef.cols[0]) + tx(tableDef.cols[1])) / 2;
      const by = ty(tableDef.row) - 14;

      indicator.bubble.clear();

      if (customer.status === 'seated') {
        // White speech bubble with red "!"
        this.drawSpeechBubble(indicator.bubble, bx, by, 22, 20);
        indicator.bubble.fillStyle(0xFF3333, 1);
        indicator.bubble.fillRect(bx - 2, by - 7, 4, 8);
        indicator.bubble.fillRect(bx - 2, by + 3, 4, 4);
      } else if (customer.status === 'ordered') {
        // Show N food icons (one per remaining serving)
        const remaining = customer.servingsNeeded - customer.servingsDelivered;
        const recipe = customer.orderedRecipeId ? RECIPES[customer.orderedRecipeId] : null;
        const iconColor = recipe?.iconColor ?? 0xC8A960;
        const recipeId = customer.orderedRecipeId;
        const iconSize = 12;
        const gap = 4;
        const totalW = remaining * iconSize + (remaining - 1) * gap;
        const bubbleW = Math.max(26, totalW + 14);
        const bubbleH = 24;

        this.drawSpeechBubble(indicator.bubble, bx, by, bubbleW, bubbleH);

        // Draw each food icon with distinctive shapes
        const startX = bx - totalW / 2 + iconSize / 2;
        for (let i = 0; i < remaining; i++) {
          const ix = startX + i * (iconSize + gap);
          this.drawFoodIcon(indicator.bubble, ix, by, iconSize, iconColor, recipeId || '');
        }
      }
    }
  }

  private drawSpeechBubble(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number): void {
    const halfW = w / 2;
    const halfH = h / 2;

    // White rounded rectangle
    gfx.fillStyle(0xFFFFFF, 0.95);
    gfx.fillRoundedRect(cx - halfW, cy - halfH, w, h, 4);
    gfx.lineStyle(1.5, 0x333333, 0.6);
    gfx.strokeRoundedRect(cx - halfW, cy - halfH, w, h, 4);

    // Triangle pointer at bottom
    gfx.fillStyle(0xFFFFFF, 0.95);
    gfx.fillTriangle(cx - 3, cy + halfH - 1, cx + 3, cy + halfH - 1, cx, cy + halfH + 5);
    // Outline for triangle
    gfx.lineStyle(1.5, 0x333333, 0.6);
    gfx.lineBetween(cx - 3, cy + halfH - 1, cx, cy + halfH + 5);
    gfx.lineBetween(cx + 3, cy + halfH - 1, cx, cy + halfH + 5);
  }

  private drawFoodIcon(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, color: number, recipeId: string): void {
    const half = size / 2;
    if (recipeId === 'barley_tea') {
      // Cup shape
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(cx - half + 1, cy - half + 2, size - 2, size - 3, 2);
      // Handle
      gfx.lineStyle(1.5, color, 1);
      gfx.strokeCircle(cx + half - 1, cy, 2);
      // Steam line
      gfx.lineStyle(1, 0xCCCCCC, 0.7);
      gfx.lineBetween(cx - 1, cy - half, cx, cy - half - 2);
      gfx.lineBetween(cx + 1, cy - half, cx + 2, cy - half - 2);
    } else if (recipeId === 'barley_rice') {
      // Bowl shape
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(cx - half, cy - half + 2, size, size - 2, 4);
      // Rice dots inside
      gfx.fillStyle(0xFFFFFF, 0.5);
      gfx.fillCircle(cx - 2, cy, 1.5);
      gfx.fillCircle(cx + 2, cy, 1.5);
      gfx.fillCircle(cx, cy - 2, 1.5);
      // Outline
      gfx.lineStyle(1, 0x000000, 0.3);
      gfx.strokeRoundedRect(cx - half, cy - half + 2, size, size - 2, 4);
    } else {
      // Generic colored square
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(cx - half, cy - half, size, size, 3);
      gfx.lineStyle(1, 0x000000, 0.3);
      gfx.strokeRoundedRect(cx - half, cy - half, size, size, 3);
    }
  }

  // ============================
  // Dirty Table Indicators
  // ============================

  private updateDirtyIndicators(): void {
    const state = GameState.getInstance();

    for (const table of state.data.restaurant.tables) {
      if (table.dirty) {
        if (!this.dirtyIndicators.has(table.id)) {
          const gfx = this.add.graphics().setDepth(20);
          this.dirtyIndicators.set(table.id, gfx);
        }
        const gfx = this.dirtyIndicators.get(table.id)!;
        gfx.clear();

        // Draw brown splatters on table tiles
        const tableDef = TABLE_TILES.find(t => t.tableId === table.id);
        if (tableDef) {
          const midX = (tx(tableDef.cols[0]) + tx(tableDef.cols[1])) / 2;
          const midY = ty(tableDef.row);
          gfx.fillStyle(0x8B6914, 0.7);
          gfx.fillCircle(midX - 6, midY - 3, 4);
          gfx.fillCircle(midX + 5, midY + 2, 3);
          gfx.fillCircle(midX - 2, midY + 4, 3);
          // "DIRTY" text label
          gfx.fillStyle(0x5A3A0A, 0.8);
          gfx.fillRoundedRect(midX - 18, midY - 12, 36, 12, 2);
        }
      } else {
        if (this.dirtyIndicators.has(table.id)) {
          this.dirtyIndicators.get(table.id)!.destroy();
          this.dirtyIndicators.delete(table.id);
        }
      }
    }
  }

  // ============================
  // Station Overlays
  // ============================

  private updateStationOverlays(): void {
    // Oven
    const oven = CookingSystem.oven;
    if (oven.state === 'empty') {
      this.ovenProgressBg.setVisible(false);
      this.ovenProgressBar.setVisible(false);
      this.ovenLabel.setText('');
    } else if (oven.state === 'roasting') {
      this.ovenProgressBg.setVisible(true);
      this.ovenProgressBar.setVisible(true);
      const ratio = Math.min(oven.timer / CookingSystem.ROAST_TIME, 1);
      this.ovenProgressBar.width = 24 * ratio;
      this.ovenProgressBar.setFillStyle(0x44CC44);
      this.ovenLabel.setText('');
    } else if (oven.state === 'done') {
      this.ovenProgressBg.setVisible(true);
      this.ovenProgressBar.setVisible(true);
      this.ovenProgressBar.width = 24;
      this.ovenProgressBar.setFillStyle(0x44CC44);
      this.ovenLabel.setText('DONE').setColor('#44FF44');
    } else if (oven.state === 'burned') {
      this.ovenProgressBg.setVisible(true);
      this.ovenProgressBar.setVisible(true);
      this.ovenProgressBar.width = 24;
      this.ovenProgressBar.setFillStyle(0xFF4444);
      this.ovenLabel.setText('BURN').setColor('#FF4444');
    }

    // Stoves (multiple)
    for (let i = 0; i < CookingSystem.stoves.length; i++) {
      const stove = CookingSystem.stoves[i];
      const label = this.stoveLabels[i];
      if (!label) continue;

      if (stove.state === 'empty') {
        label.setText('');
      } else if (stove.state === 'has_roasted_barley') {
        label.setText('BOIL?').setColor('#FFAA00');
      } else if (stove.state === 'boiling_tea') {
        const pct = Math.floor(CookingSystem.getBoilProgress(i) * 100);
        label.setText(`TEA ${pct}%`).setColor('#FFAA00');
      } else if (stove.state === 'hot_with_tea') {
        label.setText(`x${stove.cupsRemaining}`).setColor('#44FF44');
      } else if (stove.state === 'has_washed_rice') {
        label.setText('+BRL?').setColor('#AADDAA');
      } else if (stove.state === 'has_rice_and_barley') {
        label.setText('COOK?').setColor('#FFAA00');
      } else if (stove.state === 'cooking_rice') {
        const pct = Math.floor(CookingSystem.getBoilProgress(i) * 100);
        label.setText(`RICE ${pct}%`).setColor('#FFAA00');
      } else if (stove.state === 'has_barley_rice') {
        label.setText(`x${stove.servingsRemaining}`).setColor('#44FF44');
      }
    }

    // Sink
    const sink = CookingSystem.sink;
    if (sink.state === 'empty') {
      this.sinkLabel.setText('');
    } else if (sink.state === 'washing') {
      const pct = Math.floor(CookingSystem.getWashProgress() * 100);
      this.sinkLabel.setText(`${pct}%`).setColor('#66BBFF');
    } else if (sink.state === 'done') {
      this.sinkLabel.setText('DONE').setColor('#44FF44');
    }

    // Trash
    if (this.isHoldingTrash) {
      const pct = Math.floor(CookingSystem.getTrashProgress() * 100);
      this.trashLabel.setText(`${pct}%`).setColor('#FF6666');
    } else {
      this.trashLabel.setText('');
    }

    // Kitchen tables
    for (let i = 0; i < CookingSystem.kitchenTables.length; i++) {
      const kt = CookingSystem.kitchenTables[i];
      const overlay = this.ktableOverlays[i];
      const label = this.ktableLabels[i];
      if (!overlay || !label) continue;

      if (kt.item) {
        const color = this.getItemColor(kt.item);
        overlay.setFillStyle(color, 0.8);
        if (kt.item === 'tray') {
          const parts: string[] = [];
          if (kt.trayFilled > 0) parts.push(`${kt.trayFilled}T`);
          if (kt.trayEmpty > 0) parts.push(`${kt.trayEmpty}C`);
          label.setText(parts.join('+'));
        } else {
          label.setText(this.getItemShortName(kt.item));
        }
      } else {
        overlay.setFillStyle(0x000000, 0);
        label.setText('');
      }
    }
  }

  private getItemColor(item: HeldItem): number {
    switch (item) {
      case 'barley': return 0xD4AA70;
      case 'roasted_barley': return 0x8B6914;
      case 'empty_cup': return 0xEEEEDD;
      case 'barley_tea': return 0xC8A960;
      case 'tray': return 0xAA8866;
      case 'rice': return 0xB8D4B8;
      case 'washed_rice': return 0xCCDDCC;
      case 'barley_rice': return 0xC4956A;
      case 'bowl': return 0xF0E6D2;
      default: return 0x666666;
    }
  }

  private getItemShortName(item: HeldItem): string {
    switch (item) {
      case 'barley': return 'BRL';
      case 'roasted_barley': return 'RST';
      case 'empty_cup': return 'CUP';
      case 'barley_tea': return 'TEA';
      case 'tray': return 'TRAY';
      case 'rice': return 'RICE';
      case 'washed_rice': return 'WSHD';
      case 'barley_rice': return 'B.R.';
      case 'bowl': return 'BOWL';
      default: return '';
    }
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

    this.spawnCustomerAvatars(customer);

    this.scheduleNextSpawn();
  }

  // ============================
  // Customer Avatars
  // ============================

  private generateCustomerTextures(baseKey: string, appearance: CustomerAppearance): void {
    const w = 24;
    const h = 28;

    for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
      const key = `${baseKey}_${dir}`;
      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.setVisible(false);

      // Hair
      gfx.fillStyle(appearance.hairColor, 1);
      gfx.fillRoundedRect(3, 1, w - 4, 9, 4);

      // Head / face skin
      gfx.fillStyle(appearance.skinColor, 1);
      switch (dir) {
        case 'down':
          gfx.fillRoundedRect(5, 5, w - 8, 8, 2);
          break;
        case 'up':
          break;
        case 'left':
          gfx.fillRoundedRect(3, 5, 10, 8, 2);
          break;
        case 'right':
          gfx.fillRoundedRect(w - 11, 5, 10, 8, 2);
          break;
      }

      // Body (shirt)
      gfx.fillStyle(appearance.shirtColor, 1);
      gfx.fillRoundedRect(2, 13, w - 2, 10, 3);
      gfx.lineStyle(1, 0x000000, 0.2);
      gfx.strokeRoundedRect(2, 13, w - 2, 10, 3);

      // Legs/pants
      gfx.fillStyle(0x445566, 1);
      gfx.fillRoundedRect(4, 22, 8, 6, 2);
      gfx.fillRoundedRect(14, 22, 8, 6, 2);

      // Eyes
      gfx.fillStyle(0x333333, 1);
      switch (dir) {
        case 'down':
          gfx.fillRect(8, 8, 2, 2);
          gfx.fillRect(16, 8, 2, 2);
          break;
        case 'up':
          break;
        case 'left':
          gfx.fillRect(6, 8, 2, 2);
          break;
        case 'right':
          gfx.fillRect(18, 8, 2, 2);
          break;
      }

      gfx.generateTexture(key, w + 2, h + 2);
      gfx.destroy();
    }
  }

  private spawnCustomerAvatars(customer: CustomerData): void {
    const tableSeats = TABLE_SEATS[customer.tableId];
    if (!tableSeats) return;

    const numMembers = Math.min(customer.groupSize, tableSeats.length);
    const avatars: MemberAvatar[] = [];
    let seatedCount = 0;

    for (let i = 0; i < numMembers; i++) {
      const seat = tableSeats[i];
      const appearance = randomAppearance();
      const textureBaseKey = `${customer.id}_m${i}`;

      this.generateCustomerTextures(textureBaseKey, appearance);

      const sprite = this.add.image(tx(ENTRANCE_COL), ty(ENTRANCE_ROW), `${textureBaseKey}_down`)
        .setDepth(5);

      avatars.push({
        sprite,
        textureBaseKey,
        seatCol: seat.col,
        seatRow: seat.row,
        seatFacing: seat.facing,
      });

      const path = findPath(ENTRANCE_COL, ENTRANCE_ROW, seat.col, seat.row);
      if (path.length > 1) {
        this.animateWalkPath(sprite, textureBaseKey, path, i * 300, () => {
          if (sprite.active) sprite.setTexture(`${textureBaseKey}_${seat.facing}`);
          seatedCount++;
          // Mark as seated only after ALL members arrive
          if (seatedCount === numMembers) {
            ServingSystem.markSeated(customer.id);
          }
        });
      } else {
        sprite.setPosition(tx(seat.col), ty(seat.row));
        sprite.setTexture(`${textureBaseKey}_${seat.facing}`);
        seatedCount++;
        if (seatedCount === numMembers) {
          ServingSystem.markSeated(customer.id);
        }
      }
    }

    this.customerAvatars.set(customer.id, avatars);
  }

  private animateWalkPath(
    sprite: Phaser.GameObjects.Image,
    textureBaseKey: string,
    path: { col: number; row: number }[],
    delay: number,
    onComplete: () => void,
  ): void {
    if (delay > 0) {
      sprite.setAlpha(0);
      this.time.delayedCall(delay, () => {
        if (!sprite.active) return;
        sprite.setAlpha(1);
        this.walkStep(sprite, textureBaseKey, path, 1, onComplete);
      });
    } else {
      this.walkStep(sprite, textureBaseKey, path, 1, onComplete);
    }
  }

  private walkStep(
    sprite: Phaser.GameObjects.Image,
    textureBaseKey: string,
    path: { col: number; row: number }[],
    stepIndex: number,
    onComplete: () => void,
  ): void {
    if (!sprite.active) return;

    if (stepIndex >= path.length) {
      onComplete();
      return;
    }

    const target = path[stepIndex];
    const prev = path[stepIndex - 1];

    let dir: Direction = 'down';
    if (target.col > prev.col) dir = 'right';
    else if (target.col < prev.col) dir = 'left';
    else if (target.row < prev.row) dir = 'up';

    sprite.setTexture(`${textureBaseKey}_${dir}`);

    this.tweens.add({
      targets: sprite,
      x: tx(target.col),
      y: ty(target.row),
      duration: 130,
      ease: 'Linear',
      onComplete: () => {
        this.walkStep(sprite, textureBaseKey, path, stepIndex + 1, onComplete);
      },
    });
  }

  private startCustomerWalkOut(customerId: string): void {
    const avatars = this.customerAvatars.get(customerId);
    if (!avatars || avatars.length === 0) {
      this.customerAvatars.delete(customerId);
      return;
    }

    let completedCount = 0;
    const total = avatars.length;

    avatars.forEach((avatar, i) => {
      this.tweens.killTweensOf(avatar.sprite);

      const currentCol = Math.round((avatar.sprite.x - TILE / 2) / TILE);
      const currentRow = Math.round((avatar.sprite.y - TILE / 2) / TILE);
      avatar.sprite.setPosition(tx(currentCol), ty(currentRow));
      avatar.sprite.setAlpha(1);

      const path = findPath(currentCol, currentRow, ENTRANCE_COL, ENTRANCE_ROW);

      const onDone = () => {
        if (avatar.sprite.active) avatar.sprite.destroy();
        completedCount++;
        if (completedCount === total) {
          this.cleanupCustomerTextures(customerId);
        }
      };

      if (path.length > 1) {
        this.animateWalkPath(avatar.sprite, avatar.textureBaseKey, path, i * 200, onDone);
      } else {
        onDone();
      }
    });
  }

  private cleanupCustomerTextures(customerId: string): void {
    const avatars = this.customerAvatars.get(customerId);
    if (!avatars) return;

    for (const avatar of avatars) {
      for (const dir of ['up', 'down', 'left', 'right']) {
        const key = `${avatar.textureBaseKey}_${dir}`;
        if (this.textures.exists(key)) this.textures.remove(key);
      }
    }

    this.customerAvatars.delete(customerId);
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

  // ============================
  // HUD
  // ============================

  private createHUD(): void {
    const w = this.cameras.main.width;
    const panelY = ROWS * TILE; // 512
    const panelH = this.cameras.main.height - panelY; // 200
    const state = GameState.getInstance();

    // Background
    this.add.rectangle(w / 2, panelY + panelH / 2, w, panelH, 0x1a1a2e).setDepth(50);
    this.add.rectangle(w / 2, panelY, w, 2, 0x333355).setDepth(50);

    // Row 1: Title + Earnings
    this.hudTitle = this.add.text(10, panelY + 10, `Day ${state.data.day} — Service`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
    }).setDepth(51);
    this.hudEarnings = this.add.text(w - 10, panelY + 10, '$0', {
      fontSize: '14px', fontFamily: 'monospace', color: '#FFD700',
    }).setOrigin(1, 0).setDepth(51);

    // Row 2: What player is holding
    this.hudHeld = this.add.text(10, panelY + 32, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#D4C4A8',
    }).setDepth(51);

    // Row 3: Kitchen status
    this.hudKitchenStatus = this.add.text(10, panelY + 50, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#999999',
      wordWrap: { width: w - 20 },
    }).setDepth(51);

    // Boil/wash progress bar
    this.hudBoilBg = this.add.rectangle(w / 2, panelY + 76, 220, 14, 0x333333)
      .setVisible(false).setDepth(51);
    this.hudBoilBar = this.add.rectangle(w / 2 - 109, panelY + 76, 2, 10, 0x5599CC)
      .setVisible(false).setDepth(51);

    // Row 4: Context prompt
    this.hudPrompt = this.add.text(w / 2, panelY + 100, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#FFD700',
    }).setOrigin(0.5).setDepth(51);

    // Row 5: Action message
    this.hudMsg = this.add.text(w / 2, panelY + 126, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#4CAF50',
    }).setOrigin(0.5).setDepth(51);

    // Controls hints
    this.add.text(w / 2, panelY + 160, 'Arrows/WASD: Move | Space: Act | Trash: Discard', {
      fontSize: '9px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5).setDepth(51);

    const riceUnlocked = state.isCropUnlocked('rice');
    const hintText = riceUnlocked
      ? 'TEA: BIN→OVEN→STOVE(boil)→CUPS→STOVE(fill) | RICE: RICE→SINK→STOVE+BRL→BOWL→STOVE'
      : 'BIN→OVEN→STOVE(boil)→CUPS→STOVE(fill)→SERVE';
    this.add.text(w / 2, panelY + 174, hintText, {
      fontSize: '7px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5).setDepth(51);
    this.add.text(w / 2, panelY + 186, 'Walk to EXIT to close service', {
      fontSize: '9px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5).setDepth(51);
  }

  private updateHUD(): void {
    const state = GameState.getInstance();
    const w = this.cameras.main.width;
    this.hudEarnings.setText(`$${state.data.dayResults.revenue}`);

    // Held item
    if (CookingSystem.heldItem) {
      this.hudHeld.setText(`Holding: ${CookingSystem.getHeldDisplayName()}`);
    } else {
      this.hudHeld.setText('Holding: (nothing)');
    }

    // Kitchen status summary
    const oven = CookingSystem.oven;
    const sink = CookingSystem.sink;
    let statusParts: string[] = [];
    if (oven.state !== 'empty') statusParts.push(`Oven: ${oven.state}`);
    const activeStoves = CookingSystem.stoves.filter(s => s.state !== 'empty').length;
    if (activeStoves > 0) statusParts.push(`Stoves: ${activeStoves}/${CookingSystem.stoves.length}`);
    if (sink.state !== 'empty') statusParts.push(`Sink: ${sink.state}`);
    statusParts.push(`Barley: ${state.data.inventory.barley || 0}`);
    if (state.isCropUnlocked('rice')) {
      statusParts.push(`Rice: ${state.data.inventory.rice || 0}`);
    }
    this.hudKitchenStatus.setText(statusParts.join(' | '));

    // Boil/wash/trash progress bar
    // Check which stove player is facing
    const { dx: fdx, dy: fdy } = DIR_DELTA[this.facing];
    const facedStation = getStationAt(this.playerCol + fdx, this.playerRow + fdy);
    const facedStoveIdx = facedStation?.type === 'stove' ? (facedStation.index ?? 0) : -1;
    const showStoveBar = facedStoveIdx >= 0 && CookingSystem.isStoveHoldState(facedStoveIdx);
    const showSinkBar = CookingSystem.isSinkHoldState();
    const showTrashBar = this.isHoldingTrash;
    if (showStoveBar) {
      this.hudBoilBg.setVisible(true);
      this.hudBoilBar.setVisible(true);
      const ratio = CookingSystem.getBoilProgress(facedStoveIdx);
      this.hudBoilBar.width = 216 * ratio;
      this.hudBoilBar.x = w / 2 - 108 + this.hudBoilBar.width / 2;
      this.hudBoilBar.setFillStyle(0x5599CC);
    } else if (showTrashBar) {
      this.hudBoilBg.setVisible(true);
      this.hudBoilBar.setVisible(true);
      const ratio = CookingSystem.getTrashProgress();
      this.hudBoilBar.width = 216 * ratio;
      this.hudBoilBar.x = w / 2 - 108 + this.hudBoilBar.width / 2;
      this.hudBoilBar.setFillStyle(0xFF6666);
    } else if (showSinkBar) {
      this.hudBoilBg.setVisible(true);
      this.hudBoilBar.setVisible(true);
      const ratio = CookingSystem.getWashProgress();
      this.hudBoilBar.width = 216 * ratio;
      this.hudBoilBar.x = w / 2 - 108 + this.hudBoilBar.width / 2;
      this.hudBoilBar.setFillStyle(0x66BBFF);
    } else {
      this.hudBoilBg.setVisible(false);
      this.hudBoilBar.setVisible(false);
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
            case 'ordered': {
              const recipeId = customer.orderedRecipeId!;
              const recipe = RECIPES[recipeId];
              const remaining = customer.servingsNeeded - customer.servingsDelivered;
              if (CookingSystem.canServe(recipeId)) {
                this.hudPrompt.setText(`[Space] Serve ${recipe?.name} (${remaining} needed)`);
              } else {
                this.hudPrompt.setText(`Need ${remaining}x ${recipe?.name}...`);
              }
            }
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

    // Kitchen station prompts
    const station = getStationAt(fc, fr);
    if (station) {
      switch (station.type) {
        case 'barley_bin':
          if (CookingSystem.heldItem === null) {
            this.hudPrompt.setText('[Space] Pick up barley');
          } else {
            this.hudPrompt.setText('Barley bin');
          }
          break;
        case 'rice_bin': {
          const state = GameState.getInstance();
          if (!state.isCropUnlocked('rice')) {
            this.hudPrompt.setText('');
            return;
          }
          if (CookingSystem.heldItem === null) {
            this.hudPrompt.setText('[Space] Pick up rice');
          } else {
            this.hudPrompt.setText('Rice bin');
          }
          break;
        }
        case 'oven':
          if (CookingSystem.oven.state === 'empty' && CookingSystem.heldItem === 'barley') {
            this.hudPrompt.setText('[Space] Roast barley');
          } else if (CookingSystem.oven.state === 'done' && CookingSystem.heldItem === null) {
            this.hudPrompt.setText('[Space] Pick up roasted barley');
          } else if (CookingSystem.oven.state === 'burned') {
            this.hudPrompt.setText('[Space] Discard burned barley');
          } else if (CookingSystem.oven.state === 'roasting') {
            this.hudPrompt.setText('Roasting...');
          } else {
            this.hudPrompt.setText('Oven');
          }
          break;
        case 'stove': {
          const si = station.index ?? 0;
          const s = CookingSystem.stoves[si];
          if (!s) break;
          if (s.state === 'empty') {
            if (CookingSystem.heldItem === 'roasted_barley') {
              this.hudPrompt.setText('[Space] Add to stove (tea)');
            } else if (CookingSystem.heldItem === 'washed_rice') {
              this.hudPrompt.setText('[Space] Add to stove (rice)');
            } else {
              this.hudPrompt.setText('Stove');
            }
          } else if (s.state === 'has_roasted_barley') {
            this.hudPrompt.setText('[Space] Start boiling');
          } else if (s.state === 'boiling_tea') {
            this.hudPrompt.setText('[Hold Space] Boil tea');
          } else if (s.state === 'hot_with_tea' &&
            (CookingSystem.heldItem === 'empty_cup' || (CookingSystem.heldItem === 'tray' && CookingSystem.trayEmpty > 0))) {
            this.hudPrompt.setText('[Space] Fill cup');
          } else if (s.state === 'hot_with_tea') {
            this.hudPrompt.setText(`Stove hot (${s.cupsRemaining} cups left)`);
          } else if (s.state === 'has_washed_rice') {
            if (CookingSystem.heldItem === 'barley') {
              this.hudPrompt.setText('[Space] Add barley');
            } else {
              this.hudPrompt.setText('Needs barley...');
            }
          } else if (s.state === 'has_rice_and_barley') {
            this.hudPrompt.setText('[Space] Start cooking');
          } else if (s.state === 'cooking_rice') {
            this.hudPrompt.setText('[Hold Space] Cook rice');
          } else if (s.state === 'has_barley_rice') {
            if (CookingSystem.heldItem === 'bowl') {
              this.hudPrompt.setText(`[Space] Pick up Barley Rice (x${s.servingsRemaining})`);
            } else {
              this.hudPrompt.setText(`Need bowl! (x${s.servingsRemaining} ready)`);
            }
          }
          break;
        }
        case 'bowl': {
          const gs = GameState.getInstance();
          if (!gs.isCropUnlocked('rice')) {
            this.hudPrompt.setText('');
            return;
          }
          if (CookingSystem.heldItem === null) {
            this.hudPrompt.setText('[Space] Pick up bowl');
          } else {
            this.hudPrompt.setText('Hands full!');
          }
          break;
        }
        case 'trash':
          if (CookingSystem.heldItem !== null) {
            this.hudPrompt.setText('[Hold Space] Discard item');
          } else {
            this.hudPrompt.setText('Trash bin');
          }
          break;
        case 'sink': {
          const state = GameState.getInstance();
          if (!state.isCropUnlocked('rice')) {
            this.hudPrompt.setText('');
            return;
          }
          const sk = CookingSystem.sink;
          if (sk.state === 'empty' && CookingSystem.heldItem === 'rice') {
            this.hudPrompt.setText('[Space] Wash rice');
          } else if (sk.state === 'washing') {
            this.hudPrompt.setText('[Hold Space] Washing rice...');
          } else if (sk.state === 'done' && CookingSystem.heldItem === null) {
            this.hudPrompt.setText('[Space] Pick up washed rice');
          } else if (sk.state === 'done') {
            this.hudPrompt.setText('Washed rice ready!');
          } else {
            this.hudPrompt.setText('Sink');
          }
          break;
        }
        case 'cups':
          if (CookingSystem.heldItem === null) {
            this.hudPrompt.setText('[Space] Pick up cup');
          } else if (CookingSystem.heldItem === 'empty_cup' || CookingSystem.heldItem === 'barley_tea'
            || (CookingSystem.heldItem === 'tray' && CookingSystem.trayTotal < 4)) {
            this.hudPrompt.setText('[Space] Add cup to tray');
          } else if (CookingSystem.heldItem === 'tray' && CookingSystem.trayTotal >= 4) {
            this.hudPrompt.setText('Tray full!');
          } else {
            this.hudPrompt.setText('Cup storage');
          }
          break;
        case 'ktable': {
          const idx = station.index ?? 0;
          const kt = CookingSystem.kitchenTables[idx];
          if (kt?.item && CookingSystem.heldItem === null) {
            const name = kt.item === 'tray' ? 'Tray' : (ITEM_NAMES[kt.item] || kt.item);
            this.hudPrompt.setText(`[Space] Pick up ${name}`);
          } else if (!kt?.item && CookingSystem.heldItem !== null) {
            this.hudPrompt.setText('[Space] Place item');
          } else {
            this.hudPrompt.setText('Kitchen table');
          }
          break;
        }
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
  }
}
