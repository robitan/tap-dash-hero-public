import Phaser from 'phaser';
import { EffectFactory } from './effect-factory';

export interface PlayerControllerConfig {
    hasMultiDash: boolean;
    hasShield: boolean;
}

export class PlayerController {
    private scene: Phaser.Scene;
    private player: Phaser.Physics.Arcade.Sprite;
    private energy: number = 100;
    private energyBar: Phaser.GameObjects.Graphics;
    private effectFactory: EffectFactory;
    private dashSound: Phaser.Sound.BaseSound;

    // ダッシュ関連の変数
    private isCharging: boolean = false;
    private chargeStartTime: number = 0;
    private maxChargeDuration: number = 1000; // 最大チャージ時間（ミリ秒）
    private chargeAmount: number = 0;
    private dashTarget: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
    private chargeBar: Phaser.GameObjects.Graphics;

    // 回避関連の変数
    private isEvading: boolean = false;
    private evadeDuration: number = 300; // 回避の持続時間（ミリ秒）
    private evadeEffect: Phaser.GameObjects.Graphics | null = null;

    // パワーアップ状態
    private hasMultiDash: boolean = false;
    private hasShield: boolean = false;

    // ゲーム状態
    private isDisabled: boolean = false; // プレイヤー操作が無効化されているか

    constructor(
        scene: Phaser.Scene,
        player: Phaser.Physics.Arcade.Sprite,
        energyBar: Phaser.GameObjects.Graphics,
        chargeBar: Phaser.GameObjects.Graphics,
        effectFactory: EffectFactory,
        dashSound: Phaser.Sound.BaseSound
    ) {
        this.scene = scene;
        this.player = player;
        this.energyBar = energyBar;
        this.chargeBar = chargeBar;
        this.effectFactory = effectFactory;
        this.dashSound = dashSound;
    }

    /**
     * プレイヤーの位置を取得
     */
    getPosition(): { x: number, y: number } {
        return { x: this.player.x, y: this.player.y };
    }

    /**
     * プレイヤースプライトを取得
     */
    getSprite(): Phaser.Physics.Arcade.Sprite {
        return this.player;
    }

    /**
     * 回避状態を取得
     */
    isPlayerEvading(): boolean {
        return this.isEvading;
    }

    /**
     * パワーアップ状態を設定
     */
    setPowerupState(config: Partial<PlayerControllerConfig>): void {
        if (config.hasMultiDash !== undefined) {
            this.hasMultiDash = config.hasMultiDash;
        }
        if (config.hasShield !== undefined) {
            this.hasShield = config.hasShield;
        }
    }

    /**
     * シールド状態を取得
     */
    hasPlayerShield(): boolean {
        return this.hasShield;
    }

    /**
     * シールドを消費
     */
    consumeShield(): void {
        this.hasShield = false;
    }

