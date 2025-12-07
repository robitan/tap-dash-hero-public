import localforage from 'localforage';

/**
 * ハイスコア管理用ユーティリティ
 */
export class ScoreManager {
    private static readonly HIGH_SCORE_KEY = 'highScore';

    /**
     * 現在保存されているハイスコアを取得する
     * @returns ハイスコア（存在しない場合は0）
     */
    public static async getHighScore(): Promise<number> {
        try {
            const highScore = await localforage.getItem<number>(this.HIGH_SCORE_KEY);
            return highScore ?? 0;
        } catch (error) {
            console.error('ハイスコア取得エラー:', error);
            return 0;
        }
    }

    /**
     * ハイスコアを設定する
     * @param score 保存するスコア
     */
    public static async setHighScore(score: number): Promise<void> {
        try {
            await localforage.setItem(this.HIGH_SCORE_KEY, score);
        } catch (error) {
            console.error('ハイスコア保存エラー:', error);
        }
    }

    /**
     * 現在のスコアが保存されているハイスコアより高い場合、ハイスコアを更新する
     * @param currentScore 現在のスコア
     * @returns 更新されたかどうか
     */
    public static async updateHighScore(currentScore: number): Promise<boolean> {
        try {
            const highScore = await this.getHighScore();
            if (currentScore > highScore) {
                await this.setHighScore(currentScore);
                return true;
            }
            return false;
        } catch (error) {
            console.error('ハイスコア更新エラー:', error);
            return false;
        }
    }
}
