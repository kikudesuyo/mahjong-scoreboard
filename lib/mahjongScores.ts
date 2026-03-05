export const WIN_ROLE = {
  OYA: "oya",
  KO: "ko",
} as const;

export type WinRole = typeof WIN_ROLE[keyof typeof WIN_ROLE];

export interface ScoreData {
  ron: number | null;
  tsumo?: {
    ko?: number;
    oya?: number;
    all?: number;
  };
}

export const SCORE_CALC_MODE = {
  FU_BASED: "fuBased",
  LIMIT_BASED: "limitBased",
} as const;

export type ScoreCalculationMode = typeof SCORE_CALC_MODE[keyof typeof SCORE_CALC_MODE];

export const HAND_RESULT_TYPE = {
  AGARI: "agari",
  RYUUKYOKU: "ryuukyoku",
  MANUAL: "manual",
} as const;

export const AGARI_TYPE = {
  TSUMO: "tsumo",
  RON: "ron",
} as const;

// Han keys: 1, 2, 3, 4
// Fu keys: 20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110
export const scoresTable: Record<WinRole, Record<number, Record<number, ScoreData>>> = {
  // Ko entries (when a non-dealer wins)
  ko: {
    20: {
      2: { ron: null, tsumo: { ko: 400, oya: 700 } },
      3: { ron: null, tsumo: { ko: 700, oya: 1300 } },
      4: { ron: null, tsumo: { ko: 1300, oya: 2600 } },
    },
    25: {
      2: { ron: 1600 },
      3: { ron: 3200, tsumo: { ko: 800, oya: 1600 } },
      4: { ron: 6400, tsumo: { ko: 1600, oya: 3200 } },
    },
    30: {
      1: { ron: 1000, tsumo: { ko: 300, oya: 500 } },
      2: { ron: 2000, tsumo: { ko: 500, oya: 1000 } },
      3: { ron: 3900, tsumo: { ko: 1000, oya: 2000 } },
      4: { ron: 7700, tsumo: { ko: 2000, oya: 3900 } },
    },
    40: {
      1: { ron: 1300, tsumo: { ko: 400, oya: 700 } },
      2: { ron: 2600, tsumo: { ko: 700, oya: 1300 } },
      3: { ron: 5200, tsumo: { ko: 1300, oya: 2600 } },
    },
    50: {
      1: { ron: 1600, tsumo: { ko: 400, oya: 800 } },
      2: { ron: 3200, tsumo: { ko: 800, oya: 1600 } },
      3: { ron: 6400, tsumo: { ko: 1600, oya: 3200 } },
    },
    60: {
      1: { ron: 2000, tsumo: { ko: 500, oya: 1000 } },
      2: { ron: 3900, tsumo: { ko: 1000, oya: 2000 } },
      3: { ron: 7700, tsumo: { ko: 2000, oya: 3900 } },
    },
    70: {
      1: { ron: 2300, tsumo: { ko: 600, oya: 1200 } },
      2: { ron: 4500, tsumo: { ko: 1200, oya: 2300 } },
    },
    80: {
      1: { ron: 2600, tsumo: { ko: 700, oya: 1300 } },
      2: { ron: 5200, tsumo: { ko: 1300, oya: 2600 } },
    },
    90: {
      1: { ron: 2900, tsumo: { ko: 800, oya: 1500 } },
      2: { ron: 5800, tsumo: { ko: 1500, oya: 2900 } },
    },
    100: {
      1: { ron: 3200, tsumo: { ko: 800, oya: 1600 } },
      2: { ron: 6400, tsumo: { ko: 1600, oya: 3200 } },
    },
    110: {
      1: { ron: 3600, tsumo: { ko: 900, oya: 1800 } },
      2: { ron: 7100, tsumo: { ko: 1800, oya: 3600 } },
    },
  },
  // Oya entries (when the dealer wins)
  oya: {
    20: {
      2: { ron: null, tsumo: { all: 700 } },
      3: { ron: null, tsumo: { all: 1300 } },
      4: { ron: null, tsumo: { all: 2600 } },
    },
    25: {
      2: { ron: 2400 },
      3: { ron: 4800, tsumo: { all: 1600 } },
      4: { ron: 9600, tsumo: { all: 3200 } },
    },
    30: {
      1: { ron: 1500, tsumo: { all: 500 } },
      2: { ron: 2900, tsumo: { all: 1000 } },
      3: { ron: 5800, tsumo: { all: 2000 } },
      4: { ron: 11600, tsumo: { all: 3900 } },
    },
    40: {
      1: { ron: 2000, tsumo: { all: 700 } },
      2: { ron: 3900, tsumo: { all: 1300 } },
      3: { ron: 7700, tsumo: { all: 2600 } },
    },
    50: {
      1: { ron: 2400, tsumo: { all: 800 } },
      2: { ron: 4800, tsumo: { all: 1600 } },
      3: { ron: 9600, tsumo: { all: 3200 } },
    },
    60: {
      1: { ron: 2900, tsumo: { all: 1000 } },
      2: { ron: 5800, tsumo: { all: 2000 } },
      3: { ron: 11600, tsumo: { all: 3900 } },
    },
    70: {
      1: { ron: 3400, tsumo: { all: 1200 } },
      2: { ron: 6800, tsumo: { all: 2300 } },
    },
    80: {
      1: { ron: 3900, tsumo: { all: 1300 } },
      2: { ron: 7700, tsumo: { all: 2600 } },
    },
    90: {
      1: { ron: 4400, tsumo: { all: 1500 } },
      2: { ron: 8700, tsumo: { all: 2900 } },
    },
    100: {
      1: { ron: 4800, tsumo: { all: 1600 } },
      2: { ron: 9600, tsumo: { all: 3200 } },
    },
    110: {
      1: { ron: 5300, tsumo: { all: 1800 } },
      2: { ron: 10600, tsumo: { all: 3600 } },
    },
  },
};

