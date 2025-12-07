import Phaser from 'phaser';
import { ImageUtils } from '../utils/image-utils';

export class TutorialScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TutorialScene' });
    }

    create(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // タイトル
        const title = this.add.text(width / 2, 60, '遊び方', {
            font: 'bold 28px Arial',
            color: '#ffffff'
        });
        title.setOrigin(0.5, 0.5);

        // スクロール可能なテキストコンテナを作成
        const content = this.createTutorialContent(width, height);

        // 戻るボタン
        const backButton = this.add.image(width / 2, height - 60, 'button');
        ImageUtils.scaleToScreenPercent(backButton, 0.4, 0.1); // 40% width, 10% height
        backButton.setInteractive();

        const backText = this.add.text(width / 2, height - 60, '戻る', {
            font: 'bold 20px Arial',
            color: '#000000'
        });
        backText.setOrigin(0.5, 0.5);

        // ボタンのイベント設定
        backButton.on('pointerdown', () => {
            this.scene.start('MainMenuScene');
        });

        backButton.on('pointerover', () => {
            backButton.setTint(0xcccccc);
        });

        backButton.on('pointerout', () => {
            backButton.clearTint();
        });
    }

    /**
     * チュートリアルの内容を作成する
     */
    private createTutorialContent(width: number, height: number): Phaser.GameObjects.Container {
        const container = this.add.container(0, 0);
        const contentY = 100;
        const contentHeight = height - 180; // タイトルと戻るボタンのスペースを除く
        const padding = 20;

        // 背景
        const bg = this.add.rectangle(width / 2, contentY + contentHeight / 2, width - padding * 2, contentHeight, 0x000000, 0.5);
        container.add(bg);

        // テキスト内容
        const sections = [
            {
                title: '基本操作',
                content: [
                    '・画面タップ: ヒーローがタップした方向へダッシュします',
                    '・長押し: 長く押すほど、より遠くへダッシュできます',
                    '・スワイプ: 特殊な攻撃や回避を発動します',
                ]
            },
            {
                title: 'ゲームの目的',
                content: [
                    '・敵を倒してスコアを獲得しましょう',
                    '・連続で敵を倒すとコンボが発生し、スコアが増加します',
                    '・1回のプレイは60～90秒です。できるだけ長く生き残りましょう',
                ]
            },
            {
                title: '敵の種類',
                content: [
                    '・通常の敵: 1回のダッシュで倒せます',
                    '・装甲敵: 複数回のダッシュが必要です',
                    '・爆発する敵: 倒すと周囲の敵も巻き込みます',
                    '・ボス敵: 特殊なパターンで攻撃する強敵です',
                ]
            },
            {
                title: 'パワーアップ',
                content: [
                    '・シールド: 一度だけダメージを無効化します',
                    '・マルチダッシュ: 一定時間、ダッシュ回数制限がなくなります',
                    '・タイムスロー: 敵の動きが遅くなります',
                    '・コンボブースター: コンボ倍率が増加します',
                ]
            },
            {
                title: 'エネルギー管理',
                content: [
                    '・ダッシュにはエネルギーを消費します',
                    '・エネルギーは時間とともに回復します',
                    '・エネルギーを使いすぎると無防備になるので注意しましょう',
                ]
            },
            {
                title: 'ミッション',
                content: [
                    '・日替わりのミッションをクリアするとボーナスが獲得できます',
                    '・ミッションの進捗はメイン画面で確認できます',
                ]
            }
        ];

        let yOffset = contentY + padding;

        // セクションごとにテキストを追加
        sections.forEach(section => {
            // セクションタイトル
            const titleText = this.add.text(width / 2, yOffset, section.title, {
                font: 'bold 20px Arial',
                color: '#ffff00'
            });
            titleText.setOrigin(0.5, 0);
            container.add(titleText);

            yOffset += 30;

            // セクション内容
            section.content.forEach(line => {
                const contentText = this.add.text(padding + 10, yOffset, line, {
                    font: '16px Arial',
                    color: '#ffffff',
                    wordWrap: { width: width - padding * 4 }
                });
                container.add(contentText);

                yOffset += contentText.height + 10;
            });

            yOffset += 15; // セクション間のスペース
        });

        return container;
    }
}
