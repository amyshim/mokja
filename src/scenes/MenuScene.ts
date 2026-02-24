import Phaser from 'phaser';
import GameState from '../state/GameState';
import { RECIPES, RECIPE_IDS } from '../config/recipes';
import { CROPS } from '../config/crops';
import { saveGame } from '../state/persistence';

export class MenuScene extends Phaser.Scene {
  private selectedRecipes: Set<string> = new Set();
  private toggleIndicators: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private cardBgs: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private errorText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const state = GameState.getInstance();

    this.cameras.main.setBackgroundColor(0xF5E6D0);
    this.selectedRecipes.clear();
    this.toggleIndicators.clear();
    this.cardBgs.clear();

    // Header
    this.add.text(w / 2, 22, `Day ${state.data.day} — Set Today's Menu`, {
      fontSize: '18px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5, 0);

    // Inventory
    const invLines = Object.entries(state.data.inventory)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => `${CROPS[id]?.name || id}: ${qty}`)
      .join('  |  ');
    this.add.text(w / 2, 50, invLines || '(empty inventory)', {
      fontSize: '11px', fontFamily: 'monospace', color: '#7A6B5A', align: 'center',
    }).setOrigin(0.5, 0);

    // Instruction
    this.add.text(w / 2, 70, 'Select dishes for today\'s menu', {
      fontSize: '10px', fontFamily: 'monospace', color: '#9A8B7A',
    }).setOrigin(0.5, 0);

    // Recipe rows
    const startY = 95;
    const rowH = 90;

    RECIPE_IDS.forEach((id, i) => {
      const recipe = RECIPES[id];
      const y = startY + i * (rowH + 8);

      // Card background
      const cardBg = this.add.rectangle(w / 2, y + rowH / 2, w - 32, rowH, 0xE8D5B7, 0.9)
        .setStrokeStyle(2, 0xC4A882)
        .setInteractive({ useHandCursor: true });
      this.cardBgs.set(id, cardBg);

      // Toggle indicator (checkbox)
      const indicator = this.add.rectangle(32, y + rowH / 2, 20, 20, 0xD4C4A8)
        .setStrokeStyle(2, 0x8B7355);
      this.toggleIndicators.set(id, indicator);

      // Recipe name
      this.add.text(52, y + 12, recipe.name, {
        fontSize: '16px', fontFamily: 'monospace', color: '#4A3728',
      });

      // Price
      this.add.text(w - 24, y + 12, `$${recipe.profitPerServing}`, {
        fontSize: '16px', fontFamily: 'monospace', color: '#8B6914',
      }).setOrigin(1, 0);

      // Ingredients
      const ingText = recipe.ingredients
        .map(ing => `${CROPS[ing.cropId]?.name || ing.cropId} x${ing.quantity}`)
        .join(', ');
      this.add.text(52, y + 35, ingText, {
        fontSize: '10px', fontFamily: 'monospace', color: '#7A6B5A',
      });

      // Prep steps summary
      const stepsText = recipe.prepSteps.map(s => s.label).join(' → ');
      this.add.text(52, y + 52, stepsText, {
        fontSize: '9px', fontFamily: 'monospace', color: '#9A8B7A',
        wordWrap: { width: w - 80 },
      });

      // Click to toggle
      cardBg.on('pointerdown', () => this.toggleRecipe(id));
    });

    // Error text
    this.errorText = this.add.text(w / 2, h - 85, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#AA4444',
    }).setOrigin(0.5);

    // Confirm button
    const confirmBtn = this.add.text(w / 2, h - 55, '[ Open Restaurant >> ]', {
      fontSize: '18px', fontFamily: 'monospace', color: '#5A7A4A',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    confirmBtn.on('pointerover', () => confirmBtn.setColor('#6B9B5A'));
    confirmBtn.on('pointerout', () => confirmBtn.setColor('#5A7A4A'));
    confirmBtn.on('pointerdown', () => this.confirmMenu());

    // Back button
    const backBtn = this.add.text(20, h - 30, '[ << Farm ]', {
      fontSize: '14px', fontFamily: 'monospace', color: '#9A8B7A',
    }).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => this.scene.start('Farm'));
  }

  private toggleRecipe(recipeId: string): void {
    if (this.selectedRecipes.has(recipeId)) {
      this.selectedRecipes.delete(recipeId);
    } else {
      this.selectedRecipes.add(recipeId);
    }
    this.updateVisuals();
    this.errorText.setText('');
  }

  private updateVisuals(): void {
    RECIPE_IDS.forEach(id => {
      const indicator = this.toggleIndicators.get(id);
      const cardBg = this.cardBgs.get(id);
      const selected = this.selectedRecipes.has(id);

      if (indicator) {
        indicator.setFillStyle(selected ? 0x6B8E5A : 0xD4C4A8);
        indicator.setStrokeStyle(2, selected ? 0x4A6A3A : 0x8B7355);
      }
      if (cardBg) {
        cardBg.setFillStyle(selected ? 0xD4C4A0 : 0xE8D5B7, 0.9);
        cardBg.setStrokeStyle(2, selected ? 0x6B8E5A : 0xC4A882);
      }
    });
  }

  private confirmMenu(): void {
    if (this.selectedRecipes.size === 0) {
      this.errorText.setText('Select at least 1 dish!');
      return;
    }

    const state = GameState.getInstance();
    state.data.menu = Array.from(this.selectedRecipes).map(recipeId => ({ recipeId }));

    saveGame();
    this.scene.start('Serve');
  }
}
