export interface CropDef {
  id: string;
  name: string;
  growthDays: number; // real days to mature
  baseYield: number;  // harvest quantity when not watered
  wateredYield: number; // harvest quantity when watered
  sprite: string;
}

export const CROPS: Record<string, CropDef> = {
  barley: {
    id: 'barley',
    name: 'Barley',
    growthDays: 1,
    baseYield: 2,
    wateredYield: 4,
    sprite: 'crop_barley',
  },
  rice: {
    id: 'rice',
    name: 'Rice',
    growthDays: 1,
    baseYield: 2,
    wateredYield: 4,
    sprite: 'crop_rice',
  },
};

export const CROP_IDS = Object.keys(CROPS);
