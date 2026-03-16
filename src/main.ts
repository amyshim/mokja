import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { FarmScene } from './scenes/FarmScene';
import { MenuScene } from './scenes/MenuScene';
import { ServeScene } from './scenes/ServeScene';
import { AccountingScene } from './scenes/AccountingScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 768,
  height: 1024,
  parent: document.body,
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    TitleScene,
    FarmScene,
    MenuScene,
    ServeScene,
    AccountingScene,
  ],
};

new Phaser.Game(config);
