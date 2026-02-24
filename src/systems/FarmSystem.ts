import GameState from '../state/GameState';
import { CROPS } from '../config/crops';

export class FarmSystem {
  static plant(plotIndex: number, cropId: string): boolean {
    const state = GameState.getInstance();
    const plot = state.data.farm.plots[plotIndex];
    if (!plot || plot.cropId !== null) return false;

    // Seeds are unlimited — no inventory cost to plant
    plot.cropId = cropId;
    plot.plantedAt = Date.now();
    plot.wateredToday = false;
    plot.growthDays = 0;
    plot.ready = false;

    return true;
  }

  static water(plotIndex: number): boolean {
    const state = GameState.getInstance();
    const plot = state.data.farm.plots[plotIndex];
    if (!plot || !plot.cropId || plot.wateredToday || plot.ready) return false;

    plot.wateredToday = true;
    return true;
  }

  static harvest(plotIndex: number): { cropId: string; quantity: number } | null {
    const state = GameState.getInstance();
    const plot = state.data.farm.plots[plotIndex];
    if (!plot || !plot.cropId || !plot.ready) return null;

    const crop = CROPS[plot.cropId];
    if (!crop) return null;

    const quantity = plot.wateredToday ? crop.wateredYield : crop.baseYield;
    const cropId = plot.cropId;

    // Add to inventory
    state.data.inventory[cropId] = (state.data.inventory[cropId] || 0) + quantity;

    // Clear plot
    plot.cropId = null;
    plot.plantedAt = 0;
    plot.wateredToday = false;
    plot.growthDays = 0;
    plot.ready = false;

    return { cropId, quantity };
  }

  static getPlotStatus(plotIndex: number): string {
    const state = GameState.getInstance();
    const plot = state.data.farm.plots[plotIndex];
    if (!plot || !plot.cropId) return 'empty';
    if (plot.ready) return 'ready';
    if (plot.wateredToday) return 'watered';
    return 'growing';
  }
}
