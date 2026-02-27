import { useState, useEffect } from "react";
import { GameState } from "@/lib/types";
import Modal from "./Modal";
import NumberInput from "./NumberInput";

interface ManualAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onApply: (newState: GameState, result: any) => void;
}

export default function ManualAdjustmentModal({ isOpen, onClose, gameState, onApply }: ManualAdjustmentModalProps) {
  const [scores, setScores] = useState<number[]>(gameState.players.map(p => p.score));
  const [honba, setHonba] = useState<number>(gameState.honba);
  const [kyotaku, setKyotaku] = useState<number>(gameState.kyotaku);

  useEffect(() => {
    if (isOpen) {
      setScores(gameState.players.map(p => p.score));
      setHonba(gameState.honba);
      setKyotaku(gameState.kyotaku);
    }
  }, [isOpen, gameState]);

  const handleApply = () => {
    const newPlayers = gameState.players.map((p, i) => ({
      ...p,
      score: scores[i]
    }));
    
    onApply({
      players: newPlayers,
      honba: honba,
      kyotaku: kyotaku
    }, {
      type: "manual",
      points: {}
    });
    
    onClose();
  };

  const handleScoreChange = (index: number, val: string) => {
    const n = parseInt(val) || 0;
    const newScores = [...scores];
    newScores[index] = n;
    setScores(newScores);
  };
  
  const currentTotal = scores.reduce((sum, s) => sum + s, 0) + kyotaku;
  const isBalanced = currentTotal === 105000;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="点数修正">
      <div className="space-y-4">
        <p className="text-xs text-neutral-500 mb-4 bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-balance">
          点数を直接修正します。全プレイヤーの点数 ＋ 供託の合計が正確に 105,000 点になる必要があります。
        </p>

        {gameState.players.map((p, i) => (
          <div key={p.id}>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">{p.name}</label>
            <NumberInput
              value={scores[i]}
              onChange={(val) => handleScoreChange(i, val.toString())}
              step={100}
            />
          </div>
        ))}
        
        <div className={`pt-4 p-3 rounded font-bold text-center ${isBalanced ? 'bg-neutral-100 text-neutral-800' : 'bg-orange-50 text-orange-800'}`}>
          合計点数: {currentTotal.toLocaleString()} {isBalanced ? '✓' : '⚠️'}
          <br/>
          <span className="text-xs font-normal opacity-60">(目標: 105,000)</span>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-1">本場</label>
          <NumberInput
            value={honba}
            onChange={setHonba}
            step={1}
            min={0}
          />
        </div>

        <button 
          onClick={handleApply}
          disabled={!isBalanced}
          className="w-full py-2 mt-2 bg-neutral-800 hover:bg-neutral-900 dark:bg-neutral-200 dark:hover:bg-neutral-100 text-white dark:text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          修正を保存
        </button>
      </div>
    </Modal>
  );
}
