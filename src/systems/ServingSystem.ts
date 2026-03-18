import GameState, { CustomerData } from '../state/GameState';
import { RecipeSystem } from './RecipeSystem';
import { RECIPES } from '../config/recipes';

let customerCounter = 0;

export class ServingSystem {
  /** Create a single customer with a random group size (1-2 for 2-seat tables) */
  static spawnCustomer(tableId: number): CustomerData {
    const groupSize = Math.random() < 0.4 ? 1 : 2;
    const customer: CustomerData = {
      id: `cust_${++customerCounter}`,
      groupSize,
      tableId,
      orderedRecipeId: null,
      status: 'walking',
      servingsNeeded: 0,
      servingsDelivered: 0,
    };
    const state = GameState.getInstance();
    state.data.restaurant.customers.push(customer);
    return customer;
  }

  /** Mark customer as seated (called after walk animation completes) */
  static markSeated(customerId: string): void {
    const state = GameState.getInstance();
    const customer = state.data.restaurant.customers.find(c => c.id === customerId);
    if (customer && customer.status === 'walking') {
      customer.status = 'seated';
    }
  }

  /** Assign a random fulfillable order to a customer. Does NOT deduct ingredients. */
  static takeOrder(customerId: string): string | null {
    const state = GameState.getInstance();
    const customer = state.data.restaurant.customers.find(c => c.id === customerId);
    if (!customer || customer.status !== 'seated') return null;

    const fulfillable = RecipeSystem.getFulfillableMenuItems();
    if (fulfillable.length === 0) return null;

    const pick = fulfillable[Math.floor(Math.random() * fulfillable.length)];
    customer.orderedRecipeId = pick;
    customer.servingsNeeded = customer.groupSize;
    customer.servingsDelivered = 0;
    customer.status = 'ordered';
    return pick;
  }

  /** Serve one portion to the table. Returns revenue or null. Sets 'served' when all done. */
  static serveCustomer(customerId: string): { revenue: number; allDone: boolean } | null {
    const state = GameState.getInstance();
    const customer = state.data.restaurant.customers.find(c => c.id === customerId);
    if (!customer || customer.status !== 'ordered' || !customer.orderedRecipeId) return null;

    const recipe = RECIPES[customer.orderedRecipeId];
    if (!recipe) return null;

    const revenue = recipe.profitPerServing;
    state.data.dayResults.revenue += revenue;
    state.data.dayResults.customersServed++;
    state.data.wallet += revenue;

    // Track cumulative servings by recipe
    if (customer.orderedRecipeId === 'barley_tea') {
      state.data.totalTeasServed++;
      state.data.dayResults.teasServedToday++;
    } else if (customer.orderedRecipeId === 'barley_rice') {
      state.data.totalRiceServed++;
    }

    customer.servingsDelivered++;
    const allDone = customer.servingsDelivered >= customer.servingsNeeded;
    if (allDone) {
      customer.status = 'enjoying';
    }
    return { revenue, allDone };
  }

  /** Mark table as dirty after customer leaves */
  static vacateTable(tableId: number): void {
    const state = GameState.getInstance();
    const table = state.data.restaurant.tables.find(t => t.id === tableId);
    if (table) {
      table.occupied = false;
      table.dirty = true;
    }
  }

  /** Clean a dirty table */
  static cleanTable(tableId: number): boolean {
    const state = GameState.getInstance();
    const table = state.data.restaurant.tables.find(t => t.id === tableId);
    if (!table || !table.dirty) return false;
    table.dirty = false;
    table.occupied = false;
    return true;
  }

  /** Get a clean, unoccupied table */
  static getAvailableTable(): number | null {
    const state = GameState.getInstance();
    const available = state.data.restaurant.tables.filter(t => !t.occupied && !t.dirty);
    if (available.length === 0) return null;
    return available[0].id;
  }

  /** Seat a customer at a table */
  static seatAtTable(customerId: string, tableId: number): void {
    const state = GameState.getInstance();
    const table = state.data.restaurant.tables.find(t => t.id === tableId);
    if (table) {
      table.occupied = true;
    }
  }

  /** Check if service is done: no active customers and no more can be served */
  static isServiceDone(): boolean {
    const state = GameState.getInstance();
    const hasActive = state.data.restaurant.customers.some(
      c => c.status !== 'served'
    );
    if (hasActive) return false;

    // Check if more customers could arrive (ingredients available)
    return !RecipeSystem.canFulfillAnyMenuItem();
  }

  /** Get customer seated at a specific table */
  static getCustomerAtTable(tableId: number): CustomerData | null {
    const state = GameState.getInstance();
    return state.data.restaurant.customers.find(
      c => c.tableId === tableId && c.status !== 'served' && c.status !== 'walking'
    ) || null;
  }
}
