import Phaser from 'phaser';
import { ImageUtils } from '../utils/image-utils';
import { MissionManager, MissionType } from '../utils/mission-manager';
import { EffectFactory } from './effect-factory';

export interface PowerupConfig {
    scene: Phaser.Scene;
    player: Phaser.Physics.Arcade.Sprite;
    effectFactory: EffectFactory;
    powerupSound: Phaser.Sound.BaseSound;
    powerupEffects: Phaser.GameObjects.Container;
    duration?: number;
}

export class PowerupManager {
    private scene: Phaser.Scene;
    private player: Phaser.Physics.Arcade.Sprite;
    private powerups: Phaser.Physics.Arcade.Group;
    private effectFactory: EffectFactory;
    private powerupSound: Phaser.Sound.BaseSound;
    private powerupEffects: Phaser.GameObjects.Container;
    private powerupDuration: number;
    private powerupsCollected = 0;

    // パワーアップの状態
    private hasShield = false;
    private hasMultiDash = false;
    private hasTimeSlow = false;
    private hasComboBoost = false;

    // コールバック
    private onTimeSlow: (slowFactor: number) => void = () => {};
    private onComboBoost: (active: boolean) => void = () => {};
    private onShieldChange: (active: boolean) => void = () => {};
    private onMultiDashChange: (active: boolean) => void = () => {};

    constructor(config: PowerupConfig) {
        this.scene = config.scene;
        this.player = config.player;
        this.effectFactory = config.effectFactory;
        this.powerupSound = config.powerupSound;
        this.powerupEffects = config.powerupEffects;
        this.powerupDuration = config.duration || 10000; // デフォルト10秒

        // パワーアップグループの作成
        this.powerups = this.scene.physics.add.group();
    }

    /**
     * パワーアップグループを取得
     */
    getPowerups(): Phaser.Physics.Arcade.Group {
        return this.powerups;
    }

    /**
     * 収集したパワーアップの数を取得
     */
    getPowerupsCollectedCount(): number {
        return this.powerupsCollected;
    }

