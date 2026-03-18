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
    this.add.text(w / 2, 60, `Day ${state.data.day} — Results`, {
      fontSize: '36px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(w / 2, 105, 300, 3, 0xC4A882);

    // Earnings breakdown
    const centerX = w / 2;
    let y = 150;
    const lineH = 53;

    this.add.text(centerX, y, 'Customers Served', {
      fontSize: '21px', fontFamily: 'monospace', color: '#7A6B5A',
    }).setOrigin(0.5);
    y += 33;
    this.add.text(centerX, y, `${results.customersServed}`, {
      fontSize: '42px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5);

    y += lineH + 15;
    this.add.text(centerX, y, 'Revenue', {
      fontSize: '21px', fontFamily: 'monospace', color: '#7A6B5A',
    }).setOrigin(0.5);
    y += 33;
    this.add.text(centerX, y, `$${results.revenue}`, {
      fontSize: '42px', fontFamily: 'monospace', color: '#5A7A4A',
    }).setOrigin(0.5);

    y += lineH + 23;
    this.add.rectangle(centerX, y, 300, 3, 0xC4A882);

    y += 30;
    this.add.text(centerX, y, 'Total Earnings', {
      fontSize: '21px', fontFamily: 'monospace', color: '#7A6B5A',
    }).setOrigin(0.5);
    y += 33;
    this.add.text(centerX, y, `$${results.revenue}`, {
      fontSize: '54px', fontFamily: 'monospace', color: '#8B6914',
    }).setOrigin(0.5);

    y += lineH + 23;
    this.add.text(centerX, y, `Wallet: $${state.data.wallet}`, {
      fontSize: '24px', fontFamily: 'monospace', color: '#9A8B7A',
    }).setOrigin(0.5);

    // Tea progress (show how many teas served toward milestone)
    if (!state.data.milestones.firstMilestone || this.milestoneReached) {
      y += 45;
      this.add.text(centerX, y, `Barley Teas Served: ${state.data.totalTeasServed}/10`, {
        fontSize: '18px', fontFamily: 'monospace', color: '#7A6B5A',
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
    const popW = 570;
    const popH = 480;
    const popX = w / 2;
    const popY = h / 2;

    this.add.rectangle(popX, popY, popW, popH, 0xFFF8E7)
      .setStrokeStyle(5, 0xC4A882)
      .setDepth(101);

    // Title
    this.add.text(popX, popY - 195, 'Congratulations!', {
      fontSize: '33px', fontFamily: 'monospace', color: '#8B6914',
    }).setOrigin(0.5).setDepth(102);

    // Star decoration
    this.add.text(popX, popY - 150, '* * *', {
      fontSize: '27px', fontFamily: 'monospace', color: '#FFD700',
    }).setOrigin(0.5).setDepth(102);

    // Message
    this.add.text(popX, popY - 98, 'You served 10 barley teas!', {
      fontSize: '21px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(popX, popY - 60, 'Your restaurant is growing!', {
      fontSize: '20px', fontFamily: 'monospace', color: '#7A6B5A',
    }).setOrigin(0.5).setDepth(102);

    // Rewards
    let ry = popY - 15;
    this.add.text(popX, ry, 'Unlocked:', {
      fontSize: '21px', fontFamily: 'monospace', color: '#5A7A4A',
    }).setOrigin(0.5).setDepth(102);

    ry += 38;
    this.add.text(popX, ry, 'New Crop: Rice', {
      fontSize: '20px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5).setDepth(102);

    ry += 33;
    this.add.text(popX, ry, 'New Recipe: Barley Rice ($3)', {
      fontSize: '20px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5).setDepth(102);

    ry += 33;
    this.add.text(popX, ry, 'New Stations: Rice Bin, Sink, Bowls', {
      fontSize: '20px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5).setDepth(102);

    ry += 33;
    this.add.text(popX, ry, '+10 Rice & +10 Barley added!', {
      fontSize: '20px', fontFamily: 'monospace', color: '#8B6914',
    }).setOrigin(0.5).setDepth(102);

    // Continue button
    const continueBtn = this.add.text(popX, popY + 195, '[ Continue >> ]', {
      fontSize: '27px', fontFamily: 'monospace', color: '#5A7A4A',
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

    const nextBtn = this.add.text(w / 2, h - 90, '[ Next Day >> ]', {
      fontSize: '33px', fontFamily: 'monospace', color: '#5A7A4A',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerover', () => nextBtn.setColor('#6B9B5A'));
    nextBtn.on('pointerout', () => nextBtn.setColor('#5A7A4A'));
    nextBtn.on('pointerdown', () => this.startNextDay());
  }

  private startNextDay(): void {
    const state = GameState.getInstance();

    // Mark first rice service day as done if barley rice was served
    if (!state.data.firstRiceServiceDone && state.data.totalRiceServed > 0) {
      state.data.firstRiceServiceDone = true;
    }

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
