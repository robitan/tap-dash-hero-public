import Phaser from 'phaser';
import { EnemyBoss } from '../entities/EnemyBoss';
import { ImageUtils } from '../utils/image-utils';
import { MissionManager, MissionType } from '../utils/mission-manager';
import { EffectFactory } from './effect-factory';

export interface EnemyManagerConfig {
    scene: Phaser.Scene;
    player: Phaser.Physics.Arcade.Sprite;
    effectFactory: EffectFactory;
    explosionSound: Phaser.Sound.BaseSound;
    onEnemyDefeated: (score: number) => void;
    onComboIncrease: () => void;
}

export class EnemyManager {
    private scene: Phaser.Scene;
    private player: Phaser.Physics.Arcade.Sprite;
    private enemies: Phaser.Physics.Arcade.Group;
    private boss: EnemyBoss | null = null;
    private bossSpawnTimer: Phaser.Time.TimerEvent | null = null;
    private effectFactory: EffectFactory;
    private explosionSound: Phaser.Sound.BaseSound;
    private enemySpeedMultiplier: number = 1.0;
    private enemiesDefeated: number = 0;
    private onEnemyDefeated: (score: number) => void;
    private onComboIncrease: () => void;

    constructor(config: EnemyManagerConfig) {
        this.scene = config.scene;
        this.player = config.player;
        this.effectFactory = config.effectFactory;
        this.explosionSound = config.explosionSound;
        this.onEnemyDefeated = config.onEnemyDefeated;
        this.onComboIncrease = config.onComboIncrease;

        // 敵グループの作成
        this.enemies = this.scene.physics.add.group();
    }

    /**
     * 敵グループを取得
     */
    getEnemies(): Phaser.Physics.Arcade.Group {
        return this.enemies;
    }

    /**
     * ボスを取得
     */
    getBoss(): EnemyBoss | null {
        return this.boss;
    }

    /**
     * 敵の速度倍率を設定
     */
    setEnemySpeedMultiplier(multiplier: number): void {
        this.enemySpeedMultiplier = multiplier;
    }

    /**
     * 撃破した敵の数を取得
     */
    getEnemiesDefeatedCount(): number {
        return this.enemiesDefeated;
    }

