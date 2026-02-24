import GameState from '../state/GameState';
import { CROPS } from '../config/crops';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class TimeSystem {
  /** Calculate elapsed real days since last played and advance crop growth */
  static processOfflineGrowth(): void {
    const state = GameState.getInstance();
    const now = Date.now();
    const elapsed = now - state.data.lastPlayedTimestamp;
    const daysElapsed = Math.floor(elapsed / MS_PER_DAY);

    if (daysElapsed <= 0) return;

    for (const plot of state.data.farm.plots) {
      if (plot.cropId && !plot.ready) {
        plot.growthDays += daysElapsed;
        const crop = CROPS[plot.cropId];
        if (crop && plot.growthDays >= crop.growthDays) {
          plot.ready = true;
          // Preserve wateredToday so harvest gets the 2x yield bonus
        } else {
          // Only reset watered status if crop is still growing
          plot.wateredToday = false;
        }
      }
    }

    state.data.lastPlayedTimestamp = now;
  }

  /** Advance all crops by one day (called at end of day cycle) */
  static advanceDay(): void {
    const state = GameState.getInstance();
    for (const plot of state.data.farm.plots) {
      if (plot.cropId && !plot.ready) {
        plot.growthDays += 1;
        const crop = CROPS[plot.cropId];
        if (crop && plot.growthDays >= crop.growthDays) {
          plot.ready = true;
        }
      }
      // Reset watered status on all plots per day boundary
      plot.wateredToday = false;
    }
  }

  /** For dev tools: skip time forward */
  static devSkipDays(days: number): void {
    const state = GameState.getInstance();
    state.data.lastPlayedTimestamp -= days * MS_PER_DAY;
    this.processOfflineGrowth();
  }
}
