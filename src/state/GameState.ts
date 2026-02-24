import { TABLES } from '../config/tables';

export interface PlotData {
  cropId: string | null;
  plantedAt: number;  // timestamp ms
  wateredToday: boolean;
  growthDays: number;
  ready: boolean;
}

export interface Inventory {
  [cropId: string]: number;
}

export interface MenuItem {
  recipeId: string;
}

export interface TableData {
  id: number;
  seats: number;
  occupied: boolean;
  dirty: boolean;
}

export type CustomerStatus = 'seated' | 'ordered' | 'cooking' | 'ready' | 'served';

export interface CustomerData {
  id: string;
  groupSize: number;
  tableId: number;
  orderedRecipeId: string | null;
  status: CustomerStatus;
}

export interface DayResults {
  revenue: number;
  customersServed: number;
}

export interface GameStateData {
  day: number;
  wallet: number;
  farm: { plots: PlotData[] };
  inventory: Inventory;
  menu: MenuItem[];
  restaurant: {
    tables: TableData[];
    customers: CustomerData[];
  };
  dayResults: DayResults;
  lastPlayedTimestamp: number;
}

const GRID_SIZE = 24; // 4 rows of 6 plots with aisles

function createDefaultState(): GameStateData {
  const plots: PlotData[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    plots.push({
      cropId: null,
      plantedAt: 0,
      wateredToday: false,
      growthDays: 0,
      ready: false,
    });
  }

  return {
    day: 1,
    wallet: 0,
    farm: { plots },
    inventory: {
      cabbage: 0,
      pepper: 0,
      rice: 0,
    },
    menu: [],
    restaurant: {
      tables: TABLES.map(t => ({
        id: t.id,
        seats: t.seats,
        occupied: false,
        dirty: false,
      })),
      customers: [],
    },
    dayResults: { revenue: 0, customersServed: 0 },
    lastPlayedTimestamp: Date.now(),
  };
}

class GameState {
  private static instance: GameState;
  data!: GameStateData;

  private constructor() {
    this.data = createDefaultState();
  }

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  reset(): void {
    this.data = createDefaultState();
  }

  /** Starter harvest so first-time players can experience the full loop */
  grantStarterHarvest(): void {
    this.data.inventory.cabbage = (this.data.inventory.cabbage || 0) + 6;
    this.data.inventory.pepper = (this.data.inventory.pepper || 0) + 4;
    this.data.inventory.rice = (this.data.inventory.rice || 0) + 6;
  }
}

export default GameState;
