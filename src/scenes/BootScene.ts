import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    this.generatePlaceholderArt();

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
    this.createColoredRect('crop_barley_seed', 32, 32, 0xD4AA70);
    this.createColoredRect('crop_barley_growing', 32, 32, 0xC8B060);
    this.createColoredRect('crop_barley', 32, 32, 0xC8A960);
    this.createColoredRect('crop_rice_seed', 32, 32, 0xB8D4B8);
    this.createColoredRect('crop_rice_growing', 32, 32, 0xA0C8A0);
    this.createColoredRect('crop_rice', 32, 32, 0xF5F5DC);

    // Watering can
    this.createColoredRect('watering_can', 32, 32, 0x4488FF);

    // Plot states
    this.createColoredRect('plot_empty', 48, 48, 0x8B4513);
    this.createColoredRect('plot_watered', 48, 48, 0x654321);

    // Dishes
    this.createColoredRect('dish_barley_tea', 32, 32, 0xC8A960);

    // Characters (legacy)
    this.createColoredRect('player', 32, 48, 0xFFB6C1);
    this.createColoredRect('customer', 24, 36, 0x87CEEB);

    // Restaurant (legacy)
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

    // Cooking (legacy)
    this.createColoredRect('icon_chop', 48, 48, 0xCCCCCC);
    this.createColoredRect('icon_boil', 48, 48, 0x4488FF);
    this.createColoredRect('icon_combine', 48, 48, 0xFFAA00);

    // Cleaning
    this.createColoredRect('sponge', 32, 24, 0xFFFF00);

    // --- 32x32 tile textures with detail ---
    this.createFloorTile();
    this.createWallTile();
    this.createCounterTile();
    this.createTableTile();
    this.createColoredRect('tile_chop', 32, 32, 0xBBBBBB);
    this.createColoredRect('tile_boil', 32, 32, 0x5599CC);
    this.createColoredRect('tile_combine', 32, 32, 0xDD8833);

    // Kitchen station tiles
    this.createBinTile();
    this.createRiceBinTile();
    this.createOvenTile();
    this.createStoveTile();
    this.createCupsTile();
    this.createSinkTile();
    this.createBowlsTile();
    this.createTrashTile();
    this.createKitchenTableTile();

    // Farm tiles
    this.createGrassTile();
    this.createDirtTile('tile_dirt', 0x8B4513);
    this.createDirtTile('tile_dirt_wet', 0x654321);
    this.createFenceTile();
    this.createPathTile();
    this.createExitTile();
    this.createWaterTile();

    // Player directional sprites (28x32)
    this.createPlayerSprite('player_down', 'down');
    this.createPlayerSprite('player_up', 'up');
    this.createPlayerSprite('player_left', 'left');
    this.createPlayerSprite('player_right', 'right');
  }

  // --- Detailed tile generators ---

  private createFloorTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    // Base
    gfx.fillStyle(0xC4A882, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Checkerboard pattern
    gfx.fillStyle(0xBDA07A, 0.4);
    gfx.fillRect(0, 0, 16, 16);
    gfx.fillRect(16, 16, 16, 16);
    // Subtle grid lines
    gfx.lineStyle(1, 0xAA9070, 0.3);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_floor', 32, 32);
    gfx.destroy();
  }

  private createWallTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x3D2E1F, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Brick pattern
    gfx.lineStyle(1, 0x2A1F14, 0.5);
    gfx.lineBetween(0, 8, 32, 8);
    gfx.lineBetween(0, 16, 32, 16);
    gfx.lineBetween(0, 24, 32, 24);
    gfx.lineBetween(16, 0, 16, 8);
    gfx.lineBetween(0, 8, 0, 16);
    gfx.lineBetween(16, 16, 16, 24);
    // Highlight on top
    gfx.fillStyle(0x5A4535, 0.3);
    gfx.fillRect(0, 0, 32, 2);
    gfx.generateTexture('tile_wall', 32, 32);
    gfx.destroy();
  }

  private createCounterTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x6B5A4A, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Wood grain
    gfx.lineStyle(1, 0x5A4A3A, 0.4);
    gfx.lineBetween(0, 6, 32, 6);
    gfx.lineBetween(0, 14, 32, 14);
    gfx.lineBetween(0, 22, 32, 22);
    gfx.lineBetween(0, 28, 32, 28);
    // Top edge highlight
    gfx.fillStyle(0x8B7A6A, 0.5);
    gfx.fillRect(0, 0, 32, 3);
    gfx.lineStyle(1, 0x4A3A2A, 0.3);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_counter', 32, 32);
    gfx.destroy();
  }

  private createTableTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    // Full-bleed fill so adjacent tiles merge seamlessly
    gfx.fillStyle(0xDEB887, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Wood grain
    gfx.lineStyle(1, 0xC8A070, 0.3);
    gfx.lineBetween(2, 8, 30, 8);
    gfx.lineBetween(2, 16, 30, 16);
    gfx.lineBetween(2, 24, 30, 24);
    gfx.generateTexture('tile_table', 32, 32);
    gfx.destroy();
  }

  private createBinTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x8B7355, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Barrel bands
    gfx.lineStyle(2, 0x6B5335, 0.6);
    gfx.lineBetween(0, 8, 32, 8);
    gfx.lineBetween(0, 24, 32, 24);
    // Grain dots
    gfx.fillStyle(0xD4AA70, 0.6);
    gfx.fillCircle(12, 16, 3);
    gfx.fillCircle(20, 14, 2);
    gfx.fillCircle(16, 20, 2);
    gfx.lineStyle(1, 0x5A4030, 0.3);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_bin', 32, 32);
    gfx.destroy();
  }

  private createOvenTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0xCC5533, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Oven door
    gfx.fillStyle(0x993322, 1);
    gfx.fillRoundedRect(6, 8, 20, 18, 2);
    // Handle
    gfx.fillStyle(0x666666, 1);
    gfx.fillRect(13, 10, 6, 2);
    // Glow inside
    gfx.fillStyle(0xFF6633, 0.3);
    gfx.fillRect(9, 14, 14, 9);
    gfx.lineStyle(1, 0x882211, 0.5);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_oven', 32, 32);
    gfx.destroy();
  }

  private createRiceBinTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x7B8B6F, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Barrel bands
    gfx.lineStyle(2, 0x5B6B4F, 0.6);
    gfx.lineBetween(0, 8, 32, 8);
    gfx.lineBetween(0, 24, 32, 24);
    // Rice grains
    gfx.fillStyle(0xF5F5DC, 0.7);
    gfx.fillCircle(11, 15, 2);
    gfx.fillCircle(16, 18, 2);
    gfx.fillCircle(21, 14, 2);
    gfx.fillCircle(14, 21, 2);
    gfx.lineStyle(1, 0x4A5A3E, 0.3);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_rice_bin', 32, 32);
    gfx.destroy();
  }

  private createStoveTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x5599CC, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Pot body
    gfx.fillStyle(0x888888, 1);
    gfx.fillRoundedRect(6, 10, 20, 16, 4);
    // Lid
    gfx.fillStyle(0x999999, 1);
    gfx.fillRoundedRect(8, 7, 16, 5, 2);
    // Handle
    gfx.fillStyle(0x555555, 1);
    gfx.fillRect(14, 4, 4, 4);
    // Burner glow
    gfx.fillStyle(0xFF6633, 0.2);
    gfx.fillCircle(16, 24, 6);
    // Highlight
    gfx.fillStyle(0xAAAAAA, 0.4);
    gfx.fillRect(10, 12, 3, 8);
    gfx.lineStyle(1, 0x336688, 0.4);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_stove', 32, 32);
    gfx.destroy();
  }

  private createSinkTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x8899AA, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Basin
    gfx.fillStyle(0xBBCCDD, 1);
    gfx.fillRoundedRect(5, 10, 22, 16, 3);
    // Inner basin (darker)
    gfx.fillStyle(0x6688AA, 0.5);
    gfx.fillRoundedRect(8, 13, 16, 10, 2);
    // Faucet
    gfx.fillStyle(0x777777, 1);
    gfx.fillRect(14, 4, 4, 8);
    gfx.fillRect(12, 4, 8, 3);
    // Water droplet
    gfx.fillStyle(0x66BBFF, 0.6);
    gfx.fillCircle(16, 17, 2);
    gfx.lineStyle(1, 0x667788, 0.4);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_sink', 32, 32);
    gfx.destroy();
  }

  private createCupsTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0xEEEEDD, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Cup shapes
    gfx.fillStyle(0xFFFFFF, 1);
    gfx.fillRoundedRect(4, 12, 10, 14, 2);
    gfx.fillRoundedRect(18, 12, 10, 14, 2);
    // Cup rims
    gfx.lineStyle(1, 0xCCCCBB, 0.8);
    gfx.strokeRoundedRect(4, 12, 10, 14, 2);
    gfx.strokeRoundedRect(18, 12, 10, 14, 2);
    // Handles
    gfx.lineStyle(2, 0xDDDDCC, 1);
    gfx.strokeCircle(16, 19, 3);
    gfx.lineStyle(1, 0xBBBBAA, 0.4);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_cups', 32, 32);
    gfx.destroy();
  }

  private createBowlsTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0xAA9977, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Stacked bowls
    gfx.fillStyle(0xF0E6D2, 1);
    gfx.fillRoundedRect(6, 18, 20, 8, 3);
    gfx.fillRoundedRect(8, 12, 16, 8, 3);
    gfx.fillRoundedRect(10, 7, 12, 7, 3);
    // Bowl rims
    gfx.lineStyle(1, 0xC4B8A0, 0.8);
    gfx.strokeRoundedRect(6, 18, 20, 8, 3);
    gfx.strokeRoundedRect(8, 12, 16, 8, 3);
    gfx.strokeRoundedRect(10, 7, 12, 7, 3);
    gfx.lineStyle(1, 0x887755, 0.5);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_bowls', 32, 32);
    gfx.destroy();
  }

  private createTrashTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x666666, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Bin body
    gfx.fillStyle(0x555555, 1);
    gfx.fillRoundedRect(7, 8, 18, 20, 2);
    // Lid
    gfx.fillStyle(0x777777, 1);
    gfx.fillRoundedRect(5, 5, 22, 5, 2);
    // Handle
    gfx.fillStyle(0x888888, 1);
    gfx.fillRect(13, 2, 6, 4);
    // Lines on body
    gfx.lineStyle(1, 0x444444, 0.5);
    gfx.lineBetween(12, 12, 12, 26);
    gfx.lineBetween(16, 12, 16, 26);
    gfx.lineBetween(20, 12, 20, 26);
    gfx.lineStyle(1, 0x444444, 0.3);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_trash', 32, 32);
    gfx.destroy();
  }

  private createKitchenTableTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0xAA9977, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Surface texture
    gfx.lineStyle(1, 0x998866, 0.3);
    gfx.lineBetween(0, 10, 32, 10);
    gfx.lineBetween(0, 20, 32, 20);
    // Border
    gfx.lineStyle(1, 0x887755, 0.5);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_ktable', 32, 32);
    gfx.destroy();
  }

  private createGrassTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x4a8c3f, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Grass blades
    gfx.fillStyle(0x5a9c4f, 0.5);
    gfx.fillRect(4, 6, 2, 6);
    gfx.fillRect(12, 2, 2, 5);
    gfx.fillRect(24, 8, 2, 5);
    gfx.fillRect(8, 20, 2, 5);
    gfx.fillRect(18, 22, 2, 4);
    gfx.fillRect(28, 18, 2, 5);
    // Darker patches
    gfx.fillStyle(0x3a7c2f, 0.3);
    gfx.fillRect(0, 16, 16, 16);
    gfx.generateTexture('tile_grass', 32, 32);
    gfx.destroy();
  }

  private createDirtTile(key: string, baseColor: number): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(baseColor, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Dirt texture dots
    const r = (baseColor >> 16) & 0xFF;
    const g = (baseColor >> 8) & 0xFF;
    const b = baseColor & 0xFF;
    const darker = ((Math.max(0, r - 20)) << 16) | ((Math.max(0, g - 15)) << 8) | Math.max(0, b - 10);
    gfx.fillStyle(darker, 0.4);
    gfx.fillCircle(8, 8, 2);
    gfx.fillCircle(20, 12, 3);
    gfx.fillCircle(10, 24, 2);
    gfx.fillCircle(26, 26, 2);
    gfx.lineStyle(1, darker, 0.2);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture(key, 32, 32);
    gfx.destroy();
  }

  private createFenceTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x5C3A1E, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Fence planks
    gfx.fillStyle(0x6B4A2E, 0.6);
    gfx.fillRect(2, 0, 8, 32);
    gfx.fillRect(22, 0, 8, 32);
    // Cross beam
    gfx.fillStyle(0x4C2A0E, 0.5);
    gfx.fillRect(0, 12, 32, 4);
    gfx.generateTexture('tile_fence', 32, 32);
    gfx.destroy();
  }

  private createPathTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0xC2A66B, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Stone pattern
    gfx.fillStyle(0xB8985B, 0.4);
    gfx.fillRoundedRect(2, 2, 12, 12, 2);
    gfx.fillRoundedRect(16, 4, 14, 10, 2);
    gfx.fillRoundedRect(4, 16, 14, 14, 2);
    gfx.fillRoundedRect(20, 18, 10, 12, 2);
    gfx.lineStyle(1, 0xA88850, 0.3);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_path', 32, 32);
    gfx.destroy();
  }

  private createExitTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0xE8C060, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Arrow pattern
    gfx.fillStyle(0xD0A840, 0.5);
    gfx.fillTriangle(16, 4, 6, 20, 26, 20);
    gfx.lineStyle(1, 0xC89830, 0.4);
    gfx.strokeRect(0, 0, 32, 32);
    gfx.generateTexture('tile_exit', 32, 32);
    gfx.destroy();
  }

  private createWaterTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x3388BB, 1);
    gfx.fillRect(0, 0, 32, 32);
    // Wave lines
    gfx.lineStyle(1, 0x55AADD, 0.5);
    gfx.lineBetween(0, 10, 32, 10);
    gfx.lineBetween(0, 20, 32, 20);
    gfx.generateTexture('tile_water', 32, 32);
    gfx.destroy();
  }

  // --- Player sprite (28x32) ---

  private createPlayerSprite(key: string, direction: 'up' | 'down' | 'left' | 'right'): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);

    const w = 28, h = 32;

    // Hair
    gfx.fillStyle(0x4A3728, 1);
    gfx.fillRoundedRect(4, 1, 22, 10, 4);

    // Head / skin
    gfx.fillStyle(0xFFDBAC, 1);
    gfx.fillRoundedRect(6, 6, 18, 10, 3);

    // Body (shirt - pink)
    gfx.fillStyle(0xFFB6C1, 1);
    gfx.fillRoundedRect(3, 15, 24, 12, 3);

    // Pants (darker)
    gfx.fillStyle(0x5566AA, 1);
    gfx.fillRoundedRect(5, 25, 9, 7, 2);
    gfx.fillRoundedRect(16, 25, 9, 7, 2);

    // Outline
    gfx.lineStyle(1, 0x333333, 0.3);
    gfx.strokeRoundedRect(3, 15, 24, 12, 3);

    // Eyes
    gfx.fillStyle(0x333333, 1);
    switch (direction) {
      case 'down':
        gfx.fillRect(10, 10, 3, 3);
        gfx.fillRect(17, 10, 3, 3);
        break;
      case 'up':
        gfx.fillRect(10, 7, 3, 3);
        gfx.fillRect(17, 7, 3, 3);
        break;
      case 'left':
        gfx.fillRect(7, 9, 3, 3);
        gfx.fillRect(7, 13, 3, 3);
        break;
      case 'right':
        gfx.fillRect(20, 9, 3, 3);
        gfx.fillRect(20, 13, 3, 3);
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
    gfx.lineStyle(1, 0x000000, 0.3);
    gfx.strokeRoundedRect(0, 0, w, h, 4);
    gfx.generateTexture(key, w, h);
    gfx.destroy();
  }
}