    /**
     * 入力処理のセットアップ
     */
    setupInput(): void {
        // スワイプ検出用の変数
        const swipeThreshold = 50; // スワイプとして認識する最小距離
        let swipeStartX = 0;
        let swipeStartY = 0;
        let isSwipeStart = false;

        // タッチ開始（ホールド開始またはスワイプ開始）
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // 操作が無効化されていたら何もしない
            if (this.isDisabled) return;

            // スワイプ検出用の初期位置を記録
            swipeStartX = pointer.x;
            swipeStartY = pointer.y;
            isSwipeStart = true;

            if (this.energy >= 20) { // 最小エネルギー要件
                this.isCharging = true;
                this.chargeStartTime = this.scene.time.now;
                this.chargeAmount = 0;

                // ダッシュ方向の目標を保存
                this.dashTarget.x = pointer.x;
                this.dashTarget.y = pointer.y;

                // チャージバーの表示を開始
                this.updateChargeBar();
            }
        });

        // タッチ移動（ダッシュ方向の更新またはスワイプ検出）
        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            // 操作が無効化されていたら何もしない
            if (this.isDisabled) return;

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
        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            // 操作が無効化されていたら何もしない
            if (this.isDisabled) return;

            if (this.isCharging && this.energy >= 20) {
                // チャージ時間を計算
                const chargeDuration = Math.min(this.scene.time.now - this.chargeStartTime, this.maxChargeDuration);
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
                this.effectFactory.addDashEffect(this.player.x, this.player.y, angle, 1 + chargePercent);

                // チャージ状態リセット
                this.isCharging = false;
                this.chargeAmount = 0;
                this.updateChargeBar();
            }
        });
    }

    /**
     * 回避アクションを実行
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

        this.evadeEffect = this.scene.add.graphics();
        this.evadeEffect.lineStyle(3, 0x00ffff, 0.8);
        this.evadeEffect.lineBetween(this.player.x, this.player.y, targetX, targetY);

        // トレイルエフェクト
        const trail = this.scene.add.graphics();
        trail.fillStyle(0x00ffff, 0.5);
        trail.fillCircle(this.player.x, this.player.y, 15);

        // プレイヤーの移動アニメーション
        this.scene.tweens.add({
            targets: this.player,
            x: targetX,
            y: targetY,
            duration: this.evadeDuration,
            ease: 'Power2',
            onComplete: () => {
                this.scene.time.delayedCall(200, () => {
                    this.isEvading = false;
                    if (this.evadeEffect) {
                        this.evadeEffect.destroy();
                        this.evadeEffect = null;
                    }
                });
            }
        });

        // トレイルのフェードアウト
        this.scene.tweens.add({
            targets: trail,
            alpha: 0,
            duration: this.evadeDuration,
            onComplete: () => {
                trail.destroy();
            }
        });
    }

    /**
     * エネルギー回復処理
     */
    update(): void {
        // エネルギー回復
        if (this.energy < 100) {
            this.energy = Math.min(100, this.energy + 0.2);
            this.updateEnergyBar();
        }

        // チャージ処理の更新
        if (this.isCharging) {
            // チャージ量を更新
            const chargeDuration = Math.min(this.scene.time.now - this.chargeStartTime, this.maxChargeDuration);
            this.chargeAmount = chargeDuration / this.maxChargeDuration;
            this.updateChargeBar();
        }
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
     * プレイヤーにノックバックを適用
     */
    applyKnockback(sourceX: number, sourceY: number, strength: number = 200): void {
        const knockbackAngle = Phaser.Math.Angle.Between(sourceX, sourceY, this.player.x, this.player.y);
        this.player.setVelocity(
            Math.cos(knockbackAngle) * strength,
            Math.sin(knockbackAngle) * strength
        );
    }

    /**
     * プレイヤーにダメージエフェクトを適用
     */
    applyDamageEffect(): void {
        this.player.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            this.player.clearTint();
        });
    }

    /**
     * プレイヤー操作を無効化
     */
    disablePlayer(): void {
        this.isDisabled = true;

        // 進行中のチャージをキャンセル
        if (this.isCharging) {
            this.isCharging = false;
            this.chargeAmount = 0;
            this.updateChargeBar();
        }

        // 速度をゼロに設定
        this.player.setVelocity(0, 0);
    }

    /**
     * プレイヤー消滅エフェクトを適用して操作を無効化
     */
    applyDeathEffect(): void {
        // 操作を無効化
        this.disablePlayer();

        // 消滅エフェクト
        this.player.setTint(0xff0000);

        // パーティクルエフェクト作成
        const particles = this.scene.add.particles(0, 0, 'player', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.2, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            emitting: false
        });

        // プレイヤーの位置にパーティクルを配置
        particles.setPosition(this.player.x, this.player.y);

        // パーティクルを一度だけ発射
        particles.explode(30, this.player.x, this.player.y);

        // プレイヤーを徐々に透明にしながら縮小
        this.scene.tweens.add({
            targets: this.player,
            alpha: 0,
            scale: 0.1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // プレイヤーを非表示に
                this.player.setVisible(false);

                // パーティクルを少し待ってから削除
                this.scene.time.delayedCall(800, () => {
                    particles.destroy();
                });
            }
        });
    }
}
