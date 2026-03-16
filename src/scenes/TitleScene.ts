import Phaser from 'phaser';
import { hasSave, loadGame, deleteSave, saveGame } from '../state/persistence';
import GameState from '../state/GameState';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Title' });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // Title
    this.add.text(w / 2, h * 0.3, 'MOKJA', {
      fontSize: '96px',
      fontFamily: 'monospace',
      color: '#e8d5b7',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.3 + 75, 'A Korean Restaurant Game', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    // New Game button
    const newBtn = this.add.text(w / 2, h * 0.55, '[ New Game ]', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#4CAF50',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    newBtn.on('pointerover', () => newBtn.setColor('#66FF66'));
    newBtn.on('pointerout', () => newBtn.setColor('#4CAF50'));
    newBtn.on('pointerdown', () => {
      const state = GameState.getInstance();
      state.reset();
      state.grantStarterHarvest();
      saveGame();
      this.scene.start('Farm');
    });

    // Continue button (only if save exists)
    if (hasSave()) {
      const contBtn = this.add.text(w / 2, h * 0.65, '[ Continue ]', {
        fontSize: '36px',
        fontFamily: 'monospace',
        color: '#2196F3',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      contBtn.on('pointerover', () => contBtn.setColor('#66BBFF'));
      contBtn.on('pointerout', () => contBtn.setColor('#2196F3'));
      contBtn.on('pointerdown', () => {
        loadGame();
        this.scene.start('Farm');
      });

      // Delete save
      const delBtn = this.add.text(w / 2, h * 0.75, '[ Delete Save ]', {
        fontSize: '21px',
        fontFamily: 'monospace',
        color: '#666666',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      delBtn.on('pointerover', () => delBtn.setColor('#FF4444'));
      delBtn.on('pointerout', () => delBtn.setColor('#666666'));
      delBtn.on('pointerdown', () => {
        deleteSave();
        this.scene.restart();
      });
    }
  }
}
