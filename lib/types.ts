export type Player = {
  id: number;
  name: string;
  score: number;
  isRiichi?: boolean;
  isDealer?: boolean;
};

export type GameState = {
  players: Player[];
  honba: number;
  kyotaku: number;
};

export const INITIAL_STATE: GameState = {
  players: [
    { id: 1, name: "プレイヤー1", score: 35000, isDealer: true },
    { id: 2, name: "プレイヤー2", score: 35000 },
    { id: 3, name: "プレイヤー3", score: 35000 },
  ],
  honba: 0,
  kyotaku: 0,
};

// Validates the invariant that the total score is exactly 105,000 points.
export function validateInvariant(state: GameState): boolean {
  const total = state.players.reduce((sum, p) => sum + p.score, 0) + state.kyotaku;
  return total === 105000;
}
