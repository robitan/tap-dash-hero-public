import Phaser from 'phaser';
import { ImageUtils } from '../utils/image-utils';
import { MissionManager, MissionType } from '../utils/mission-manager';
import { ScoreManager } from '../utils/score-manager';
import { EffectFactory } from '../managers/effect-factory';
import { PlayerController } from '../managers/player-controller';
import { EnemyManager } from '../managers/enemy-manager';
import { PowerupManager } from '../managers/powerup-manager';
import { UIManager } from '../managers/ui-manager';

export class GameplayScene extends Phaser.Scene {
    // コンポーネントマネージャー
    private effectFactory!: EffectFactory;
    private playerController!: PlayerController;
    private enemyManager!: EnemyManager;
    private powerupManager!: PowerupManager;
    private uiManager!: UIManager;

    // ゲーム要素
    private player!: Phaser.Physics.Arcade.Sprite;
    private powerupEffects!: Phaser.GameObjects.Container;

    // ゲーム状態
    private maxCombo: number = 0;

    // サウンド
    private dashSound!: Phaser.Sound.BaseSound;
    private explosionSound!: Phaser.Sound.BaseSound;
    private powerupSound!: Phaser.Sound.BaseSound;

    constructor() {
        super({ key: 'GameplayScene' });
    }

    create(): void {
        // ゲーム状態のリセット
        this.maxCombo = 0;

        // 背景の設定
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000033).setOrigin(0, 0);

        // コンポーネントの初期化
        this.setupGameComponents();

        // 効果音の設定
        this.setupSounds();

        // 衝突判定の設定
        this.setupCollisions();

        // スポーンタイマーの開始
        this.enemyManager.startSpawning();
        this.powerupManager.startSpawning();

        // ゲームタイマーの開始
        this.uiManager.startGameTimer(() => this.endGame());

