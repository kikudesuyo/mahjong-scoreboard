import { useState } from "react";
import { GameState, INITIAL_STATE } from "@/lib/types";
import { RYUUKYOKU_TOTAL_POINTS } from "@/lib/constants";
import Modal from "./Modal";

interface RyuukyokuModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onApply: (newState: GameState, result: any) => void;
}

export default function RyuukyokuModal({ isOpen, onClose, gameState, onApply }: RyuukyokuModalProps) {
  const [tenpaiPlayers, setTenpaiPlayers] = useState<number[]>([]);
  const RYUUKYOKU_POINTS = RYUUKYOKU_TOTAL_POINTS; // Total penalty points paid in 3-player mahjong

  const toggleTenpai = (id: number) => {
    setTenpaiPlayers(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    let newPlayers = [...gameState.players];
    const numTenpai = tenpaiPlayers.length;
    
    // Distribute points if someone is tenpai and someone is noten
    if (numTenpai > 0 && numTenpai < 3) {
      const numNoten = 3 - numTenpai;
      const amountPerTenpai = RYUUKYOKU_POINTS / numTenpai;
      const amountPerNoten = RYUUKYOKU_POINTS / numNoten;
      
      newPlayers = newPlayers.map(p => {
        if (tenpaiPlayers.includes(p.id)) {
          return { ...p, score: p.score + amountPerTenpai }; // Receive
        } else {
          return { ...p, score: p.score - amountPerNoten }; // Pay
        }
      });
    }
    
    // Record point differences
    const pointDiffs: Record<number, number> = {};
    newPlayers.forEach(p => {
      const oldPlayer = gameState.players.find(op => op.id === p.id);
      if (oldPlayer) {
        pointDiffs[p.id] = p.score - oldPlayer.score;
      }
    });

    onApply({
      players: newPlayers,
      honba: gameState.honba + 1,
      kyotaku: gameState.kyotaku, // Kyotaku carries over
      rules: gameState.rules || INITIAL_STATE.rules
    }, {
      type: "ryuukyoku",
      winnerIds: tenpaiPlayers,
      points: pointDiffs
    });

    setTenpaiPlayers([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="流局（テンパイ）">
      <div className="space-y-6">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          テンパイしているプレイヤーを選択してください。<br/>
          （※本場は1つ追加され、供託はそのまま残ります。）
        </p>

        <div className="space-y-3">
          {gameState.players.map((p) => (
            <button
              key={p.id}
              onClick={() => toggleTenpai(p.id)}
              className={`w-full p-4 flex items-center justify-between rounded-xl font-bold transition-all border ${
                tenpaiPlayers.includes(p.id)
                  ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 shadow-md border-transparent" 
                  : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-500"
              }`}
            >
              <span className="text-lg">{p.name}</span>
              <span className="text-sm font-black uppercase tracking-widest">{tenpaiPlayers.includes(p.id) ? "聴牌" : "不聴"}</span>
            </button>
          ))}
        </div>

        <button 
          onClick={handleApply}
          className="w-full py-4 mt-4 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 font-black text-lg rounded-xl transition-all shadow-md active:scale-[0.98]"
        >
          確定
        </button>
      </div>
    </Modal>
  );
}
