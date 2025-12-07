import Phaser from 'phaser';
import { ImageUtils } from '../utils/image-utils';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload(): void {
        // Load any assets needed for the loading screen
        this.load.image('logo', 'assets/images/logo.png');
    }

    create(): void {
        // Set up any systems that need to be initialized before the game starts
        console.log('Boot scene started');

        // Transition to the preload scene
        this.scene.start('PreloadScene');
    }
}
