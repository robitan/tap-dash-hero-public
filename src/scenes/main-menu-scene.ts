import Phaser from 'phaser';
import { ImageUtils } from '../utils/image-utils';
import { ScoreManager } from '../utils/score-manager';
import { MissionManager } from '../utils/mission-manager';

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    private highScoreText!: Phaser.GameObjects.Text;
    private missionText!: Phaser.GameObjects.Text;

    create(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Add title
        const title = this.add.text(width / 2, height / 4, 'TAP DASH HERO', {
            font: 'bold 32px Arial',
            color: '#ffffff'
        });
        title.setOrigin(0.5, 0.5);

        // ハイスコア表示
        this.highScoreText = this.add.text(width / 2, height / 4 + 40, 'ハイスコア: 0', {
            font: '20px Arial',
            color: '#ffff00'
        });
        this.highScoreText.setOrigin(0.5, 0.5);

        // ハイスコアとミッションを読み込み
        this.loadHighScore();
        this.loadCurrentMission();

        // Add play button with responsive sizing
        const playButton = this.add.image(width / 2, height / 2, 'button');
        ImageUtils.scaleToScreenPercent(playButton, 0.4, 0.1); // 40% width, 10% height
        playButton.setInteractive();

        const playText = this.add.text(width / 2, height / 2, 'PLAY', {
            font: 'bold 24px Arial',
            color: '#000000'
        });
        playText.setOrigin(0.5, 0.5);

        // Add tutorial button with responsive sizing
        const tutorialButton = this.add.image(width / 2, height / 2 + 80, 'button');
        ImageUtils.scaleToScreenPercent(tutorialButton, 0.4, 0.1); // 40% width, 10% height
        tutorialButton.setInteractive();

        const tutorialText = this.add.text(width / 2, height / 2 + 80, '遊び方', {
            font: 'bold 24px Arial',
            color: '#000000'
        });
        tutorialText.setOrigin(0.5, 0.5);

        // Add settings button with responsive sizing
        const settingsButton = this.add.image(width / 2, height / 2 + 160, 'button');
        ImageUtils.scaleToScreenPercent(settingsButton, 0.4, 0.1); // 40% width, 10% height
        settingsButton.setInteractive();

        const settingsText = this.add.text(width / 2, height / 2 + 160, 'SETTINGS', {
            font: 'bold 24px Arial',
            color: '#000000'
        });
        settingsText.setOrigin(0.5, 0.5);

        // Add version text
        const versionText = this.add.text(width - 10, height - 10, 'v0.1.0', {
            font: '12px Arial',
            color: '#ffffff'
        });
        versionText.setOrigin(1, 1);

        // Add button interactions
        playButton.on('pointerdown', () => {
            this.scene.start('GameplayScene');
        });

        playButton.on('pointerover', () => {
            playButton.setTint(0xcccccc);
        });

        playButton.on('pointerout', () => {
            playButton.clearTint();
        });

        // チュートリアルボタンの操作
        tutorialButton.on('pointerdown', () => {
            this.scene.start('TutorialScene');
        });

        tutorialButton.on('pointerover', () => {
            tutorialButton.setTint(0xcccccc);
        });

        tutorialButton.on('pointerout', () => {
            tutorialButton.clearTint();
        });

        // 設定ボタンの操作
        settingsButton.on('pointerdown', () => {
            console.log('Settings button clicked');
            // TODO: Implement settings scene
        });

        settingsButton.on('pointerover', () => {
            settingsButton.setTint(0xcccccc);
        });

        settingsButton.on('pointerout', () => {
            settingsButton.clearTint();
        });

        // Add background music
        if (!this.sound.get('bgm')) {
            const music = this.sound.add('bgm', {
                volume: 0.5,
                loop: true
            });
            music.play();
        }
    }

    /**
     * 現在のミッションを読み込み、表示する
     */
    private async loadCurrentMission(): Promise<void> {
        try {
            const mission = await MissionManager.getCurrentMission();
            if (mission) {
                // ミッション表示
                const width = this.cameras.main.width;
                const height = this.cameras.main.height;
                this.missionText = this.add.text(width / 2, height / 4 + 80, `ミッション: ${mission.description}`, {
                    font: '16px Arial',
                    color: '#cccccc',
                    align: 'center',
                    wordWrap: { width: width * 0.8 }
                });
                this.missionText.setOrigin(0.5, 0.5);

                // 進捗とステータス表示
                let statusText = `(${mission.progress}/${mission.target})`;

                // ミッション達成済みの場合
                if (mission.completed) {
                    this.missionText.setColor('#00ff00');
                    statusText = '(達成済み!)';

                    // クリア報酬を表示
                    const rewardText = this.add.text(width / 2, height / 4 + 110, `報酬: ${mission.reward}`, {
                        font: '14px Arial',
                        color: '#ffff00',
                        align: 'center'
                    });
                    rewardText.setOrigin(0.5, 0.5);
                }

                this.missionText.setText(`ミッション: ${mission.description} ${statusText}`);
            }
        } catch (error) {
            console.error('ミッション読み込みエラー:', error);
        }
    }

    /**
     * ハイスコアを非同期で読み込み、表示を更新する
     */
    private async loadHighScore(): Promise<void> {
        try {
            const highScore = await ScoreManager.getHighScore();
            this.highScoreText.setText(`ハイスコア: ${highScore}`);

            // ハイスコアが高い場合は色を変える
            if (highScore > 0) {
                if (highScore >= 10000) {
                    this.highScoreText.setColor('#ff9900'); // 1万以上はオレンジ
                } else if (highScore >= 5000) {
                    this.highScoreText.setColor('#ffff00'); // 5000以上は黄色
                }

                // アニメーション効果（サイズ変更）
                this.tweens.add({
                    targets: this.highScoreText,
                    scale: 1.1,
                    duration: 300,
                    yoyo: true
                });
            }
        } catch (error) {
            console.error('ハイスコア読み込みエラー:', error);
            this.highScoreText.setText('ハイスコア: --');
        }
    }
}
