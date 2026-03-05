export type PrepStepType = 'roast' | 'boil' | 'fill' | 'wash';

export interface PrepStep {
  type: PrepStepType;
  label: string;
  duration: number; // seconds for the interaction
}

export interface RecipeDef {
  id: string;
  name: string;
  ingredients: { cropId: string; quantity: number }[];
  profitPerServing: number;
  prepSteps: PrepStep[];
  servingsPerBatch?: number; // how many servings one cook yields (default 1)
  iconColor: number; // color for order indicator icon
}

export const RECIPES: Record<string, RecipeDef> = {
  barley_tea: {
    id: 'barley_tea',
    name: 'Barley Tea',
    ingredients: [{ cropId: 'barley', quantity: 1 }],
    profitPerServing: 2,
    prepSteps: [
      { type: 'roast', label: 'Roast barley in oven', duration: 5 },
      { type: 'boil', label: 'Boil at stove', duration: 3 },
      { type: 'fill', label: 'Fill cup from stove', duration: 0 },
    ],
    iconColor: 0xC8A960, // warm brown for tea
  },
  barley_rice: {
    id: 'barley_rice',
    name: 'Barley Rice',
    ingredients: [
      { cropId: 'barley', quantity: 1 },
      { cropId: 'rice', quantity: 1 },
    ],
    profitPerServing: 3,
    prepSteps: [
      { type: 'wash', label: 'Wash rice at sink', duration: 3 },
      { type: 'boil', label: 'Boil with barley at stove', duration: 3 },
    ],
    servingsPerBatch: 5,
    iconColor: 0xC4956A, // warm golden brown for barley rice
  },
};

export const RECIPE_IDS = Object.keys(RECIPES);
