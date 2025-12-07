import localforage from 'localforage';

/**
 * ミッションの種類の定義
 */
export enum MissionType {
    DEFEAT_ENEMIES = 'defeat_enemies', // 敵を倒す
    DEFEAT_BOSS = 'defeat_boss', // ボスを倒す
    REACH_SCORE = 'reach_score', // スコア到達
    USE_POWERUPS = 'use_powerups', // パワーアップを使用
    COMBO_CHAIN = 'combo_chain' // コンボを繋げる
}

/**
 * ミッションの状態
 */
export interface Mission {
    id: string;
    type: MissionType;
    target: number;
    progress: number;
    completed: boolean;
    description: string;
    reward: string;
}

/**
 * ミッション管理クラス
 */
export class MissionManager {
    private static readonly MISSION_KEY = 'currentMission';
    private static readonly COMPLETED_MISSIONS_KEY = 'completedMissions';

    /**
     * 日替わりミッションのリスト
     */
    private static readonly DAILY_MISSIONS: Omit<Mission, 'progress' | 'completed'>[] = [
        {
            id: 'mission1',
            type: MissionType.DEFEAT_ENEMIES,
            target: 50,
            description: '敵を50体倒す',
            reward: 'ボーナススコア +1000'
        },
        {
            id: 'mission2',
            type: MissionType.REACH_SCORE,
            target: 5000,
            description: 'スコア5000を達成する',
            reward: '次のゲームで敵の速度-10%'
        },
        {
            id: 'mission3',
            type: MissionType.COMBO_CHAIN,
            target: 10,
            description: '10連続コンボを達成する',
            reward: '次のゲームでコンボ効果+20%'
        },
        {
            id: 'mission4',
            type: MissionType.DEFEAT_BOSS,
            target: 1,
            description: 'ボスを倒す',
            reward: '次のゲームでスタート時にシールド獲得'
        },
        {
            id: 'mission5',
            type: MissionType.USE_POWERUPS,
            target: 5,
            description: 'パワーアップを5個使用する',
            reward: '次のゲームでパワーアップ効果+50%'
        }
    ];

    /**
     * 現在のミッションを取得する
     * @returns 現在のミッション
     */
    public static async getCurrentMission(): Promise<Mission | null> {
        try {
            let mission = await localforage.getItem<Mission>(this.MISSION_KEY);

            // ミッションがなければ新しいミッションを生成
            if (!mission) {
                mission = await this.generateNewMission();
            }

            return mission;
        } catch (error) {
            console.error('ミッション取得エラー:', error);
            return null;
        }
    }

    /**
     * ミッションの進捗を更新する
     * @param type ミッションタイプ
     * @param amount 増加量
     * @returns 更新されたミッション
     */
    public static async updateMissionProgress(type: MissionType, amount: number = 1): Promise<Mission | null> {
        try {
            const mission = await this.getCurrentMission();
            if (!mission || mission.type !== type || mission.completed) {
                return mission;
            }

            // 進捗を更新
            mission.progress = Math.min(mission.target, mission.progress + amount);

            // 達成判定
            if (mission.progress >= mission.target) {
                mission.completed = true;
                await this.addCompletedMission(mission.id);
            }

            // 保存
            await localforage.setItem(this.MISSION_KEY, mission);
            return mission;
        } catch (error) {
            console.error('ミッション更新エラー:', error);
            return null;
        }
    }

    /**
     * 新しいミッションを生成する
     * @returns 新しいミッション
     */
    public static async generateNewMission(): Promise<Mission> {
        try {
            // 達成済みミッションIDのリストを取得
            const completedMissions = await this.getCompletedMissions();

            // 未達成のミッションからランダムに選択
            const availableMissions = this.DAILY_MISSIONS.filter(m => !completedMissions.includes(m.id));

            // すべてのミッションが達成済みの場合はリセット
            const missionBase = availableMissions.length > 0
                ? availableMissions[Math.floor(Math.random() * availableMissions.length)]
                : this.DAILY_MISSIONS[Math.floor(Math.random() * this.DAILY_MISSIONS.length)];

            // 新しいミッションを作成
            const newMission: Mission = {
                ...missionBase,
                progress: 0,
                completed: false
            };

            // 保存
            await localforage.setItem(this.MISSION_KEY, newMission);
            return newMission;
        } catch (error) {
            console.error('ミッション生成エラー:', error);
            // エラー時はデフォルトミッションを返す
            const defaultMission: Mission = {
                id: 'default',
                type: MissionType.DEFEAT_ENEMIES,
                target: 50,
                progress: 0,
                completed: false,
                description: '敵を50体倒す',
                reward: 'ボーナススコア +1000'
            };
            return defaultMission;
        }
    }

    /**
     * 完了したミッションを記録する
     * @param missionId ミッションID
     */
    private static async addCompletedMission(missionId: string): Promise<void> {
        try {
            const completedMissions = await this.getCompletedMissions();
            if (!completedMissions.includes(missionId)) {
                completedMissions.push(missionId);
                await localforage.setItem(this.COMPLETED_MISSIONS_KEY, completedMissions);
            }
        } catch (error) {
            console.error('達成済みミッション記録エラー:', error);
        }
    }

    /**
     * 達成済みミッションIDリストを取得する
     * @returns 達成済みミッションIDリスト
     */
    private static async getCompletedMissions(): Promise<string[]> {
        try {
            const completedMissions = await localforage.getItem<string[]>(this.COMPLETED_MISSIONS_KEY);
            return completedMissions || [];
        } catch (error) {
            console.error('達成済みミッション取得エラー:', error);
            return [];
        }
    }

    /**
     * ミッション達成報酬を適用する
     * @param mission 達成したミッション
     * @returns 適用結果メッセージ
     */
    public static applyMissionReward(mission: Mission): string {
        if (!mission.completed) {
            return 'ミッションが達成されていません';
        }

        let resultMessage = '';

        // ミッションタイプに応じた報酬の適用
        switch (mission.id) {
            case 'mission1': // 敵を50体倒す
                // ボーナススコア +1000 (ゲームシーンで適用)
                resultMessage = 'ボーナススコア +1000 が適用されました！';
                break;
            case 'mission2': // スコア5000達成
                // 敵の速度減少効果 (ゲームシーンで適用)
                resultMessage = '次回のゲームで敵の速度が減少します！';
                break;
            case 'mission3': // 10連続コンボ達成
                // コンボ効果増加 (ゲームシーンで適用)
                resultMessage = '次回のゲームでコンボ効果が増加します！';
                break;
            case 'mission4': // ボスを倒す
                // スタート時にシールド獲得 (ゲームシーンで適用)
                resultMessage = '次回のゲームでスタート時にシールドを獲得します！';
                break;
            case 'mission5': // パワーアップを5個使用
                // パワーアップ効果増加 (ゲームシーンで適用)
                resultMessage = '次回のゲームでパワーアップ効果が増加します！';
                break;
            default:
                resultMessage = '報酬が適用されました！';
                break;
        }

        return resultMessage;
    }

    /**
     * 全てのミッションをリセットする（開発用）
     */
    public static async resetAllMissions(): Promise<void> {
        try {
            await localforage.removeItem(this.MISSION_KEY);
            await localforage.removeItem(this.COMPLETED_MISSIONS_KEY);
            console.log('全ミッションがリセットされました');
        } catch (error) {
            console.error('ミッションリセットエラー:', error);
        }
    }
}
