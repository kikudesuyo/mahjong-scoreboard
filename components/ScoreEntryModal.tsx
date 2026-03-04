import { useState, useEffect, useCallback } from "react";
import { GameState, INITIAL_STATE } from "@/lib/types";
import Modal from "./Modal";
import { scoresTable, limitScores, WinRole, ScoreData, ManganOrHigher, ScoreCalculationMode, SCORE_CALC_MODE, HAND_RESULT_TYPE, AGARI_TYPE } from "@/lib/mahjongScores";
import { HAN_OPTIONS, LIMIT_HANDS, FU_OPTIONS, DEFAULT_TSUMIBO } from "@/lib/constants";

interface ScoreEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onApply: (newState: GameState, result: any) => void;
  initialWinnerId?: number | null;
}

export default function ScoreEntryModal({ isOpen, onClose, gameState, onApply, initialWinnerId }: ScoreEntryModalProps) {
  const [winnerIds, setWinnerIds] = useState<number[]>([]);
  const [winType, setWinType] = useState<typeof AGARI_TYPE.TSUMO | typeof AGARI_TYPE.RON | null>(null);
  const [loserId, setLoserId] = useState<number | null>(null); // Only for Ron
  
  // For Ron (Base points per winner)
  const [ronPoints, setRonPoints] = useState<Record<number, number>>({});
  
  // For Tsumo (Payment per loser)
  const [tsumoPayments, setTsumoPayments] = useState<Record<number, number>>({});

  // Explicit Honba points
  const [ronHonbaPoints, setRonHonbaPoints] = useState<number>(0);
  const [tsumoHonbaPoints, setTsumoHonbaPoints] = useState<number>(0);

  // Score Table Selection State
  const [selectedHan, setSelectedHan] = useState<number | ManganOrHigher | null>(null);
  const [selectedFu, setSelectedFu] = useState<number | null | undefined>(null);
  const [selectedRole, setSelectedRole] = useState<WinRole>("ko");
  const [selectedMode, setSelectedMode] = useState<ScoreCalculationMode>(SCORE_CALC_MODE.FU_BASED);

  useEffect(() => {
    if (isOpen) {
      if (initialWinnerId) {
        setWinnerIds([initialWinnerId]);
      } else {
        setWinnerIds([]);
      }
      // Reset other states
      setWinType(null);
      setLoserId(null);
      setRonPoints({});
      setTsumoPayments({});
      setSelectedHan(null);
      setSelectedFu(null);
    }
  }, [isOpen, initialWinnerId]);

  const updatePointsFromTable = useCallback((role: WinRole, han: number | ManganOrHigher | null, fu: number | null | undefined, mode: ScoreCalculationMode) => {
    if (han === null) return;
    
    let data: ScoreData | undefined;
    
    if (mode === SCORE_CALC_MODE.LIMIT_BASED) {
      data = limitScores[role]?.[han as ManganOrHigher];
    } else {
      if (fu === null) return;
      data = scoresTable[role]?.[fu as number]?.[han as number];
    }

    if (!data) return;

    if (winType === AGARI_TYPE.RON) {
      const newRonPoints: Record<number, number> = {};
      winnerIds.forEach(wid => {
        newRonPoints[wid] = data!.ron ?? 0;
      });
      setRonPoints(newRonPoints);
    } else {
      const newTsumoPayments: Record<number, number> = {};
      gameState.players.filter(p => !winnerIds.includes(p.id)).forEach(p => {
        if (role === "oya") {
          newTsumoPayments[p.id] = data!.tsumo?.all || 0;
        } else {
          const dealerPlayer = gameState.players.find(pl => pl.isDealer);
          if (p.id === dealerPlayer?.id) {
            newTsumoPayments[p.id] = data!.tsumo?.oya || 0;
          } else {
            newTsumoPayments[p.id] = data!.tsumo?.ko || 0;
          }
        }
      });
      setTsumoPayments(newTsumoPayments);
    }
  }, [winType, winnerIds, gameState.players]);

  useEffect(() => {
    if (isOpen && winnerIds.length > 0) {
      const firstWinner = gameState.players.find(p => p.id === winnerIds[0]);
      if (firstWinner) {
        setSelectedRole(firstWinner.isDealer ? "oya" : "ko");
      }
    }
  }, [isOpen, winnerIds, gameState.players]);

  useEffect(() => {
    if (isOpen && winnerIds.length > 0 && selectedHan !== null) {
      updatePointsFromTable(selectedRole, selectedHan, selectedFu, selectedMode);
    }
  }, [isOpen, winnerIds, winType, selectedHan, selectedFu, selectedRole, selectedMode, updatePointsFromTable]);

  useEffect(() => {
    if (isOpen) {
      const tsumibo = gameState.rules?.tsumiboPoints ?? DEFAULT_TSUMIBO;
      setRonHonbaPoints(gameState.honba * tsumibo);
      setTsumoHonbaPoints(Math.floor((gameState.honba * tsumibo) / (gameState.rules?.playerCount - 1 || 2)));
    }
  }, [isOpen, gameState.honba, gameState.rules?.tsumiboPoints, gameState.rules?.playerCount]);

  const handleWinTypeChange = (type: typeof AGARI_TYPE.TSUMO | typeof AGARI_TYPE.RON) => {
    setWinType(type);
    if (type === AGARI_TYPE.TSUMO && winnerIds.length > 1) {
      setWinnerIds([winnerIds[0]]);
    }
    setLoserId(null);
    
    if (type === AGARI_TYPE.RON && selectedFu === 20) {
      setSelectedFu(30);
      updatePointsFromTable(selectedRole, selectedHan, 30, selectedMode);
    }
  };

  const handleApply = () => {
    if (winnerIds.length === 0) return alert("アガったプレイヤーを選択してください");
    if (winType === AGARI_TYPE.TSUMO && Object.keys(tsumoPayments).length === 0) return alert("ツモの点数を入力してください");
    if (winType === AGARI_TYPE.RON && !loserId) return alert("放銃者を選択してください");
    if (winType === AGARI_TYPE.RON && winnerIds.includes(loserId!)) return alert("アガった人と放銃者は別にしてください");

    let newPlayers = [...gameState.players];
    const isOyaWinner = winnerIds.some(wid => gameState.players.find(p => p.id === wid)?.isDealer);
    const newHonba = isOyaWinner ? gameState.honba + 1 : 0;
    const newKyotaku = 0;
    const kyotakuPoints = gameState.kyotaku;

    if (winType === AGARI_TYPE.TSUMO) {
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
    } else if (winType === AGARI_TYPE.RON) {
      const winnerId = winnerIds[0];
      const honbaPayment = ronHonbaPoints;
      
      newPlayers = newPlayers.map((p) => {
        if (p.id === winnerId) {
          const bPoints = ronPoints[p.id] || 0;
          return { ...p, score: p.score + bPoints + honbaPayment + kyotakuPoints };
        }
        return p;
      });

      const totalLoserPayment = (ronPoints[winnerId] || 0) + honbaPayment;
      newPlayers = newPlayers.map((p) => 
        p.id === loserId ? { ...p, score: p.score - totalLoserPayment } : p
      );
    }

    const pointDiffs: Record<number, number> = {};
    newPlayers.forEach(p => {
      const oldPlayer = gameState.players.find(op => op.id === p.id);
      if (oldPlayer) {
        pointDiffs[p.id] = p.score - oldPlayer.score;
      }
    });

    const baseAgariPoints: Record<number, number> = {};
    if (winType === AGARI_TYPE.TSUMO) {
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
      type: HAND_RESULT_TYPE.AGARI,
      agariType: winType as typeof AGARI_TYPE.TSUMO | typeof AGARI_TYPE.RON,
      winnerIds,
      loserId,
      han: selectedHan,
      fu: selectedFu,
      isOyaWin: isOyaWinner,
      points: pointDiffs,
      basePoints: baseAgariPoints
    });
    
    setWinnerIds([]);
    setWinType(null);
    setLoserId(null);
    setRonPoints({});
    setTsumoPayments({});
    onClose();
  };

  const winnerNames = winnerIds.map(id => gameState.players.find(p => p.id === id)?.name).filter(Boolean).join(" & ");

  const renderApplyButton = () => {
    const hasWinType = !!winType;
    const hasScore = selectedHan !== null && (selectedMode === SCORE_CALC_MODE.LIMIT_BASED || selectedFu !== null);
    const hasLoser = winType === AGARI_TYPE.RON ? !!loserId : true;
    const isReady = hasWinType && hasScore && hasLoser;

    return (
      <button 
        disabled={!isReady}
        onClick={handleApply}
        className={`w-full py-5 font-black text-2xl rounded-xl transition-all shadow-lg ${
          isReady 
            ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 active:scale-[0.98] animate-in fade-in zoom-in duration-300" 
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600 cursor-not-allowed opacity-50"
        }`}
      >
        確定
      </button>
    );
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={winnerNames ? `${winnerNames} の和了` : "和了（アガリ）"}
      footer={renderApplyButton()}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 text-sm p-1">
        <section className="space-y-3">
          <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">1. どうやってアガりましたか？</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleWinTypeChange(AGARI_TYPE.TSUMO)}
              className={`flex-1 py-4 text-xl rounded-xl font-bold transition-all ${
                winType === AGARI_TYPE.TSUMO
                  ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 shadow-md" 
                  : "bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:border-neutral-300"
              }`}
            >
              ツモ
            </button>
            <button
              onClick={() => handleWinTypeChange(AGARI_TYPE.RON)}
              className={`flex-1 py-4 text-xl rounded-xl font-bold transition-all ${
                winType === AGARI_TYPE.RON
                  ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 shadow-md" 
                  : "bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:border-neutral-300"
              }`}
            >
              ロン
            </button>
          </div>
        </section>

        {winnerIds.length > 0 && winType && (
          <section className="space-y-4">
            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">3. 役と点数を選択してください</label>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest opacity-60">一般役</label>
                    <div className="grid grid-cols-4 gap-2">
                      {HAN_OPTIONS.map(h => (
                        <button
                          key={h}
                          onClick={() => { 
                            setSelectedHan(h); 
                            const newFu = selectedFu || null;
                            setSelectedFu(newFu);
                            setSelectedMode(SCORE_CALC_MODE.FU_BASED);
                            updatePointsFromTable(selectedRole, h, newFu, SCORE_CALC_MODE.FU_BASED); 
                          }}
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
                          onClick={() => { 
                            setSelectedHan(h.id as ManganOrHigher); 
                            setSelectedFu(undefined);
                            setSelectedMode(SCORE_CALC_MODE.LIMIT_BASED);
                            updatePointsFromTable(selectedRole, h.id as ManganOrHigher, undefined, SCORE_CALC_MODE.LIMIT_BASED); 
                          }}
                          className={`py-2 text-[10px] font-black rounded-lg transition-all ${selectedHan === h.id ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white' : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 hover:bg-neutral-100'}`}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest opacity-60">親 / 子</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["ko", "oya"] as WinRole[]).map(r => (
                        <button
                          key={r}
                          onClick={() => { setSelectedRole(r); updatePointsFromTable(r, selectedHan, selectedFu, selectedMode); }}
                          className={`py-2 text-sm font-bold rounded-lg transition-all ${selectedRole === r ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white' : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 hover:bg-neutral-100'}`}
                        >
                          {r === "oya" ? "親" : "子"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {selectedHan !== null && selectedMode === SCORE_CALC_MODE.FU_BASED && (
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest opacity-60">符</label>
                      <div className="grid grid-cols-4 gap-2">
                        {FU_OPTIONS.map(f => {
                          const isApplicable = (() => {
                            const data = scoresTable[selectedRole]?.[f]?.[selectedHan as number];
                            if (!data) return false;
                            if (winType === AGARI_TYPE.TSUMO && !data.tsumo) return false;
                            if (winType === AGARI_TYPE.RON && data.ron === null) return false;
                            return true;
                          })();

                          return (
                            <button
                              key={f}
                              disabled={!isApplicable}
                              onClick={() => { setSelectedFu(f); updatePointsFromTable(selectedRole, selectedHan, f, selectedMode); }}
                              className={`py-2 text-sm font-bold rounded-lg transition-all ${selectedFu === f ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white' : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 hover:bg-neutral-100'} disabled:opacity-10 disabled:cursor-not-allowed`}
                            >
                              {f}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(() => {
                const data = selectedMode === SCORE_CALC_MODE.LIMIT_BASED ? limitScores[selectedRole]?.[selectedHan as ManganOrHigher] : (selectedFu ? scoresTable[selectedRole]?.[selectedFu]?.[selectedHan as number] : undefined);
                if (!data) return (
                  <div className="text-center pt-6 border-t border-neutral-100 dark:border-neutral-800">
                    <p className="text-neutral-400 italic">翻と符を選択してください</p>
                  </div>
                );
                const label = selectedMode === SCORE_CALC_MODE.LIMIT_BASED ? 
                  { mangan: "満貫", haneman: "跳満", baiman: "倍満", sanbaiman: "三倍満", yakuman: "役満", double_yakuman: "二倍役満", triple_yakuman: "三倍役満" }[selectedHan as string] : 
                  `${selectedHan}翻${selectedFu}符`;
                
                return (
                  <div className="text-center pt-6 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex flex-col items-center gap-1 mb-2">
                       <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{label}</span>
                       {winType === AGARI_TYPE.RON && loserId && (
                         <div className="flex items-center gap-2 text-xs font-black text-neutral-500">
                           <span>{winnerIds.map(id => gameState.players.find(p => p.id === id)?.name).join(' & ')}</span>
                           <span className="text-neutral-300">→</span>
                           <span>{gameState.players.find(p => p.id === loserId)?.name}</span>
                         </div>
                       )}
                    </div>
                    <span className="text-5xl font-black text-neutral-800 dark:text-neutral-200 tabular-nums">
                      {winType === AGARI_TYPE.RON ? (
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

        {winnerIds.length > 0 && winType && (
          <section className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            {winType === AGARI_TYPE.RON && (
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

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800/50">
                <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest">積み棒 (+{gameState.honba})</label>
                <div className="text-2xl font-black text-neutral-700 dark:text-neutral-300 tabular-nums">
                  +{winType === AGARI_TYPE.RON ? (gameState.honba * (gameState.rules?.tsumiboPoints ?? DEFAULT_TSUMIBO)).toLocaleString() : (Math.floor((gameState.honba * (gameState.rules?.tsumiboPoints ?? DEFAULT_TSUMIBO)) / (gameState.rules?.playerCount - 1 || 2))).toLocaleString()} <span className="text-xs font-normal">点</span>
                </div>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800/50">
                <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest">供託 (+{gameState.kyotaku / 1000})</label>
                <div className="text-2xl font-black text-neutral-700 dark:text-neutral-300 tabular-nums">
                  +{gameState.kyotaku.toLocaleString()} <span className="text-xs font-normal">点</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
