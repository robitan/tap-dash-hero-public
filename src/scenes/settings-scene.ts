import Phaser from 'phaser';
import { ImageUtils } from '../utils/image-utils';

export class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SettingsScene' });
    }

    create(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.add.rectangle(0, 0, width, height, 0x0b1020).setOrigin(0, 0);

        const title = this.add.text(width / 2, 80, 'SETTINGS', {
            font: 'bold 32px Arial',
            color: '#ffffff'
        });
        title.setOrigin(0.5, 0.5);

        let bgmVolume = this.sound.volume;
        let seVolume = this.registry.get('seVolume') ?? 0.8;

        const bgmLabel = this.add.text(width / 2, 190, '', {
            font: '20px Arial',
            color: '#dddddd'
        }).setOrigin(0.5);

        const seLabel = this.add.text(width / 2, 300, '', {
            font: '20px Arial',
            color: '#dddddd'
        }).setOrigin(0.5);

        const refreshLabels = () => {
            bgmLabel.setText(`BGM: ${Math.round(bgmVolume * 100)}%`);
            seLabel.setText(`SE: ${Math.round(seVolume * 100)}%`);
        };
        refreshLabels();

        const addStepButton = (x: number, y: number, text: string, onClick: () => void) => {
            const button = this.add.image(x, y, 'button');
            ImageUtils.scaleToScreenPercent(button, 0.18, 0.08);
            button.setInteractive();
            button.on('pointerdown', onClick);
            button.on('pointerover', () => button.setTint(0xcccccc));
            button.on('pointerout', () => button.clearTint());

            this.add.text(x, y, text, {
                font: 'bold 20px Arial',
                color: '#000000'
            }).setOrigin(0.5);
        };

        addStepButton(width / 2 - 90, 240, '-', () => {
            bgmVolume = Math.max(0, bgmVolume - 0.1);
            this.sound.volume = bgmVolume;
            refreshLabels();
        });
        addStepButton(width / 2 + 90, 240, '+', () => {
            bgmVolume = Math.min(1, bgmVolume + 0.1);
            this.sound.volume = bgmVolume;
            refreshLabels();
        });

        addStepButton(width / 2 - 90, 350, '-', () => {
            seVolume = Math.max(0, seVolume - 0.1);
            this.registry.set('seVolume', seVolume);
            refreshLabels();
        });
        addStepButton(width / 2 + 90, 350, '+', () => {
            seVolume = Math.min(1, seVolume + 0.1);
            this.registry.set('seVolume', seVolume);
            refreshLabels();
        });

        const backButton = this.add.image(width / 2, height - 80, 'button');
        ImageUtils.scaleToScreenPercent(backButton, 0.4, 0.1);
        backButton.setInteractive();
        backButton.on('pointerdown', () => this.scene.start('MainMenuScene'));
        backButton.on('pointerover', () => backButton.setTint(0xcccccc));
        backButton.on('pointerout', () => backButton.clearTint());

        this.add.text(width / 2, height - 80, '戻る', {
            font: 'bold 20px Arial',
            color: '#000000'
        }).setOrigin(0.5);
    }
}
