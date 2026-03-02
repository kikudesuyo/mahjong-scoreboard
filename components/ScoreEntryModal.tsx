import { useState, useEffect, useCallback } from "react";
import { GameState, INITIAL_STATE } from "@/lib/types";
import Modal from "./Modal";
import NumberInput from "./NumberInput";
import { scoresTable, limitScores, WinRole, ScoreData } from "@/lib/mahjongScores";
import { HAN_OPTIONS, LIMIT_HANDS, FU_OPTIONS, DEFAULT_TSUMIBO } from "@/lib/constants";

interface ScoreEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onApply: (newState: GameState, result: any) => void;
}

export default function ScoreEntryModal({ isOpen, onClose, gameState, onApply }: ScoreEntryModalProps) {
  const [winnerIds, setWinnerIds] = useState<number[]>([]);
  const [headBumpWinnerId, setHeadBumpWinnerId] = useState<number | null>(null);
  const [winType, setWinType] = useState<"tsumo" | "ron" | null>(null);
  const [loserId, setLoserId] = useState<number | null>(null); // Only for Ron
  
  // For Ron (Base points per winner)
  const [ronPoints, setRonPoints] = useState<Record<number, number>>({});
  
  // For Tsumo (Payment per loser)
  const [tsumoPayments, setTsumoPayments] = useState<Record<number, number>>({});

  // Explicit Honba points
  const [ronHonbaPoints, setRonHonbaPoints] = useState<number>(0);
  const [tsumoHonbaPoints, setTsumoHonbaPoints] = useState<number>(0);

  // Score Table Selection State
  const [selectedHan, setSelectedHan] = useState<number | string>(1);
  const [selectedFu, setSelectedFu] = useState<number>(30);
  const [selectedRole, setSelectedRole] = useState<WinRole>("ko");

  const updatePointsFromTable = useCallback((role: WinRole, han: number | string, fu: number) => {
    let data: ScoreData | undefined;
    
    if (typeof han === "string") {
      data = limitScores[role]?.[han];
    } else {
      data = scoresTable[role]?.[fu]?.[han];
    }

    if (!data) return;

    if (winType === "ron") {
      // Apply to all winners (usually just 1, but handles 2 for Double Ron)
      const newRonPoints: Record<number, number> = {};
      winnerIds.forEach(wid => {
        newRonPoints[wid] = data.ron ?? 0;
      });
      setRonPoints(newRonPoints);
    } else {
      // Tsumo: Apply lookup to all losers
      const newTsumoPayments: Record<number, number> = {};
      gameState.players.filter(p => !winnerIds.includes(p.id)).forEach(p => {
        if (role === "oya") {
          newTsumoPayments[p.id] = data.tsumo?.all || 0;
        } else {
      // Ko wins: Parent pays more
          const dealerPlayer = gameState.players.find(pl => pl.isDealer);
          if (p.id === dealerPlayer?.id) {
            newTsumoPayments[p.id] = data.tsumo?.oya || 0;
          } else {
            newTsumoPayments[p.id] = data.tsumo?.ko || 0;
          }
        }
      });
      setTsumoPayments(newTsumoPayments);
    }
  }, [winType, winnerIds, gameState.players]);

  useEffect(() => {
    if (isOpen && winnerIds.length > 0) {
      // Auto-set role if we have winners
      const firstWinner = gameState.players.find(p => p.id === winnerIds[0]);
      if (firstWinner) {
        setSelectedRole(firstWinner.isDealer ? "oya" : "ko");
      }
    }
  }, [isOpen, winnerIds, gameState.players]);

  useEffect(() => {
    if (isOpen && winnerIds.length > 0) {
      updatePointsFromTable(selectedRole, selectedHan, selectedFu);
    }
  }, [isOpen, winnerIds, winType, selectedHan, selectedFu, selectedRole, updatePointsFromTable]);

  useEffect(() => {
    if (isOpen) {
      const tsumibo = gameState.rules?.tsumiboPoints ?? DEFAULT_TSUMIBO;
      setRonHonbaPoints(gameState.honba * tsumibo);
      // For 3-player mahjong, tsumo honba is (total tsumibo) / 2
      setTsumoHonbaPoints(Math.floor((gameState.honba * tsumibo) / 2));
    }
  }, [isOpen, gameState.honba, gameState.rules?.tsumiboPoints]);

  const toggleWinner = (id: number) => {
    if (winType === "tsumo") {
      setWinnerIds([id]);
      setHeadBumpWinnerId(id);
    } else {
      if (winnerIds.includes(id)) {
        const newWinners = winnerIds.filter(wid => wid !== id);
        setWinnerIds(newWinners);
        if (headBumpWinnerId === id) setHeadBumpWinnerId(newWinners.length > 0 ? newWinners[0] : null);
      } else {
        if (winnerIds.length >= 2) return; // Max 2 winners for Double Ron
        setWinnerIds([...winnerIds, id]);
        if (winnerIds.length === 0) setHeadBumpWinnerId(id);
      }
    }
  };

  const handleWinTypeChange = (type: "tsumo" | "ron") => {
    setWinType(type);
    if (type === "tsumo" && winnerIds.length > 1) {
      setWinnerIds([winnerIds[0]]);
    }
    setLoserId(null);
    
    // 20 Fu is impossible for Ron. If current Fu is 20, switch to 30.
    if (type === "ron" && selectedFu === 20) {
      setSelectedFu(30);
      updatePointsFromTable(selectedRole, selectedHan, 30);
    }
  };

  const handleApply = () => {
    if (winnerIds.length === 0) return alert("アガったプレイヤーを選択してください");
    if (winType === "tsumo" && Object.keys(tsumoPayments).length === 0) return alert("ツモの点数を入力してください");
    if (winType === "ron" && !loserId) return alert("放銃者を選択してください");
    if (winType === "ron" && winnerIds.includes(loserId!)) return alert("アガった人と放銃者は別にしてください");
    if (winType === "ron" && Object.keys(ronPoints).length === 0) return alert("ロンの点数を入力してください");

    let newPlayers = [...gameState.players];
    
    // Automation: Honba increments if Oya wins, otherwise resets to 0
    const isOyaWinner = winnerIds.some(wid => gameState.players.find(p => p.id === wid)?.isDealer);
    const newHonba = isOyaWinner ? gameState.honba + 1 : 0;
    
    const newKyotaku = 0; // Kyotaku resets to 0 (claimed by winner)
    const kyotakuPoints = gameState.kyotaku;

    if (winType === "tsumo") {
      // Tsumo: The two other players pay their respective `tsumoPayments` + `tsumoHonbaPoints`
      const winnerId = winnerIds[0];
      const honbaPaymentPerPlayer = tsumoHonbaPoints;
      
      let totalClaimed = kyotakuPoints;
      
      newPlayers = newPlayers.map((p) => {
        if (p.id !== winnerId) {
          const payment = (tsumoPayments[p.id] || 0) + honbaPaymentPerPlayer;
          totalClaimed += payment;
          return { ...p, score: p.score - payment };
        }
        return p;
      });
      
      newPlayers = newPlayers.map((p) => 
        p.id === winnerId ? { ...p, score: p.score + totalClaimed } : p
      );
    } else if (winType === "ron") {
      // Ron: The loser pays each winner's `ronPoints` + `ronHonbaPoints`
      const honbaPayment = ronHonbaPoints;
      
      const actualHeadBumpWinnerId = headBumpWinnerId && winnerIds.includes(headBumpWinnerId) 
        ? headBumpWinnerId 
        : winnerIds[0];
      
      newPlayers = newPlayers.map((p) => {
        if (winnerIds.includes(p.id)) {
          const isHeadBumpWinner = p.id === actualHeadBumpWinnerId;
          const bPoints = ronPoints[p.id] || 0;
          const extra = isHeadBumpWinner ? honbaPayment + kyotakuPoints : 0;
          return { ...p, score: p.score + bPoints + extra };
        }
        return p;
      });

      // Bug Fix: Loser only pays base Ron points and Honba. Kyotaku is already on the board.
      const totalLoserPayment = winnerIds.reduce((sum, wid) => sum + (ronPoints[wid] || 0), 0) + honbaPayment;
      
      newPlayers = newPlayers.map((p) => 
        p.id === loserId ? { ...p, score: p.score - totalLoserPayment } : p
      );
    }

    // Record point differences
    const pointDiffs: Record<number, number> = {};
    newPlayers.forEach(p => {
      const oldPlayer = gameState.players.find(op => op.id === p.id);
      if (oldPlayer) {
        pointDiffs[p.id] = p.score - oldPlayer.score;
      }
    });

    // Base Agari Points (excluding Honba and Kyotaku)
    const baseAgariPoints: Record<number, number> = {};
    if (winType === "tsumo") {
      const winnerId = winnerIds[0];
      baseAgariPoints[winnerId] = Object.values(tsumoPayments).reduce((sum, val) => sum + val, 0);
    } else {
      winnerIds.forEach(wid => {
        baseAgariPoints[wid] = ronPoints[wid] || 0;
      });
    }

    onApply({
      players: newPlayers,
      honba: newHonba,
      kyotaku: newKyotaku,
      rules: gameState.rules || INITIAL_STATE.rules,
    }, {
      type: winType as "tsumo" | "ron",
      winnerIds,
      loserId,
      han: selectedHan,
      fu: selectedFu,
      isOyaWin: isOyaWinner,
      points: pointDiffs,
      basePoints: baseAgariPoints
    });
    
    // Reset modal state
    setWinnerIds([]);
    setHeadBumpWinnerId(null);
    setWinType(null);
    setLoserId(null);
    setRonPoints({});
    setTsumoPayments({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="和了（アガリ）">
      <div className="space-y-6 text-sm p-1">
        {/* 1. Winner Selection */}
        <section className="space-y-3">
          <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">
            1. だれがアガりましたか？
          </label>
          <div className="flex gap-2">
            {gameState.players.map((p) => (
              <button
                key={p.id}
                onClick={() => toggleWinner(p.id)}
                className={`flex-1 py-4 text-xl rounded-xl font-bold transition-all ${
                  winnerIds.includes(p.id)
                    ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 shadow-md" 
                    : "bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:border-neutral-300"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>

        {/* 2. Win Type Selection */}
        {winnerIds.length > 0 && (
          <section className="space-y-3">
            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">2. どうやってアガりましたか？</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleWinTypeChange("tsumo")}
                className={`flex-1 py-4 text-xl rounded-xl font-bold transition-all ${
                  winType === "tsumo"
                    ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 shadow-md" 
                    : "bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:border-neutral-300"
                }`}
              >
                ツモ
              </button>
              <button
                onClick={() => handleWinTypeChange("ron")}
                className={`flex-1 py-4 text-xl rounded-xl font-bold transition-all ${
                  winType === "ron"
                    ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 shadow-md" 
                    : "bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:border-neutral-300"
                }`}
              >
                ロン
              </button>
            </div>
          </section>
        )}

        {/* 3. Score (Han/Fu) Selection */}
        {winnerIds.length > 0 && winType && (
          <section className="space-y-4">
            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">3. 役と点数を選択してください</label>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Han Selection */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest opacity-60">一般役</label>
                    <div className="grid grid-cols-4 gap-2">
                      {HAN_OPTIONS.map(h => (
                        <button
                          key={h}
                          onClick={() => { setSelectedHan(h); updatePointsFromTable(selectedRole, h, selectedFu); }}
                          className={`py-2 text-sm font-bold rounded-lg transition-all ${selectedHan === h ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white' : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 hover:bg-neutral-100'}`}
                        >
                          {h}翻
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest opacity-60">満貫以上</label>
                    <div className="grid grid-cols-3 gap-2">
                      {LIMIT_HANDS.map(h => (
                        <button
                          key={h.id}
                          onClick={() => { setSelectedHan(h.id); updatePointsFromTable(selectedRole, h.id, selectedFu); }}
                          className={`py-2 text-[10px] font-black rounded-lg transition-all ${selectedHan === h.id ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white' : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 hover:bg-neutral-100'}`}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Role & Fu Selection */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest opacity-60">親 / 子</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["ko", "oya"] as WinRole[]).map(r => (
                        <button
                          key={r}
                          onClick={() => { setSelectedRole(r); updatePointsFromTable(r, selectedHan, selectedFu); }}
                          className={`py-2 text-sm font-bold rounded-lg transition-all ${selectedRole === r ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white' : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 hover:bg-neutral-100'}`}
                        >
                          {r === "oya" ? "親" : "子"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest opacity-60">符</label>
                    <div className="grid grid-cols-4 gap-2">
                      {FU_OPTIONS.map(f => (
                        <button
                          key={f}
                          disabled={typeof selectedHan === "string" || (f === 20 && (selectedHan === 1 || winType === "ron"))}
                          onClick={() => { setSelectedFu(f); updatePointsFromTable(selectedRole, selectedHan, f); }}
                          className={`py-2 text-sm font-bold rounded-lg transition-all disabled:opacity-10 ${selectedFu === f ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white' : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 hover:bg-neutral-100'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Summary Display */}
              {(() => {
                const data = typeof selectedHan === "string" ? limitScores[selectedRole]?.[selectedHan] : scoresTable[selectedRole]?.[selectedFu]?.[selectedHan];
                if (!data) return null;
                const label = typeof selectedHan === "string" ? 
                  { mangan: "満貫", haneman: "跳満", baiman: "倍満", sanbaiman: "三倍満", yakuman: "役満" }[selectedHan as string] : 
                  `${selectedHan}翻${selectedFu}符`;
                
                return (
                  <div className="text-center pt-6 border-t border-neutral-100 dark:border-neutral-800">
                    <span className="text-sm text-neutral-400 font-bold">{label} → </span>
                    <span className="text-5xl font-black text-neutral-800 dark:text-neutral-200 ml-2 tabular-nums">
                      {winType === "ron" ? (
                        data.ron === null ? "?" : `${data.ron.toLocaleString()}`
                      ) : (
                        selectedRole === "oya" ? (
                          `${data.tsumo?.all?.toLocaleString()} all`
                        ) : (
                          `${data.tsumo?.ko?.toLocaleString()} / ${data.tsumo?.oya?.toLocaleString()}`
                        )
                      )}
                    </span>
                    <span className="text-xl font-black text-neutral-400 ml-1">点</span>
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* 4. Detail Settings (Loser selection, etc.) */}
        {winnerIds.length > 0 && winType && (
          <section className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            {winType === "ron" && (
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest">振り込み (放銃者)</label>
                <div className="flex gap-2">
                  {gameState.players.filter(p => !winnerIds.includes(p.id)).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setLoserId(p.id)}
                      className={`flex-1 py-3 text-lg rounded-xl font-bold ${
                        loserId === p.id 
                          ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900" 
                          : "bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-400"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Totals and Honba breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800/50">
                <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest">積み棒 (+{gameState.honba})</label>
                <div className="text-2xl font-black text-neutral-700 dark:text-neutral-300 tabular-nums">
                  +{winType === "ron" ? (gameState.honba * (gameState.rules?.tsumiboPoints ?? DEFAULT_TSUMIBO)).toLocaleString() : (Math.floor((gameState.honba * (gameState.rules?.tsumiboPoints ?? DEFAULT_TSUMIBO)) / 2)).toLocaleString()} <span className="text-xs font-normal">点</span>
                </div>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800/50">
                <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest">供託 (+{gameState.kyotaku / 1000})</label>
                <div className="text-2xl font-black text-neutral-700 dark:text-neutral-300 tabular-nums">
                  +{gameState.kyotaku.toLocaleString()} <span className="text-xs font-normal">点</span>
                </div>
              </div>
            </div>

            {/* Head Bump for Double Ron */}
            {winType === "ron" && winnerIds.length > 1 && (
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <label className="block text-[10px] font-black text-neutral-400 mb-3 uppercase tracking-widest">供託・本場を受け取る (上家取り)</label>
                <div className="flex gap-2">
                  {winnerIds.map(wid => (
                    <button
                      key={wid}
                      onClick={() => setHeadBumpWinnerId(wid)}
                      className={`flex-1 py-3 text-sm rounded-xl font-bold ${
                        (headBumpWinnerId || winnerIds[0]) === wid 
                          ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white" 
                          : "bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-400"
                      }`}
                    >
                      {gameState.players.find(p => p.id === wid)?.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

            <button 
              disabled={winnerIds.length === 0 || (winType === "ron" && !loserId)}
              onClick={handleApply}
              className="w-full py-5 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 font-black text-2xl rounded-xl transition-all active:scale-[0.98] disabled:opacity-20 shadow-lg"
            >
              確定
            </button>
      </div>
    </Modal>
  );
}
