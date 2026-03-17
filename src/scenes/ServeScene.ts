import Phaser from 'phaser';
import GameState, { CustomerData } from '../state/GameState';
import { ServingSystem } from '../systems/ServingSystem';
import { CookingSystem, HeldItem } from '../systems/CookingSystem';
import { RecipeSystem } from '../systems/RecipeSystem';
import { RECIPES } from '../config/recipes';
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
const F = 0;  // floor (walkable)
const W = 1;  // wall (non-walkable)
const T = 2;  // table (non-walkable, interactable)
const K = 8;  // counter (non-walkable)
const P = 6;  // path (walkable)
const X = 7;  // exit (walkable, triggers transition)
// Kitchen station types
const S = 10; // barley bin
const O = 11; // oven
const KT = 12; // kettle
const U = 13; // cup storage
const L = 14; // kitchen table (surface)
const RB = 15; // rice bin
const SK = 16; // sink
const BW = 17; // bowl station
const TR = 18; // trash bin
const RC = 19; // rice cooker
const RK = 20; // recipe book

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
  [S,RB,F,O,F,KT,F,RC,F,F,U,BW,F,SK,F,TR], // 9  stations
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 10 kitchen floor
  [F,L,F,L,F,F,F,F,L,F,L,F,F,F,F,F], // 11 kitchen tables (4)
  [F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F], // 12
  [RK,F,F,F,F,F,F,P,F,F,F,F,F,F,F,F], // 13 recipe book + path
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
const HAIR_COLORS = [0x2C1B18, 0x4A3728, 0x654321, 0x090806, 0xB55239, 0x2B1D0E];
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

type StationType = 'barley_bin' | 'rice_bin' | 'oven' | 'kettle' | 'rice_cooker' | 'recipe_book' | 'cups' | 'sink' | 'ktable' | 'bowl' | 'trash';

function getStationAt(col: number, row: number): { type: StationType; index?: number } | null {
  const tile = REST_MAP[row]?.[col];
  if (tile === S) return { type: 'barley_bin' };
  if (tile === RB) return { type: 'rice_bin' };
  if (tile === O) return { type: 'oven' };
  if (tile === KT) return { type: 'kettle' };
  if (tile === RC) return { type: 'rice_cooker' };
  if (tile === RK) return { type: 'recipe_book' };
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
  if (t === F || t === P || t === X) return true;
  // When rice is NOT unlocked, RB, RC, BW, SK render as floor and should be walkable
  if (!GameState.getInstance().isCropUnlocked('rice')) {
    if (t === RB || t === RC || t === BW || t === SK) return true;
  }
  return false;
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
  washed_barley: 'Washed Barley',
  empty_cup: 'Empty Cup',
  barley_tea: 'Barley Tea',
  tray: 'Tray',
  rice: 'Rice',
  washed_rice: 'Washed Rice',
  barley_rice: 'Barley Rice',
  bowl: 'Bowl',
  bowl_stack: 'Stack',
};

