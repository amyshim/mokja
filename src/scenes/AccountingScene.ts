import Phaser from 'phaser';
import GameState from '../state/GameState';
import { EconomySystem } from '../systems/EconomySystem';
import { TimeSystem } from '../systems/TimeSystem';
import { saveGame } from '../state/persistence';

export class AccountingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Accounting' });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const state = GameState.getInstance();
    const results = EconomySystem.getDayResults();

    this.cameras.main.setBackgroundColor(0xF5E6D0);

    // Header
    this.add.text(w / 2, 40, `Day ${state.data.day} — Results`, {
      fontSize: '24px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(w / 2, 70, 200, 2, 0xC4A882);

    // Earnings breakdown
    const centerX = w / 2;
    let y = 100;
    const lineH = 35;

    this.add.text(centerX, y, 'Customers Served', {
      fontSize: '14px', fontFamily: 'monospace', color: '#7A6B5A',
    }).setOrigin(0.5);
    y += 22;
    this.add.text(centerX, y, `${results.customersServed}`, {
      fontSize: '28px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5);

    y += lineH + 10;
    this.add.text(centerX, y, 'Revenue', {
      fontSize: '14px', fontFamily: 'monospace', color: '#7A6B5A',
    }).setOrigin(0.5);
    y += 22;
    this.add.text(centerX, y, `$${results.revenue}`, {
      fontSize: '28px', fontFamily: 'monospace', color: '#5A7A4A',
    }).setOrigin(0.5);

    y += lineH + 15;
    this.add.rectangle(centerX, y, 200, 2, 0xC4A882);

    y += 20;
    this.add.text(centerX, y, 'Total Earnings', {
      fontSize: '14px', fontFamily: 'monospace', color: '#7A6B5A',
    }).setOrigin(0.5);
    y += 22;
    this.add.text(centerX, y, `$${results.revenue}`, {
      fontSize: '36px', fontFamily: 'monospace', color: '#8B6914',
    }).setOrigin(0.5);

    y += lineH + 15;
    this.add.text(centerX, y, `Wallet: $${state.data.wallet}`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#9A8B7A',
    }).setOrigin(0.5);

    // Next day button
    const nextBtn = this.add.text(w / 2, h - 60, '[ Next Day >> ]', {
      fontSize: '22px', fontFamily: 'monospace', color: '#5A7A4A',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerover', () => nextBtn.setColor('#6B9B5A'));
    nextBtn.on('pointerout', () => nextBtn.setColor('#5A7A4A'));
    nextBtn.on('pointerdown', () => this.startNextDay());
  }

  private startNextDay(): void {
    const state = GameState.getInstance();

    // Advance day
    state.data.day++;

    // Advance crop growth
    TimeSystem.advanceDay();

    // Reset day results
    EconomySystem.resetDayResults();

    // Clear menu
    state.data.menu = [];

    // Clear restaurant
    state.data.restaurant.customers = [];
    for (const table of state.data.restaurant.tables) {
      table.occupied = false;
      table.dirty = false;
    }

    saveGame();
    this.scene.start('Farm');
  }
}
