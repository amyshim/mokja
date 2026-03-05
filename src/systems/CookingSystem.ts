import GameState from '../state/GameState';
import { RECIPES } from '../config/recipes';

export type HeldItem = 'barley' | 'roasted_barley' | 'empty_cup' | 'barley_tea' | 'tray' | 'rice' | 'washed_rice' | 'barley_rice' | 'bowl' | null;

export type OvenState = 'empty' | 'roasting' | 'done' | 'burned';

export interface OvenData {
  state: OvenState;
  timer: number; // seconds elapsed since barley placed
}

export type StoveState =
  | 'empty'
  // Tea mode
  | 'has_roasted_barley'  // roasted barley added, ready to boil
  | 'boiling_tea'         // hold Space to boil
  | 'hot_with_tea'        // ready to dispense cups
  // Rice mode
  | 'has_washed_rice'     // washed rice added, needs barley
  | 'has_rice_and_barley' // both added, ready to cook
  | 'cooking_rice'        // hold Space to cook
  | 'has_barley_rice';    // done, pick up servings

export interface StoveData {
  state: StoveState;
  cupsRemaining: number;     // tea mode only
  servingsRemaining: number; // rice mode: how many barley rice servings left
  boilProgress: number;      // 0-3 seconds (used for both tea boiling and rice cooking)
}

export type SinkState = 'empty' | 'washing' | 'done';

export interface SinkData {
  state: SinkState;
  washProgress: number; // 0-3 seconds
}

export interface KitchenTableData {
  item: HeldItem;
  trayEmpty: number;
  trayFilled: number;
}

// Trash bin hold-to-discard
export interface TrashData {
  holdProgress: number; // 0-1 seconds
}

const ROAST_TIME = 5;    // seconds to roast
const BURN_TIME = 10;    // seconds before burning
const BOIL_TIME = 3;     // seconds to boil tea or cook rice
const WASH_TIME = 3;     // seconds to wash rice
const CUPS_PER_BATCH = 5;
const RICE_SERVINGS_PER_BATCH = 5;
const MAX_TRAY = 4;
const TRASH_HOLD_TIME = 1; // seconds to hold Space to discard

const NUM_STOVES = 4;
const NUM_KITCHEN_TABLES = 4;

function createStove(): StoveData {
  return { state: 'empty', cupsRemaining: 0, servingsRemaining: 0, boilProgress: 0 };
}

export class CookingSystem {
  // Oven
  static oven: OvenData = { state: 'empty', timer: 0 };

  // Multiple stoves
  static stoves: StoveData[] = Array.from({ length: NUM_STOVES }, () => createStove());

  // Sink (unlocked with rice)
  static sink: SinkData = { state: 'empty', washProgress: 0 };

  // Trash bin
  static trash: TrashData = { holdProgress: 0 };

  // Kitchen tables (4 surfaces)
  static kitchenTables: KitchenTableData[] = Array.from({ length: NUM_KITCHEN_TABLES }, () => ({
    item: null as HeldItem, trayEmpty: 0, trayFilled: 0,
  }));

  // Player held item
  static heldItem: HeldItem = null;

  // Tray state (only meaningful when heldItem === 'tray')
  static trayEmpty = 0;
  static trayFilled = 0;

  static reset(): void {
    this.oven = { state: 'empty', timer: 0 };
    this.stoves = Array.from({ length: NUM_STOVES }, () => createStove());
    this.sink = { state: 'empty', washProgress: 0 };
    this.trash = { holdProgress: 0 };
    this.kitchenTables = Array.from({ length: NUM_KITCHEN_TABLES }, () => ({
      item: null as HeldItem, trayEmpty: 0, trayFilled: 0,
    }));
    this.heldItem = null;
    this.trayEmpty = 0;
    this.trayFilled = 0;
  }

  /** Total cups on tray */
  static get trayTotal(): number {
    return this.trayEmpty + this.trayFilled;
  }

  /** Check if player can serve a specific recipe */
  static canServe(recipeId: string): boolean {
    if (recipeId === 'barley_tea') {
      return this.heldItem === 'barley_tea' || (this.heldItem === 'tray' && this.trayFilled > 0);
    }
    if (recipeId === 'barley_rice') {
      return this.heldItem === 'barley_rice';
    }
    return false;
  }

