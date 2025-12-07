import Phaser from 'phaser';
import { GameConfig } from './config/game-config';
import { BootScene } from './scenes/boot-scene';
import { PreloadScene } from './scenes/preload-scene';
import { MainMenuScene } from './scenes/main-menu-scene';
import { GameplayScene } from './scenes/gameplay-scene';
import { TutorialScene } from './scenes/tutorial-scene';

// Add scenes to the game config
GameConfig.scene = [
    BootScene,
    PreloadScene,
    MainMenuScene,
    GameplayScene,
    TutorialScene
];

// Create the game instance
const game = new Phaser.Game(GameConfig);

// Handle window resize
window.addEventListener('resize', () => {
    game.scale.refresh();
});

// Expose game to window for debugging in development
if (process.env.NODE_ENV === 'development') {
    (window as any).game = game;
}
