import { useState, useMemo } from "react";
import Modal from "./Modal";
import { GameState, HandResult } from "../lib/types";
import { WinRole, scoresTable, limitScores, ManganOrHigher, ScoreCalculationMode, SCORE_CALC_MODE, HAND_RESULT_TYPE, AGARI_TYPE } from "../lib/mahjongScores";
import { HAN_OPTIONS, FU_OPTIONS, LIMIT_HANDS, DEFAULT_TSUMIBO } from "../lib/constants";

interface MultiRonModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onApply: (newState: GameState, result: HandResult) => void;
}

type Step = "winners" | "loser" | "scores" | "confirm";

export default function MultiRonModal({ isOpen, onClose, gameState, onApply }: MultiRonModalProps) {
  const [step, setStep] = useState<Step>("winners");
  const [loserId, setLoserId] = useState<number | null>(null);
  const [winnerIds, setWinnerIds] = useState<number[]>([]);
  const [winnerScores, setWinnerScores] = useState<Record<number, { han: number | ManganOrHigher | null, fu: number | null | undefined, role: WinRole, mode: ScoreCalculationMode }>>({});
  const [headBumpWinnerId, setHeadBumpWinnerId] = useState<number | null>(null);

  // Initialize winner score settings when winners change
  const handleToggleWinner = (id: number) => {
    setWinnerIds(prev => {
      const next = prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id];
      // Sync winnerScores
      const newScores = { ...winnerScores };
      if (!prev.includes(id)) {
        newScores[id] = { han: null, fu: null, role: gameState.players.find(p => p.id === id)?.isDealer ? "oya" : "ko", mode: SCORE_CALC_MODE.FU_BASED };
      } else {
        delete newScores[id];
      }
      setWinnerScores(newScores);
      return next;
    });
  };

  const currentWinnersList = useMemo(() => 
    winnerIds.map(id => gameState.players.find(p => p.id === id)).filter(Boolean),
    [winnerIds, gameState.players]
  );

  const handleApply = () => {
    // 全ての和了者の点数が入力されているか最終確認
    const allScoresEntered = winnerIds.every(wId => {
      const s = winnerScores[wId];
      if (s.han === null) return false;
      if (s.mode === SCORE_CALC_MODE.FU_BASED && s.fu === null) return false;
      return true;
    });

    if (!loserId || winnerIds.length < 2 || !headBumpWinnerId || !allScoresEntered) return;

    let newPlayers = [...gameState.players];
    const basePointsPerPlayer: Record<number, number> = {};
    
    let totalLostByLoser = 0;

    winnerIds.forEach(wId => {
      const settings = winnerScores[wId];
      if (settings.han === null) return;

      const data = settings.mode === SCORE_CALC_MODE.LIMIT_BASED
        ? limitScores[settings.role][settings.han as ManganOrHigher]
        : scoresTable[settings.role][settings.fu as number][settings.han as number];
      
      const ronBase = data.ron || 0;
      basePointsPerPlayer[wId] = ronBase;
      
      let winnerGain = ronBase;

      // 供託と本場は選択されたプレイヤーが受け取る
      if (wId === headBumpWinnerId) {
        const honbaPoints = gameState.honba * (gameState.rules?.tsumiboPoints ?? DEFAULT_TSUMIBO);
        winnerGain += honbaPoints + gameState.kyotaku;
        totalLostByLoser += ronBase + honbaPoints;
      } else {
        totalLostByLoser += ronBase;
      }

      newPlayers = newPlayers.map(p => 
        p.id === wId ? { ...p, score: p.score + winnerGain } : p
      );
    });

    newPlayers = newPlayers.map(p => 
      p.id === loserId ? { ...p, score: p.score - totalLostByLoser } : p
    );

    // 本場を受け取ったプレイヤーが親なら本場増加、そうでなければリセット
    const isKamichaOya = gameState.players.find(p => p.id === headBumpWinnerId)?.isDealer;
    const newHonba = isKamichaOya ? gameState.honba + 1 : 0;

    // 点数差分の記録
    const pointDiffs: Record<number, number> = {};
    newPlayers.forEach(p => {
      const oldPlayer = gameState.players.find(op => op.id === p.id);
      if (oldPlayer) {
        pointDiffs[p.id] = p.score - oldPlayer.score;
      }
    });

    onApply({
      ...gameState,
      players: newPlayers,
      honba: newHonba,
      kyotaku: 0,
    }, {
      type: HAND_RESULT_TYPE.AGARI,
      agariType: AGARI_TYPE.RON,
      winnerIds,
      loserId,
      points: pointDiffs,
      basePoints: basePointsPerPlayer,
      honba: gameState.honba,
      isOyaWin: isKamichaOya || false
    });

    resetAndClose();
  };

  const resetAndClose = () => {
    setStep("winners");
    setWinnerIds([]);
    setLoserId(null);
    setWinnerScores({});
    setHeadBumpWinnerId(null);
    onClose();
  };

  const renderWinnersStep = () => (
    <div className="space-y-4">
      <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">1. 和了者を選択（複数）</label>
      <div className="grid grid-cols-2 gap-2">
        {gameState.players.map(p => (
          <button
            key={p.id}
            onClick={() => handleToggleWinner(p.id)}
            className={`py-6 text-xl rounded-xl font-bold transition-all ${
              winnerIds.includes(p.id) 
                ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 shadow-md scale-[0.98]' 
                : 'bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:border-neutral-300'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="pt-2">
        {winnerIds.length < 2 && (
          <p className="text-xs text-orange-500 font-bold animate-pulse">※2名以上を選択してください</p>
        )}
        {winnerIds.length >= gameState.players.length && (
          <p className="text-xs text-red-500 font-bold">※全員があがることはできません（放銃者が必要です）</p>
        )}
      </div>
    </div>
  );

  const renderLoserStep = () => (
    <div className="space-y-4">
      <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">2. 放銃者を選択</label>
      <div className="grid grid-cols-2 gap-2">
        {gameState.players.map(p => {
          const isWinner = winnerIds.includes(p.id);
          return (
            <button
              key={p.id}
              disabled={isWinner}
              onClick={() => { setLoserId(p.id); setStep("scores"); }}
              className={`py-6 text-xl rounded-xl font-bold transition-all ${
                isWinner 
                  ? 'opacity-10 cursor-not-allowed grayscale' 
                  : loserId === p.id 
                    ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 shadow-md' 
                    : 'bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:border-neutral-300'
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderScoresStep = () => (
    <div className="space-y-6">
      <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">3. 各プレイヤーの点数（翻・符）</label>
      <div className="space-y-6">
        {currentWinnersList.map(p => {
          if (!p) return null;
          const settings = winnerScores[p.id];
          return (
            <div key={p.id} className="p-5 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-4 bg-white dark:bg-neutral-900">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <span className="font-black text-lg text-neutral-800 dark:text-neutral-200">{p.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${p.isDealer ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600'}`}>
                  {p.isDealer ? "親" : "子"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest px-1">翻</label>
                  <select 
                    value={settings.han ?? ""} 
                    onChange={(e) => {
                      const raw = e.target.value;
                      const isLimit = isNaN(Number(raw)) && raw !== "";
                      const val = raw === "" ? null : isLimit ? raw as ManganOrHigher : Number(raw);
                      setWinnerScores(prev => ({
                        ...prev,
                        [p.id]: { 
                          ...prev[p.id], 
                          han: val, 
                          fu: isLimit ? undefined : (prev[p.id].mode === SCORE_CALC_MODE.LIMIT_BASED ? null : prev[p.id].fu),
                          mode: isLimit ? SCORE_CALC_MODE.LIMIT_BASED : SCORE_CALC_MODE.FU_BASED
                        }
                      }));
                    }}
                    className={`w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl font-bold text-lg appearance-none cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${settings.han === null ? 'text-neutral-400 font-normal italic' : ''}`}
                  >
                    <option value="">選択してください</option>
                    <optgroup label="一般役">
                      {HAN_OPTIONS.map(h => <option key={h} value={h}>{h}翻</option>)}
                    </optgroup>
                    <optgroup label="満貫以上">
                      {LIMIT_HANDS.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
                    </optgroup>
                  </select>
                </div>
                {settings.han !== null && settings.mode === SCORE_CALC_MODE.FU_BASED && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest px-1">符</label>
                    <select
                      value={settings.fu ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value);
                        setWinnerScores(prev => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], fu: val }
                        }));
                      }}
                      className={`w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl font-bold text-lg appearance-none cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${settings.fu === null ? 'text-neutral-400 font-normal italic' : ''}`}
                    >
                      <option value="">選択</option>
                      {FU_OPTIONS.map(f => <option key={f} value={f}>{f}符</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">4. 本場・供託の受取人を選択</label>
        <div className="grid grid-cols-2 gap-2">
          {currentWinnersList.map(p => {
            if (!p) return null;
            return (
              <button
                key={p.id}
                onClick={() => setHeadBumpWinnerId(p.id)}
                className={`py-6 text-xl rounded-2xl font-black transition-all ${
                  headBumpWinnerId === p.id 
                    ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 shadow-xl scale-[1.02]' 
                    : 'bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-400 opacity-60'
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-neutral-400 leading-relaxed italic px-2">
          ※積み棒（本場点）と供託リーチ棒を受け取るプレイヤーを1人選んでください。
        </p>
      </div>

      <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">点数推移の見込み</label>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 space-y-4">
          {winnerIds.map(wId => {
            const p = gameState.players.find(pl => pl.id === wId);
            const settings = winnerScores[wId];
            if (!p || settings.han === null || (settings.mode === SCORE_CALC_MODE.FU_BASED && settings.fu === null)) return null;
            
            const data = settings.mode === SCORE_CALC_MODE.LIMIT_BASED
              ? limitScores[settings.role][settings.han as ManganOrHigher] 
              : scoresTable[settings.role][settings.fu as number][settings.han as number];
            
            const isReciever = wId === headBumpWinnerId;
            const gain = (data.ron || 0) + (isReciever ? (gameState.honba * (gameState.rules?.tsumiboPoints ?? DEFAULT_TSUMIBO) + gameState.kyotaku) : 0);
            return (
              <div key={wId} className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-bold text-neutral-700 dark:text-neutral-300">{p?.name}</span>
                  {isReciever && (gameState.honba > 0 || gameState.kyotaku > 0) && (
                    <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">本場・供託 受取済</span>
                  )}
                </div>
                <span className="text-2xl font-black text-green-600 tabular-nums">+{gain.toLocaleString()}</span>
              </div>
            );
          })}
          {loserId && (
            <div className="flex justify-between items-center pt-4 border-t border-neutral-100 dark:border-neutral-800/50">
              <span className="font-bold text-neutral-400">{gameState.players.find(p => p.id === loserId)?.name} (放銃)</span>
              <span className="text-2xl font-black text-red-600 tabular-nums">
                -{winnerIds.reduce((sum, wId) => {
                  const settings = winnerScores[wId];
                  if (settings.han === null || (typeof settings.han === 'number' && settings.fu === null)) return sum;
                  
                  const data = settings.mode === SCORE_CALC_MODE.LIMIT_BASED
                    ? limitScores[settings.role][settings.han as ManganOrHigher] 
                    : scoresTable[settings.role][settings.fu || 30][settings.han as number];
                  const isReciever = wId === headBumpWinnerId;
                  return sum + (data.ron || 0) + (isReciever ? (gameState.honba * (gameState.rules?.tsumiboPoints ?? DEFAULT_TSUMIBO)) : 0);
                }, 0).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const footer = (
    <div className="flex justify-between gap-4 w-full px-2 pb-2">
      {step !== "winners" && (
        <button
          onClick={() => {
            if (step === "loser") setStep("winners");
            if (step === "scores") setStep("loser");
            if (step === "confirm") setStep("scores");
          }}
          className="px-8 py-5 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 font-black rounded-xl transition-all hover:bg-neutral-100 dark:hover:bg-neutral-700"
        >
          戻る
        </button>
      )}
      <div className="flex-1" />
      {step === "winners" && winnerIds.length >= 2 && winnerIds.length < gameState.players.length && (
        <button
          onClick={() => setStep("loser")}
          className="px-10 py-5 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 font-black rounded-xl shadow-lg transition-all active:scale-98 animate-in fade-in zoom-in duration-300"
        >
          次へ
        </button>
      )}
      {step === "loser" && loserId && (
        <button
          onClick={() => setStep("scores")}
          className="px-10 py-5 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 font-black rounded-xl shadow-lg transition-all active:scale-98 animate-in fade-in zoom-in duration-300"
        >
          次へ
        </button>
      )}
      {step === "scores" && (
        <button
          disabled={!winnerIds.every(wId => {
            const s = winnerScores[wId];
            return s.han !== null && (s.mode === SCORE_CALC_MODE.LIMIT_BASED || s.fu !== null);
          })}
          onClick={() => {
            if (!headBumpWinnerId) setHeadBumpWinnerId(winnerIds[0]);
            setStep("confirm");
          }}
          className={`px-10 py-5 font-black rounded-xl shadow-lg transition-all active:scale-98 animate-in fade-in zoom-in duration-300 ${
            winnerIds.every(wId => {
              const s = winnerScores[wId];
              return s.han !== null && (s.mode === SCORE_CALC_MODE.LIMIT_BASED || s.fu !== null);
            })
              ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-50"
          }`}
        >
          結果確認へ
        </button>
      )}
      {step === "confirm" && headBumpWinnerId && (
        <button
          onClick={handleApply}
          className="px-10 py-5 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 font-black rounded-xl shadow-lg transition-all active:scale-98 hover:opacity-90"
        >
          確定
        </button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="複数ロン入力"
      maxWidth="max-w-2xl"
      footer={footer}
    >
      <div className="p-2">
        {step === "winners" && renderWinnersStep()}
        {step === "loser" && renderLoserStep()}
        {step === "scores" && renderScoresStep()}
        {step === "confirm" && renderConfirmStep()}
      </div>
    </Modal>
  );
}
