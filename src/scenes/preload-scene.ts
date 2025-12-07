import Phaser from 'phaser';
import { ImageUtils } from '../utils/image-utils';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload(): void {
        // Display loading progress
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Add logo with responsive sizing
        const logo = this.add.image(width / 2, height / 2 - 100, 'logo');
        ImageUtils.scaleToScreenPercent(logo, 0.3); // 30% of screen width

        // Create loading bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2, 320, 50);

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2 - 20, 'Loading...', {
            font: '20px Arial',
            color: '#ffffff'
        });
        loadingText.setOrigin(0.5, 0.5);

        // Percent text
        const percentText = this.add.text(width / 2, height / 2 + 50, '0%', {
            font: '18px Arial',
            color: '#ffffff'
        });
        percentText.setOrigin(0.5, 0.5);

        // Loading event handlers
        this.load.on('progress', (value: number) => {
            percentText.setText(parseInt(String(value * 100)) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 + 10, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });

        // Load game assets
        this.loadAssets();
    }

    create(): void {
        console.log('Preload scene completed');
        this.scene.start('MainMenuScene');
    }

    private loadAssets(): void {
        // Player assets
        this.load.image('player', 'assets/images/player.png');

        // Enemy assets
        this.load.image('enemy-basic', 'assets/images/enemy-basic.png');
        this.load.image('enemy-armored', 'assets/images/enemy-armored.png');
        this.load.image('enemy-explosive', 'assets/images/enemy-explosive.png');
        this.load.image('enemy-boss', 'assets/images/enemy-boss.png');

        // Power-up assets
        this.load.image('powerup-shield', 'assets/images/powerup-shield.png');
        this.load.image('powerup-multidash', 'assets/images/powerup-multidash.png');
        this.load.image('powerup-timeslow', 'assets/images/powerup-timeslow.png');
        this.load.image('powerup-combo', 'assets/images/powerup-combo.png');

        // UI assets
        this.load.image('button', 'assets/images/button.png');
        this.load.image('energy-bar', 'assets/images/energy-bar.png');

        // Audio assets
        this.load.audio('dash', 'assets/audio/dash.mp3');
        this.load.audio('explosion', 'assets/audio/explosion.mp3');
        this.load.audio('powerup', 'assets/audio/powerup.mp3');
        this.load.audio('bgm', 'assets/audio/bgm.mp3');
    }
}
