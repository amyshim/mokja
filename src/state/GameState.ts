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

export type CustomerStatus = 'walking' | 'seated' | 'ordered' | 'served';

export interface CustomerData {
  id: string;
  groupSize: number;
  tableId: number;
  orderedRecipeId: string | null;
  status: CustomerStatus;
  servingsNeeded: number;
  servingsDelivered: number;
}

export interface DayResults {
  revenue: number;
  customersServed: number;
}

export interface MilestoneData {
  firstMilestone: boolean; // 10 barley teas → rice unlock
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
  totalTeasServed: number;
  milestones: MilestoneData;
  unlockedCrops: string[];
  unlockedRecipes: string[];
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
      barley: 0,
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
    totalTeasServed: 0,
    milestones: { firstMilestone: false },
    unlockedCrops: ['barley'],
    unlockedRecipes: ['barley_tea'],
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
    this.data.inventory.barley = (this.data.inventory.barley || 0) + 5;
  }

  /** Check and apply milestone unlocks. Returns true if a new milestone was reached. */
  checkMilestones(): boolean {
    if (!this.data.milestones.firstMilestone && this.data.totalTeasServed >= 10) {
      this.data.milestones.firstMilestone = true;
      // Unlock rice crop
      if (!this.data.unlockedCrops.includes('rice')) {
        this.data.unlockedCrops.push('rice');
      }
      // Unlock barley rice recipe
      if (!this.data.unlockedRecipes.includes('barley_rice')) {
        this.data.unlockedRecipes.push('barley_rice');
      }
      // Award 10 rice and 10 barley
      this.data.inventory.rice = (this.data.inventory.rice || 0) + 10;
      this.data.inventory.barley = (this.data.inventory.barley || 0) + 10;
      return true;
    }
    return false;
  }

  /** Check if a crop is unlocked */
  isCropUnlocked(cropId: string): boolean {
    return this.data.unlockedCrops.includes(cropId);
  }

  /** Check if a recipe is unlocked */
  isRecipeUnlocked(recipeId: string): boolean {
    return this.data.unlockedRecipes.includes(recipeId);
  }
}

export default GameState;