    /**
     * 敵のスポーンタイマーを開始
     */
    startSpawning(): void {
        // 敵のスポーン
        this.scene.time.addEvent({
            delay: 1000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // ボス敵のスポーン
        this.bossSpawnTimer = this.scene.time.addEvent({
            delay: 30000, // 30秒
            callback: this.spawnBoss,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * 敵の更新処理
     */
    update(): void {
        // 敵の移動更新
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

        // ボス敵の更新（存在する場合）
        if (this.boss && this.boss.active) {
            // ボスとプレイヤーの衝突をチェック
            this.scene.physics.overlap(
                this.player,
                this.boss,
                (player, boss) => this.handleBossCollision(player as Phaser.GameObjects.GameObject, boss as Phaser.GameObjects.GameObject),
                undefined,
                this
            );

            // ボスの弾とプレイヤーの衝突をチェック
            if (this.boss.getBullets()) {
                this.scene.physics.overlap(
                    this.player,
                    this.boss.getBullets(),
                    (player, bullet) => this.handleBossBulletCollision(player as Phaser.GameObjects.GameObject, bullet as Phaser.GameObjects.GameObject),
                    undefined,
                    this
                );
            }
        }
    }

    /**
     * 敵の衝突判定を設定
     */
    setupCollisions(
        onPlayerHit: (player: Phaser.GameObjects.GameObject, enemy: Phaser.GameObjects.GameObject) => void
    ): void {
        this.scene.physics.add.overlap(
            this.player,
            this.enemies,
            (player, enemy) => {
                this.handleEnemyCollision(player as Phaser.GameObjects.GameObject, enemy as Phaser.GameObjects.GameObject, onPlayerHit);
            },
            undefined,
            this
        );
    }

    /**
     * 敵を生成
     */
    private spawnEnemy(): void {
        // 敵の出現位置を決定（画面外から）
        let x, y;
        const side = Phaser.Math.Between(0, 3);

        switch (side) {
            case 0: // Top
                x = Phaser.Math.Between(0, this.scene.cameras.main.width);
                y = -20;
                break;
            case 1: // Right
                x = this.scene.cameras.main.width + 20;
                y = Phaser.Math.Between(0, this.scene.cameras.main.height);
                break;
            case 2: // Bottom
                x = Phaser.Math.Between(0, this.scene.cameras.main.width);
                y = this.scene.cameras.main.height + 20;
                break;
            case 3: // Left
                x = -20;
                y = Phaser.Math.Between(0, this.scene.cameras.main.height);
                break;
            default:
                x = -20;
                y = -20;
        }

        // ゲーム時間が取得できない場合は基本敵のみにする
        // このロジックは後でGameplaySceneから現在の時間を受け取るように修正が必要かもしれません
        const gameTime = 60; // デフォルト値（実際にはシーンから取得する必要がある）

        // 敵のタイプをランダムに決定
        // ゲーム時間が経過するほど、強い敵が出現しやすくなる
        const enemyTypes = ['basic', 'armored', 'explosive'];
        let typeIndex: number;

        // 15秒以下は基本的な敵のみ
        if (gameTime > 45) {
            typeIndex = 0; // basic enemy only
        }
        // 15-30秒は基本的な敵と装甲敵
        else if (gameTime > 30) {
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

    /**
     * ボス敵をスポーン
     */
    private spawnBoss(): void {
        // すでにボスが存在する場合は何もしない
        if (this.boss && this.boss.active) return;

        // ボスの出現位置（画面上部）
        const x = this.scene.cameras.main.width / 2;
        const y = -50;

        // ボス作成
        this.boss = new EnemyBoss(this.scene, x, y, this.player);

        // ボス出現アナウンス
        const bossText = this.scene.add.text(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2,
            'BOSS APPEARED!',
            {
                font: 'bold 40px Arial',
                color: '#ff0000'
            }
        );
        bossText.setOrigin(0.5, 0.5);

        // テキストアニメーション
        this.scene.tweens.add({
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
        this.scene.cameras.main.shake(500, 0.01);
    }

    /**
     * 敵との衝突処理
     */
    private handleEnemyCollision(
        player: Phaser.GameObjects.GameObject,
        enemy: Phaser.GameObjects.GameObject,
        onPlayerHit: (player: Phaser.GameObjects.GameObject, enemy: Phaser.GameObjects.GameObject) => void
    ): void {
        const playerSprite = player as Phaser.Physics.Arcade.Sprite;
        const e = enemy as Phaser.Physics.Arcade.Sprite;
        const health = e.getData('health') as number;
        const enemyType = e.getData('type') as string;
        const score = e.getData('score') as number || 10; // デフォルトスコア

        if (playerSprite.body && playerSprite.body.velocity.length() > 100) {
            // プレイヤーがダッシュ中、敵にダメージ
            if (health > 1) {
                // 体力が残っている場合は減らすだけ
                e.setData('health', health - 1);

                // ダメージエフェクト
                e.setTint(0xff0000);
                this.scene.time.delayedCall(100, () => {
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
                    this.effectFactory.createExplosion(
                        e.x,
                        e.y,
                        e.getData('explosionRadius') as number,
                        this.damageEnemy.bind(this),
                        this.enemies
                    );
                }

                // 敵を破壊
                e.destroy();

                // スコア追加
                this.onEnemyDefeated(score);

                // コンボ増加
                this.onComboIncrease();

                // 爆発音再生
                this.explosionSound.play();

                // 爆発エフェクト
                this.effectFactory.addExplosionEffect(e.x, e.y);
            }
        } else {
            // プレイヤーがダメージを受ける処理
            onPlayerHit(player, enemy);
        }
    }

    /**
     * 敵にダメージを与える
     */
    private damageEnemy(enemy: Phaser.Physics.Arcade.Sprite, damage: number): void {
        const health = enemy.getData('health') as number;

        if (health > damage) {
            // ダメージを与える
            enemy.setData('health', health - damage);

            // ダメージエフェクト
            enemy.setTint(0xff0000);
            this.scene.time.delayedCall(100, () => {
                if (enemy.active) {
                    enemy.clearTint();
                }
            });
        } else {
            // 敵を破壊
            const score = enemy.getData('score') as number || 10;
            this.onEnemyDefeated(score);
            this.onComboIncrease();
            this.effectFactory.addExplosionEffect(enemy.x, enemy.y);
            enemy.destroy();

            // 敵を倒した数を増やす
            this.enemiesDefeated++;

            // 敵を倒すミッションの進捗を更新
            MissionManager.updateMissionProgress(MissionType.DEFEAT_ENEMIES, 1);
        }
    }

    /**
     * ボスとの衝突処理
     */
    private handleBossCollision(player: Phaser.GameObjects.GameObject, boss: Phaser.GameObjects.GameObject): void {
        const playerSprite = player as Phaser.Physics.Arcade.Sprite;

        if (playerSprite.body && playerSprite.body.velocity.length() > 100) {
            // プレイヤーがダッシュ中、ボスにダメージ
            this.boss?.takeDamage(1);

            // ノックバック
            const knockbackAngle = Phaser.Math.Angle.Between(this.boss!.x, this.boss!.y, playerSprite.x, playerSprite.y);
            playerSprite.setVelocity(
                Math.cos(knockbackAngle) * 300,
                Math.sin(knockbackAngle) * 300
            );

            // ボスが倒れたらミッション更新
            if (this.boss && this.boss.getData('health') <= 0) {
                MissionManager.updateMissionProgress(MissionType.DEFEAT_BOSS, 1);
            }
        } else {
            // プレイヤーダメージ処理
            // この部分はGameplaySceneで処理するので実装しない
        }
    }

    /**
     * ボスの弾との衝突処理
     */
    private handleBossBulletCollision(player: Phaser.GameObjects.GameObject, bullet: Phaser.GameObjects.GameObject): void {
        // 弾を消す
        bullet.destroy();

        // プレイヤーダメージ処理
        // この部分はGameplaySceneで処理するので実装しない
    }
}
