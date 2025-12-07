import Phaser from 'phaser';

/**
 * ゲーム内のビジュアルエフェクトを作成・管理するクラス
 */
export class EffectFactory {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * 星空背景を作成
     */
    createStarfield(): void {
        // 異なる大きさと透明度の星を作成
        const starCount = 100;

        for (let i = 0; i < starCount; i++) {
            const x = Phaser.Math.Between(0, this.scene.cameras.main.width);
            const y = Phaser.Math.Between(0, this.scene.cameras.main.height);
            const size = Phaser.Math.Between(1, 3);
            const alpha = 0.3 + Math.random() * 0.7;

            const star = this.scene.add.circle(x, y, size, 0xffffff, alpha);

            // 星の瞬きエフェクト
            this.scene.tweens.add({
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
     * ダッシュエフェクトを追加
     */
    addDashEffect(x: number, y: number, angle: number, scale: number = 1): void {
        // ダッシュの軌跡エフェクト
        const lineLength = 40 * scale;
        const dashLine = this.scene.add.graphics();
        dashLine.lineStyle(3 * scale, 0xffffff, 0.7);

        const startX = x - Math.cos(angle) * lineLength;
        const startY = y - Math.sin(angle) * lineLength;

        dashLine.lineBetween(startX, startY, x, y);

        // ダッシュエフェクトのフェードアウト
        this.scene.tweens.add({
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
    addExplosionEffect(x: number, y: number): void {
        // 爆発の中心
        const explosion = this.scene.add.circle(x, y, 20, 0xff7700, 0.8);

        // 飛び散る破片
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 30;
            const particle = this.scene.add.circle(
                x + Math.cos(angle) * 5,
                y + Math.sin(angle) * 5,
                5,
                0xff5500,
                0.7
            );

            // 破片が飛び散るアニメーション
            this.scene.tweens.add({
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
        this.scene.tweens.add({
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
     * 爆発を作成
     */
    createExplosion(x: number, y: number, radius: number, onEnemyDamage: (enemy: Phaser.Physics.Arcade.Sprite, damage: number) => void, enemies: Phaser.Physics.Arcade.Group): void {
        // 爆発の範囲内にある敵を探して、ダメージを与える
        enemies.getChildren().forEach((enemy: Phaser.GameObjects.GameObject) => {
            const e = enemy as Phaser.Physics.Arcade.Sprite;

            // 爆発した敵自身は除外
            if (!e.active) return;

            // 敵と爆発地点の距離を計算
            const distance = Phaser.Math.Distance.Between(x, y, e.x, e.y);

            // 爆発範囲内なら
            if (distance <= radius) {
                // 距離に応じてダメージ量を決定（近いほど多いダメージ）
                const damage = Math.max(1, Math.floor(3 * (1 - distance / radius)));
                onEnemyDamage(e, damage);
            }
        });

        // 爆発の視覚効果を追加
        const explosion = this.scene.add.circle(x, y, radius, 0xff7700, 0.5);

        // 爆発を拡大して消滅
        this.scene.tweens.add({
            targets: explosion,
            scale: 0.2,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                explosion.destroy();
            }
        });
    }

    /**
     * シールド破壊エフェクト
     */
    createShieldBreakEffect(x: number, y: number): void {
        const shieldBreak = this.scene.add.circle(x, y, 50, 0x00aaff, 0.6);
        this.scene.tweens.add({
            targets: shieldBreak,
            alpha: 0,
            scale: 2,
            duration: 300,
            onComplete: () => {
                shieldBreak.destroy();
            }
        });
    }
}
