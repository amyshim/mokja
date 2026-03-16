import GameState from '../state/GameState';
import { RECIPES } from '../config/recipes';

export type HeldItem = 'barley' | 'roasted_barley' | 'washed_barley' | 'empty_cup' | 'barley_tea' | 'tray' | 'rice' | 'washed_rice' | 'barley_rice' | 'bowl' | 'bowl_stack' | null;

export type OvenState = 'empty' | 'roasting' | 'done' | 'burned';

export interface OvenData {
  state: OvenState;
  timer: number; // seconds elapsed since barley placed
}

export type KettleState =
  | 'empty'
  | 'has_roasted_barley'  // roasted barley added, ready to boil
  | 'boiling_tea'         // hold Space to boil
  | 'hot_with_tea';       // ready to dispense cups

export interface KettleData {
  state: KettleState;
  cupsRemaining: number;
  boilProgress: number;
}

export type RiceCookerState =
  | 'empty'
  | 'has_washed_rice'     // washed rice added, needs washed barley
  | 'has_washed_barley'   // washed barley added, needs washed rice
  | 'has_both'            // both added, ready to cook
  | 'cooking_rice'        // hold Space to cook
  | 'has_barley_rice';    // done, pick up servings

export interface RiceCookerData {
  state: RiceCookerState;
  servingsRemaining: number;
  cookProgress: number;
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
  stackEmpty: number;
  stackFilled: number;
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
const MAX_STACK = 4;
const TRASH_HOLD_TIME = 1; // seconds to hold Space to discard

const NUM_KITCHEN_TABLES = 4;

export class CookingSystem {
  // Oven
  static oven: OvenData = { state: 'empty', timer: 0 };

  // Kettle (for tea)
  static kettle: KettleData = { state: 'empty', cupsRemaining: 0, boilProgress: 0 };

  // Rice cooker (for barley rice)
  static riceCooker: RiceCookerData = { state: 'empty', servingsRemaining: 0, cookProgress: 0 };

  // Sink (now available for both barley and rice washing)
  static sink: SinkData = { state: 'empty', washProgress: 0 };
  static sinkItem: 'rice' | 'barley' | null = null;

  // Trash bin
  static trash: TrashData = { holdProgress: 0 };

  // Kitchen tables (4 surfaces)
  static kitchenTables: KitchenTableData[] = Array.from({ length: NUM_KITCHEN_TABLES }, () => ({
    item: null as HeldItem, trayEmpty: 0, trayFilled: 0, stackEmpty: 0, stackFilled: 0,
  }));

  // Player held item
  static heldItem: HeldItem = null;

  // Tray state (only meaningful when heldItem === 'tray')
  static trayEmpty = 0;
  static trayFilled = 0;

  // Bowl stack state (only meaningful when heldItem === 'bowl_stack')
  static stackEmpty = 0;
  static stackFilled = 0;

  static reset(): void {
    this.oven = { state: 'empty', timer: 0 };
    this.kettle = { state: 'empty', cupsRemaining: 0, boilProgress: 0 };
    this.riceCooker = { state: 'empty', servingsRemaining: 0, cookProgress: 0 };
    this.sink = { state: 'empty', washProgress: 0 };
    this.sinkItem = null;
    this.trash = { holdProgress: 0 };
    this.kitchenTables = Array.from({ length: NUM_KITCHEN_TABLES }, () => ({
      item: null as HeldItem, trayEmpty: 0, trayFilled: 0, stackEmpty: 0, stackFilled: 0,
    }));
    this.heldItem = null;
    this.trayEmpty = 0;
    this.trayFilled = 0;
    this.stackEmpty = 0;
    this.stackFilled = 0;
  }

  /** Total cups on tray */
  static get trayTotal(): number {
    return this.trayEmpty + this.trayFilled;
  }

  /** Total bowls on stack */
  static get stackTotal(): number {
    return this.stackEmpty + this.stackFilled;
  }

