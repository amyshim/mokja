import GameState from '../state/GameState';
import { RECIPES, RecipeDef } from '../config/recipes';

export class RecipeSystem {
  /** How many servings can be made from current inventory */
  static maxServings(recipeId: string): number {
    const state = GameState.getInstance();
    const recipe = RECIPES[recipeId];
    if (!recipe) return 0;

    let max = Infinity;
    for (const ing of recipe.ingredients) {
      const have = state.data.inventory[ing.cropId] || 0;
      const possible = Math.floor(have / ing.quantity);
      max = Math.min(max, possible);
    }
    return max === Infinity ? 0 : max;
  }

  /** Check if there are enough ingredients for one serving of a recipe */
  static canFulfillOrder(recipeId: string): boolean {
    return this.maxServings(recipeId) >= 1;
  }

  /** Deduct ingredients for one serving of a recipe. Returns false if insufficient. */
  static deductForOrder(recipeId: string): boolean {
    const state = GameState.getInstance();
    const recipe = RECIPES[recipeId];
    if (!recipe) return false;

    // Validate first
    for (const ing of recipe.ingredients) {
      const have = state.data.inventory[ing.cropId] || 0;
      if (have < ing.quantity) return false;
    }

    // Deduct
    for (const ing of recipe.ingredients) {
      state.data.inventory[ing.cropId] -= ing.quantity;
    }
    return true;
  }

  /** Check if any dish on today's menu can be fulfilled */
  static canFulfillAnyMenuItem(): boolean {
    const state = GameState.getInstance();
    return state.data.menu.some(item => this.canFulfillOrder(item.recipeId));
  }

  /** Get menu items that can currently be fulfilled */
  static getFulfillableMenuItems(): string[] {
    const state = GameState.getInstance();
    return state.data.menu
      .filter(item => this.canFulfillOrder(item.recipeId))
      .map(item => item.recipeId);
  }

  static getRecipe(recipeId: string): RecipeDef | undefined {
    return RECIPES[recipeId];
  }

  static getAllRecipes(): RecipeDef[] {
    return Object.values(RECIPES);
  }
}
