import { RECIPES, PrepStep } from '../config/recipes';

export class CookingSystem {
  /** Get the prep steps for a recipe */
  static getPrepSteps(recipeId: string): PrepStep[] {
    const recipe = RECIPES[recipeId];
    return recipe ? recipe.prepSteps : [];
  }
}