  /** Remove one serving for the given recipe. Returns true if served. */
  static serveOne(recipeId: string): boolean {
    if (recipeId === 'barley_tea') {
      return this.serveOneTea();
    }
    if (recipeId === 'barley_rice') {
      if (this.heldItem === 'barley_rice') {
        this.heldItem = null;
        return true;
      }
      return false;
    }
    return false;
  }

  /** Legacy: check if player can serve tea */
  static hasTeaToServe(): boolean {
    return this.canServe('barley_tea');
  }

  /** Remove one tea for serving. Returns true if served. */
  static serveOneTea(): boolean {
    if (this.heldItem === 'barley_tea') {
      this.heldItem = null;
      return true;
    }
    if (this.heldItem === 'tray' && this.trayFilled > 0) {
      this.trayFilled--;
      if (this.trayTotal === 0) {
        this.heldItem = null;
      }
      return true;
    }
    return false;
  }

  /** Upgrade single item to tray when adding a cup */
  private static upgradeToTray(): void {
    if (this.heldItem === 'empty_cup') {
      this.heldItem = 'tray';
      this.trayEmpty = 1;
      this.trayFilled = 0;
    } else if (this.heldItem === 'barley_tea') {
      this.heldItem = 'tray';
      this.trayEmpty = 0;
      this.trayFilled = 1;
    }
  }

  /** Update oven timer each frame */
  static updateOven(deltaSec: number): void {
    if (this.oven.state === 'roasting' || this.oven.state === 'done') {
      this.oven.timer += deltaSec;
      if (this.oven.timer >= BURN_TIME) {
        this.oven.state = 'burned';
      } else if (this.oven.state === 'roasting' && this.oven.timer >= ROAST_TIME) {
        this.oven.state = 'done';
      }
    }
  }

  /** Update stove boil/cook progress when actively holding Space */
  static updateStoveBoil(stoveIndex: number, deltaSec: number): boolean {
    const stove = this.stoves[stoveIndex];
    if (!stove) return false;

    if (stove.state === 'boiling_tea') {
      stove.boilProgress += deltaSec;
      if (stove.boilProgress >= BOIL_TIME) {
        stove.state = 'hot_with_tea';
        stove.boilProgress = BOIL_TIME;
        return true;
      }
    } else if (stove.state === 'cooking_rice') {
      stove.boilProgress += deltaSec;
      if (stove.boilProgress >= BOIL_TIME) {
        stove.state = 'has_barley_rice';
        stove.servingsRemaining = RICE_SERVINGS_PER_BATCH;
        stove.boilProgress = BOIL_TIME;
        return true;
      }
    }
    return false;
  }

  /** Update sink wash progress when actively holding Space */
  static updateSinkWash(deltaSec: number): boolean {
    if (this.sink.state !== 'washing') return false;
    this.sink.washProgress += deltaSec;
    if (this.sink.washProgress >= WASH_TIME) {
      this.sink.state = 'done';
      this.sink.washProgress = WASH_TIME;
      return true;
    }
    return false;
  }

  /** Update trash hold progress. Returns true if item discarded. */
  static updateTrashHold(deltaSec: number): boolean {
    if (this.heldItem === null) return false;
    this.trash.holdProgress += deltaSec;
    if (this.trash.holdProgress >= TRASH_HOLD_TIME) {
      this.discardHeldItem();
      this.trash.holdProgress = 0;
      return true;
    }
    return false;
  }

  static resetTrashHold(): void {
    this.trash.holdProgress = 0;
  }

  static getTrashProgress(): number {
    return this.trash.holdProgress / TRASH_HOLD_TIME;
  }

  // --- Station interactions ---

  /** Interact with barley bin */
  static interactBarleyBin(): string | null {
    if (this.heldItem !== null) return 'Hands full!';
    const state = GameState.getInstance();
    if ((state.data.inventory.barley || 0) <= 0) return 'No barley!';
    state.data.inventory.barley--;
    this.heldItem = 'barley';
    return null;
  }

  /** Interact with rice bin */
  static interactRiceBin(): string | null {
    const state = GameState.getInstance();
    if (!state.isCropUnlocked('rice')) return 'Not unlocked yet!';
    if (this.heldItem !== null) return 'Hands full!';
    if ((state.data.inventory.rice || 0) <= 0) return 'No rice!';
    state.data.inventory.rice--;
    this.heldItem = 'rice';
    return null;
  }

