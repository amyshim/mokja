import Phaser from 'phaser';
import GameState from '../state/GameState';
import { EconomySystem } from '../systems/EconomySystem';
import { TimeSystem } from '../systems/TimeSystem';
import { saveGame } from '../state/persistence';

export class AccountingScene extends Phaser.Scene {
  private milestoneReached = false;

  constructor() {
    super({ key: 'Accounting' });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const state = GameState.getInstance();
    const results = EconomySystem.getDayResults();

    this.cameras.main.setBackgroundColor(0xF5E6D0);

    // Check milestones before displaying results
    this.milestoneReached = state.checkMilestones();

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

    // Tea progress (show how many teas served toward milestone)
    if (!state.data.milestones.firstMilestone || this.milestoneReached) {
      y += 30;
      this.add.text(centerX, y, `Barley Teas Served: ${state.data.totalTeasServed}/10`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#7A6B5A',
      }).setOrigin(0.5);
    }

    // Show milestone popup or next day button
    if (this.milestoneReached) {
      this.showMilestonePopup();
    } else {
      this.showNextDayButton();
    }
  }

  private showMilestonePopup(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Overlay
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.5).setDepth(100);

    // Popup background
    const popW = 380;
    const popH = 320;
    const popX = w / 2;
    const popY = h / 2;

    this.add.rectangle(popX, popY, popW, popH, 0xFFF8E7)
      .setStrokeStyle(3, 0xC4A882)
      .setDepth(101);

    // Title
    this.add.text(popX, popY - 130, 'Congratulations!', {
      fontSize: '22px', fontFamily: 'monospace', color: '#8B6914',
    }).setOrigin(0.5).setDepth(102);

    // Star decoration
    this.add.text(popX, popY - 100, '* * *', {
      fontSize: '18px', fontFamily: 'monospace', color: '#FFD700',
    }).setOrigin(0.5).setDepth(102);

    // Message
    this.add.text(popX, popY - 65, 'You served 10 barley teas!', {
      fontSize: '14px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(popX, popY - 40, 'Your restaurant is growing!', {
      fontSize: '13px', fontFamily: 'monospace', color: '#7A6B5A',
    }).setOrigin(0.5).setDepth(102);

    // Rewards
    let ry = popY - 10;
    this.add.text(popX, ry, 'Unlocked:', {
      fontSize: '14px', fontFamily: 'monospace', color: '#5A7A4A',
    }).setOrigin(0.5).setDepth(102);

    ry += 25;
    this.add.text(popX, ry, 'New Crop: Rice', {
      fontSize: '13px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5).setDepth(102);

    ry += 22;
    this.add.text(popX, ry, 'New Recipe: Barley Rice ($3)', {
      fontSize: '13px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5).setDepth(102);

    ry += 22;
    this.add.text(popX, ry, 'New Stations: Rice Bin, Sink, Bowls', {
      fontSize: '13px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5).setDepth(102);

    ry += 22;
    this.add.text(popX, ry, '+10 Rice & +10 Barley added!', {
      fontSize: '13px', fontFamily: 'monospace', color: '#8B6914',
    }).setOrigin(0.5).setDepth(102);

    // Continue button
    const continueBtn = this.add.text(popX, popY + 130, '[ Continue >> ]', {
      fontSize: '18px', fontFamily: 'monospace', color: '#5A7A4A',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(102);

    continueBtn.on('pointerover', () => continueBtn.setColor('#6B9B5A'));
    continueBtn.on('pointerout', () => continueBtn.setColor('#5A7A4A'));
    continueBtn.on('pointerdown', () => {
      overlay.destroy();
      // Remove popup elements by starting next day
      this.startNextDay();
    });
  }

  private showNextDayButton(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

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
