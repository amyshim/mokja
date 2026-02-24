import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    // Generate all placeholder art programmatically
    this.generatePlaceholderArt();

    // Loading bar
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const bar = this.add.rectangle(w / 2, h / 2, 300, 20, 0x333333);
    const fill = this.add.rectangle(w / 2 - 148, h / 2, 4, 16, 0x88cc44);

    this.load.on('progress', (value: number) => {
      fill.width = 296 * value;
      fill.x = w / 2 - 148 + fill.width / 2;
    });

    this.load.on('complete', () => {
      bar.destroy();
      fill.destroy();
    });
  }

  create(): void {
    this.scene.start('Title');
  }

  private generatePlaceholderArt(): void {
    // Crops
    this.createColoredRect('crop_cabbage_seed', 32, 32, 0x8B6914);
    this.createColoredRect('crop_cabbage_growing', 32, 32, 0x90EE90);
    this.createColoredRect('crop_cabbage', 32, 32, 0x4CAF50);
    this.createColoredRect('crop_pepper_seed', 32, 32, 0x8B6914);
    this.createColoredRect('crop_pepper_growing', 32, 32, 0xFFA07A);
    this.createColoredRect('crop_pepper', 32, 32, 0xF44336);
    this.createColoredRect('crop_rice_seed', 32, 32, 0x8B6914);
    this.createColoredRect('crop_rice_growing', 32, 32, 0xF5F5DC);
    this.createColoredRect('crop_rice', 32, 32, 0xFFF8DC);

    // Watering can
    this.createColoredRect('watering_can', 32, 32, 0x4488FF);

    // Plot states
    this.createColoredRect('plot_empty', 48, 48, 0x8B4513);
    this.createColoredRect('plot_watered', 48, 48, 0x654321);

    // Dishes
    this.createColoredRect('dish_kimchi', 32, 32, 0xFF6347);
    this.createColoredRect('dish_kimchi_stew', 32, 32, 0xCC4422);
    this.createColoredRect('dish_kimchi_fried_rice', 32, 32, 0xFFAA33);
    this.createColoredRect('dish_roasted_rice_tea', 32, 32, 0xD2B48C);

    // Characters
    this.createColoredRect('player', 32, 48, 0xFFB6C1);
    this.createColoredRect('customer', 24, 36, 0x87CEEB);

    // Restaurant
    this.createColoredRect('table_2', 64, 48, 0xDEB887);
    this.createColoredRect('table_4', 80, 48, 0xDEB887);
    this.createColoredRect('chair', 20, 20, 0xA0522D);
    this.createColoredRect('plate', 24, 24, 0xFAFAFA);

    // UI
    this.createColoredRect('btn_green', 120, 40, 0x4CAF50);
    this.createColoredRect('btn_blue', 120, 40, 0x2196F3);
    this.createColoredRect('btn_red', 120, 40, 0xF44336);
    this.createColoredRect('btn_gray', 120, 40, 0x9E9E9E);
    this.createColoredRect('panel', 200, 150, 0x2D2D4E);
    this.createColoredRect('coin', 16, 16, 0xFFD700);

    // Cooking interactions
    this.createColoredRect('icon_chop', 48, 48, 0xCCCCCC);
    this.createColoredRect('icon_boil', 48, 48, 0x4488FF);
    this.createColoredRect('icon_combine', 48, 48, 0xFFAA00);

    // Cleaning
    this.createColoredRect('sponge', 32, 24, 0xFFFF00);

    // Restaurant tiles (25x25 for grid-based serve)
    this.createColoredRect('tile_floor', 25, 25, 0xC4A882);
    this.createColoredRect('tile_wall', 25, 25, 0x3D2E1F);
    this.createColoredRect('tile_counter', 25, 25, 0x6B5A4A);
    this.createColoredRect('tile_table', 25, 25, 0xDEB887);
    this.createColoredRect('tile_chop', 25, 25, 0xBBBBBB);
    this.createColoredRect('tile_boil', 25, 25, 0x5599CC);
    this.createColoredRect('tile_combine', 25, 25, 0xDD8833);

    // Farm tiles (25x25 for grid-based farm)
    this.createColoredRect('tile_grass', 25, 25, 0x4a8c3f);
    this.createColoredRect('tile_dirt', 25, 25, 0x8B4513);
    this.createColoredRect('tile_dirt_wet', 25, 25, 0x654321);
    this.createColoredRect('tile_fence', 25, 25, 0x5C3A1E);
    this.createColoredRect('tile_path', 25, 25, 0xC2A66B);
    this.createColoredRect('tile_exit', 25, 25, 0xE8C060);
    this.createColoredRect('tile_water', 25, 25, 0x3388BB);

    // Player directional sprites
    this.createPlayerSprite('player_down', 'down');
    this.createPlayerSprite('player_up', 'up');
    this.createPlayerSprite('player_left', 'left');
    this.createPlayerSprite('player_right', 'right');
  }

  private createPlayerSprite(key: string, direction: 'up' | 'down' | 'left' | 'right'): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);

    const w = 18, h = 22;

    // Body
    gfx.fillStyle(0xFFB6C1, 1);
    gfx.fillRoundedRect(1, 1, w, h, 3);
    gfx.lineStyle(1, 0xCC8899, 1);
    gfx.strokeRoundedRect(1, 1, w, h, 3);

    // Eyes (direction indicator)
    gfx.fillStyle(0x333333, 1);
    switch (direction) {
      case 'down':
        gfx.fillRect(5, 14, 3, 3);
        gfx.fillRect(12, 14, 3, 3);
        break;
      case 'up':
        gfx.fillRect(5, 6, 3, 3);
        gfx.fillRect(12, 6, 3, 3);
        break;
      case 'left':
        gfx.fillRect(3, 8, 3, 3);
        gfx.fillRect(3, 14, 3, 3);
        break;
      case 'right':
        gfx.fillRect(14, 8, 3, 3);
        gfx.fillRect(14, 14, 3, 3);
        break;
    }

    gfx.generateTexture(key, w + 2, h + 2);
    gfx.destroy();
  }

  private createColoredRect(key: string, w: number, h: number, color: number): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(0, 0, w, h, 4);
    // Add a subtle border
    gfx.lineStyle(1, 0x000000, 0.3);
    gfx.strokeRoundedRect(0, 0, w, h, 4);
    gfx.generateTexture(key, w, h);
    gfx.destroy();
  }
}
