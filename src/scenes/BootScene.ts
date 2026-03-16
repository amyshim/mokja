import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    this.generatePlaceholderArt();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const bar = this.add.rectangle(w / 2, h / 2, 450, 30, 0x333333);
    const fill = this.add.rectangle(w / 2 - 222, h / 2, 6, 24, 0x88cc44);

    this.load.on('progress', (value: number) => {
      fill.width = 444 * value;
      fill.x = w / 2 - 222 + fill.width / 2;
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
    this.createColoredRect('crop_barley_seed', 48, 48, 0xD4AA70);
    this.createColoredRect('crop_barley_growing', 48, 48, 0xC8B060);
    this.createColoredRect('crop_barley', 48, 48, 0xC8A960);
    this.createColoredRect('crop_rice_seed', 48, 48, 0xB8D4B8);
    this.createColoredRect('crop_rice_growing', 48, 48, 0xA0C8A0);
    this.createColoredRect('crop_rice', 48, 48, 0xF5F5DC);

    // Watering can
    this.createColoredRect('watering_can', 48, 48, 0x4488FF);

    // Plot states
    this.createColoredRect('plot_empty', 72, 72, 0x8B4513);
    this.createColoredRect('plot_watered', 72, 72, 0x654321);

    // Dishes
    this.createColoredRect('dish_barley_tea', 48, 48, 0xC8A960);

    // Characters (legacy)
    this.createColoredRect('player', 48, 72, 0xFFB6C1);
    this.createColoredRect('customer', 36, 54, 0x87CEEB);

    // Restaurant (legacy)
    this.createColoredRect('table_2', 96, 72, 0xDEB887);
    this.createColoredRect('table_4', 120, 72, 0xDEB887);
    this.createColoredRect('chair', 30, 30, 0xA0522D);
    this.createColoredRect('plate', 36, 36, 0xFAFAFA);

    // UI
    this.createColoredRect('btn_green', 180, 60, 0x4CAF50);
    this.createColoredRect('btn_blue', 180, 60, 0x2196F3);
    this.createColoredRect('btn_red', 180, 60, 0xF44336);
    this.createColoredRect('btn_gray', 180, 60, 0x9E9E9E);
    this.createColoredRect('panel', 300, 225, 0x2D2D4E);
    this.createColoredRect('coin', 24, 24, 0xFFD700);

    // Cooking (legacy)
    this.createColoredRect('icon_chop', 72, 72, 0xCCCCCC);
    this.createColoredRect('icon_boil', 72, 72, 0x4488FF);
    this.createColoredRect('icon_combine', 72, 72, 0xFFAA00);

    // Cleaning
    this.createColoredRect('sponge', 48, 36, 0xFFFF00);

    // --- 48x48 tile textures with detail ---
    this.createFloorTile();
    this.createWallTile();
    this.createCounterTile();
    this.createTableTile();
    this.createColoredRect('tile_chop', 48, 48, 0xBBBBBB);
    this.createColoredRect('tile_boil', 48, 48, 0x5599CC);
    this.createColoredRect('tile_combine', 48, 48, 0xDD8833);

    // Kitchen station tiles
    this.createBinTile();
    this.createRiceBinTile();
    this.createOvenTile();
    this.createKettleTile();
    this.createRiceCookerTile();
    this.createRecipeBookTile();
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

    // Player directional sprites (42x48)
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
    gfx.fillRect(0, 0, 48, 48);
    // Checkerboard pattern
    gfx.fillStyle(0xBDA07A, 0.4);
    gfx.fillRect(0, 0, 24, 24);
    gfx.fillRect(24, 24, 24, 24);
    // Subtle grid lines
    gfx.lineStyle(1, 0xAA9070, 0.3);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_floor', 48, 48);
    gfx.destroy();
  }

  private createWallTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x3D2E1F, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Brick pattern
    gfx.lineStyle(1, 0x2A1F14, 0.5);
    gfx.lineBetween(0, 12, 48, 12);
    gfx.lineBetween(0, 24, 48, 24);
    gfx.lineBetween(0, 36, 48, 36);
    gfx.lineBetween(24, 0, 24, 12);
    gfx.lineBetween(0, 12, 0, 24);
    gfx.lineBetween(24, 24, 24, 36);
    // Highlight on top
    gfx.fillStyle(0x5A4535, 0.3);
    gfx.fillRect(0, 0, 48, 3);
    gfx.generateTexture('tile_wall', 48, 48);
    gfx.destroy();
  }

  private createCounterTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x6B5A4A, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Wood grain
    gfx.lineStyle(1, 0x5A4A3A, 0.4);
    gfx.lineBetween(0, 9, 48, 9);
    gfx.lineBetween(0, 21, 48, 21);
    gfx.lineBetween(0, 33, 48, 33);
    gfx.lineBetween(0, 42, 48, 42);
    // Top edge highlight
    gfx.fillStyle(0x8B7A6A, 0.5);
    gfx.fillRect(0, 0, 48, 5);
    gfx.lineStyle(1, 0x4A3A2A, 0.3);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_counter', 48, 48);
    gfx.destroy();
  }

  private createTableTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    // Full-bleed fill so adjacent tiles merge seamlessly
    gfx.fillStyle(0xDEB887, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Wood grain
    gfx.lineStyle(1, 0xC8A070, 0.3);
    gfx.lineBetween(3, 12, 45, 12);
    gfx.lineBetween(3, 24, 45, 24);
    gfx.lineBetween(3, 36, 45, 36);
    gfx.generateTexture('tile_table', 48, 48);
    gfx.destroy();
  }

  private createBinTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x8B7355, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Barrel bands (shifted up 6px)
    gfx.lineStyle(3, 0x6B5335, 0.6);
    gfx.lineBetween(0, 6, 48, 6);
    gfx.lineBetween(0, 28, 48, 28);
    // Grain dots (shifted up 6px)
    gfx.fillStyle(0xD4AA70, 0.6);
    gfx.fillCircle(18, 17, 5);
    gfx.fillCircle(30, 14, 3);
    gfx.fillCircle(24, 23, 3);
    gfx.lineStyle(1, 0x5A4030, 0.3);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_bin', 48, 48);
    gfx.destroy();
  }

  private createOvenTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0xCC5533, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Oven door (shifted up 6px)
    gfx.fillStyle(0x993322, 1);
    gfx.fillRoundedRect(9, 6, 30, 25, 3);
    // Handle
    gfx.fillStyle(0x666666, 1);
    gfx.fillRect(20, 9, 9, 3);
    // Glow inside
    gfx.fillStyle(0xFF6633, 0.3);
    gfx.fillRect(14, 15, 21, 12);
    gfx.lineStyle(1, 0x882211, 0.5);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_oven', 48, 48);
    gfx.destroy();
  }

  private createRiceBinTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x7B8B6F, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Barrel bands (shifted up 6px)
    gfx.lineStyle(3, 0x5B6B4F, 0.6);
    gfx.lineBetween(0, 6, 48, 6);
    gfx.lineBetween(0, 28, 48, 28);
    // Rice grains (shifted up 6px)
    gfx.fillStyle(0xF5F5DC, 0.7);
    gfx.fillCircle(17, 17, 3);
    gfx.fillCircle(24, 21, 3);
    gfx.fillCircle(32, 15, 3);
    gfx.fillCircle(21, 26, 3);
    gfx.lineStyle(1, 0x4A5A3E, 0.3);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_rice_bin', 48, 48);
    gfx.destroy();
  }

  private createKettleTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    // Background - dark teal
    gfx.fillStyle(0x2A5566, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Kettle body (shifted up 6px)
    gfx.fillStyle(0xAAAAAA, 1);
    gfx.fillRoundedRect(10, 10, 28, 24, 8);
    // Lid
    gfx.fillStyle(0xBBBBBB, 1);
    gfx.fillRoundedRect(14, 6, 20, 7, 3);
    // Lid knob
    gfx.fillStyle(0x666666, 1);
    gfx.fillRect(22, 2, 4, 5);
    // Spout (right side)
    gfx.fillStyle(0x999999, 1);
    gfx.fillTriangle(38, 14, 44, 8, 38, 20);
    // Handle (left side)
    gfx.lineStyle(3, 0x666666, 1);
    gfx.strokeCircle(8, 22, 5);
    // Steam lines
    gfx.lineStyle(1, 0xCCEEFF, 0.5);
    gfx.lineBetween(20, 0, 22, 0);
    gfx.lineBetween(26, 0, 28, 0);
    // Highlight
    gfx.fillStyle(0xCCCCCC, 0.3);
    gfx.fillRect(16, 13, 4, 12);
    gfx.lineStyle(1, 0x1A4455, 0.4);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_kettle', 48, 48);
    gfx.destroy();
  }

  private createRiceCookerTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    // Background - dark teal for white label readability
    gfx.fillStyle(0x4A6670, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Body (shifted up 6px)
    gfx.fillStyle(0xEEE8DD, 1);
    gfx.fillRoundedRect(8, 12, 32, 22, 6);
    // Lid
    gfx.fillStyle(0xBBBBBB, 1);
    gfx.fillRoundedRect(10, 6, 28, 10, 5);
    // Lid handle
    gfx.fillStyle(0x888888, 1);
    gfx.fillRect(20, 3, 8, 4);
    // Red indicator light
    gfx.fillStyle(0xFF2222, 1);
    gfx.fillCircle(36, 28, 3);
    // Steam lines
    gfx.lineStyle(1, 0xCCEEFF, 0.4);
    gfx.lineBetween(18, 2, 20, 0);
    gfx.lineBetween(28, 2, 30, 0);
    // Body outline
    gfx.lineStyle(1, 0x776655, 0.4);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_rice_cooker', 48, 48);
    gfx.destroy();
  }

  private createRecipeBookTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    // Background - dark brown for white label readability
    gfx.fillStyle(0x3B2A1A, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Book stand (shifted up 6px)
    gfx.fillStyle(0x5A4A3A, 1);
    gfx.fillTriangle(14, 36, 34, 36, 24, 30);
    // Book cover (shifted up 6px)
    gfx.fillStyle(0x8B4513, 1);
    gfx.fillRoundedRect(10, 2, 28, 30, 3);
    // Pages visible
    gfx.fillStyle(0xFFF8E7, 1);
    gfx.fillRect(12, 4, 24, 26);
    // Text lines on pages
    gfx.fillStyle(0x666666, 0.4);
    gfx.fillRect(15, 8, 18, 2);
    gfx.fillRect(15, 13, 14, 2);
    gfx.fillRect(15, 18, 16, 2);
    gfx.fillRect(15, 23, 12, 2);
    // Spine
    gfx.fillStyle(0x6B3010, 1);
    gfx.fillRect(10, 2, 4, 30);
    gfx.lineStyle(1, 0x5A4030, 0.3);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_recipe_book', 48, 48);
    gfx.destroy();
  }

  private createSinkTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x8899AA, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Basin (shifted up 6px)
    gfx.fillStyle(0xBBCCDD, 1);
    gfx.fillRoundedRect(8, 9, 33, 24, 5);
    // Inner basin
    gfx.fillStyle(0x6688AA, 0.5);
    gfx.fillRoundedRect(12, 14, 24, 15, 3);
    // Faucet
    gfx.fillStyle(0x777777, 1);
    gfx.fillRect(21, 0, 6, 12);
    gfx.fillRect(18, 0, 12, 5);
    // Water droplet
    gfx.fillStyle(0x66BBFF, 0.6);
    gfx.fillCircle(24, 20, 3);
    gfx.lineStyle(1, 0x667788, 0.4);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_sink', 48, 48);
    gfx.destroy();
  }

  private createCupsTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0xEEEEDD, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Cup shapes (shifted up 6px)
    gfx.fillStyle(0xFFFFFF, 1);
    gfx.fillRoundedRect(6, 12, 15, 21, 3);
    gfx.fillRoundedRect(27, 12, 15, 21, 3);
    // Cup rims
    gfx.lineStyle(1, 0xCCCCBB, 0.8);
    gfx.strokeRoundedRect(6, 12, 15, 21, 3);
    gfx.strokeRoundedRect(27, 12, 15, 21, 3);
    // Handles
    gfx.lineStyle(3, 0xDDDDCC, 1);
    gfx.strokeCircle(24, 23, 5);
    gfx.lineStyle(1, 0xBBBBAA, 0.4);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_cups', 48, 48);
    gfx.destroy();
  }

  private createBowlsTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0xAA9977, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Stacked bowls (shifted up 6px)
    gfx.fillStyle(0xF0E6D2, 1);
    gfx.fillRoundedRect(9, 21, 30, 12, 5);
    gfx.fillRoundedRect(12, 12, 24, 12, 5);
    gfx.fillRoundedRect(15, 5, 18, 11, 5);
    // Bowl rims
    gfx.lineStyle(1, 0xC4B8A0, 0.8);
    gfx.strokeRoundedRect(9, 21, 30, 12, 5);
    gfx.strokeRoundedRect(12, 12, 24, 12, 5);
    gfx.strokeRoundedRect(15, 5, 18, 11, 5);
    gfx.lineStyle(1, 0x887755, 0.5);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_bowls', 48, 48);
    gfx.destroy();
  }

  private createTrashTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x666666, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Bin body (shifted up 6px)
    gfx.fillStyle(0x555555, 1);
    gfx.fillRoundedRect(11, 6, 27, 28, 3);
    // Lid
    gfx.fillStyle(0x777777, 1);
    gfx.fillRoundedRect(8, 2, 33, 8, 3);
    // Handle
    gfx.fillStyle(0x888888, 1);
    gfx.fillRect(20, 0, 9, 3);
    // Lines on body
    gfx.lineStyle(1, 0x444444, 0.5);
    gfx.lineBetween(18, 12, 18, 32);
    gfx.lineBetween(24, 12, 24, 32);
    gfx.lineBetween(30, 12, 30, 32);
    gfx.lineStyle(1, 0x444444, 0.3);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_trash', 48, 48);
    gfx.destroy();
  }

  private createKitchenTableTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0xAA9977, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Surface texture
    gfx.lineStyle(1, 0x998866, 0.3);
    gfx.lineBetween(0, 15, 48, 15);
    gfx.lineBetween(0, 30, 48, 30);
    // Border
    gfx.lineStyle(1, 0x887755, 0.5);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_ktable', 48, 48);
    gfx.destroy();
  }

  private createGrassTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x4a8c3f, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Grass blades
    gfx.fillStyle(0x5a9c4f, 0.5);
    gfx.fillRect(6, 9, 3, 9);
    gfx.fillRect(18, 3, 3, 8);
    gfx.fillRect(36, 12, 3, 8);
    gfx.fillRect(12, 30, 3, 8);
    gfx.fillRect(27, 33, 3, 6);
    gfx.fillRect(42, 27, 3, 8);
    // Darker patches
    gfx.fillStyle(0x3a7c2f, 0.3);
    gfx.fillRect(0, 24, 24, 24);
    gfx.generateTexture('tile_grass', 48, 48);
    gfx.destroy();
  }

  private createDirtTile(key: string, baseColor: number): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(baseColor, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Dirt texture dots
    const r = (baseColor >> 16) & 0xFF;
    const g = (baseColor >> 8) & 0xFF;
    const b = baseColor & 0xFF;
    const darker = ((Math.max(0, r - 20)) << 16) | ((Math.max(0, g - 15)) << 8) | Math.max(0, b - 10);
    gfx.fillStyle(darker, 0.4);
    gfx.fillCircle(12, 12, 3);
    gfx.fillCircle(30, 18, 5);
    gfx.fillCircle(15, 36, 3);
    gfx.fillCircle(39, 39, 3);
    gfx.lineStyle(1, darker, 0.2);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture(key, 48, 48);
    gfx.destroy();
  }

  private createFenceTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x5C3A1E, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Fence planks
    gfx.fillStyle(0x6B4A2E, 0.6);
    gfx.fillRect(3, 0, 12, 48);
    gfx.fillRect(33, 0, 12, 48);
    // Cross beam
    gfx.fillStyle(0x4C2A0E, 0.5);
    gfx.fillRect(0, 18, 48, 6);
    gfx.generateTexture('tile_fence', 48, 48);
    gfx.destroy();
  }

  private createPathTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0xC2A66B, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Stone pattern
    gfx.fillStyle(0xB8985B, 0.4);
    gfx.fillRoundedRect(3, 3, 18, 18, 3);
    gfx.fillRoundedRect(24, 6, 21, 15, 3);
    gfx.fillRoundedRect(6, 24, 21, 21, 3);
    gfx.fillRoundedRect(30, 27, 15, 18, 3);
    gfx.lineStyle(1, 0xA88850, 0.3);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_path', 48, 48);
    gfx.destroy();
  }

  private createExitTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0xE8C060, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Arrow pattern
    gfx.fillStyle(0xD0A840, 0.5);
    gfx.fillTriangle(24, 6, 9, 30, 39, 30);
    gfx.lineStyle(1, 0xC89830, 0.4);
    gfx.strokeRect(0, 0, 48, 48);
    gfx.generateTexture('tile_exit', 48, 48);
    gfx.destroy();
  }

  private createWaterTile(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(0x3388BB, 1);
    gfx.fillRect(0, 0, 48, 48);
    // Wave lines
    gfx.lineStyle(1, 0x55AADD, 0.5);
    gfx.lineBetween(0, 15, 48, 15);
    gfx.lineBetween(0, 30, 48, 30);
    gfx.generateTexture('tile_water', 48, 48);
    gfx.destroy();
  }

  // --- Player sprite (42x48) ---

  private createPlayerSprite(key: string, direction: 'up' | 'down' | 'left' | 'right'): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);

    const w = 42, h = 48;

    // Hair
    gfx.fillStyle(0x4A3728, 1);
    gfx.fillRoundedRect(6, 2, 33, 15, 6);

    // Head / skin
    gfx.fillStyle(0xFFDBAC, 1);
    gfx.fillRoundedRect(9, 9, 27, 15, 5);

    // Body (shirt - pink)
    gfx.fillStyle(0xFFB6C1, 1);
    gfx.fillRoundedRect(5, 23, 36, 18, 5);

    // Pants (darker)
    gfx.fillStyle(0x5566AA, 1);
    gfx.fillRoundedRect(8, 38, 14, 11, 3);
    gfx.fillRoundedRect(24, 38, 14, 11, 3);

    // Outline
    gfx.lineStyle(1, 0x333333, 0.3);
    gfx.strokeRoundedRect(5, 23, 36, 18, 5);

    // Eyes
    gfx.fillStyle(0x333333, 1);
    switch (direction) {
      case 'down':
        gfx.fillRect(15, 15, 5, 5);
        gfx.fillRect(26, 15, 5, 5);
        break;
      case 'up':
        gfx.fillRect(15, 11, 5, 5);
        gfx.fillRect(26, 11, 5, 5);
        break;
      case 'left':
        gfx.fillRect(11, 14, 5, 5);
        gfx.fillRect(11, 20, 5, 5);
        break;
      case 'right':
        gfx.fillRect(30, 14, 5, 5);
        gfx.fillRect(30, 20, 5, 5);
        break;
    }

    gfx.generateTexture(key, w + 3, h + 3);
    gfx.destroy();
  }

  private createColoredRect(key: string, w: number, h: number, color: number): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.setVisible(false);
    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(0, 0, w, h, 6);
    gfx.lineStyle(1, 0x000000, 0.3);
    gfx.strokeRoundedRect(0, 0, w, h, 6);
    gfx.generateTexture(key, w, h);
    gfx.destroy();
  }
}