  /** Interact with oven */
  static interactOven(): string | null {
    if (this.oven.state === 'empty') {
      if (this.heldItem !== 'barley') return 'Need barley!';
      this.heldItem = null;
      this.oven.state = 'roasting';
      this.oven.timer = 0;
      return null;
    }
    if (this.oven.state === 'roasting') {
      return 'Still roasting...';
    }
    if (this.oven.state === 'done') {
      if (this.heldItem !== null) return 'Hands full!';
      this.heldItem = 'roasted_barley';
      this.oven.state = 'empty';
      this.oven.timer = 0;
      return null;
    }
    if (this.oven.state === 'burned') {
      this.oven.state = 'empty';
      this.oven.timer = 0;
      return 'Burned! Discarded.';
    }
    return null;
  }

  /** Interact with a specific stove (multi-purpose: tea and rice modes) */
  static interactStove(stoveIndex: number): string | null {
    const stove = this.stoves[stoveIndex];
    if (!stove) return 'No stove!';

    // Empty stove — auto-detect mode based on held item
    if (stove.state === 'empty') {
      if (this.heldItem === 'roasted_barley') {
        // Tea mode
        this.heldItem = null;
        stove.state = 'has_roasted_barley';
        stove.cupsRemaining = CUPS_PER_BATCH;
        stove.boilProgress = 0;
        return null;
      }
      if (this.heldItem === 'washed_rice') {
        // Rice mode step 1
        this.heldItem = null;
        stove.state = 'has_washed_rice';
        stove.boilProgress = 0;
        return null;
      }
      return 'Need roasted barley or washed rice!';
    }

    // Tea mode states
    if (stove.state === 'has_roasted_barley') {
      if (this.heldItem !== null) return 'Put item down first!';
      stove.state = 'boiling_tea';
      stove.boilProgress = 0;
      return null;
    }
    if (stove.state === 'boiling_tea') {
      return 'Hold Space to boil!';
    }
    if (stove.state === 'hot_with_tea') {
      if (stove.cupsRemaining <= 0) return 'Stove empty!';

      // Single empty cup → single barley tea
      if (this.heldItem === 'empty_cup') {
        this.heldItem = 'barley_tea';
        stove.cupsRemaining--;
        if (stove.cupsRemaining <= 0) stove.state = 'empty';
        return null;
      }

      // Tray with empty cups → fill one
      if (this.heldItem === 'tray' && this.trayEmpty > 0) {
        this.trayEmpty--;
        this.trayFilled++;
        stove.cupsRemaining--;
        if (stove.cupsRemaining <= 0) stove.state = 'empty';
        return null;
      }

      return 'Need empty cup!';
    }

    // Rice mode states
    if (stove.state === 'has_washed_rice') {
      if (this.heldItem === 'barley') {
        // Add barley to complete ingredients
        this.heldItem = null;
        stove.state = 'has_rice_and_barley';
        return null;
      }
      return 'Add barley!';
    }
    if (stove.state === 'has_rice_and_barley') {
      if (this.heldItem !== null) return 'Put item down first!';
      stove.state = 'cooking_rice';
      stove.boilProgress = 0;
      return null;
    }
    if (stove.state === 'cooking_rice') {
      return 'Hold Space to cook!';
    }
    if (stove.state === 'has_barley_rice') {
      // Requires bowl to pick up
      if (this.heldItem !== 'bowl') return 'Need a bowl!';
      this.heldItem = 'barley_rice';
      stove.servingsRemaining--;
      if (stove.servingsRemaining <= 0) stove.state = 'empty';
      stove.boilProgress = 0;
      return null;
    }

    return null;
  }

  /** Interact with sink (wash rice) */
  static interactSink(): string | null {
    const state = GameState.getInstance();
    if (!state.isCropUnlocked('rice')) return 'Not unlocked yet!';

    if (this.sink.state === 'empty') {
      if (this.heldItem !== 'rice') return 'Need rice!';
      this.heldItem = null;
      this.sink.state = 'washing';
      this.sink.washProgress = 0;
      return null;
    }
    if (this.sink.state === 'washing') {
      return 'Hold Space to wash!';
    }
    if (this.sink.state === 'done') {
      if (this.heldItem !== null) return 'Hands full!';
      this.heldItem = 'washed_rice';
      this.sink.state = 'empty';
      this.sink.washProgress = 0;
      return null;
    }
    return null;
  }

  /** Interact with bowl station */
  static interactBowls(): string | null {
    const state = GameState.getInstance();
    if (!state.isCropUnlocked('rice')) return 'Not unlocked yet!';
    if (this.heldItem !== null) return 'Hands full!';
    this.heldItem = 'bowl';
    return null;
  }