// Item indicator colors
const ITEM_COLORS: Record<string, number> = {
  barley: 0xD4AA70,
  roasted_barley: 0x8B6914,
  washed_barley: 0xB89960,
  empty_cup: 0xEEEEDD,
  barley_tea: 0xC8A960,
  rice: 0xB8D4B8,
  washed_rice: 0xCCDDCC,
  barley_rice: 0xC4956A,
  bowl: 0xF0E6D2,
  bowl_stack: 0xD4B896,
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
  private kettleLabel!: Phaser.GameObjects.Text;
  private riceCookerLabel!: Phaser.GameObjects.Text;
  private sinkLabel!: Phaser.GameObjects.Text;
  private trashLabel!: Phaser.GameObjects.Text;
  private ktableOverlays: Phaser.GameObjects.Rectangle[] = [];
  private ktableLabels: Phaser.GameObjects.Text[] = [];

  // Rice bin / sink station labels (hidden when locked)
  private riceBinStationLabel?: Phaser.GameObjects.Text;
  private sinkStationLabel?: Phaser.GameObjects.Text;

  // Player
  private player!: Phaser.GameObjects.Image;
  private playerCol = 1;
  private playerRow = 13;
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

  // Recipe modal
  private recipeModal?: Phaser.GameObjects.Container;
  private recipeModalVisible = false;
  private serviceStarted = false;

  // Hold-space state (for kettle boil, rice cooker cook, sink wash, trash discard)
  private isHoldingKettle = false;
  private isHoldingRiceCooker = false;
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
    this.isHoldingKettle = false;
    this.isHoldingRiceCooker = false;
    this.isHoldingSink = false;
    this.isHoldingTrash = false;
    this.recipeModalVisible = false;
    this.serviceStarted = false;
    this.playerCol = 1;
    this.playerRow = 13;
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

    // Show recipe book on start so player can review before serving
    this.showRecipeModal();

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

    // Handle kettle hold (boil tea)
    this.handleKettleHold(deltaSec);

    // Handle rice cooker hold (cook rice)
    this.handleRiceCookerHold(deltaSec);

    // Handle sink hold (wash rice or barley)
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
    this.spaceKey.on('down', () => {
      if (this.recipeModalVisible) {
        this.hideRecipeModal();
        return;
      }
      this.handleAction();
    });
    this.input.keyboard!.addKey('ENTER').on('down', () => this.handleAction());
    this.input.keyboard!.addKey('ESC').on('down', () => {
      if (this.recipeModalVisible) this.hideRecipeModal();
    });

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
          case KT: key = 'tile_kettle'; break;
          case RC: key = riceUnlocked ? 'tile_rice_cooker' : 'tile_floor'; break;
          case RK: key = 'tile_recipe_book'; break;
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

    // Station labels — positioned at bottom of tile so icons stay visible
    const labelBot = ty(9) + TILE / 2 - 8; // 8px from bottom edge
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '11px', fontFamily: 'monospace', color: '#FFFFFF',
    };
    this.add.text(tx(0), labelBot, 'BARLEY', labelStyle).setOrigin(0.5);
    if (riceUnlocked) {
      this.riceBinStationLabel = this.add.text(tx(1), labelBot, 'RICE', labelStyle).setOrigin(0.5);
    }
    this.add.text(tx(3), labelBot, 'OVEN', labelStyle).setOrigin(0.5);
    this.add.text(tx(5), labelBot, 'KETTLE', labelStyle).setOrigin(0.5);
    if (riceUnlocked) {
      this.add.text(tx(7), labelBot, 'COOKER', labelStyle).setOrigin(0.5);
    }
    this.add.text(tx(10), labelBot, 'CUPS', labelStyle).setOrigin(0.5);
    if (riceUnlocked) {
      this.add.text(tx(11), labelBot, 'BOWL', labelStyle).setOrigin(0.5);
    }
    if (riceUnlocked) {
      this.sinkStationLabel = this.add.text(tx(13), labelBot, 'SINK', labelStyle).setOrigin(0.5);
    }
    this.add.text(tx(0), ty(13) + TILE / 2 - 8, 'RECIPE', labelStyle).setOrigin(0.5);
    this.add.text(tx(15), labelBot, 'TRASH', labelStyle).setOrigin(0.5);

    // Oven progress overlay
    const ovenX = tx(3);
    const ovenY = ty(9);
    this.ovenOverlay = this.add.rectangle(ovenX, ovenY - 18, 36, 8, 0x000000, 0).setDepth(15);
    this.ovenProgressBg = this.add.rectangle(ovenX, ovenY - 18, 36, 8, 0x333333, 0.8).setDepth(15);
    this.ovenProgressBar = this.add.rectangle(ovenX - 18, ovenY - 18, 0, 8, 0x44CC44).setDepth(16).setOrigin(0, 0.5);
    this.ovenLabel = this.add.text(ovenX, ovenY - 30, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(16);

    // Kettle label overlay
    const kettleX = tx(5);
    const kettleY = ty(9);
    this.kettleLabel = this.add.text(kettleX, kettleY - 24, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(16);

    // Rice cooker label overlay
    const rcX = tx(7);
    const rcY = ty(9);
    this.riceCookerLabel = this.add.text(rcX, rcY - 24, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(16);

    // Sink label overlay
    const sinkX = tx(13);
    const sinkY = ty(9);
    this.sinkLabel = this.add.text(sinkX, sinkY - 24, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(16);

    // Trash label overlay
    const trashX = tx(15);
    const trashY = ty(9);
    this.trashLabel = this.add.text(trashX, trashY - 24, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(16);

    // Kitchen table overlays
    for (const kt of KITCHEN_TABLE_TILES) {
      const ktx = tx(kt.col);
      const kty = ty(kt.row);
      const overlay = this.add.rectangle(ktx, kty, 30, 30, 0x000000, 0).setDepth(15);
      const label = this.add.text(ktx, kty, '', {
        fontSize: '11px', fontFamily: 'monospace', color: '#FFFFFF',
      }).setOrigin(0.5).setDepth(16);
      this.ktableOverlays.push(overlay);
      this.ktableLabels.push(label);
    }

    // Exit label
    this.add.text(tx(7), ty(14) + 2, 'EXIT', {
      fontSize: '12px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5);
  }

  // ============================
  // Player
  // ============================

  private createPlayer(): void {
    this.facingHighlight = this.add.rectangle(0, 0, TILE - 3, TILE - 3, 0xFFFF00, 0)
      .setStrokeStyle(3, 0xFFFF00, 0.6)
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
    const isInteractable = t === T || t === S || t === RB || t === O || t === KT || t === RC || t === RK || t === U || t === SK || t === L || t === BW || t === TR;

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
      case 'kettle': {
        err = CookingSystem.interactKettle();
        if (!err) {
          const k = CookingSystem.kettle;
          if (k.state === 'has_roasted_barley') this.showMsg('Added barley to kettle');
          else if (k.state === 'boiling_tea') this.showMsg('Hold Space to boil!');
          else if (CookingSystem.heldItem === 'barley_tea') {
            this.showMsg('Filled cup with tea!');
          } else if (CookingSystem.heldItem === 'tray') {
            const remaining = k.cupsRemaining;
            if (k.state === 'empty' && remaining <= 0) {
              this.showMsg('Filled cup! Kettle empty.');
            } else {
              this.showMsg(`Filled cup! (${remaining} left)`);
            }
          } else if (k.state === 'hot_with_tea') {
            this.showMsg(`Tea ready! (${k.cupsRemaining} cups left)`);
          }
        }
        break;
      }
      case 'rice_cooker': {
        err = CookingSystem.interactRiceCooker();
        if (!err) {
          const rc = CookingSystem.riceCooker;
          if (rc.state === 'has_washed_rice') this.showMsg('Added washed rice to cooker');
          else if (rc.state === 'has_washed_barley') this.showMsg('Added washed barley to cooker');
          else if (rc.state === 'has_both') this.showMsg('Both added — ready to cook!');
          else if (rc.state === 'cooking_rice') this.showMsg('Hold Space to cook!');
          else if (CookingSystem.heldItem === 'barley_rice') this.showMsg('Picked up Barley Rice!');
          else if (CookingSystem.heldItem === 'bowl_stack') {
            const remaining = rc.servingsRemaining;
            if (rc.state === 'empty' && remaining <= 0) {
              this.showMsg('Filled bowl! Cooker empty.');
            } else {
              this.showMsg(`Filled bowl! (${remaining} left)`);
            }
          }
        }
        break;
      }
      case 'recipe_book':
        this.toggleRecipeModal();
        break;
      case 'sink':
        err = CookingSystem.interactSink();
        if (!err) {
          if (CookingSystem.sink.state === 'washing') {
            const what = CookingSystem.sinkItem === 'barley' ? 'barley' : 'rice';
            this.showMsg(`Hold Space to wash ${what}!`);
          } else if (CookingSystem.heldItem === 'washed_rice') {
            this.showMsg('Rice washed!');
          } else if (CookingSystem.heldItem === 'washed_barley') {
            this.showMsg('Barley washed!');
          }
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
        if (!err) {
          if (CookingSystem.heldItem === 'bowl_stack') {
            this.showMsg(`Stack: ${CookingSystem.stackTotal} bowls`);
          } else {
            this.showMsg('Picked up bowl');
          }
        }
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

  private handleKettleHold(deltaSec: number): void {
    const { dx, dy } = DIR_DELTA[this.facing];
    const fc = this.playerCol + dx;
    const fr = this.playerRow + dy;
    const station = getStationAt(fc, fr);

    if (station?.type === 'kettle' && CookingSystem.isKettleHoldState() && this.spaceKey.isDown) {
      this.isHoldingKettle = true;
      const done = CookingSystem.updateKettleBoil(deltaSec);
      if (done) {
        this.isHoldingKettle = false;
        this.showMsg('Tea ready! Fill cups here.');
      }
    } else if (!this.spaceKey.isDown && this.isHoldingKettle) {
      this.isHoldingKettle = false;
    }
  }

  private handleRiceCookerHold(deltaSec: number): void {
    const { dx, dy } = DIR_DELTA[this.facing];
    const fc = this.playerCol + dx;
    const fr = this.playerRow + dy;
    const station = getStationAt(fc, fr);

    if (station?.type === 'rice_cooker' && CookingSystem.isRiceCookerHoldState() && this.spaceKey.isDown) {
      this.isHoldingRiceCooker = true;
      const done = CookingSystem.updateRiceCookerCook(deltaSec);
      if (done) {
        this.isHoldingRiceCooker = false;
        const rc = CookingSystem.riceCooker;
        this.showMsg(`Barley Rice cooked! x${rc.servingsRemaining} servings.`);
      }
    } else if (!this.spaceKey.isDown && this.isHoldingRiceCooker) {
      this.isHoldingRiceCooker = false;
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
          const what = CookingSystem.sinkItem === 'barley' ? 'Barley' : 'Rice';
          this.showMsg(`${what} washed! Pick it up.`);
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
    const py = this.player.y - 27;

    if (held === 'tray') {
      const total = CookingSystem.trayTotal;
      const slotW = 9;
      const slotH = 9;
      const gap = 2;
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
    } else if (held === 'bowl_stack') {
      const total = CookingSystem.stackTotal;
      const slotW = 9;
      const slotH = 9;
      const gap = 2;
      const totalW = total * slotW + (total - 1) * gap;
      const startX = px - totalW / 2;

      let drawn = 0;
      for (let i = 0; i < CookingSystem.stackFilled; i++) {
        const sx = startX + drawn * (slotW + gap);
        this.heldIndicator.fillStyle(0x8B6914, 1);
        this.heldIndicator.fillRect(sx, py - slotH / 2, slotW, slotH);
        this.heldIndicator.lineStyle(1, 0x000000, 0.4);
        this.heldIndicator.strokeRect(sx, py - slotH / 2, slotW, slotH);
        drawn++;
      }
      for (let i = 0; i < CookingSystem.stackEmpty; i++) {
        const sx = startX + drawn * (slotW + gap);
        this.heldIndicator.fillStyle(0xC0C0C0, 1);
        this.heldIndicator.fillRect(sx, py - slotH / 2, slotW, slotH);
        this.heldIndicator.lineStyle(1, 0x000000, 0.4);
        this.heldIndicator.strokeRect(sx, py - slotH / 2, slotW, slotH);
        drawn++;
      }
    } else {
      const color = ITEM_COLORS[held] || 0x666666;
      this.heldIndicator.fillStyle(color, 1);
      this.heldIndicator.fillCircle(px, py, 6);
      this.heldIndicator.lineStyle(1, 0x000000, 0.5);
      this.heldIndicator.strokeCircle(px, py, 6);
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
      const by = ty(tableDef.row) - 21;

      indicator.bubble.clear();

      if (customer.status === 'seated') {
        // White speech bubble with red "!"
        this.drawSpeechBubble(indicator.bubble, bx, by, 33, 30);
        indicator.bubble.fillStyle(0xFF3333, 1);
        indicator.bubble.fillRect(bx - 3, by - 11, 6, 12);
        indicator.bubble.fillRect(bx - 3, by + 5, 6, 6);
      } else if (customer.status === 'ordered') {
        // Show N food icons (one per remaining serving)
        const remaining = customer.servingsNeeded - customer.servingsDelivered;
        const recipe = customer.orderedRecipeId ? RECIPES[customer.orderedRecipeId] : null;
        const iconColor = recipe?.iconColor ?? 0xC8A960;
        const recipeId = customer.orderedRecipeId;
        const iconSize = 18;
        const gap = 6;
        const totalW = remaining * iconSize + (remaining - 1) * gap;
        const bubbleW = Math.max(39, totalW + 21);
        const bubbleH = 36;

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
    gfx.fillRoundedRect(cx - halfW, cy - halfH, w, h, 6);
    gfx.lineStyle(2, 0x333333, 0.6);
    gfx.strokeRoundedRect(cx - halfW, cy - halfH, w, h, 6);

    // Triangle pointer at bottom
    gfx.fillStyle(0xFFFFFF, 0.95);
    gfx.fillTriangle(cx - 5, cy + halfH - 2, cx + 5, cy + halfH - 2, cx, cy + halfH + 8);
    // Outline for triangle
    gfx.lineStyle(2, 0x333333, 0.6);
    gfx.lineBetween(cx - 5, cy + halfH - 2, cx, cy + halfH + 8);
    gfx.lineBetween(cx + 5, cy + halfH - 2, cx, cy + halfH + 8);
  }

  private drawFoodIcon(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, color: number, recipeId: string): void {
    const half = size / 2;
    if (recipeId === 'barley_tea') {
      // Cup shape
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(cx - half + 2, cy - half + 3, size - 3, size - 5, 3);
      // Handle
      gfx.lineStyle(2, color, 1);
      gfx.strokeCircle(cx + half - 2, cy, 3);
      // Steam line
      gfx.lineStyle(1, 0xCCCCCC, 0.7);
      gfx.lineBetween(cx - 2, cy - half, cx, cy - half - 3);
      gfx.lineBetween(cx + 2, cy - half, cx + 3, cy - half - 3);
    } else if (recipeId === 'barley_rice') {
      // Bowl shape
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(cx - half, cy - half + 3, size, size - 3, 6);
      // Rice dots inside
      gfx.fillStyle(0xFFFFFF, 0.5);
      gfx.fillCircle(cx - 3, cy, 2);
      gfx.fillCircle(cx + 3, cy, 2);
      gfx.fillCircle(cx, cy - 3, 2);
      // Outline
      gfx.lineStyle(1, 0x000000, 0.3);
      gfx.strokeRoundedRect(cx - half, cy - half + 3, size, size - 3, 6);
    } else {
      // Generic colored square
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(cx - half, cy - half, size, size, 5);
      gfx.lineStyle(1, 0x000000, 0.3);
      gfx.strokeRoundedRect(cx - half, cy - half, size, size, 5);
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
          gfx.fillCircle(midX - 9, midY - 5, 6);
          gfx.fillCircle(midX + 8, midY + 3, 5);
          gfx.fillCircle(midX - 3, midY + 6, 5);
          // "DIRTY" text label
          gfx.fillStyle(0x5A3A0A, 0.8);
          gfx.fillRoundedRect(midX - 27, midY - 18, 54, 18, 3);
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
      this.ovenProgressBar.width = 36 * ratio;
      this.ovenProgressBar.setFillStyle(0x44CC44);
      this.ovenLabel.setText('');
    } else if (oven.state === 'done') {
      this.ovenProgressBg.setVisible(true);
      this.ovenProgressBar.setVisible(true);
      this.ovenProgressBar.width = 36;
      this.ovenProgressBar.setFillStyle(0x44CC44);
      this.ovenLabel.setText('DONE').setColor('#44FF44');
    } else if (oven.state === 'burned') {
      this.ovenProgressBg.setVisible(true);
      this.ovenProgressBar.setVisible(true);
      this.ovenProgressBar.width = 36;
      this.ovenProgressBar.setFillStyle(0xFF4444);
      this.ovenLabel.setText('BURN').setColor('#FF4444');
    }

    // Kettle
    const kettle = CookingSystem.kettle;
    if (kettle.state === 'empty') {
      this.kettleLabel.setText('');
    } else if (kettle.state === 'has_roasted_barley') {
      this.kettleLabel.setText('BOIL?').setColor('#FFAA00');
    } else if (kettle.state === 'boiling_tea') {
      const pct = Math.floor(CookingSystem.getKettleProgress() * 100);
      this.kettleLabel.setText(`TEA ${pct}%`).setColor('#FFAA00');
    } else if (kettle.state === 'hot_with_tea') {
      this.kettleLabel.setText(`x${kettle.cupsRemaining}`).setColor('#44FF44');
    }

    // Rice cooker
    const rc = CookingSystem.riceCooker;
    if (rc.state === 'empty') {
      this.riceCookerLabel.setText('');
    } else if (rc.state === 'has_washed_rice') {
      this.riceCookerLabel.setText('+BRL?').setColor('#AADDAA');
    } else if (rc.state === 'has_washed_barley') {
      this.riceCookerLabel.setText('+RICE?').setColor('#AADDAA');
    } else if (rc.state === 'has_both') {
      this.riceCookerLabel.setText('COOK?').setColor('#FFAA00');
    } else if (rc.state === 'cooking_rice') {
      const pct = Math.floor(CookingSystem.getRiceCookerProgress() * 100);
      this.riceCookerLabel.setText(`RICE ${pct}%`).setColor('#FFAA00');
    } else if (rc.state === 'has_barley_rice') {
      this.riceCookerLabel.setText(`x${rc.servingsRemaining}`).setColor('#44FF44');
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
        } else if (kt.item === 'bowl_stack') {
          const parts: string[] = [];
          if (kt.stackFilled > 0) parts.push(`${kt.stackFilled}R`);
          if (kt.stackEmpty > 0) parts.push(`${kt.stackEmpty}B`);
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
      case 'washed_barley': return 0xB89960;
      case 'empty_cup': return 0xEEEEDD;
      case 'barley_tea': return 0xC8A960;
      case 'tray': return 0xAA8866;
      case 'bowl_stack': return 0xD4B896;
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
      case 'washed_barley': return 'W.B';
      case 'empty_cup': return 'CUP';
      case 'barley_tea': return 'TEA';
      case 'tray': return 'TRAY';
      case 'bowl_stack': return 'STK';
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
    const w = 36;
    const h = 42;

    for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
      const key = `${baseKey}_${dir}`;
      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.setVisible(false);

      // Hair
      gfx.fillStyle(appearance.hairColor, 1);
      gfx.fillRoundedRect(5, 2, w - 6, 14, 6);

      // Head / face skin
      gfx.fillStyle(appearance.skinColor, 1);
      switch (dir) {
        case 'down':
          gfx.fillRoundedRect(8, 8, w - 12, 12, 3);
          break;
        case 'up':
          break;
        case 'left':
          gfx.fillRoundedRect(5, 8, 15, 12, 3);
          break;
        case 'right':
          gfx.fillRoundedRect(w - 17, 8, 15, 12, 3);
          break;
      }

      // Body (shirt)
      gfx.fillStyle(appearance.shirtColor, 1);
      gfx.fillRoundedRect(3, 20, w - 3, 15, 5);
      gfx.lineStyle(1, 0x000000, 0.2);
      gfx.strokeRoundedRect(3, 20, w - 3, 15, 5);

      // Legs/pants
      gfx.fillStyle(0x445566, 1);
      gfx.fillRoundedRect(6, 33, 12, 9, 3);
      gfx.fillRoundedRect(21, 33, 12, 9, 3);

      // Eyes
      gfx.fillStyle(0x333333, 1);
      switch (dir) {
        case 'down':
          gfx.fillRect(12, 12, 3, 3);
          gfx.fillRect(24, 12, 3, 3);
          break;
        case 'up':
          break;
        case 'left':
          gfx.fillRect(9, 12, 3, 3);
          break;
        case 'right':
          gfx.fillRect(27, 12, 3, 3);
          break;
      }

      gfx.generateTexture(key, w + 3, h + 3);
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
    const panelY = ROWS * TILE; // 768
    const panelH = this.cameras.main.height - panelY; // 256
    const state = GameState.getInstance();

    // Background
    this.add.rectangle(w / 2, panelY + panelH / 2, w, panelH, 0x1a1a2e).setDepth(50);
    this.add.rectangle(w / 2, panelY, w, 3, 0x333355).setDepth(50);

    // Row 1: Title + Earnings
    this.hudTitle = this.add.text(15, panelY + 15, `Day ${state.data.day} — Service`, {
      fontSize: '21px', fontFamily: 'monospace', color: '#ffffff',
    }).setDepth(51);
    this.hudEarnings = this.add.text(w - 15, panelY + 15, '$0', {
      fontSize: '21px', fontFamily: 'monospace', color: '#FFD700',
    }).setOrigin(1, 0).setDepth(51);

    // Row 2: What player is holding
    this.hudHeld = this.add.text(15, panelY + 48, '', {
      fontSize: '18px', fontFamily: 'monospace', color: '#D4C4A8',
    }).setDepth(51);

    // Row 3: Kitchen status
    this.hudKitchenStatus = this.add.text(15, panelY + 75, '', {
      fontSize: '15px', fontFamily: 'monospace', color: '#999999',
      wordWrap: { width: w - 30 },
    }).setDepth(51);

    // Boil/wash progress bar
    this.hudBoilBg = this.add.rectangle(w / 2, panelY + 114, 330, 21, 0x333333)
      .setVisible(false).setDepth(51);
    this.hudBoilBar = this.add.rectangle(w / 2 - 162, panelY + 114, 0, 15, 0x5599CC)
      .setOrigin(0, 0.5).setVisible(false).setDepth(51);

    // Row 4: Context prompt
    this.hudPrompt = this.add.text(w / 2, panelY + 150, '', {
      fontSize: '21px', fontFamily: 'monospace', color: '#FFD700',
    }).setOrigin(0.5).setDepth(51);

    // Row 5: Action message
    this.hudMsg = this.add.text(w / 2, panelY + 189, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#4CAF50',
    }).setOrigin(0.5).setDepth(51);

    // Controls hints
    this.add.text(w / 2, panelY + 220, 'Arrows/WASD: Move | Space: Act | Trash: Discard', {
      fontSize: '14px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5).setDepth(51);

    const riceUnlocked = state.isCropUnlocked('rice');
    const hintText = riceUnlocked
      ? 'TEA: BRL→OVEN→KETTLE→CUPS→KETTLE | RICE: RICE→SINK+BRL→SINK→COOKER→BOWL→COOKER'
      : 'TEA: BARLEY→OVEN(roast)→KETTLE(boil)→CUPS→KETTLE(fill)';
    this.add.text(w / 2, panelY + 237, hintText, {
      fontSize: '11px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5).setDepth(51);
    this.add.text(w / 2, panelY + 249, 'Walk to EXIT to close service', {
      fontSize: '14px', fontFamily: 'monospace', color: '#555555',
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
    if (CookingSystem.kettle.state !== 'empty') statusParts.push(`Kettle: ${CookingSystem.kettle.state}`);
    if (CookingSystem.riceCooker.state !== 'empty') statusParts.push(`Cooker: ${CookingSystem.riceCooker.state}`);
    if (sink.state !== 'empty') statusParts.push(`Sink: ${sink.state}`);
    statusParts.push(`Barley: ${state.data.inventory.barley || 0}`);
    if (state.isCropUnlocked('rice')) {
      statusParts.push(`Rice: ${state.data.inventory.rice || 0}`);
    }
    this.hudKitchenStatus.setText(statusParts.join(' | '));

    // Boil/wash/trash progress bar
    const { dx: fdx, dy: fdy } = DIR_DELTA[this.facing];
    const facedStation = getStationAt(this.playerCol + fdx, this.playerRow + fdy);
    const showKettleBar = facedStation?.type === 'kettle' && CookingSystem.isKettleHoldState();
    const showRiceCookerBar = facedStation?.type === 'rice_cooker' && CookingSystem.isRiceCookerHoldState();
    const showSinkBar = CookingSystem.isSinkHoldState();
    const showTrashBar = this.isHoldingTrash;
    if (showKettleBar) {
      this.hudBoilBg.setVisible(true);
      this.hudBoilBar.setVisible(true);
      const ratio = Math.min(1, CookingSystem.getKettleProgress());
      this.hudBoilBar.width = 324 * ratio;

      this.hudBoilBar.setFillStyle(0x5599CC);
    } else if (showRiceCookerBar) {
      this.hudBoilBg.setVisible(true);
      this.hudBoilBar.setVisible(true);
      const ratio = Math.min(1, CookingSystem.getRiceCookerProgress());
      this.hudBoilBar.width = 324 * ratio;

      this.hudBoilBar.setFillStyle(0x88CC44);
    } else if (showTrashBar) {
      this.hudBoilBg.setVisible(true);
      this.hudBoilBar.setVisible(true);
      const ratio = Math.min(1, CookingSystem.getTrashProgress());
      this.hudBoilBar.width = 324 * ratio;

      this.hudBoilBar.setFillStyle(0xFF6666);
    } else if (showSinkBar) {
      this.hudBoilBg.setVisible(true);
      this.hudBoilBar.setVisible(true);
      const ratio = Math.min(1, CookingSystem.getWashProgress());
      this.hudBoilBar.width = 324 * ratio;

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
            this.hudPrompt.setText('Barley station');
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
        case 'kettle': {
          const k = CookingSystem.kettle;
          if (k.state === 'empty') {
            if (CookingSystem.heldItem === 'roasted_barley') {
              this.hudPrompt.setText('[Space] Add to kettle');
            } else {
              this.hudPrompt.setText('Kettle');
            }
          } else if (k.state === 'has_roasted_barley') {
            this.hudPrompt.setText('[Space] Start boiling');
          } else if (k.state === 'boiling_tea') {
            this.hudPrompt.setText('[Hold Space] Boil tea');
          } else if (k.state === 'hot_with_tea' &&
            (CookingSystem.heldItem === 'empty_cup' || (CookingSystem.heldItem === 'tray' && CookingSystem.trayEmpty > 0))) {
            this.hudPrompt.setText('[Space] Fill cup');
          } else if (k.state === 'hot_with_tea') {
            this.hudPrompt.setText(`Kettle hot (${k.cupsRemaining} cups left)`);
          }
          break;
        }
        case 'rice_cooker': {
          const gs2 = GameState.getInstance();
          if (!gs2.isCropUnlocked('rice')) {
            this.hudPrompt.setText('');
            return;
          }
          const rc = CookingSystem.riceCooker;
          if (rc.state === 'empty') {
            if (CookingSystem.heldItem === 'washed_rice') {
              this.hudPrompt.setText('[Space] Add washed rice');
            } else if (CookingSystem.heldItem === 'washed_barley') {
              this.hudPrompt.setText('[Space] Add washed barley');
            } else {
              this.hudPrompt.setText('Rice Cooker');
            }
          } else if (rc.state === 'has_washed_rice') {
            if (CookingSystem.heldItem === 'washed_barley') {
              this.hudPrompt.setText('[Space] Add washed barley');
            } else {
              this.hudPrompt.setText('Needs washed barley...');
            }
          } else if (rc.state === 'has_washed_barley') {
            if (CookingSystem.heldItem === 'washed_rice') {
              this.hudPrompt.setText('[Space] Add washed rice');
            } else {
              this.hudPrompt.setText('Needs washed rice...');
            }
          } else if (rc.state === 'has_both') {
            this.hudPrompt.setText('[Space] Start cooking');
          } else if (rc.state === 'cooking_rice') {
            this.hudPrompt.setText('[Hold Space] Cook rice');
          } else if (rc.state === 'has_barley_rice') {
            if (CookingSystem.heldItem === 'bowl') {
              this.hudPrompt.setText(`[Space] Pick up Barley Rice (x${rc.servingsRemaining})`);
            } else if (CookingSystem.heldItem === 'bowl_stack' && CookingSystem.stackEmpty > 0) {
              this.hudPrompt.setText(`[Space] Fill bowl (x${rc.servingsRemaining})`);
            } else {
              this.hudPrompt.setText(`Need bowl! (x${rc.servingsRemaining} ready)`);
            }
          }
          break;
        }
        case 'recipe_book':
          this.hudPrompt.setText('[Space] View recipes');
          break;
        case 'bowl': {
          const gs = GameState.getInstance();
          if (!gs.isCropUnlocked('rice')) {
            this.hudPrompt.setText('');
            return;
          }
          if (CookingSystem.heldItem === null) {
            this.hudPrompt.setText('[Space] Pick up bowl');
          } else if (CookingSystem.heldItem === 'bowl' || CookingSystem.heldItem === 'barley_rice'
            || (CookingSystem.heldItem === 'bowl_stack' && CookingSystem.stackTotal < 4)) {
            this.hudPrompt.setText('[Space] Add bowl to stack');
          } else if (CookingSystem.heldItem === 'bowl_stack' && CookingSystem.stackTotal >= 4) {
            this.hudPrompt.setText('Stack full!');
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
          const gs3 = GameState.getInstance();
          if (!gs3.isCropUnlocked('rice')) {
            this.hudPrompt.setText('');
            return;
          }
          const sk = CookingSystem.sink;
          if (sk.state === 'empty' && CookingSystem.heldItem === 'rice') {
            this.hudPrompt.setText('[Space] Wash rice');
          } else if (sk.state === 'empty' && CookingSystem.heldItem === 'barley') {
            this.hudPrompt.setText('[Space] Wash barley');
          } else if (sk.state === 'washing') {
            const what = CookingSystem.sinkItem === 'barley' ? 'barley' : 'rice';
            this.hudPrompt.setText(`[Hold Space] Washing ${what}...`);
          } else if (sk.state === 'done' && CookingSystem.heldItem === null) {
            const what = CookingSystem.sinkItem === 'barley' ? 'washed barley' : 'washed rice';
            this.hudPrompt.setText(`[Space] Pick up ${what}`);
          } else if (sk.state === 'done') {
            const what = CookingSystem.sinkItem === 'barley' ? 'Washed barley' : 'Washed rice';
            this.hudPrompt.setText(`${what} ready!`);
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
            const name = kt.item === 'tray' ? 'Tray' : kt.item === 'bowl_stack' ? 'Stack' : (ITEM_NAMES[kt.item] || kt.item);
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

  // ============================
  // Recipe Modal
  // ============================

  private toggleRecipeModal(): void {
    if (this.recipeModalVisible) {
      this.hideRecipeModal();
    } else {
      this.showRecipeModal();
    }
  }

  private showRecipeModal(): void {
    if (this.recipeModalVisible) return;
    this.recipeModalVisible = true;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const state = GameState.getInstance();
    const riceUnlocked = state.isCropUnlocked('rice');

    const container = this.add.container(0, 0).setDepth(100);

    // Semi-transparent background
    const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7);
    container.add(bg);

    // Modal panel
    const panelW = 600;
    const panelH = 500;
    const panel = this.add.rectangle(w / 2, h / 2, panelW, panelH, 0x2D2D4E, 0.95);
    panel.setStrokeStyle(2, 0x5555AA);
    container.add(panel);

    // Title
    const title = this.add.text(w / 2, h / 2 - panelH / 2 + 25, 'RECIPE BOOK', {
      fontSize: '24px', fontFamily: 'monospace', color: '#FFD700',
    }).setOrigin(0.5);
    container.add(title);

    let yOff = h / 2 - panelH / 2 + 60;
    const leftX = w / 2 - panelW / 2 + 30;
    const lineH = 18;

    // Barley Tea recipe
    const iconGfx = this.add.graphics().setDepth(101);
    container.add(iconGfx);

    const iconSize = 22;
    this.drawFoodIcon(iconGfx, leftX + iconSize / 2, yOff + 9, iconSize, 0xC8A960, 'barley_tea');
    const teaTitle = this.add.text(leftX + iconSize + 8, yOff, 'BARLEY TEA:', {
      fontSize: '16px', fontFamily: 'monospace', color: '#C8A960',
    });
    container.add(teaTitle);
    yOff += lineH + 4;

    const teaSteps = [
      '1. Pick up BARLEY from barley bin',
      '2. ROAST at OVEN (wait 5s)',
      '3. Add to KETTLE',
      '4. BOIL at KETTLE (hold Space 3s)',
      '5. Pick up CUP(s) from cup storage',
      '6. FILL cup(s) at KETTLE',
      '7. SERVE to customer!',
    ];
    for (const step of teaSteps) {
      const txt = this.add.text(leftX + 10, yOff, step, {
        fontSize: '13px', fontFamily: 'monospace', color: '#CCCCCC',
      });
      container.add(txt);
      yOff += lineH;
    }

    yOff += 12;

    // Barley Rice recipe (only if unlocked)
    if (riceUnlocked) {
      this.drawFoodIcon(iconGfx, leftX + iconSize / 2, yOff + 9, iconSize, 0xC4956A, 'barley_rice');
      const riceTitle = this.add.text(leftX + iconSize + 8, yOff, 'BARLEY RICE:', {
        fontSize: '16px', fontFamily: 'monospace', color: '#C4956A',
      });
      container.add(riceTitle);
      yOff += lineH + 4;

      const riceSteps = [
        '1. Pick up RICE from rice bin → WASH at SINK',
        '2. Pick up BARLEY from barley bin → WASH at SINK',
        '3. Add both to RICE COOKER (either order)',
        '4. COOK at COOKER (hold Space 3s)',
        '5. Pick up BOWL(s) from bowl station',
        '6. FILL bowl(s) at COOKER',
        '7. SERVE to customer!',
      ];
      for (const step of riceSteps) {
        const txt = this.add.text(leftX + 10, yOff, step, {
          fontSize: '13px', fontFamily: 'monospace', color: '#CCCCCC',
        });
        container.add(txt);
        yOff += lineH;
      }
    }

    // Reopen hint
    const reopenHint = this.add.text(w / 2, h / 2 + panelH / 2 - 45, 'To view this screen again, come back to the RECIPE station and press SPACE', {
      fontSize: '11px', fontFamily: 'monospace', color: '#888888', wordWrap: { width: panelW - 60 },
    }).setOrigin(0.5);
    container.add(reopenHint);

    // Close hint
    const closeHint = this.add.text(w / 2, h / 2 + panelH / 2 - 25, '[Space / Esc] Close', {
      fontSize: '14px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0.5);
    container.add(closeHint);

    this.recipeModal = container;
  }

  private hideRecipeModal(): void {
    if (!this.recipeModalVisible) return;
    this.recipeModalVisible = false;
    if (this.recipeModal) {
      this.recipeModal.destroy();
      this.recipeModal = undefined;
    }
    // Start spawning customers after player closes the initial recipe review
    if (!this.serviceStarted) {
      this.serviceStarted = true;
      this.scheduleNextSpawn();
    }
  }

  private showMsg(text: string): void {
    this.hudMsg.setText(text);
    if (this.msgTimer) this.msgTimer.destroy();
    this.msgTimer = this.time.delayedCall(3000, () => this.hudMsg.setText(''));
  }
}
