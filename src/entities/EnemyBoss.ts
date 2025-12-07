import Phaser from 'phaser';
import { ImageUtils } from '../utils/image-utils';

/**
 * ボス敵の攻撃フェーズ
 */
export enum BossPhase {
    ENTRY,      // 登場フェーズ
    PHASE_ONE,  // 第1フェーズ - 弾発射
    PHASE_TWO,  // 第2フェーズ - 突進攻撃
    PHASE_THREE // 第3フェーズ - 全方位攻撃
}

/**
 * ボス敵の攻撃パターン
 */
export enum BossAttackPattern {
    SHOOT,            // 弾を発射
    DASH,             // 突進攻撃
    RADIAL_ATTACK,    // 全方位攻撃
    IDLE              // 待機
}

/**
 * ボス敵クラス
 * 複雑な攻撃パターンと状態遷移を持つ
 */
export class EnemyBoss extends Phaser.Physics.Arcade.Sprite {
    /**
     * ボスの最大体力
     */
    private maxHealth: number = 20;

    /**
     * 現在の体力
     */
    private health: number = 20;

    /**
     * 現在の攻撃フェーズ
     */
    private currentPhase: BossPhase = BossPhase.ENTRY;

    /**
     * 現在の攻撃パターン
     */
    private currentPattern: BossAttackPattern = BossAttackPattern.IDLE;

    /**
     * 弾のグループ
     */
    private bullets: Phaser.Physics.Arcade.Group;

    /**
     * 攻撃クールダウンタイマー
     */
    private attackCooldown: Phaser.Time.TimerEvent | null = null;

    /**
     * フェーズ変更タイマー
     */
    private phaseChangeTimer: Phaser.Time.TimerEvent | null = null;

    /**
     * HPバー表示用のグラフィック
     */
    private healthBar: Phaser.GameObjects.Graphics;

    /**
     * プレイヤー参照
     */
    private player: Phaser.Physics.Arcade.Sprite;

    /**
     * 最後に攻撃パターンを変更した時間
     */
    private lastPatternChangeTime: number = 0;

    /**
     * パターン持続時間
     */
    private patternDuration: number = 3000; // 3秒

    /**
     * 弾のサイズ（画面幅に対する割合）
     */
    private bulletSizePercent: number = 0.03; // 画面幅の3%

    /**
     * 弾の速度
     */
    private bulletSpeed: number = 200;

    /**
     * ダッシュ速度
     */
    private dashSpeed: number = 400;

    /**
     * ダッシュクールダウン
     */
    private dashCooldown: number = 2000; // 2秒

    /**
     * ボスのサイズ（画面幅に対する割合）
     */
    private static readonly BOSS_SIZE_PERCENT: number = 0.15; // 画面幅の15%

    /**
     * ボスの移動速度
     */
    private moveSpeed: number = 80;

    /**
     * ボスが受ける点滅エフェクトの持続時間
     */
    private hitEffectDuration: number = 200; // 0.2秒

    /**
     * 撃破時のスコア
     */
    private scoreValue: number = 500;

    /**
     * コンストラクタ
     * @param scene ゲームシーン
     * @param x X座標
     * @param y Y座標
     * @param player プレイヤーの参照
     */
    constructor(scene: Phaser.Scene, x: number, y: number, player: Phaser.Physics.Arcade.Sprite) {
        super(scene, x, y, 'enemy-boss');

        // シーンにスプライトを追加
        scene.add.existing(this);

        // 物理エンジンに追加
        scene.physics.add.existing(this);

        // プレイヤー参照を保存
        this.player = player;

        // サイズの設定
        ImageUtils.scaleToScreenPercent(this, EnemyBoss.BOSS_SIZE_PERCENT);

        // HPバーの作成
        this.healthBar = scene.add.graphics();
        this.updateHealthBar();

        // 弾のグループ作成
        this.bullets = scene.physics.add.group();

        // 当たり判定の設定
        this.setCollideWorldBounds(true);
        this.setBounce(1, 1);

        // データの設定（GameplaySceneとの互換性のため）
        this.setData('type', 'boss');
        this.setData('health', this.health);
        this.setData('score', this.scoreValue);

        // エントリーフェーズを開始
        this.startEntryPhase();
    }

