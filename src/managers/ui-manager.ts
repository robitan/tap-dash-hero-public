import Phaser from 'phaser';
import { ScoreManager } from '../utils/score-manager';
import { MissionManager } from '../utils/mission-manager';

export interface UIManagerConfig {
    scene: Phaser.Scene;
    initialScore?: number;
    initialCombo?: number;
    initialGameTime?: number;
}

export class UIManager {
    private scene: Phaser.Scene;
    private scoreText!: Phaser.GameObjects.Text;
    private comboText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;
    private energyBar!: Phaser.GameObjects.Graphics;
    private chargeBar!: Phaser.GameObjects.Graphics;
    private missionText: Phaser.GameObjects.Text | null = null;

    private score: number;
    private combo: number;
    private gameTime: number;
    private gameTimer: Phaser.Time.TimerEvent | null = null;
    private hasComboBoost: boolean = false;

    // ゲーム終了コールバック
    private onGameEnd: () => void = () => {};

    constructor(config: UIManagerConfig) {
        this.scene = config.scene;
        this.score = config.initialScore || 0;
        this.combo = config.initialCombo || 0;
        this.gameTime = config.initialGameTime || 60;

        // UIの初期設定
        this.setupUI();
    }

    /**
     * ゲームタイマーの開始
     */
    startGameTimer(onGameEnd: () => void): void {
        this.onGameEnd = onGameEnd;
        this.gameTimer = this.scene.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * ゲームタイマーの停止
     */
    stopGameTimer(): void {
        if (this.gameTimer) {
            this.gameTimer.remove();
            this.gameTimer = null;
        }
    }

    /**
     * エネルギーバーの取得
     */
    getEnergyBar(): Phaser.GameObjects.Graphics {
        return this.energyBar;
    }

    /**
     * チャージバーの取得
     */
    getChargeBar(): Phaser.GameObjects.Graphics {
        return this.chargeBar;
    }

    /**
     * コンボブースト状態の設定
     */
    setComboBoost(active: boolean): void {
        this.hasComboBoost = active;
    }

    /**
     * スコアの増加
     */
    increaseScore(amount: number, playerX?: number, playerY?: number): void {
        // コンボボーストがあればスコア増加
        if (this.hasComboBoost) {
            amount = Math.floor(amount * 1.5);
        }

        // コンボ倍率を適用
        if (this.combo > 1) {
            amount = Math.floor(amount * (1 + (this.combo * 0.1)));
        }

        this.score += amount;
        this.scoreText.setText(`Score: ${this.score}`);

        // スコアポップアップエフェクト（プレイヤー位置が指定されている場合）
        if (playerX !== undefined && playerY !== undefined) {
            const popupText = this.scene.add.text(
                playerX,
                playerY - 30,
                `+${amount}`,
                {
                    font: '16px Arial',
                    color: '#ffff00'
                }
            );
            popupText.setOrigin(0.5, 0.5);

            // ポップアップが上に浮いて消える
            this.scene.tweens.add({
                targets: popupText,
                y: popupText.y - 40,
                alpha: 0,
                duration: 700,
                onComplete: () => {
                    popupText.destroy();
                }
            });
        }
    }

    /**
     * コンボの増加
     */
    increaseCombo(): void {
        this.combo++;

        if (this.combo > 1) {
            this.comboText.setVisible(true);
            this.comboText.setText(`Combo: x${this.combo}`);

            // コンボが大きくなるほど色を変える
            if (this.combo >= 10) {
                this.comboText.setColor('#ff00ff'); // 紫
            } else if (this.combo >= 5) {
                this.comboText.setColor('#ffaa00'); // オレンジ
            } else {
                this.comboText.setColor('#ffffff'); // 白
            }

            // コンボテキストを一瞬大きくする
            this.scene.tweens.add({
                targets: this.comboText,
                scale: 1.3,
                duration: 100,
                yoyo: true
            });
        }
    }

    /**
     * 現在のコンボ数を取得
     */
    getCombo(): number {
        return this.combo;
    }

    /**
     * 現在のスコアを取得
     */
    getScore(): number {
        return this.score;
    }

    /**
     * 残り時間を取得
     */
    getGameTime(): number {
        return this.gameTime;
    }

    /**
     * ミッション表示を追加
     */
    async loadCurrentMission(): Promise<void> {
        try {
            const mission = await MissionManager.getCurrentMission();
            if (mission) {
                // ミッション表示
                const width = this.scene.cameras.main.width;
                this.missionText = this.scene.add.text(width - 20, 70, `ミッション: ${mission.description} (${mission.progress}/${mission.target})`, {
                    font: '16px Arial',
                    color: '#cccccc'
                });
                this.missionText.setOrigin(1, 0);
                this.missionText.setData('mission', mission);

                // ミッション達成済みの場合
                if (mission.completed) {
                    this.missionText.setColor('#00ff00');
                    this.missionText.setText(`達成済み: ${mission.description}`);
                }
            }
        } catch (error) {
            console.error('ミッション読み込みエラー:', error);
        }
    }

    /**
     * ゲーム終了画面の表示
     */
    showGameOver(stats: { enemiesDefeated: number, powerupsCollected: number, maxCombo: number }): void {
        // 最終スコアを保存
        ScoreManager.updateHighScore(this.score);

        // リザルト表示
        const overlay = this.scene.add.rectangle(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0x000000,
            0.7
        );

        const gameOverText = this.scene.add.text(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 3,
            'GAME OVER',
            {
                font: 'bold 48px Arial',
                color: '#ff0000'
            }
        );
        gameOverText.setOrigin(0.5, 0.5);

        const finalScoreText = this.scene.add.text(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2,
            `SCORE: ${this.score}`,
            {
                font: 'bold 32px Arial',
                color: '#ffffff'
            }
        );
        finalScoreText.setOrigin(0.5, 0.5);

        // ミッション達成状況表示
        const missionResultText = this.scene.add.text(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2 + 50,
            `敵を倒した数: ${stats.enemiesDefeated}`,
            {
                font: '20px Arial',
                color: '#cccccc'
            }
        );
        missionResultText.setOrigin(0.5, 0.5);

        // メニューに戻るボタン
        const menuButton = this.scene.add.rectangle(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height * 0.7,
            200,
            50,
            0x444444
        );
        menuButton.setInteractive();

        const menuText = this.scene.add.text(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height * 0.7,
            'Back to Menu',
            {
                font: '24px Arial',
                color: '#ffffff'
            }
        );
        menuText.setOrigin(0.5, 0.5);

        menuButton.on('pointerdown', () => {
            this.scene.scene.start('MainMenuScene');
        });
    }

    /**
     * UIの初期設定
     */
    private setupUI(): void {
        // 半透明の黒いUIバックグラウンドを追加してテキストの可読性を向上
        const topBarHeight = 60;
        const topBarBg = this.scene.add.rectangle(
            this.scene.cameras.main.width / 2,
            topBarHeight / 2,
            this.scene.cameras.main.width,
            topBarHeight,
            0x000000,
            0.5
        );

        // UI要素にグラデーションエフェクトを追加
        const gradientBar = this.scene.add.graphics();
        gradientBar.fillGradientStyle(0x0000ff, 0x0000ff, 0x000033, 0x000033, 1);
        gradientBar.fillRect(0, 0, this.scene.cameras.main.width, 3);
        gradientBar.setY(topBarHeight);

        // Score text
        this.scoreText = this.scene.add.text(20, 20, `Score: ${this.score}`, {
            font: 'bold 24px Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });

        // Combo text
        this.comboText = this.scene.add.text(20, 50, `Combo: x${this.combo}`, {
            font: '18px Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.comboText.setVisible(false);

        // Timer text
        this.timerText = this.scene.add.text(
            this.scene.cameras.main.width - 20,
            20,
            `Time: ${this.gameTime}`,
            {
                font: 'bold 24px Arial',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        this.timerText.setOrigin(1, 0);

        // Energy bar
        this.energyBar = this.scene.add.graphics();

        // Charge bar（初期状態では非表示）
        this.chargeBar = this.scene.add.graphics();
    }

    /**
     * タイマーの更新
     */
    private updateTimer(): void {
        if (this.gameTime > 0) {
            this.gameTime--;
            this.timerText.setText(`Time: ${this.gameTime}`);

            // 残り時間が少なくなったら赤く表示
            if (this.gameTime <= 10) {
                this.timerText.setColor('#ff0000');

                // 残り時間が10秒以下でテキストを点滅
                if (this.gameTime % 2 === 0) {
                    this.timerText.setAlpha(1);
                } else {
                    this.timerText.setAlpha(0.5);
                }
            }
        } else {
            // タイムアップ
            this.onGameEnd();
        }
    }
}
