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
    this.add.text(w / 2, 33, `Day ${state.data.day} — Set Today's Menu`, {
      fontSize: '27px', fontFamily: 'monospace', color: '#4A3728',
    }).setOrigin(0.5, 0);

    // Inventory
    const invLines = Object.entries(state.data.inventory)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => `${CROPS[id]?.name || id}: ${qty}`)
      .join('  |  ');
    this.add.text(w / 2, 75, invLines || '(empty inventory)', {
      fontSize: '17px', fontFamily: 'monospace', color: '#7A6B5A', align: 'center',
    }).setOrigin(0.5, 0);

    // Instruction
    this.add.text(w / 2, 105, 'Select dishes for today\'s menu', {
      fontSize: '15px', fontFamily: 'monospace', color: '#9A8B7A',
    }).setOrigin(0.5, 0);

    // Recipe rows (only show unlocked recipes)
    const startY = 143;
    const rowH = 135;

    const unlockedIds = RECIPE_IDS.filter(id => state.isRecipeUnlocked(id));

    unlockedIds.forEach((id, i) => {
      const recipe = RECIPES[id];
      const y = startY + i * (rowH + 12);

      // Card background
      const cardBg = this.add.rectangle(w / 2, y + rowH / 2, w - 48, rowH, 0xE8D5B7, 0.9)
        .setStrokeStyle(3, 0xC4A882)
        .setInteractive({ useHandCursor: true });
      this.cardBgs.set(id, cardBg);

      // Toggle indicator (checkbox)
      const indicator = this.add.rectangle(48, y + rowH / 2, 30, 30, 0xD4C4A8)
        .setStrokeStyle(3, 0x8B7355);
      this.toggleIndicators.set(id, indicator);

      // Order icon (matches what customers show in speech bubbles)
      const iconGfx = this.add.graphics();
      this.drawFoodIcon(iconGfx, 90, y + 30, 24, recipe.iconColor, id);

      // Recipe name (shifted right to make room for icon)
      this.add.text(110, y + 18, recipe.name, {
        fontSize: '24px', fontFamily: 'monospace', color: '#4A3728',
      });

      // Price
      this.add.text(w - 36, y + 18, `$${recipe.profitPerServing}`, {
        fontSize: '24px', fontFamily: 'monospace', color: '#8B6914',
      }).setOrigin(1, 0);

      // Ingredients
      const ingText = recipe.ingredients
        .map(ing => `${CROPS[ing.cropId]?.name || ing.cropId} x${ing.quantity}`)
        .join(', ');
      this.add.text(78, y + 53, ingText, {
        fontSize: '15px', fontFamily: 'monospace', color: '#7A6B5A',
      });

      // Prep steps summary
      const stepsText = recipe.prepSteps.map(s => s.label).join(' → ');
      this.add.text(78, y + 78, stepsText, {
        fontSize: '14px', fontFamily: 'monospace', color: '#9A8B7A',
        wordWrap: { width: w - 120 },
      });

      // Click to toggle
      cardBg.on('pointerdown', () => this.toggleRecipe(id));
    });

    // Error text
    this.errorText = this.add.text(w / 2, h - 128, '', {
      fontSize: '18px', fontFamily: 'monospace', color: '#AA4444',
    }).setOrigin(0.5);

    // Confirm button
    const confirmBtn = this.add.text(w / 2, h - 83, '[ Open Restaurant >> ]', {
      fontSize: '27px', fontFamily: 'monospace', color: '#5A7A4A',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    confirmBtn.on('pointerover', () => confirmBtn.setColor('#6B9B5A'));
    confirmBtn.on('pointerout', () => confirmBtn.setColor('#5A7A4A'));
    confirmBtn.on('pointerdown', () => this.confirmMenu());

    // Back button
    const backBtn = this.add.text(30, h - 45, '[ << Farm ]', {
      fontSize: '21px', fontFamily: 'monospace', color: '#9A8B7A',
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
    const state = GameState.getInstance();
    const unlockedIds = RECIPE_IDS.filter(id => state.isRecipeUnlocked(id));
    unlockedIds.forEach(id => {
      const indicator = this.toggleIndicators.get(id);
      const cardBg = this.cardBgs.get(id);
      const selected = this.selectedRecipes.has(id);

      if (indicator) {
        indicator.setFillStyle(selected ? 0x6B8E5A : 0xD4C4A8);
        indicator.setStrokeStyle(3, selected ? 0x4A6A3A : 0x8B7355);
      }
      if (cardBg) {
        cardBg.setFillStyle(selected ? 0xD4C4A0 : 0xE8D5B7, 0.9);
        cardBg.setStrokeStyle(3, selected ? 0x6B8E5A : 0xC4A882);
      }
    });
  }

  private drawFoodIcon(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, color: number, recipeId: string): void {
    const half = size / 2;
    if (recipeId === 'barley_tea') {
      // Cup shape
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(cx - half + 2, cy - half + 3, size - 3, size - 5, 3);
      gfx.lineStyle(2, color, 1);
      gfx.strokeCircle(cx + half - 2, cy, 3);
      gfx.lineStyle(1, 0xCCCCCC, 0.7);
      gfx.lineBetween(cx - 2, cy - half, cx, cy - half - 3);
      gfx.lineBetween(cx + 2, cy - half, cx + 3, cy - half - 3);
    } else if (recipeId === 'barley_rice') {
      // Bowl shape
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(cx - half, cy - half + 3, size, size - 3, 6);
      gfx.fillStyle(0xFFFFFF, 0.5);
      gfx.fillCircle(cx - 3, cy, 2);
      gfx.fillCircle(cx + 3, cy, 2);
      gfx.fillCircle(cx, cy - 3, 2);
      gfx.lineStyle(1, 0x000000, 0.3);
      gfx.strokeRoundedRect(cx - half, cy - half + 3, size, size - 3, 6);
    } else {
      // Generic colored square
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(cx - half, cy - half, size, size, 5);
      gfx.lineStyle(1, 0x000000, 0.3);
      gfx.strokeRoundedRect(cx - half, cy - half, size, size, 5);
    }
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
