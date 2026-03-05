import { MANGAN_OR_HIGHER } from "./mahjongScores";

export const STARTING_SCORE_3P = 35000;
export const STARTING_SCORE_4P = 25000;
export const TOTAL_GAME_SCORE_3P = 105000;
export const TOTAL_GAME_SCORE_4P = 100000;

export const PLAYER_COUNT_OPTIONS = [3, 4];
export const DEFAULT_PLAYER_COUNT = 3;

export const TSUMIBO_OPTIONS_MAP: Record<number, number[]> = {
  3: [200, 300,1000],
  4: [300,1000]
};
export const DEFAULT_TSUMIBO = 300; // Will be refined by player count logic anyway

export const HAN_OPTIONS = [1, 2, 3, 4];
export const FU_OPTIONS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];

export const RYUUKYOKU_TOTAL_POINTS_MAP: Record<number, number> = {
  3: 2000,
  4: 3000
};

export const LIMIT_HANDS = [
  { id: MANGAN_OR_HIGHER.MANGAN, label: "満貫" },
  { id: MANGAN_OR_HIGHER.HANEMAN, label: "跳満" },
  { id: MANGAN_OR_HIGHER.BAIMAN, label: "倍満" },
  { id: MANGAN_OR_HIGHER.SANBAIMAN, label: "三倍満" },
  { id: MANGAN_OR_HIGHER.YAKUMAN, label: "役満" },
  { id: MANGAN_OR_HIGHER.DOUBLE_YAKUMAN, label: "二倍役満" },
  { id: MANGAN_OR_HIGHER.TRIPLE_YAKUMAN, label: "三倍役満" }
];

export const LOCAL_STORAGE_KEYS = {
  STATE: "mahjong_state",
  HISTORY: "mahjong_history",
  HAND_RECORDS: "mahjong_hand_records",
  SETUP: "mahjong_setup",
} as const;

export const TRACKER_TABS = {
  SCOREBOARD: "scoreboard",
  STATS: "stats",
} as const;

export type TrackerTab = typeof TRACKER_TABS[keyof typeof TRACKER_TABS];