    /**
     * 毎フレーム更新
     * @param time 経過時間
     * @param delta 前フレームからの経過時間
     */
    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);

        // HPバーの位置更新
        this.updateHealthBar();

        // 現在のフェーズとパターンに基づいて行動
        this.executeCurrentPattern(time);

        // パターン変更時期を確認
        if (time > this.lastPatternChangeTime + this.patternDuration) {
            this.changePattern();
            this.lastPatternChangeTime = time;
        }
    }

    /**
     * 現在のパターンを実行
     * @param time 現在時間
     */
    private executeCurrentPattern(time: number): void {
        switch (this.currentPattern) {
            case BossAttackPattern.SHOOT:
                this.executeShootPattern();
                break;

            case BossAttackPattern.DASH:
                this.executeDashPattern();
                break;

            case BossAttackPattern.RADIAL_ATTACK:
                this.executeRadialAttackPattern();
                break;

            case BossAttackPattern.IDLE:
                this.executeIdlePattern();
                break;
        }
    }

    /**
     * 現在のフェーズに基づいて攻撃パターンを変更
     */
    private changePattern(): void {
        switch (this.currentPhase) {
            case BossPhase.ENTRY:
                // エントリーフェーズでは基本的にはIdleのまま
                this.currentPattern = BossAttackPattern.IDLE;
                break;

            case BossPhase.PHASE_ONE:
                // 弾発射フェーズでは、SHOOTとIDLEを交互に
                if (this.currentPattern === BossAttackPattern.SHOOT) {
                    this.currentPattern = BossAttackPattern.IDLE;
                } else {
                    this.currentPattern = BossAttackPattern.SHOOT;
                }
                break;

            case BossPhase.PHASE_TWO:
                // 第2フェーズでは、DASH、SHOOT、IDLEをローテーション
                if (this.currentPattern === BossAttackPattern.DASH) {
                    this.currentPattern = BossAttackPattern.IDLE;
                } else if (this.currentPattern === BossAttackPattern.IDLE) {
                    if (Math.random() > 0.5) {
                        this.currentPattern = BossAttackPattern.SHOOT;
                    } else {
                        this.currentPattern = BossAttackPattern.DASH;
                    }
                } else {
                    this.currentPattern = BossAttackPattern.IDLE;
                }
                break;

            case BossPhase.PHASE_THREE:
                // 最終フェーズでは、全てのパターンを使用
                const patterns = [
                    BossAttackPattern.SHOOT,
                    BossAttackPattern.DASH,
                    BossAttackPattern.RADIAL_ATTACK,
                    BossAttackPattern.IDLE
                ];

                // 同じパターンを連続して使わないようにする
                let newPattern: BossAttackPattern;
                do {
                    const randomIndex = Math.floor(Math.random() * patterns.length);
                    newPattern = patterns[randomIndex];
                } while (newPattern === this.currentPattern);

                this.currentPattern = newPattern;
                break;
        }
    }

    /**
     * エントリーフェーズを開始
     */
    private startEntryPhase(): void {
        this.currentPhase = BossPhase.ENTRY;
        this.currentPattern = BossAttackPattern.IDLE;

        // 画面上部中央から登場
        const centerX = this.scene.cameras.main.width / 2;
        const startY = -this.height;

        this.setPosition(centerX, startY);

        // 画面中央上部まで移動
        const targetY = this.scene.cameras.main.height * 0.2;

        this.scene.tweens.add({
            targets: this,
            y: targetY,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                // 入場完了後、フェーズ1に移行
                this.startPhaseOne();
            }
        });

        // 入場エフェクト（省略可能）
        this.createEntryEffect();
    }

    /**
     * フェーズ1開始
     */
    private startPhaseOne(): void {
        this.currentPhase = BossPhase.PHASE_ONE;
        this.currentPattern = BossAttackPattern.IDLE;

        // フェーズ1のBGMや効果音を追加（省略可能）

        // 一定時間後にフェーズ2へ、またはHPが一定以下になったら移行
        this.phaseChangeTimer = this.scene.time.delayedCall(15000, () => {
            this.startPhaseTwo();
        });
    }

    /**
     * フェーズ2開始
     */
    private startPhaseTwo(): void {
        if (this.phaseChangeTimer) {
            this.phaseChangeTimer.remove();
        }

        this.currentPhase = BossPhase.PHASE_TWO;
        this.currentPattern = BossAttackPattern.IDLE;

        // フェーズ2のBGMや効果音を追加（省略可能）

        // 一定時間後またはHPが一定以下になったらフェーズ3へ
        this.phaseChangeTimer = this.scene.time.delayedCall(15000, () => {
            if (this.health <= this.maxHealth * 0.3) {
                this.startPhaseThree();
            }
        });
    }

    /**
     * フェーズ3開始（最終フェーズ）
     */
    private startPhaseThree(): void {
        if (this.phaseChangeTimer) {
            this.phaseChangeTimer.remove();
        }

        this.currentPhase = BossPhase.PHASE_THREE;
        this.currentPattern = BossAttackPattern.IDLE;

        // フェーズ3のBGMや効果音を追加（省略可能）
        // 最終フェーズのエフェクト（省略可能）
        // 例：ボスが赤く輝くなど
        this.setTint(0xff0000);

        // 移動速度と弾の速度を上げる
        this.moveSpeed = 120;
        this.bulletSpeed = 300;
    }

    /**
     * 待機パターン実行
     */
    private executeIdlePattern(): void {
        // プレイヤーからは距離を取りつつ、ゆっくり移動
        const dx = this.player.x - this.x;
        const dy = this.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 一定距離を保つ
        const targetDistance = 300;

        if (distance < targetDistance) {
            // プレイヤーから離れる
            this.setVelocity(-dx * 0.5, -dy * 0.5);
        } else {
            // ランダムに移動
            if (Math.random() < 0.05) {
                const angle = Math.random() * Math.PI * 2;
                this.setVelocity(
                    Math.cos(angle) * this.moveSpeed,
                    Math.sin(angle) * this.moveSpeed
                );
            }
        }
    }

    /**
     * 弾発射パターン実行
     */
    private executeShootPattern(): void {
        // 攻撃中は移動を遅くする
        if (this.body && this.body.velocity) {
            this.setVelocity(this.body.velocity.x * 0.95, this.body.velocity.y * 0.95);
        }

        // 一定間隔で弾を発射
        if (!this.attackCooldown || this.attackCooldown.getProgress() === 1) {
            this.shootBullets();

            // 次の攻撃までのクールダウン
            const cooldownTime = this.currentPhase === BossPhase.PHASE_THREE ? 500 : 1000;
            this.attackCooldown = this.scene.time.delayedCall(cooldownTime, () => {}, [], this);
        }
    }

    /**
     * 突進パターン実行
     */
    private executeDashPattern(): void {
        // 突進の準備中
        if (this.body && this.body.velocity && this.body.velocity.length() < this.dashSpeed * 0.5) {
            // プレイヤーの方を向く
            const dx = this.player.x - this.x;
            const dy = this.player.y - this.y;
            const angle = Math.atan2(dy, dx);

            // 突進前にチャージエフェクト
            if (!this.attackCooldown || this.attackCooldown.getProgress() === 1) {
                this.createDashChargeEffect();

                // チャージ完了後に突進
                this.attackCooldown = this.scene.time.delayedCall(1000, () => {
                    // 突進
                    this.setVelocity(
                        Math.cos(angle) * this.dashSpeed,
                        Math.sin(angle) * this.dashSpeed
                    );

                    // 突進エフェクト
                    this.createDashEffect();
                }, [], this);
            }
        }
    }

    /**
     * 全方位攻撃パターン実行（最終フェーズでのみ使用）
     */
    private executeRadialAttackPattern(): void {
        // 移動を止める
        this.setVelocity(0, 0);

        // 攻撃準備エフェクト
        if (!this.attackCooldown || this.attackCooldown.getProgress() === 1) {
            this.createRadialAttackChargeEffect();

            // チャージ完了後に全方位攻撃
            this.attackCooldown = this.scene.time.delayedCall(1500, () => {
                this.shootRadialBullets();
            }, [], this);
        }
    }

    /**
     * 複数方向に弾を発射
     */
    private shootBullets(): void {
        // プレイヤーの方向を計算
        const dx = this.player.x - this.x;
        const dy = this.player.y - this.y;
        const angle = Math.atan2(dy, dx);

        // フェーズによって弾の数を変更
        let bulletCount = 1;
        let spreadAngle = 0;

        if (this.currentPhase === BossPhase.PHASE_TWO) {
            bulletCount = 3;
            spreadAngle = Math.PI / 8; // 22.5度
        } else if (this.currentPhase === BossPhase.PHASE_THREE) {
            bulletCount = 5;
            spreadAngle = Math.PI / 6; // 30度
        }

        // 弾を発射
        for (let i = 0; i < bulletCount; i++) {
            // 角度の計算（奇数の場合は中央を基準に、偶数の場合は左右対称に）
            let bulletAngle = angle;
            if (bulletCount > 1) {
                const offset = (i - Math.floor(bulletCount / 2)) * spreadAngle;
                bulletAngle = angle + offset;
            }

            // 弾の作成
            const bullet = this.bullets.create(this.x, this.y, 'enemy-basic');
            bullet.setTint(0xff0000); // 赤い弾

            // 弾のサイズ設定
            ImageUtils.scaleToScreenPercent(bullet, this.bulletSizePercent);

            // 弾の速度設定
            bullet.setVelocity(
                Math.cos(bulletAngle) * this.bulletSpeed,
                Math.sin(bulletAngle) * this.bulletSpeed
            );

            // 弾のデータ設定
            bullet.setData('type', 'boss-bullet');
            bullet.setData('damage', 1);

            // 画面外に出たら自動削除
            bullet.setData('lifespan', 5000);
            this.scene.time.delayedCall(5000, () => {
                if (bullet.active) {
                    bullet.destroy();
                }
            });

            // 発射エフェクト
            this.createBulletFireEffect(bullet);
        }

        // 発射音（省略可能）
    }

    /**
     * 全方位に弾を発射
     */
    private shootRadialBullets(): void {
        const bulletCount = 12; // 30度間隔で12発
        const angleStep = (Math.PI * 2) / bulletCount;

        for (let i = 0; i < bulletCount; i++) {
            const angle = i * angleStep;

            // 弾の作成
            const bullet = this.bullets.create(this.x, this.y, 'enemy-basic');
            bullet.setTint(0xff3300); // オレンジの弾

            // 弾のサイズ設定
            ImageUtils.scaleToScreenPercent(bullet, this.bulletSizePercent * 1.5); // 通常より大きい

            // 弾の速度設定
            bullet.setVelocity(
                Math.cos(angle) * this.bulletSpeed * 0.7, // 少し遅め
                Math.sin(angle) * this.bulletSpeed * 0.7
            );

            // 弾のデータ設定
            bullet.setData('type', 'boss-bullet-radial');
            bullet.setData('damage', 1);

            // 画面外に出たら自動削除
            bullet.setData('lifespan', 5000);
            this.scene.time.delayedCall(5000, () => {
                if (bullet.active) {
                    bullet.destroy();
                }
            });

            // 発射エフェクト
            this.createBulletFireEffect(bullet);
        }

        // 全方位攻撃の発射エフェクト
        this.createRadialAttackFireEffect();
    }

    /**
     * ダメージを受ける
     * @param amount ダメージ量
     * @returns 生存しているか
     */
    takeDamage(amount: number): boolean {
        // ダメージを適用
        this.health = Math.max(0, this.health - amount);
        this.setData('health', this.health);

        // ダメージエフェクト
        this.setTint(0xff0000);
        this.scene.time.delayedCall(this.hitEffectDuration, () => {
            this.clearTint();
        });

        // HPバー更新
        this.updateHealthBar();

        // HPに応じたフェーズ変更
        const healthPercent = this.health / this.maxHealth;

        if (healthPercent <= 0.3 && this.currentPhase !== BossPhase.PHASE_THREE) {
            this.startPhaseThree();
        } else if (healthPercent <= 0.6 && this.currentPhase === BossPhase.PHASE_ONE) {
            this.startPhaseTwo();
        }

        // 撃破判定
        if (this.health <= 0) {
            this.onDefeat();
            return false;
        }

        return true;
    }

    /**
     * ボス撃破時の処理
     */
    private onDefeat(): void {
        // 弾を全て消す
        this.bullets.clear(true, true);

        // HPバーを消す
        if (this.healthBar) {
            this.healthBar.destroy();
        }

        // 撃破エフェクト
        this.createDefeatEffect();

        // 報酬ドロップ（実装例）
        this.dropRewards();

        // スコア加算は呼び出し側（GameplayScene）で処理

        // 自身を削除
        this.destroy();
    }

    /**
     * 報酬をドロップ
     */
    private dropRewards(): void {
        // 複数のパワーアップをドロップするなどの処理
        // この実装は、GameplaySceneで行うことを想定
    }

    /**
     * HPバーの更新
     */
    private updateHealthBar(): void {
        if (!this.healthBar) return;

        this.healthBar.clear();

        // バーの位置
        const barX = this.x - 50;
        const barY = this.y - 60;
        const barWidth = 100;
        const barHeight = 10;

        // 背景（黒）
        this.healthBar.fillStyle(0x000000, 0.7);
        this.healthBar.fillRect(barX, barY, barWidth, barHeight);

        // 体力に応じた色
        const healthPercent = this.health / this.maxHealth;
        let barColor = 0x00ff00; // 緑

        if (healthPercent < 0.3) {
            barColor = 0xff0000; // 赤
        } else if (healthPercent < 0.6) {
            barColor = 0xffff00; // 黄
        }

        // 残り体力
        this.healthBar.fillStyle(barColor, 1);
        this.healthBar.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }

    /**
     * 弾のグループを取得
     */
    getBullets(): Phaser.Physics.Arcade.Group {
        return this.bullets;
    }

    /**
     * 登場エフェクトの作成
     */
    private createEntryEffect(): void {
        // ボスの周りに光のエフェクト
        const glow = this.scene.add.circle(this.x, this.y, 100, 0xffff00, 0.5);

        this.scene.tweens.add({
            targets: glow,
            alpha: 0,
            scale: 2,
            duration: 1000,
            onComplete: () => {
                glow.destroy();
            }
        });
    }

    /**
     * 弾発射エフェクトの作成
     */
    private createBulletFireEffect(bullet: Phaser.Physics.Arcade.Sprite): void {
        // 弾の発射時の光のエフェクト
        const flash = this.scene.add.circle(bullet.x, bullet.y, 15, 0xffff00, 0.8);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 0,
            duration: 200,
            onComplete: () => {
                flash.destroy();
            }
        });
    }

    /**
     * ダッシュ充電エフェクトの作成
     */
    private createDashChargeEffect(): void {
        // ボスの周りにエネルギー充填エフェクト
        const energyCircle = this.scene.add.circle(this.x, this.y, 50, 0x00ffff, 0.5);

        this.scene.tweens.add({
            targets: energyCircle,
            scale: 0.5,
            alpha: 0.8,
            duration: 1000,
            yoyo: true,
            onComplete: () => {
                energyCircle.destroy();
            }
        });
    }

    /**
     * ダッシュエフェクトの作成
     */
    private createDashEffect(): void {
        // ダッシュ時の軌跡エフェクト
        const trail = this.scene.add.rectangle(this.x, this.y, 100, 20, 0x00ffff, 0.7);
        trail.setOrigin(0.5);

        // ダッシュ方向に合わせて回転
        const velocity = this.body?.velocity;
        const angle = velocity ? Math.atan2(velocity.y, velocity.x) : 0;
        trail.setRotation(angle);

        this.scene.tweens.add({
            targets: trail,
            alpha: 0,
            scale: 2,
            duration: 500,
            onComplete: () => {
                trail.destroy();
            }
        });
    }

    /**
     * 全方位攻撃充電エフェクトの作成
     */
    private createRadialAttackChargeEffect(): void {
        // ボスの周りに拡大する円エフェクト
        const energyCircle = this.scene.add.circle(this.x, this.y, 30, 0xff3300, 0.5);

        this.scene.tweens.add({
            targets: energyCircle,
            scale: 3,
            alpha: 0.2,
            duration: 1500,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                energyCircle.destroy();
            }
        });
    }

    /**
     * 全方位攻撃発射エフェクトの作成
     */
    private createRadialAttackFireEffect(): void {
        // 全方位に広がる衝撃波エフェクト
        const shockwave = this.scene.add.circle(this.x, this.y, 30, 0xff3300, 0.8);

        this.scene.tweens.add({
            targets: shockwave,
            scale: 5,
            alpha: 0,
            duration: 800,
            ease: 'Expo.easeOut',
            onComplete: () => {
                shockwave.destroy();
            }
        });
    }

    /**
     * 撃破エフェクトの作成
     */
    private createDefeatEffect(): void {
        // 複数の爆発エフェクト
        for (let i = 0; i < 8; i++) {
            // ランダムな位置にずらした爆発
            const offsetX = (Math.random() - 0.5) * this.width * 0.8;
            const offsetY = (Math.random() - 0.5) * this.height * 0.8;

            const explosionDelay = i * 200; // 連続爆発

            this.scene.time.delayedCall(explosionDelay, () => {
                // 爆発の中心
                const explosion = this.scene.add.circle(
                    this.x + offsetX,
                    this.y + offsetY,
                    30,
                    0xffcc00,
                    0.9
                );

                // 爆発アニメーション
                this.scene.tweens.add({
                    targets: explosion,
                    scale: 3,
                    alpha: 0,
                    duration: 800,
                    onComplete: () => {
                        explosion.destroy();
                    }
                });

                // 破片エフェクト
                for (let j = 0; j < 6; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 100 + Math.random() * 100;
                    const distance = 20 + Math.random() * 50;

                    const particle = this.scene.add.circle(
                        this.x + offsetX,
                        this.y + offsetY,
                        3,
                        0xffaa00,
                        0.8
                    );

                    // 破片が飛び散るアニメーション
                    this.scene.tweens.add({
                        targets: particle,
                        x: particle.x + Math.cos(angle) * distance,
                        y: particle.y + Math.sin(angle) * distance,
                        scale: 0.1,
                        alpha: 0,
                        duration: 600,
                        onComplete: () => {
                            particle.destroy();
                        }
                    });
                }
            });
        }
    }
}