    /**
     * パワーアップ生成タイマーを開始
     */
    startSpawning(): void {
        this.scene.time.addEvent({
            delay: 10000, // 10秒ごと
            callback: this.spawnPowerup,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * パワーアップ生成
     */
    private spawnPowerup(): void {
        const x = Phaser.Math.Between(50, this.scene.cameras.main.width - 50);
        const y = Phaser.Math.Between(50, this.scene.cameras.main.height - 50);

        const powerupTypes = ['shield', 'multidash', 'timeslow', 'combo'];
        const type = powerupTypes[Phaser.Math.Between(0, powerupTypes.length - 1)];

        const powerup = this.powerups.create(x, y, `powerup-${type}`);
        powerup.setData('type', type);

        // Apply responsive sizing to the powerup
        ImageUtils.scaleToScreenPercent(powerup, 0.06); // 6% of screen width

        // Add a tween to make the powerup more visible
        this.scene.tweens.add({
            targets: powerup,
            scale: powerup.scale * 1.2, // Scale relative to the current scale
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    /**
     * パワーアップの衝突判定を設定
     */
    setupCollisions(): void {
        this.scene.physics.add.overlap(
            this.player,
            this.powerups,
            (player, powerup) => this.handlePowerupCollision(player as Phaser.GameObjects.GameObject, powerup as Phaser.GameObjects.GameObject),
            undefined,
            this
        );
    }

    /**
     * パワーアップの状態を設定するコールバック
     */
    setCallbacks(callbacks: {
        onTimeSlow?: (slowFactor: number) => void;
        onComboBoost?: (active: boolean) => void;
        onShieldChange?: (active: boolean) => void;
        onMultiDashChange?: (active: boolean) => void;
    }): void {
        if (callbacks.onTimeSlow) this.onTimeSlow = callbacks.onTimeSlow;
        if (callbacks.onComboBoost) this.onComboBoost = callbacks.onComboBoost;
        if (callbacks.onShieldChange) this.onShieldChange = callbacks.onShieldChange;
        if (callbacks.onMultiDashChange) this.onMultiDashChange = callbacks.onMultiDashChange;
    }

    /**
     * パワーアップとの衝突処理
     */
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

    /**
     * シールドパワーアップの有効化
     */
    private activateShield(): void {
        // シールド有効化
        this.hasShield = true;
        this.onShieldChange(true);

        // シールドの視覚効果
        const shield = this.scene.add.circle(0, 0, 40, 0x00aaff, 0.4);

        // プレイヤーに追従するシールドエフェクト
        const shieldEffect = this.scene.add.container(this.player.x, this.player.y);
        shieldEffect.add(shield);
        shieldEffect.setData('type', 'shield');

        // パワーアップエフェクトコンテナに追加
        this.powerupEffects.add(shieldEffect);

        // 一定時間後に消える
        this.scene.time.delayedCall(this.powerupDuration, () => {
            if (this.hasShield) {
                this.hasShield = false;
                this.onShieldChange(false);
                shieldEffect.destroy();
            }
        });
    }

    /**
     * マルチダッシュパワーアップの有効化
     */
    private activateMultiDash(): void {
        this.hasMultiDash = true;
        this.onMultiDashChange(true);

        // マルチダッシュの視覚効果（プレイヤーの周りに回転するエフェクト）
        const effectContainer = this.scene.add.container(this.player.x, this.player.y);

        // 複数の粒子を作成
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 30;
            const particle = this.scene.add.circle(
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
        this.scene.tweens.add({
            targets: effectContainer,
            angle: 360,
            duration: 2000,
            repeat: this.powerupDuration / 2000
        });

        // 一定時間後に効果を解除
        this.scene.time.delayedCall(this.powerupDuration, () => {
            this.hasMultiDash = false;
            this.onMultiDashChange(false);
            effectContainer.destroy();
        });
    }

    /**
     * タイムスローパワーアップの有効化
     */
    private activateTimeSlow(): void {
        this.hasTimeSlow = true;
        this.onTimeSlow(0.5); // 敵の速度を半分に

        // 画面全体にエフェクト
        const overlay = this.scene.add.rectangle(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0x0000ff,
            0.2
        );

        // フラッシュエフェクト
        this.scene.tweens.add({
            targets: overlay,
            alpha: 0.1,
            duration: 1000,
            yoyo: true,
            repeat: this.powerupDuration / 2000 - 1
        });

        // 一定時間後に効果を解除
        this.scene.time.delayedCall(this.powerupDuration, () => {
            this.hasTimeSlow = false;
            this.onTimeSlow(1.0); // 敵の速度を元に戻す
            overlay.destroy();
        });
    }

    /**
     * コンボブーストパワーアップの有効化
     */
    private activateComboBoost(): void {
        this.hasComboBoost = true;
        this.onComboBoost(true);

        // 画面上部にコンボブーストの表示
        const boostText = this.scene.add.text(
            this.scene.cameras.main.width / 2,
            40,
            'コンボブースト!',
            {
                font: 'bold 24px Arial',
                color: '#ffff00'
            }
        );
        boostText.setOrigin(0.5, 0);

        // フラッシュエフェクト
        this.scene.tweens.add({
            targets: boostText,
            alpha: 0.5,
            duration: 500,
            yoyo: true,
            repeat: this.powerupDuration / 1000 - 1
        });

        // 一定時間後に効果を解除
        this.scene.time.delayedCall(this.powerupDuration, () => {
            this.hasComboBoost = false;
            this.onComboBoost(false);
            boostText.destroy();
        });
    }

    /**
     * シールド状態を取得
     */
    hasActiveShield(): boolean {
        return this.hasShield;
    }

    /**
     * シールドを消費
     */
    consumeShield(): void {
        if (this.hasShield) {
            this.hasShield = false;
            this.onShieldChange(false);

            // シールドエフェクトを探して削除
            this.powerupEffects.getAll().forEach((effect: Phaser.GameObjects.GameObject) => {
                const effectContainer = effect as Phaser.GameObjects.Container;
                if (effectContainer.getData('type') === 'shield') {
                    effectContainer.destroy();
                }
            });

            // シールド破壊エフェクト
            this.effectFactory.createShieldBreakEffect(this.player.x, this.player.y);
        }
    }

    /**
     * コンボブースト状態を取得
     */
    hasActiveComboBoost(): boolean {
        return this.hasComboBoost;
    }

    /**
     * パワーアップエフェクトの位置を更新
     */
    update(): void {
        if (this.powerupEffects) {
            this.powerupEffects.getAll().forEach((effect: Phaser.GameObjects.GameObject) => {
                const effectContainer = effect as Phaser.GameObjects.Container;
                if (effectContainer.getData('type') === 'shield' ||
                    effectContainer.getData('type') === 'multidash') {
                    effectContainer.setPosition(this.player.x, this.player.y);
                }
            });
        }
    }
}
