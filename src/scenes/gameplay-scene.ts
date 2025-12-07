import Phaser from 'phaser';
import { ImageUtils } from '../utils/image-utils';
import { EnemyBoss } from '../entities/EnemyBoss';
import { MissionManager, MissionType } from '../utils/mission-manager';
import { ScoreManager } from '../utils/score-manager';

export class GameplayScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private enemies!: Phaser.Physics.Arcade.Group;
    private powerups!: Phaser.Physics.Arcade.Group;
    private energyBar!: Phaser.GameObjects.Graphics;
    private chargeBar!: Phaser.GameObjects.Graphics;
    private scoreText!: Phaser.GameObjects.Text;
    private comboText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;

    // スワイプ回避関連の変数
    private isEvading: boolean = false;
    private evadeDuration: number = 300; // 回避の持続時間（ミリ秒）
    private evadeEffect: Phaser.GameObjects.Graphics | null = null;

    // ボス敵の参照
    private boss: EnemyBoss | null = null;
    // ボス弾グループへの参照
    private bossBullets: Phaser.Physics.Arcade.Group | null = null;
    // ボススポーン用タイマー
    private bossSpawnTimer!: Phaser.Time.TimerEvent;

    private score: number = 0;
    private combo: number = 0;
    private energy: number = 100;
    private gameTime: number = 60; // 60 seconds game time
    private gameTimer!: Phaser.Time.TimerEvent;

    // ミッション関連の変数
    private enemiesDefeated: number = 0;
    private powerupsCollected: number = 0;
    private maxCombo: number = 0;

    // ダッシュ関連の変数
    private isCharging: boolean = false;
    private chargeStartTime: number = 0;
    private maxChargeDuration: number = 1000; // 最大チャージ時間（ミリ秒）
    private chargeAmount: number = 0;
    private dashTarget: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);

    // パワーアップの状態を管理する変数
    private hasShield: boolean = false;
    private hasMultiDash: boolean = false;
    private hasTimeSlow: boolean = false;
    private hasComboBoost: boolean = false;
    private powerupDuration: number = 10000; // 10秒
    private powerupEffects!: Phaser.GameObjects.Container;
    private enemySpeedMultiplier: number = 1.0;

    private dashSound!: Phaser.Sound.BaseSound;
    private explosionSound!: Phaser.Sound.BaseSound;
    private powerupSound!: Phaser.Sound.BaseSound;

    constructor() {
        super({ key: 'GameplayScene' });
    }

    create(): void {
        // ゲーム状態を完全にリセット
        this.score = 0;
        this.combo = 0;
        this.energy = 100;
        this.gameTime = 60;
        this.enemiesDefeated = 0;
        this.powerupsCollected = 0;
        this.maxCombo = 0;
        this.chargeAmount = 0;
        this.isCharging = false;
        this.isEvading = false;

        // パワーアップ状態をリセット
        this.hasShield = false;
        this.hasMultiDash = false;
        this.hasTimeSlow = false;
        this.hasComboBoost = false;
        this.enemySpeedMultiplier = 1.0;

        // Set up background
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000033).setOrigin(0, 0);

        // 星空背景を追加してゲームフィールドを向上
        this.createStarfield();

        // Create player with responsive sizing
        this.player = ImageUtils.createResponsivePhysicsSprite(
            this,
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'player',
            undefined,
            0.1 // 10% of screen width
        );
        this.player.setCollideWorldBounds(true);

        // Create enemy group
        this.enemies = this.physics.add.group();

        // Create powerup group
        this.powerups = this.physics.add.group();

        // パワーアップエフェクトのコンテナを作成
        this.powerupEffects = this.add.container(0, 0);

        // Set up collisions
        this.physics.add.overlap(
            this.player,
            this.enemies,
            (player, enemy) => this.handleEnemyCollision(player as Phaser.GameObjects.GameObject, enemy as Phaser.GameObjects.GameObject),
            undefined,
            this
        );

        this.physics.add.overlap(
            this.player,
            this.powerups,
            (player, powerup) => this.handlePowerupCollision(player as Phaser.GameObjects.GameObject, powerup as Phaser.GameObjects.GameObject),
            undefined,
            this
        );

        // Set up UI
        this.setupUI();

        // Set up input
        this.setupInput();

        // Set up sounds
        this.setupSounds();

        // Start spawning enemies
        this.time.addEvent({
            delay: 1000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // Start spawning powerups
        this.time.addEvent({
            delay: 10000, // Every 10 seconds
            callback: this.spawnPowerup,
            callbackScope: this,
            loop: true
        });

        // 30秒ごとにボス敵をスポーン
        this.bossSpawnTimer = this.time.addEvent({
            delay: 30000, // 30秒
            callback: this.spawnBoss,
            callbackScope: this,
            loop: true
        });

        // Start game timer
        this.gameTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });

        // 現在のミッションを取得して表示（オプション）
        this.loadCurrentMission();
    }

    /**
     * 星空背景を作成してゲームフィールドを向上させる
     */
    private createStarfield(): void {
        // 異なる大きさと透明度の星を作成
        const starCount = 100;

        for (let i = 0; i < starCount; i++) {
            const x = Phaser.Math.Between(0, this.cameras.main.width);
            const y = Phaser.Math.Between(0, this.cameras.main.height);
            const size = Phaser.Math.Between(1, 3);
            const alpha = 0.3 + Math.random() * 0.7;

            const star = this.add.circle(x, y, size, 0xffffff, alpha);

            // 星の瞬きエフェクト
            this.tweens.add({
                targets: star,
                alpha: alpha - 0.2,
                duration: 1000 + Phaser.Math.Between(0, 2000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    /**
     * 現在のミッションを読み込み、表示する
     */
    private async loadCurrentMission(): Promise<void> {
        try {
            const mission = await MissionManager.getCurrentMission();
            if (mission) {
                // ミッション表示（オプション）
                const width = this.cameras.main.width;
                const missionText = this.add.text(width - 20, 70, `ミッション: ${mission.description} (${mission.progress}/${mission.target})`, {
                    font: '16px Arial',
                    color: '#cccccc'
                });
                missionText.setOrigin(1, 0);
                missionText.setData('mission', mission);

                // ミッション達成済みの場合
                if (mission.completed) {
                    missionText.setColor('#00ff00');
                    missionText.setText(`達成済み: ${mission.description}`);
                }
            }
        } catch (error) {
            console.error('ミッション読み込みエラー:', error);
        }
    }

    update(): void {
        // エネルギー回復
        if (this.energy < 100) {
            this.energy = Math.min(100, this.energy + 0.2);
            this.updateEnergyBar();
        }

        // チャージ処理の更新
        if (this.isCharging) {
            // チャージ量を更新
            const chargeDuration = Math.min(this.time.now - this.chargeStartTime, this.maxChargeDuration);
            this.chargeAmount = chargeDuration / this.maxChargeDuration;
            this.updateChargeBar();
        }

        // ボス敵の更新（存在する場合）
        if (this.boss && this.boss.active) {
            // ボスとプレイヤーの衝突をチェック
            this.physics.overlap(
                this.player,
                this.boss,
                (player, boss) => this.handleBossCollision(player as Phaser.GameObjects.GameObject, boss as Phaser.GameObjects.GameObject),
                undefined,
                this
            );

            // ボスの弾とプレイヤーの衝突をチェック
            if (this.boss.getBullets()) {
                this.physics.overlap(
                    this.player,
                    this.boss.getBullets(),
                    (player, bullet) => this.handleBossBulletCollision(player as Phaser.GameObjects.GameObject, bullet as Phaser.GameObjects.GameObject),
                    undefined,
                    this
                );
            }
        }

        // Update enemies
        this.enemies.getChildren().forEach((enemy: Phaser.GameObjects.GameObject) => {
            const e = enemy as Phaser.Physics.Arcade.Sprite;
            // Move enemies toward player
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const angle = Math.atan2(dy, dx);
            // タイムスローが有効なら敵の速度は遅くなる
            const baseSpeed = e.getData('speed') as number || 50;
            const speed = baseSpeed * this.enemySpeedMultiplier;

            e.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
        });

        // パワーアップエフェクトの位置を更新
        if (this.powerupEffects) {
            this.powerupEffects.getAll().forEach((effect: Phaser.GameObjects.GameObject) => {
                const effectContainer = effect as Phaser.GameObjects.Container;
                if (effectContainer.getData('type') === 'shield' ||
                    effectContainer.getData('type') === 'multidash') {
                    effectContainer.setPosition(this.player.x, this.player.y);
                }
            });
        }

        // 最大コンボ更新
        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
            // コンボチェーンのミッション進捗を更新
            MissionManager.updateMissionProgress(MissionType.COMBO_CHAIN, this.maxCombo);
        }
    }

    private setupUI(): void {
        // 半透明の黒いUIバックグラウンドを追加してテキストの可読性を向上
        const topBarHeight = 60;
        const topBarBg = this.add.rectangle(
            this.cameras.main.width / 2,
            topBarHeight / 2,
            this.cameras.main.width,
            topBarHeight,
            0x000000,
            0.5
        );

        // UI要素にグラデーションエフェクトを追加
        const gradientBar = this.add.graphics();
        gradientBar.fillGradientStyle(0x0000ff, 0x0000ff, 0x000033, 0x000033, 1);
        gradientBar.fillRect(0, 0, this.cameras.main.width, 3);
        gradientBar.setY(topBarHeight);

        // Score text - より目立つスタイルに
        this.scoreText = this.add.text(20, 20, 'Score: 0', {
            font: 'bold 24px Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });

        // Combo text - より目立つスタイルに
        this.comboText = this.add.text(20, 50, 'Combo: x1', {
            font: '18px Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.comboText.setVisible(false);

        // Timer text - より目立つスタイルに
        this.timerText = this.add.text(
            this.cameras.main.width - 20,
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
        this.energyBar = this.add.graphics();
        this.updateEnergyBar();

        // Charge bar (初期状態では非表示)
        this.chargeBar = this.add.graphics();
        this.updateChargeBar();
    }

    private setupInput(): void {
        // スワイプ検出用の変数
        const swipeThreshold = 50; // スワイプとして認識する最小距離
        let swipeStartX = 0;
        let swipeStartY = 0;
        let isSwipeStart = false;

        // タッチ開始（ホールド開始またはスワイプ開始）
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // スワイプ検出用の初期位置を記録
            swipeStartX = pointer.x;
            swipeStartY = pointer.y;
            isSwipeStart = true;

            if (this.energy >= 20) { // 最小エネルギー要件
                this.isCharging = true;
                this.chargeStartTime = this.time.now;
                this.chargeAmount = 0;

                // ダッシュ方向の目標を保存
                this.dashTarget.x = pointer.x;
                this.dashTarget.y = pointer.y;

                // チャージバーの表示を開始
                this.updateChargeBar();
            }
        });

        // タッチ移動（ダッシュ方向の更新またはスワイプ検出）
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isCharging) {
                // ダッシュ方向の目標を更新
                this.dashTarget.x = pointer.x;
                this.dashTarget.y = pointer.y;
            }

            // スワイプ検出
            if (isSwipeStart && !this.isEvading) {
                const dx = pointer.x - swipeStartX;
                const dy = pointer.y - swipeStartY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // 十分な距離のスワイプが検出された場合
                if (distance > swipeThreshold) {
                    // スワイプの方向を計算
                    const angle = Math.atan2(dy, dx);

                    // スワイプによる回避アクションを実行
                    this.performEvade(angle);

                    // スワイプ検出をリセット
                    isSwipeStart = false;

                    // チャージ状態をキャンセル
                    if (this.isCharging) {
                        this.isCharging = false;
                        this.chargeAmount = 0;
                        this.updateChargeBar();
                    }
                }
            }
        });

        // タッチ終了（ダッシュ実行）
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.isCharging && this.energy >= 20) {
                // チャージ時間を計算
                const chargeDuration = Math.min(this.time.now - this.chargeStartTime, this.maxChargeDuration);
                const chargePercent = chargeDuration / this.maxChargeDuration;

                // ダッシュ方向の計算
                const dx = this.dashTarget.x - this.player.x;
                const dy = this.dashTarget.y - this.player.y;
                const angle = Math.atan2(dy, dx);

                // チャージに基づいたダッシュ速度
                const baseDashSpeed = 400;
                const maxExtraSpeed = 400; // チャージ最大時の追加速度
                let dashSpeed = baseDashSpeed + (maxExtraSpeed * chargePercent);

                // マルチダッシュ効果があればさらに速くなる
                if (this.hasMultiDash) {
                    dashSpeed *= 1.5;
                }

                // 消費エネルギー計算（チャージで増加）
                let baseEnergy = 20;
                let maxExtraEnergy = 30; // チャージ最大時の追加消費エネルギー

                // マルチダッシュ効果があればエネルギー消費半減
                if (this.hasMultiDash) {
                    baseEnergy = 10;
                    maxExtraEnergy = 15;
                }

                const energyCost = baseEnergy + Math.floor(maxExtraEnergy * chargePercent);

                // ダッシュ速度の適用
                this.player.setVelocity(
                    Math.cos(angle) * dashSpeed,
                    Math.sin(angle) * dashSpeed
                );

                // エネルギー消費
                this.energy = Math.max(0, this.energy - energyCost);
                this.updateEnergyBar();

                // 効果音
                this.dashSound.play();

                // ダッシュエフェクト（チャージで大きく）
                this.addDashEffect(angle, 1 + chargePercent);

                // チャージ状態リセット
                this.isCharging = false;
                this.chargeAmount = 0;
                this.updateChargeBar();
            }
        });
    }

    private setupSounds(): void {
        this.dashSound = this.sound.add('dash');
        this.explosionSound = this.sound.add('explosion');
        this.powerupSound = this.sound.add('powerup');
    }

    private spawnEnemy(): void {
        // 敵の出現位置を決定（画面外から）
        let x, y;
        const side = Phaser.Math.Between(0, 3);

        switch (side) {
            case 0: // Top
                x = Phaser.Math.Between(0, this.cameras.main.width);
                y = -20;
                break;
            case 1: // Right
                x = this.cameras.main.width + 20;
                y = Phaser.Math.Between(0, this.cameras.main.height);
                break;
            case 2: // Bottom
                x = Phaser.Math.Between(0, this.cameras.main.width);
                y = this.cameras.main.height + 20;
                break;
            case 3: // Left
                x = -20;
                y = Phaser.Math.Between(0, this.cameras.main.height);
                break;
            default:
                x = -20;
                y = -20;
        }

        // 敵のタイプをランダムに決定
        // ゲーム時間が経過するほど、強い敵が出現しやすくなる
        const enemyTypes = ['basic', 'armored', 'explosive'];
        let typeIndex: number;

        // 15秒以下は基本的な敵のみ
        if (this.gameTime > 45) {
            typeIndex = 0; // basic enemy only
        }
        // 15-30秒は基本的な敵と装甲敵
        else if (this.gameTime > 30) {
            typeIndex = Phaser.Math.Between(0, 1);
        }
        // 30秒以降は全ての敵タイプ
        else {
            typeIndex = Phaser.Math.Between(0, 2);
        }

        const enemyType = enemyTypes[typeIndex];

        // 敵の作成
        const enemy = this.enemies.create(x, y, `enemy-${enemyType}`);
        enemy.setData('type', enemyType);

        // 敵タイプに基づいて設定を変更
        switch (enemyType) {
            case 'basic':
                enemy.setData('health', 1);
                enemy.setData('speed', 50);
                enemy.setData('score', 10);
                break;
            case 'armored':
                enemy.setData('health', 3);
                enemy.setData('speed', 40); // 少し遅い
                enemy.setData('score', 30); // 多くのスコア
                // 装甲敵は少し大きめ
                ImageUtils.scaleToScreenPercent(enemy, 0.09);
                return; // 装甲敵はここで設定完了
            case 'explosive':
                enemy.setData('health', 1);
                enemy.setData('speed', 30); // より遅い
                enemy.setData('score', 20);
                enemy.setData('explosionRadius', 100); // 爆発半径
                // 爆発する敵は特殊な見た目
                enemy.setTint(0xff5500);
                ImageUtils.scaleToScreenPercent(enemy, 0.08);
                return; // 爆発する敵はここで設定完了
        }

        // 基本的な敵のサイズ調整（デフォルト）
        ImageUtils.scaleToScreenPercent(enemy, 0.08); // 画面幅の8%
    }

    private spawnPowerup(): void {
        const x = Phaser.Math.Between(50, this.cameras.main.width - 50);
        const y = Phaser.Math.Between(50, this.cameras.main.height - 50);

        const powerupTypes = ['shield', 'multidash', 'timeslow', 'combo'];
        const type = powerupTypes[Phaser.Math.Between(0, powerupTypes.length - 1)];

        const powerup = this.powerups.create(x, y, `powerup-${type}`);
        powerup.setData('type', type);

        // Apply responsive sizing to the powerup
        ImageUtils.scaleToScreenPercent(powerup, 0.06); // 6% of screen width

        // Add a tween to make the powerup more visible
        this.tweens.add({
            targets: powerup,
            scale: powerup.scale * 1.2, // Scale relative to the current scale
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    private handleEnemyCollision(player: Phaser.GameObjects.GameObject, enemy: Phaser.GameObjects.GameObject): void {
        // 回避中は当たり判定を無効化
        if (this.isEvading) return;

        const e = enemy as Phaser.Physics.Arcade.Sprite;
        const health = e.getData('health') as number;
        const enemyType = e.getData('type') as string;
        const score = e.getData('score') as number || 10; // デフォルトスコア

        if (this.player.body && this.player.body.velocity.length() > 100) {
            // プレイヤーがダッシュ中、敵にダメージ
            if (health > 1) {
                // 体力が残っている場合は減らすだけ
                e.setData('health', health - 1);

                // ダメージエフェクト
                e.setTint(0xff0000);
                this.time.delayedCall(100, () => {
                    if (e.active) {
                        e.clearTint();
                    }
                });
            } else {
                // 敵を倒した
                this.enemiesDefeated++;

                // 敵を倒すミッションの進捗を更新
                MissionManager.updateMissionProgress(MissionType.DEFEAT_ENEMIES, 1);

                // 爆発する敵の場合、周囲の敵にダメージ
                if (enemyType === 'explosive') {
                    this.createExplosion(e.x, e.y, e.getData('explosionRadius'));
                }

                // 敵を破壊
                e.destroy();

                // スコア追加
                this.increaseScore(score);

                // コンボ増加
                this.increaseCombo();

                // 爆発音再生
                this.explosionSound.play();

                // 爆発エフェクト
                this.addExplosionEffect(e.x, e.y);
            }
        } else {
            // プレイヤーがダッシュしていない、ダメージを受ける
            if (this.hasShield) {
                // シールドがあればダメージを受けずにシールド消失
                this.hasShield = false;

                // シールドエフェクトを探して削除
                this.powerupEffects.getAll().forEach((effect: Phaser.GameObjects.GameObject) => {
                    const effectContainer = effect as Phaser.GameObjects.Container;
                    if (effectContainer.getData('type') === 'shield') {
                        effectContainer.destroy();
                    }
                });

                // シールド破壊エフェクト
                const shieldBreak = this.add.circle(this.player.x, this.player.y, 50, 0x00aaff, 0.6);
                this.tweens.add({
                    targets: shieldBreak,
                    alpha: 0,
                    scale: 2,
                    duration: 300,
                    onComplete: () => {
                        shieldBreak.destroy();
                    }
                });
            } else {
                // プレイヤーがダメージを受けたエフェクト
                this.player.setTint(0xff0000); // プレイヤーを赤く点滅させる

                // カメラシェイク
                this.cameras.main.shake(300, 0.02);

                // プレイヤーのノックバック処理
                const knockbackAngle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
                this.player.setVelocity(
                    Math.cos(knockbackAngle) * 200,
                    Math.sin(knockbackAngle) * 200
                );

                // ゲームオーバー処理を呼び出す
                this.time.delayedCall(100, () => {
                    this.player.clearTint();

                    // 敵を全て削除（消えていくエフェクト付き）
                    this.enemies.getChildren().forEach((enemy: Phaser.GameObjects.GameObject) => {
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
                    this.powerups.clear(true, true);

                    // 少し遅延させてゲームオーバー画面を表示
                    this.time.delayedCall(500, () => {
                        this.endGame();
                    });
                });
            }
        }
    }

    private createExplosion(x: number, y: number, radius: number): void {
        // 爆発の範囲内にある敵を探して、ダメージを与える
        this.enemies.getChildren().forEach((enemy: Phaser.GameObjects.GameObject) => {
            const e = enemy as Phaser.Physics.Arcade.Sprite;

            // 爆発した敵自身は除外
            if (!e.active) return;

            // 敵と爆発地点の距離を計算
            const distance = Phaser.Math.Distance.Between(x, y, e.x, e.y);

            // 爆発範囲内なら
            if (distance <= radius) {
                // 距離に応じてダメージ量を決定（近いほど多いダメージ）
                const health = e.getData('health') as number;
                const damage = Math.max(1, Math.floor(3 * (1 - distance / radius)));

                if (health > damage) {
                    // ダメージを与える
                    e.setData('health', health - damage);

                    // ダメージエフェクト
                    e.setTint(0xff0000);
                    this.time.delayedCall(100, () => {
                        if (e.active) {
                            e.clearTint();
                        }
                    });
                } else {
                    // 敵を破壊
                    const score = e.getData('score') as number || 10;
                    this.increaseScore(score);
                    this.increaseCombo();
                    this.addExplosionEffect(e.x, e.y);
                    e.destroy();

                    // 敵を倒した数を増やす
                    this.enemiesDefeated++;

                    // 敵を倒すミッションの進捗を更新
                    MissionManager.updateMissionProgress(MissionType.DEFEAT_ENEMIES, 1);
                }
            }
        });

        // 爆発の視覚効果を追加
        const explosion = this.add.circle(x, y, radius, 0xff7700, 0.5);

        // 爆発を拡大して消滅
        this.tweens.add({
            targets: explosion,
            scale: 0.2,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                explosion.destroy();
            }
        });
    }

    private handlePowerupCollision(player: Phaser.GameObjects.GameObject, powerup: Phaser.GameObjects.GameObject): void {
        const p = powerup as Phaser.Physics.Arcade.Sprite;
        const type = p.getData('type') as string;

        // パワーアップを使用した数を増やす
        this.powerupsCollected++;

        // パワーアップ使用ミッションの進捗を更新
        MissionManager.updateMissionProgress(MissionType.USE_POWERUPS, 1);

        // パワーアップ効果を適用
        switch (type) {
            case 'shield':
                this.activateShield();
                break;
            case 'multidash':
                this.activateMultiDash();
                break;
            case 'timeslow':
                this.activateTimeSlow();
                break;
            case 'combo':
                this.activateComboBoost();
                break;
        }

        // 効果音再生
        this.powerupSound.play();

        // パワーアップ消去
        p.destroy();
    }

    private activateShield(): void {
        // シールド有効化
        this.hasShield = true;

        // シールドの視覚効果
        const shield = this.add.circle(0, 0, 40, 0x00aaff, 0.4);

        if (!this.powerupEffects) {
            this.powerupEffects = this.add.container(0, 0);
        }

        // プレイヤーに追従するシールドエフェクト
        const shieldEffect = this.add.container(this.player.x, this.player.y);
        shieldEffect.add(shield);
        shieldEffect.setData('type', 'shield');

        // パワーアップエフェクトコンテナに追加
        this.powerupEffects.add(shieldEffect);

        // 一定時間後に消える
        this.time.delayedCall(this.powerupDuration, () => {
            if (this.hasShield) {
                this.hasShield = false;
                shieldEffect.destroy();
            }
        });
    }

    /**
     * マルチダッシュパワーアップの有効化
     */
    private activateMultiDash(): void {
        this.hasMultiDash = true;

        // マルチダッシュの視覚効果（プレイヤーの周りに回転するエフェクト）
        const effectContainer = this.add.container(this.player.x, this.player.y);

        // 複数の粒子を作成
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 30;
            const particle = this.add.circle(
                Math.cos(angle) * distance,
                Math.sin(angle) * distance,
                5,
                0x00ff00,
                0.7
            );
            effectContainer.add(particle);
        }

        effectContainer.setData('type', 'multidash');
        this.powerupEffects.add(effectContainer);

        // 回転アニメーション
        this.tweens.add({
            targets: effectContainer,
            angle: 360,
            duration: 2000,
            repeat: this.powerupDuration / 2000
        });

        // 一定時間後に効果を解除
        this.time.delayedCall(this.powerupDuration, () => {
            this.hasMultiDash = false;
            effectContainer.destroy();
        });
    }

    /**
     * タイムスローパワーアップの有効化
     */
    private activateTimeSlow(): void {
        this.hasTimeSlow = true;

        // 敵の速度を遅くする
        this.enemySpeedMultiplier = 0.5;

        // 画面全体にエフェクト
        const overlay = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x0000ff,
            0.2
        );

        // フラッシュエフェクト
        this.tweens.add({
            targets: overlay,
            alpha: 0.1,
            duration: 1000,
            yoyo: true,
            repeat: this.powerupDuration / 2000 - 1
        });

        // 一定時間後に効果を解除
        this.time.delayedCall(this.powerupDuration, () => {
            this.hasTimeSlow = false;
            this.enemySpeedMultiplier = 1.0;
            overlay.destroy();
        });
    }

    /**
     * コンボブーストパワーアップの有効化
     */
    private activateComboBoost(): void {
        this.hasComboBoost = true;

        // 画面上部にコンボブーストの表示
        const boostText = this.add.text(
            this.cameras.main.width / 2,
            40,
            'コンボブースト!',
            {
                font: 'bold 24px Arial',
                color: '#ffff00'
            }
        );
        boostText.setOrigin(0.5, 0);

        // フラッシュエフェクト
        this.tweens.add({
            targets: boostText,
            alpha: 0.5,
            duration: 500,
            yoyo: true,
            repeat: this.powerupDuration / 1000 - 1
        });

        // 一定時間後に効果を解除
        this.time.delayedCall(this.powerupDuration, () => {
            this.hasComboBoost = false;
            boostText.destroy();
        });
    }

    /**
     * 回避アクションを実行する
     */
    private performEvade(angle: number): void {
        if (this.isEvading) return;

        this.isEvading = true;

        // 回避方向に瞬間的に移動
        const evadeDistance = 150;
        const targetX = this.player.x + Math.cos(angle) * evadeDistance;
        const targetY = this.player.y + Math.sin(angle) * evadeDistance;

        // 回避エフェクト
        if (this.evadeEffect) {
            this.evadeEffect.destroy();
        }

        this.evadeEffect = this.add.graphics();
        this.evadeEffect.lineStyle(3, 0x00ffff, 0.8);
        this.evadeEffect.lineBetween(this.player.x, this.player.y, targetX, targetY);

        // トレイルエフェクト
        const trail = this.add.graphics();
        trail.fillStyle(0x00ffff, 0.5);
        trail.fillCircle(this.player.x, this.player.y, 15);

        // プレイヤーの移動アニメーション
        this.tweens.add({
            targets: this.player,
            x: targetX,
            y: targetY,
            duration: this.evadeDuration,
            ease: 'Power2',
            onComplete: () => {
                this.time.delayedCall(200, () => {
                    this.isEvading = false;
                    if (this.evadeEffect) {
                        this.evadeEffect.destroy();
                        this.evadeEffect = null;
                    }
                });
            }
        });

        // トレイルのフェードアウト
        this.tweens.add({
            targets: trail,
            alpha: 0,
            duration: this.evadeDuration,
            onComplete: () => {
                trail.destroy();
            }
        });
    }

    /**
     * ダッシュエフェクトを追加
     */
    private addDashEffect(angle: number, scale: number = 1): void {
        // ダッシュの軌跡エフェクト
        const lineLength = 40 * scale;
        const dashLine = this.add.graphics();
        dashLine.lineStyle(3 * scale, 0xffffff, 0.7);

        const startX = this.player.x - Math.cos(angle) * lineLength;
        const startY = this.player.y - Math.sin(angle) * lineLength;

        dashLine.lineBetween(startX, startY, this.player.x, this.player.y);

        // ダッシュエフェクトのフェードアウト
        this.tweens.add({
            targets: dashLine,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                dashLine.destroy();
            }
        });
    }

    /**
     * 爆発エフェクトを追加
     */
    private addExplosionEffect(x: number, y: number): void {
        // 爆発の中心
        const explosion = this.add.circle(x, y, 20, 0xff7700, 0.8);

        // 飛び散る破片
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 30;
            const particle = this.add.circle(
                x + Math.cos(angle) * 5,
                y + Math.sin(angle) * 5,
                5,
                0xff5500,
                0.7
            );

            // 破片が飛び散るアニメーション
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    particle.destroy();
                }
            });
        }

        // 爆発のサイズ変更と消滅
        this.tweens.add({
            targets: explosion,
            scale: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                explosion.destroy();
            }
        });
    }

    /**
     * エネルギーバーを更新
     */
    private updateEnergyBar(): void {
        this.energyBar.clear();

        // 背景
        this.energyBar.fillStyle(0x222222, 0.8);
        this.energyBar.fillRect(20, 80, 150, 15);

        // エネルギー残量
        if (this.energy > 30) {
            this.energyBar.fillStyle(0x00ff00, 1);
        } else {
            this.energyBar.fillStyle(0xff0000, 1);
        }

        const width = Math.max(0, (this.energy / 100) * 150);
        this.energyBar.fillRect(20, 80, width, 15);
    }

    /**
     * チャージバーを更新
     */
    private updateChargeBar(): void {
        this.chargeBar.clear();

        if (this.isCharging && this.chargeAmount > 0) {
            // バーの位置（プレイヤーの下）
            const barX = this.player.x - 25;
            const barY = this.player.y + 30;
            const barWidth = 50;
            const barHeight = 5;

            // 背景
            this.chargeBar.fillStyle(0x000000, 0.5);
            this.chargeBar.fillRect(barX, barY, barWidth, barHeight);

            // チャージ量
            this.chargeBar.fillStyle(0xffff00, 0.8);
            const chargeWidth = this.chargeAmount * barWidth;
            this.chargeBar.fillRect(barX, barY, chargeWidth, barHeight);
        }
    }

    /**
     * タイマーを更新
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
            this.endGame();
        }
    }

    /**
     * スコアを増加
     */
    private increaseScore(amount: number): void {
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

        // スコア到達ミッションの進捗を更新
        MissionManager.updateMissionProgress(MissionType.REACH_SCORE, amount);

        // スコアポップアップエフェクト
        const popupText = this.add.text(
            this.player.x,
            this.player.y - 30,
            `+${amount}`,
            {
                font: '16px Arial',
                color: '#ffff00'
            }
        );
        popupText.setOrigin(0.5, 0.5);

        // ポップアップが上に浮いて消える
        this.tweens.add({
            targets: popupText,
            y: popupText.y - 40,
            alpha: 0,
            duration: 700,
            onComplete: () => {
                popupText.destroy();
            }
        });
    }

    /**
     * コンボを増加
     */
    private increaseCombo(): void {
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
            this.tweens.add({
                targets: this.comboText,
                scale: 1.3,
                duration: 100,
                yoyo: true
            });
        }
    }

    /**
     * ボス敵をスポーン
     */
    private spawnBoss(): void {
        // すでにボスが存在する場合は何もしない
        if (this.boss && this.boss.active) return;

        // ボスの出現位置（画面上部）
        const x = this.cameras.main.width / 2;
        const y = -50;

        // ボス作成
        this.boss = new EnemyBoss(this, x, y, this.player);

        // ボス出現アナウンス
        const bossText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'BOSS APPEARED!',
            {
                font: 'bold 40px Arial',
                color: '#ff0000'
            }
        );
        bossText.setOrigin(0.5, 0.5);

        // テキストアニメーション
        this.tweens.add({
            targets: bossText,
            scale: 1.5,
            duration: 500,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                bossText.destroy();
            }
        });

        // カメラシェイク
        this.cameras.main.shake(500, 0.01);
    }

    /**
     * ボス敵との衝突処理
     */
    private handleBossCollision(player: Phaser.GameObjects.GameObject, boss: Phaser.GameObjects.GameObject): void {
        // 回避中は当たり判定を無効化
        if (this.isEvading) return;

        if (this.player.body && this.player.body.velocity.length() > 100) {
            // プレイヤーがダッシュ中、ボスにダメージ
            this.boss?.takeDamage(1);

            // ノックバック
            const knockbackAngle = Phaser.Math.Angle.Between(this.boss!.x, this.boss!.y, this.player.x, this.player.y);
            this.player.setVelocity(
                Math.cos(knockbackAngle) * 300,
                Math.sin(knockbackAngle) * 300
            );

            // ボスが倒れたらミッション更新
            if (this.boss && this.boss.getData('health') <= 0) {
                MissionManager.updateMissionProgress(MissionType.DEFEAT_BOSS, 1);
            }
        } else {
            // プレイヤーダメージ処理（通常の敵と同様）
            if (this.hasShield) {
                this.hasShield = false;

                // シールドエフェクトを探して削除
                this.powerupEffects.getAll().forEach((effect: Phaser.GameObjects.GameObject) => {
                    const effectContainer = effect as Phaser.GameObjects.Container;
                    if (effectContainer.getData('type') === 'shield') {
                        effectContainer.destroy();
                    }
                });

                // シールド破壊エフェクト
                const shieldBreak = this.add.circle(this.player.x, this.player.y, 50, 0x00aaff, 0.6);
                this.tweens.add({
                    targets: shieldBreak,
                    alpha: 0,
                    scale: 2,
                    duration: 300,
                    onComplete: () => {
                        shieldBreak.destroy();
                    }
                });
            } else {
                // ゲームオーバー
                this.endGame();
            }
        }
    }

    /**
     * ボスの弾との衝突処理
     */
    private handleBossBulletCollision(player: Phaser.GameObjects.GameObject, bullet: Phaser.GameObjects.GameObject): void {
        // 回避中は当たり判定を無効化
        if (this.isEvading) return;

        // 弾を消す
        bullet.destroy();

        if (this.hasShield) {
            // シールドがあれば消費して無効化
            this.hasShield = false;

            // シールドエフェクトを探して削除
            this.powerupEffects.getAll().forEach((effect: Phaser.GameObjects.GameObject) => {
                const effectContainer = effect as Phaser.GameObjects.Container;
                if (effectContainer.getData('type') === 'shield') {
                    effectContainer.destroy();
                }
            });

            // シールド破壊エフェクト
            const shieldBreak = this.add.circle(this.player.x, this.player.y, 50, 0x00aaff, 0.6);
            this.tweens.add({
                targets: shieldBreak,
                alpha: 0,
                scale: 2,
                duration: 300,
                onComplete: () => {
                    shieldBreak.destroy();
                }
            });
        } else {
            // ゲームオーバー
            this.endGame();
        }
    }

    /**
     * ゲーム終了処理
     */
    private endGame(): void {
        // ゲームタイマーを停止
        this.gameTimer.remove();

        // 敵のスポーンを停止
        this.time.removeAllEvents();

        // 最終スコアを保存
        ScoreManager.updateHighScore(this.score);

        // リザルト表示
        const overlay = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        );

        const gameOverText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 3,
            'GAME OVER',
            {
                font: 'bold 48px Arial',
                color: '#ff0000'
            }
        );
        gameOverText.setOrigin(0.5, 0.5);

        const finalScoreText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            `SCORE: ${this.score}`,
            {
                font: 'bold 32px Arial',
                color: '#ffffff'
            }
        );
        finalScoreText.setOrigin(0.5, 0.5);

        // ミッション達成状況表示
        const missionResultText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 50,
            `敵を倒した数: ${this.enemiesDefeated}`,
            {
                font: '20px Arial',
                color: '#cccccc'
            }
        );
        missionResultText.setOrigin(0.5, 0.5);

        // メニューに戻るボタン
        const menuButton = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height * 0.7,
            200,
            50,
            0x444444
        );
        menuButton.setInteractive();

        const menuText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height * 0.7,
            'Back to Menu',
            {
                font: '24px Arial',
                color: '#ffffff'
            }
        );
        menuText.setOrigin(0.5, 0.5);

        menuButton.on('pointerdown', () => {
            this.scene.start('MainMenuScene');
        });
    }
}
