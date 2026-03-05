import GameState, { GameStateData } from './GameState';
import { TABLES } from '../config/tables';

const SAVE_KEY = 'mokja_save';

export function saveGame(): void {
  const state = GameState.getInstance();
  state.data.lastPlayedTimestamp = Date.now();
  const json = JSON.stringify(state.data);
  localStorage.setItem(SAVE_KEY, json);
}

export function loadGame(): boolean {
  const json = localStorage.getItem(SAVE_KEY);
  if (!json) return false;

  try {
    const saved = JSON.parse(json);
    migrateState(saved);
    const state = GameState.getInstance();
    state.data = saved as GameStateData;
    return true;
  } catch {
    return false;
  }
}

/** Migrate old save formats to current shape */
function migrateState(saved: any): void {
  // Remove tips from dayResults (v1 → v2)
  if (saved.dayResults && 'tips' in saved.dayResults) {
    delete saved.dayResults.tips;
  }
  if (!('customersServed' in (saved.dayResults || {}))) {
    saved.dayResults = { revenue: 0, customersServed: 0 };
  }

  // Simplify menu items (remove servingsPlanned/servingsPrepared)
  if (saved.menu && saved.menu.length > 0 && 'servingsPlanned' in saved.menu[0]) {
    saved.menu = saved.menu.map((m: any) => ({ recipeId: m.recipeId }));
  }

  // Reset customers (shape changed: status enum replaces served/seatedAt/tableId nullable)
  if (saved.restaurant?.customers?.length > 0) {
    const first = saved.restaurant.customers[0];
    if ('served' in first || 'seatedAt' in first) {
      saved.restaurant.customers = [];
    }
  }

  // Guard against missing lastPlayedTimestamp
  if (!saved.lastPlayedTimestamp) {
    saved.lastPlayedTimestamp = Date.now();
  }

  // Ensure tables are reset
  if (saved.restaurant) {
    saved.restaurant.tables = TABLES.map(t => ({
      id: t.id,
      seats: t.seats,
      occupied: false,
      dirty: false,
    }));
  }

  // Milestone system fields (v3)
  if (saved.totalTeasServed === undefined) {
    saved.totalTeasServed = 0;
  }
  if (!saved.milestones) {
    saved.milestones = { firstMilestone: false };
  }
  if (!saved.unlockedCrops) {
    saved.unlockedCrops = ['barley'];
  }
  if (!saved.unlockedRecipes) {
    saved.unlockedRecipes = ['barley_tea'];
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