  /** Interact with cup storage */
  static interactCups(): string | null {
    // Empty hands → pick up single cup
    if (this.heldItem === null) {
      this.heldItem = 'empty_cup';
      return null;
    }

    // Holding single cup or single tea → upgrade to tray and add one empty
    if (this.heldItem === 'empty_cup' || this.heldItem === 'barley_tea') {
      this.upgradeToTray();
      // Now it's a tray, fall through to add another cup
      if (this.trayTotal < MAX_TRAY) {
        this.trayEmpty++;
        return null;
      }
      return 'Tray full!';
    }

    // Already a tray → add empty cup
    if (this.heldItem === 'tray') {
      if (this.trayTotal >= MAX_TRAY) return 'Tray full!';
      this.trayEmpty++;
      return null;
    }

    return 'Hands full!';
  }

  /** Interact with kitchen table */
  static interactKitchenTable(tableIndex: number): string | null {
    const table = this.kitchenTables[tableIndex];
    if (!table) return 'No table!';

    if (this.heldItem !== null && table.item === null) {
      // Place item (save tray state)
      table.item = this.heldItem;
      table.trayEmpty = this.trayEmpty;
      table.trayFilled = this.trayFilled;
      this.heldItem = null;
      this.trayEmpty = 0;
      this.trayFilled = 0;
      return null;
    }
    if (this.heldItem === null && table.item !== null) {
      // Pick up item (restore tray state)
      this.heldItem = table.item;
      this.trayEmpty = table.trayEmpty;
      this.trayFilled = table.trayFilled;
      table.item = null;
      table.trayEmpty = 0;
      table.trayFilled = 0;
      return null;
    }
    if (this.heldItem !== null && table.item !== null) {
      return 'Table occupied!';
    }
    return 'Table empty.';
  }

  /** Discard held item */
  static discardHeldItem(): void {
    this.heldItem = null;
    this.trayEmpty = 0;
    this.trayFilled = 0;
  }

  // --- Getters ---

  static getOvenProgress(): number {
    if (this.oven.state === 'roasting') return this.oven.timer / ROAST_TIME;
    if (this.oven.state === 'done') return 1;
    if (this.oven.state === 'burned') return 1;
    return 0;
  }

  static getBoilProgress(stoveIndex: number): number {
    const stove = this.stoves[stoveIndex];
    if (!stove) return 0;
    return stove.boilProgress / BOIL_TIME;
  }

  static getWashProgress(): number {
    return this.sink.washProgress / WASH_TIME;
  }

  /** Is a specific stove in a state that requires hold-Space? */
  static isStoveHoldState(stoveIndex: number): boolean {
    const stove = this.stoves[stoveIndex];
    if (!stove) return false;
    return stove.state === 'boiling_tea' || stove.state === 'cooking_rice';
  }

  /** Is any stove in a hold state? */
  static isAnyStoveHoldState(): boolean {
    return this.stoves.some((_, i) => this.isStoveHoldState(i));
  }

  /** Is the sink in a state that requires hold-Space? */
  static isSinkHoldState(): boolean {
    return this.sink.state === 'washing';
  }

  /** Get a display name for current held item */
  static getHeldDisplayName(): string {
    if (this.heldItem === 'tray') {
      const parts: string[] = [];
      if (this.trayFilled > 0) parts.push(`${this.trayFilled} tea`);
      if (this.trayEmpty > 0) parts.push(`${this.trayEmpty} empty`);
      return `Tray (${parts.join(', ')})`;
    }
    switch (this.heldItem) {
      case 'barley': return 'Barley';
      case 'roasted_barley': return 'Roasted Barley';
      case 'empty_cup': return 'Empty Cup';
      case 'barley_tea': return 'Barley Tea';
      case 'rice': return 'Rice';
      case 'washed_rice': return 'Washed Rice';
      case 'barley_rice': return 'Barley Rice';
      case 'bowl': return 'Bowl';
      default: return '';
    }
  }

  static get ROAST_TIME(): number { return ROAST_TIME; }
  static get BURN_TIME(): number { return BURN_TIME; }
  static get BOIL_TIME(): number { return BOIL_TIME; }
  static get WASH_TIME(): number { return WASH_TIME; }
  static get CUPS_PER_BATCH(): number { return CUPS_PER_BATCH; }
  static get TRASH_HOLD_TIME(): number { return TRASH_HOLD_TIME; }
}
