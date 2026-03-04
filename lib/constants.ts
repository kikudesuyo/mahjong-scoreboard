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
  { id: "mangan", label: "満貫" },
  { id: "haneman", label: "跳満" },
  { id: "baiman", label: "倍満" },
  { id: "sanbaiman", label: "三倍満" },
  { id: "yakuman", label: "役満" },
  {id:"double_yakuman", label:"二倍役満"},
  {id:"triple_yakuman", label:"三倍役満"}
];