  /** Check if player can serve a specific recipe */
  static canServe(recipeId: string): boolean {
    if (recipeId === 'barley_tea') {
      return this.heldItem === 'barley_tea' || (this.heldItem === 'tray' && this.trayFilled > 0);
    }
    if (recipeId === 'barley_rice') {
      return this.heldItem === 'barley_rice' || (this.heldItem === 'bowl_stack' && this.stackFilled > 0);
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
      return this.serveOneRice();
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

  /** Remove one barley rice from bowl stack. Returns true if served. */
  static serveOneRice(): boolean {
    if (this.heldItem === 'bowl_stack' && this.stackFilled > 0) {
      this.stackFilled--;
      if (this.stackTotal === 0) {
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

  /** Upgrade single item to bowl stack when adding a bowl */
  private static upgradeToStack(): void {
    if (this.heldItem === 'bowl') {
      this.heldItem = 'bowl_stack';
      this.stackEmpty = 1;
      this.stackFilled = 0;
    } else if (this.heldItem === 'barley_rice') {
      this.heldItem = 'bowl_stack';
      this.stackEmpty = 0;
      this.stackFilled = 1;
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

  /** Update kettle boil progress when actively holding Space */
  static updateKettleBoil(deltaSec: number): boolean {
    if (this.kettle.state !== 'boiling_tea') return false;
    this.kettle.boilProgress += deltaSec;
    if (this.kettle.boilProgress >= BOIL_TIME) {
      this.kettle.state = 'hot_with_tea';
      this.kettle.boilProgress = BOIL_TIME;
      return true;
    }
    return false;
  }

  /** Update rice cooker cook progress when actively holding Space */
  static updateRiceCookerCook(deltaSec: number): boolean {
    if (this.riceCooker.state !== 'cooking_rice') return false;
    this.riceCooker.cookProgress += deltaSec;
    if (this.riceCooker.cookProgress >= BOIL_TIME) {
      this.riceCooker.state = 'has_barley_rice';
      this.riceCooker.servingsRemaining = RICE_SERVINGS_PER_BATCH;
      this.riceCooker.cookProgress = BOIL_TIME;
      return true;
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

  /** Interact with oven — accepts raw barley for roasting (tea workflow) */
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

  /** Interact with kettle (tea workflow only) */
  static interactKettle(): string | null {
    const kettle = this.kettle;

    // Empty kettle — add roasted barley
    if (kettle.state === 'empty') {
      if (this.heldItem === 'roasted_barley') {
        this.heldItem = null;
        kettle.state = 'has_roasted_barley';
        kettle.cupsRemaining = CUPS_PER_BATCH;
        kettle.boilProgress = 0;
        return null;
      }
      return 'Need roasted barley!';
    }

    // Has roasted barley — start boiling
    if (kettle.state === 'has_roasted_barley') {
      if (this.heldItem !== null) return 'Put item down first!';
      kettle.state = 'boiling_tea';
      kettle.boilProgress = 0;
      return null;
    }

    if (kettle.state === 'boiling_tea') {
      return 'Hold Space to boil!';
    }

    // Hot with tea — fill cups
    if (kettle.state === 'hot_with_tea') {
      if (kettle.cupsRemaining <= 0) return 'Kettle empty!';

      // Single empty cup -> single barley tea
      if (this.heldItem === 'empty_cup') {
        this.heldItem = 'barley_tea';
        kettle.cupsRemaining--;
        if (kettle.cupsRemaining <= 0) kettle.state = 'empty';
        return null;
      }

      // Tray with empty cups -> fill one
      if (this.heldItem === 'tray' && this.trayEmpty > 0) {
        this.trayEmpty--;
        this.trayFilled++;
        kettle.cupsRemaining--;
        if (kettle.cupsRemaining <= 0) kettle.state = 'empty';
        return null;
      }

      return 'Need empty cup!';
    }

    return null;
  }

  /** Interact with rice cooker (rice workflow only) */
  static interactRiceCooker(): string | null {
    const rc = this.riceCooker;

    // Empty rice cooker — accepts washed_rice or washed_barley
    if (rc.state === 'empty') {
      if (this.heldItem === 'washed_rice') {
        this.heldItem = null;
        rc.state = 'has_washed_rice';
        rc.cookProgress = 0;
        return null;
      }
      if (this.heldItem === 'washed_barley') {
        this.heldItem = null;
        rc.state = 'has_washed_barley';
        rc.cookProgress = 0;
        return null;
      }
      return 'Need washed rice or washed barley!';
    }

    // Has washed rice — needs washed barley
    if (rc.state === 'has_washed_rice') {
      if (this.heldItem === 'washed_barley') {
        this.heldItem = null;
        rc.state = 'has_both';
        return null;
      }
      return 'Add washed barley!';
    }

    // Has washed barley — needs washed rice
    if (rc.state === 'has_washed_barley') {
      if (this.heldItem === 'washed_rice') {
        this.heldItem = null;
        rc.state = 'has_both';
        return null;
      }
      return 'Add washed rice!';
    }

    // Has both — start cooking
    if (rc.state === 'has_both') {
      if (this.heldItem !== null) return 'Put item down first!';
      rc.state = 'cooking_rice';
      rc.cookProgress = 0;
      return null;
    }

    if (rc.state === 'cooking_rice') {
      return 'Hold Space to cook!';
    }

    // Has barley rice — fill bowls
    if (rc.state === 'has_barley_rice') {
      // Single bowl -> single barley rice
      if (this.heldItem === 'bowl') {
        this.heldItem = 'barley_rice';
        rc.servingsRemaining--;
        if (rc.servingsRemaining <= 0) rc.state = 'empty';
        rc.cookProgress = 0;
        return null;
      }

      // Bowl stack with empty bowls -> fill one
      if (this.heldItem === 'bowl_stack' && this.stackEmpty > 0) {
        this.stackEmpty--;
        this.stackFilled++;
        rc.servingsRemaining--;
        if (rc.servingsRemaining <= 0) rc.state = 'empty';
        return null;
      }

      return 'Need a bowl!';
    }

    return null;
  }

  /** Interact with sink (wash rice or barley — only available after rice unlock) */
  static interactSink(): string | null {
    const state = GameState.getInstance();
    if (!state.isCropUnlocked('rice')) return 'Not unlocked yet!';
    if (this.sink.state === 'empty') {
      if (this.heldItem === 'rice') {
        this.sinkItem = 'rice';
        this.heldItem = null;
        this.sink.state = 'washing';
        this.sink.washProgress = 0;
        return null;
      }
      if (this.heldItem === 'barley') {
        this.sinkItem = 'barley';
        this.heldItem = null;
        this.sink.state = 'washing';
        this.sink.washProgress = 0;
        return null;
      }
      return 'Need rice or barley!';
    }
    if (this.sink.state === 'washing') {
      return 'Hold Space to wash!';
    }
    if (this.sink.state === 'done') {
      if (this.heldItem !== null) return 'Hands full!';
      if (this.sinkItem === 'rice') {
        this.heldItem = 'washed_rice';
      } else {
        this.heldItem = 'washed_barley';
      }
      this.sink.state = 'empty';
      this.sink.washProgress = 0;
      this.sinkItem = null;
      return null;
    }
    return null;
  }

  /** Interact with bowl station */
  static interactBowls(): string | null {
    const state = GameState.getInstance();
    if (!state.isCropUnlocked('rice')) return 'Not unlocked yet!';

    // Empty hands -> pick up single bowl
    if (this.heldItem === null) {
      this.heldItem = 'bowl';
      return null;
    }

    // Holding single bowl or single barley rice -> upgrade to stack and add one empty
    if (this.heldItem === 'bowl' || this.heldItem === 'barley_rice') {
      this.upgradeToStack();
      if (this.stackTotal < MAX_STACK) {
        this.stackEmpty++;
        return null;
      }
      return 'Stack full!';
    }

    // Already a stack -> add empty bowl
    if (this.heldItem === 'bowl_stack') {
      if (this.stackTotal >= MAX_STACK) return 'Stack full!';
      this.stackEmpty++;
      return null;
    }

    return 'Hands full!';
  }

  /** Interact with cup storage */
  static interactCups(): string | null {
    // Empty hands -> pick up single cup
    if (this.heldItem === null) {
      this.heldItem = 'empty_cup';
      return null;
    }

    // Holding single cup or single tea -> upgrade to tray and add one empty
    if (this.heldItem === 'empty_cup' || this.heldItem === 'barley_tea') {
      this.upgradeToTray();
      // Now it's a tray, fall through to add another cup
      if (this.trayTotal < MAX_TRAY) {
        this.trayEmpty++;
        return null;
      }
      return 'Tray full!';
    }

    // Already a tray -> add empty cup
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
      // Place item (save tray/stack state)
      table.item = this.heldItem;
      table.trayEmpty = this.trayEmpty;
      table.trayFilled = this.trayFilled;
      table.stackEmpty = this.stackEmpty;
      table.stackFilled = this.stackFilled;
      this.heldItem = null;
      this.trayEmpty = 0;
      this.trayFilled = 0;
      this.stackEmpty = 0;
      this.stackFilled = 0;
      return null;
    }
    if (this.heldItem === null && table.item !== null) {
      // Pick up item (restore tray/stack state)
      this.heldItem = table.item;
      this.trayEmpty = table.trayEmpty;
      this.trayFilled = table.trayFilled;
      this.stackEmpty = table.stackEmpty;
      this.stackFilled = table.stackFilled;
      table.item = null;
      table.trayEmpty = 0;
      table.trayFilled = 0;
      table.stackEmpty = 0;
      table.stackFilled = 0;
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
    this.stackEmpty = 0;
    this.stackFilled = 0;
  }

  // --- Getters ---

  static getOvenProgress(): number {
    if (this.oven.state === 'roasting') return this.oven.timer / ROAST_TIME;
    if (this.oven.state === 'done') return 1;
    if (this.oven.state === 'burned') return 1;
    return 0;
  }

  static getKettleProgress(): number {
    return this.kettle.boilProgress / BOIL_TIME;
  }

  static getRiceCookerProgress(): number {
    return this.riceCooker.cookProgress / BOIL_TIME;
  }

  static getWashProgress(): number {
    return this.sink.washProgress / WASH_TIME;
  }

  /** Is the kettle in a state that requires hold-Space? */
  static isKettleHoldState(): boolean {
    return this.kettle.state === 'boiling_tea';
  }

  /** Is the rice cooker in a state that requires hold-Space? */
  static isRiceCookerHoldState(): boolean {
    return this.riceCooker.state === 'cooking_rice';
  }

  /** Is the sink in a state that requires hold-Space? */
  static isSinkHoldState(): boolean {
    return this.sink.state === 'washing';
  }

  /** Is any station in a hold state? */
  static isAnyHoldState(): boolean {
    return this.isKettleHoldState() || this.isRiceCookerHoldState() || this.isSinkHoldState();
  }

  /** Get a display name for current held item */
  static getHeldDisplayName(): string {
    if (this.heldItem === 'tray') {
      const parts: string[] = [];
      if (this.trayFilled > 0) parts.push(`${this.trayFilled} tea`);
      if (this.trayEmpty > 0) parts.push(`${this.trayEmpty} empty`);
      return `Tray (${parts.join(', ')})`;
    }
    if (this.heldItem === 'bowl_stack') {
      const parts: string[] = [];
      if (this.stackFilled > 0) parts.push(`${this.stackFilled} rice`);
      if (this.stackEmpty > 0) parts.push(`${this.stackEmpty} empty`);
      return `Stack (${parts.join(', ')})`;
    }
    switch (this.heldItem) {
      case 'barley': return 'Barley';
      case 'roasted_barley': return 'Roasted Barley';
      case 'washed_barley': return 'Washed Barley';
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
