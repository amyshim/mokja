export type PrepStepType = 'chop' | 'boil' | 'combine';

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
}

export const RECIPES: Record<string, RecipeDef> = {
  kimchi: {
    id: 'kimchi',
    name: 'Kimchi',
    ingredients: [
      { cropId: 'cabbage', quantity: 2 },
      { cropId: 'pepper', quantity: 1 },
    ],
    profitPerServing: 8,
    prepSteps: [
      { type: 'chop', label: 'Chop cabbage', duration: 2 },
      { type: 'combine', label: 'Mix with pepper flakes & salt', duration: 2 },
    ],
  },
  kimchi_stew: {
    id: 'kimchi_stew',
    name: 'Kimchi Stew',
    ingredients: [
      { cropId: 'cabbage', quantity: 3 },
      { cropId: 'pepper', quantity: 1 },
    ],
    profitPerServing: 12,
    prepSteps: [
      { type: 'chop', label: 'Chop cabbage', duration: 2 },
      { type: 'boil', label: 'Boil stew', duration: 3 },
      { type: 'combine', label: 'Add pepper & season', duration: 2 },
    ],
  },
  kimchi_fried_rice: {
    id: 'kimchi_fried_rice',
    name: 'Kimchi Fried Rice',
    ingredients: [
      { cropId: 'cabbage', quantity: 1 },
      { cropId: 'pepper', quantity: 1 },
      { cropId: 'rice', quantity: 2 },
    ],
    profitPerServing: 10,
    prepSteps: [
      { type: 'chop', label: 'Chop kimchi', duration: 2 },
      { type: 'combine', label: 'Fry rice with kimchi', duration: 3 },
    ],
  },
  roasted_rice_tea: {
    id: 'roasted_rice_tea',
    name: 'Roasted Rice Tea',
    ingredients: [
      { cropId: 'rice', quantity: 1 },
    ],
    profitPerServing: 5,
    prepSteps: [
      { type: 'boil', label: 'Roast & steep rice', duration: 3 },
    ],
  },
};

export const RECIPE_IDS = Object.keys(RECIPES);
