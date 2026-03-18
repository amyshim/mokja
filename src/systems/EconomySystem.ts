import GameState, { DayResults } from '../state/GameState';

export class EconomySystem {
  static getDayResults(): DayResults {
    return GameState.getInstance().data.dayResults;
  }

  static resetDayResults(): void {
    const state = GameState.getInstance();
    state.data.dayResults = { revenue: 0, customersServed: 0, teasServedToday: 0 };
  }

  static getWallet(): number {
    return GameState.getInstance().data.wallet;
  }
}
