import GameState, { CustomerData } from '../state/GameState';
import { RecipeSystem } from './RecipeSystem';

let customerCounter = 0;

export class ServingSystem {
  /** Create a single customer with a random group size */
  static spawnCustomer(tableId: number): CustomerData {
    const groupSize = Math.random() < 0.3 ? 1 : Math.floor(Math.random() * 3) + 2;
    const customer: CustomerData = {
      id: `cust_${++customerCounter}`,
      groupSize,
      tableId,
      orderedRecipeId: null,
      status: 'seated',
    };
    const state = GameState.getInstance();
    state.data.restaurant.customers.push(customer);
    return customer;
  }

  /** Assign a random fulfillable order to a customer. Deducts ingredients. */
  static takeOrder(customerId: string): string | null {
    const state = GameState.getInstance();
    const customer = state.data.restaurant.customers.find(c => c.id === customerId);
    if (!customer || customer.status !== 'seated') return null;

    const fulfillable = RecipeSystem.getFulfillableMenuItems();
    if (fulfillable.length === 0) return null;

    const pick = fulfillable[Math.floor(Math.random() * fulfillable.length)];
    if (!RecipeSystem.deductForOrder(pick)) return null;

    customer.orderedRecipeId = pick;
    customer.status = 'ordered';
    return pick;
  }

  /** Start cooking a customer's order */
  static startCooking(customerId: string): boolean {
    const state = GameState.getInstance();
    const customer = state.data.restaurant.customers.find(c => c.id === customerId);
    if (!customer || customer.status !== 'ordered') return false;

    // Only one order can cook at a time
    const alreadyCooking = state.data.restaurant.customers.find(c => c.status === 'cooking');
    if (alreadyCooking) return false;

    customer.status = 'cooking';
    return true;
  }

  /** Mark cooking as complete */
  static finishCooking(customerId: string): boolean {
    const state = GameState.getInstance();
    const customer = state.data.restaurant.customers.find(c => c.id === customerId);
    if (!customer || customer.status !== 'cooking') return false;
    customer.status = 'ready';
    return true;
  }

  /** Serve a customer their completed dish */
  static serveCustomer(customerId: string): number | null {
    const state = GameState.getInstance();
    const customer = state.data.restaurant.customers.find(c => c.id === customerId);
    if (!customer || customer.status !== 'ready' || !customer.orderedRecipeId) return null;

    const recipe = RecipeSystem.getRecipe(customer.orderedRecipeId);
    if (!recipe) return null;

    const revenue = recipe.profitPerServing;
    state.data.dayResults.revenue += revenue;
    state.data.dayResults.customersServed++;
    state.data.wallet += revenue;

    customer.status = 'served';
    return revenue;
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

  /** Get a clean, unoccupied table (prefer matching group size) */
  static getAvailableTable(groupSize?: number): number | null {
    const state = GameState.getInstance();
    const available = state.data.restaurant.tables.filter(t => !t.occupied && !t.dirty);
    if (available.length === 0) return null;

    if (groupSize) {
      // Prefer smallest table that fits
      const fitting = available.filter(t => t.seats >= groupSize).sort((a, b) => a.seats - b.seats);
      if (fitting.length > 0) return fitting[0].id;
    }

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

  /** Get the customer currently being cooked */
  static getCookingCustomer(): CustomerData | null {
    const state = GameState.getInstance();
    return state.data.restaurant.customers.find(c => c.status === 'cooking') || null;
  }

  /** Get customer seated at a specific table */
  static getCustomerAtTable(tableId: number): CustomerData | null {
    const state = GameState.getInstance();
    return state.data.restaurant.customers.find(
      c => c.tableId === tableId && c.status !== 'served'
    ) || null;
  }
}