        // 現在のミッションを読み込み表示
        this.uiManager.loadCurrentMission();
    }

    update(): void {
        // プレイヤーコントローラーの更新
        this.playerController.update();

        // 敵マネージャーの更新
        this.enemyManager.update();

        // パワーアップマネージャーの更新
        this.powerupManager.update();

        // 最大コンボ更新チェック
        if (this.uiManager.getCombo() > this.maxCombo) {
            this.maxCombo = this.uiManager.getCombo();
            // コンボチェーンのミッション進捗を更新
            MissionManager.updateMissionProgress(MissionType.COMBO_CHAIN, this.maxCombo);
        }
    }

    /**
     * ゲームコンポーネントをセットアップ
     */
    private setupGameComponents(): void {
        // エフェクトファクトリーの作成
        this.effectFactory = new EffectFactory(this);

        // 星空背景の作成
        this.effectFactory.createStarfield();

        // UIマネージャーの作成
        this.uiManager = new UIManager({
            scene: this,
            initialScore: 0,
            initialCombo: 0,
            initialGameTime: 60
        });

        // プレイヤーの作成
        this.player = ImageUtils.createResponsivePhysicsSprite(
            this,
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'player',
            undefined,
            0.1 // 10% of screen width
        );
        this.player.setCollideWorldBounds(true);

        // パワーアップエフェクトのコンテナを作成
        this.powerupEffects = this.add.container(0, 0);

        // プレイヤーコントローラーの作成
        this.playerController = new PlayerController(
            this,
            this.player,
            this.uiManager.getEnergyBar(),
            this.uiManager.getChargeBar(),
            this.effectFactory,
            this.dashSound
        );

        // 敵マネージャーの作成
        this.enemyManager = new EnemyManager({
            scene: this,
            player: this.player,
            effectFactory: this.effectFactory,
            explosionSound: this.explosionSound,
            onEnemyDefeated: (score) => {
                // プレイヤーの位置でスコア更新
                this.uiManager.increaseScore(score, this.player.x, this.player.y);
                MissionManager.updateMissionProgress(MissionType.REACH_SCORE, score);
            },
            onComboIncrease: () => {
                this.uiManager.increaseCombo();
            }
        });

        // パワーアップマネージャーの作成
        this.powerupManager = new PowerupManager({
            scene: this,
            player: this.player,
            effectFactory: this.effectFactory,
            powerupSound: this.powerupSound,
            powerupEffects: this.powerupEffects
        });

        // パワーアップ効果のコールバック設定
        this.powerupManager.setCallbacks({
            onTimeSlow: (slowFactor) => {
                this.enemyManager.setEnemySpeedMultiplier(slowFactor);
            },
            onComboBoost: (active) => {
                this.uiManager.setComboBoost(active);
            },
            onShieldChange: (active) => {
                this.playerController.setPowerupState({ hasShield: active });
            },
            onMultiDashChange: (active) => {
                this.playerController.setPowerupState({ hasMultiDash: active });
            }
        });

        // 入力処理のセットアップ
        this.playerController.setupInput();
    }

    /**
     * サウンドの設定
     */
    private setupSounds(): void {
        this.dashSound = this.sound.add('dash');
        this.explosionSound = this.sound.add('explosion');
        this.powerupSound = this.sound.add('powerup');
    }

    /**
     * 衝突判定の設定
     */
    private setupCollisions(): void {
        // 敵との衝突
        this.enemyManager.setupCollisions(
            (player, enemy) => this.handlePlayerDamage(player, enemy)
        );

        // パワーアップとの衝突
        this.powerupManager.setupCollisions();
    }

    /**
     * プレイヤーがダメージを受けた時の処理
     */
    private handlePlayerDamage(player: Phaser.GameObjects.GameObject, enemy: Phaser.GameObjects.GameObject): void {
        // 回避中は当たり判定を無効化
        if (this.playerController.isPlayerEvading()) return;

        // シールドがある場合はダメージを受けずにシールド消失
        if (this.powerupManager.hasActiveShield()) {
            this.powerupManager.consumeShield();

            // シールド破壊のカメラシェイク（軽め）
            this.cameras.main.shake(150, 0.01);
        } else {
            // プレイヤーがダメージを受けたエフェクト
            this.playerController.applyDamageEffect();

            // カメラシェイク
            this.cameras.main.shake(300, 0.02);

            // プレイヤーのノックバック処理
            const e = enemy as Phaser.Physics.Arcade.Sprite;
            this.playerController.applyKnockback(e.x, e.y);

            // ゲームオーバー処理
            this.time.delayedCall(100, () => {
                // プレイヤーの消滅エフェクトを適用して操作を無効化
                this.playerController.applyDeathEffect();

                // 敵を全て削除（消えていくエフェクト付き）
                this.enemyManager.getEnemies().getChildren().forEach((enemy: Phaser.GameObjects.GameObject) => {
                    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
                    this.tweens.add({
                        targets: enemySprite,
                        alpha: 0,
                        scale: 0.1,
                        duration: 300,
                        onComplete: () => {
                            enemySprite.destroy();
                        }
                    });
                });

                // パワーアップを全て削除
                this.powerupManager.getPowerups().clear(true, true);

                // 少し遅延させてゲームオーバー画面を表示
                this.time.delayedCall(800, () => {
                    this.endGame();
                });
            });
        }
    }

    /**
     * ボスの弾との衝突処理
     */
    private handleBossBulletCollision(player: Phaser.GameObjects.GameObject, bullet: Phaser.GameObjects.GameObject): void {
        // 回避中は当たり判定を無効化
        if (this.playerController.isPlayerEvading()) return;

        // シールドがある場合はダメージを受けずにシールド消失
        if (this.powerupManager.hasActiveShield()) {
            this.powerupManager.consumeShield();
        } else {
            // プレイヤーの消滅エフェクトを適用して操作を無効化
            this.playerController.applyDeathEffect();

            // 少し遅延させてゲームオーバー画面を表示
            this.time.delayedCall(800, () => {
                this.endGame();
            });
        }
    }

    /**
     * ゲーム終了処理
     */
    private endGame(): void {
        // ゲームタイマーを停止
        this.uiManager.stopGameTimer();

        // 敵のスポーンを停止
        this.time.removeAllEvents();

        // ゲームオーバー画面を表示
        this.uiManager.showGameOver({
            enemiesDefeated: this.enemyManager.getEnemiesDefeatedCount(),
            powerupsCollected: this.powerupManager.getPowerupsCollectedCount(),
            maxCombo: this.maxCombo
        });
    }
}