export const MANGAN_OR_HIGHER = {
  MANGAN: "mangan",
  HANEMAN: "haneman",
  BAIMAN: "baiman",
  SANBAIMAN: "sanbaiman",
  YAKUMAN: "yakuman",
  DOUBLE_YAKUMAN: "double_yakuman",
  TRIPLE_YAKUMAN: "triple_yakuman",
} as const;

export type ManganOrHigher = typeof MANGAN_OR_HIGHER[keyof typeof MANGAN_OR_HIGHER];

export const limitScores: Record<WinRole, Record<ManganOrHigher, ScoreData>> = {
  ko: {
    mangan: { ron: 8000, tsumo: { ko: 2000, oya: 4000 } },
    haneman: { ron: 12000, tsumo: { ko: 3000, oya: 6000 } },
    baiman: { ron: 16000, tsumo: { ko: 4000, oya: 8000 } },
    sanbaiman: { ron: 24000, tsumo: { ko: 6000, oya: 12000 } },
    yakuman: { ron: 32000, tsumo: { ko: 8000, oya: 16000 } },
    double_yakuman: { ron: 64000, tsumo: { ko: 16000, oya: 32000 } },
    triple_yakuman: { ron: 96000, tsumo: { ko: 24000, oya: 48000 } },
  },
  oya: {
    mangan: { ron: 12000, tsumo: { all: 4000 } },
    haneman: { ron: 18000, tsumo: { all: 6000 } },
    baiman: { ron: 24000, tsumo: { all: 8000 } },
    sanbaiman: { ron: 36000, tsumo: { all: 12000 } },
    yakuman: { ron: 48000, tsumo: { all: 16000 } },
    double_yakuman: { ron: 96000, tsumo: { all: 32000 } },
    triple_yakuman: { ron: 144000, tsumo: { all: 48000 } },
  },
};
