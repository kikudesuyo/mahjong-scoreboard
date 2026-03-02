"use client";

import { useState, useEffect } from "react";
import { GameState, INITIAL_STATE, validateInvariant, HandRecord, HandResult } from "@/lib/types";
import { STARTING_SCORE_3P, STARTING_SCORE_4P, TSUMIBO_OPTIONS_MAP, PLAYER_COUNT_OPTIONS } from "@/lib/constants";
import PlayerCard from "./PlayerCard";
import ScoreEntryModal from "./ScoreEntryModal";
import RyuukyokuModal from "./RyuukyokuModal";
import ManualAdjustmentModal from "./ManualAdjustmentModal";
import StatsView from "./StatsView";

export default function MahjongTracker() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [history, setHistory] = useState<GameState[]>([]);
  const [handRecords, setHandRecords] = useState<HandRecord[]>([]);
  const [currentState, setCurrentState] = useState<GameState>(INITIAL_STATE);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [setupNames, setSetupNames] = useState(["", "", ""]);
  const [setupRules, setSetupRules] = useState(INITIAL_STATE.rules);
  const [activeTab, setActiveTab] = useState<"scoreboard" | "stats">("scoreboard");
  
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isRyuukyokuModalOpen, setIsRyuukyokuModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
      const savedState = localStorage.getItem("mahjong_state");
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          // State Migration: Ensure rules exists
          if (!parsed.rules) {
            parsed.rules = INITIAL_STATE.rules;
          }
          setCurrentState(parsed);
        } catch (e) {
          console.error("Failed to parse saved state", e);
        }
      }
    const savedHistory = localStorage.getItem("mahjong_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse saved history", e);
      }
    }
    const savedHandRecords = localStorage.getItem("mahjong_hand_records");
    if (savedHandRecords) {
      try {
        setHandRecords(JSON.parse(savedHandRecords));
      } catch (e) {
        console.error("Failed to parse saved hand records", e);
      }
    }
    const savedSetup = localStorage.getItem("mahjong_setup");
    if (savedSetup === "true") {
      setIsSetupComplete(true);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mahjong_state", JSON.stringify(currentState));
      localStorage.setItem("mahjong_history", JSON.stringify(history));
      localStorage.setItem("mahjong_hand_records", JSON.stringify(handRecords));
      localStorage.setItem("mahjong_setup", isSetupComplete.toString());
    }
  }, [currentState, history, handRecords, isLoaded, isSetupComplete]);

  const applyStateUpdate = (newState: GameState, result?: HandResult) => {
    if (newState.rules.hasHakoshita) {
      const negativePlayer = newState.players.find(p => p.score < 0);
      if (negativePlayer) {
        alert(`${negativePlayer.name}さんがハコ割れ（0点未満）しました。ゲーム終了です！`);
      }
    }

    // Clear riichi status when moving to a new state (e.g. after agari/ryuukyoku)
    const playersWithoutRiichi = newState.players.map(p => ({ ...p, isRiichi: false }));
    const finalState = { ...newState, players: playersWithoutRiichi };

    setHistory((prev) => [...prev, currentState]);
    setCurrentState(finalState);

    if (result) {
      const record: HandRecord = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        preState: currentState,
        postState: finalState,
        result: result
      };
      setHandRecords((prev) => [...prev, record]);
    }
  };

  const undo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setCurrentState(previousState);
    setHistory((prev) => prev.slice(0, -1));
    setHandRecords((prev) => prev.slice(0, -1));
  };
  
  const resetGame = () => {
    if (confirm("新しくゲームを始めますか？現在のスコアはリセットされます。")) {
      setHistory([]);
      setHandRecords([]);
      const is4P = currentState.rules.playerCount === 4;
      const startScore = is4P ? STARTING_SCORE_4P : STARTING_SCORE_3P;
      setCurrentState({
        ...INITIAL_STATE,
        players: currentState.players.map(p => ({ ...p, score: startScore, isRiichi: false })), // Keep names, reset scores & riichi
        rules: currentState.rules // Keep rules
      });
    }
  };
  
  const clearCache = () => {
    if (confirm("全てのデータ（プレイヤー名含む）を完全に初期化しますか？")) {
      setHistory([]);
      setHandRecords([]);
      setCurrentState(INITIAL_STATE);
      setIsSetupComplete(false);
      setSetupNames(["", "", ""]);
      setSetupRules(INITIAL_STATE.rules);
      localStorage.removeItem("mahjong_state");
      localStorage.removeItem("mahjong_history");
      localStorage.removeItem("mahjong_setup");
    }
  };

  const handleRiichi = (playerId: number) => {
    const player = currentState.players.find((p) => p.id === playerId);
    if (!player) return;
    
    // If already in Riichi, cancel it
    if (player.isRiichi) {
      const newPlayers = currentState.players.map((p) => 
        p.id === playerId ? { ...p, score: p.score + 1000, isRiichi: false } : p
      );
      
      setHistory((prev) => [...prev, currentState]);
      setCurrentState({
        ...currentState,
        players: newPlayers,
        kyotaku: currentState.kyotaku - 1000,
      });
      return;
    }

    if (player.score < 1000) return; // Cannot riichi if less than 1000 points
    
    const newPlayers = currentState.players.map((p) => 
      p.id === playerId ? { ...p, score: p.score - 1000, isRiichi: true } : p
    );
    
    setHistory((prev) => [...prev, currentState]);
    setCurrentState({
      ...currentState,
      players: newPlayers,
      kyotaku: currentState.kyotaku + 1000,
    });
  };

  const handleSetDealer = (playerId: number) => {
    const newPlayers = currentState.players.map((p) => ({
      ...p,
      isDealer: p.id === playerId
    }));
    setCurrentState({ ...currentState, players: newPlayers });
  };

  const handleNameChange = (playerId: number, newName: string) => {
    const newPlayers = currentState.players.map((p) => 
      p.id === playerId ? { ...p, name: newName } : p
    );
    setCurrentState({ ...currentState, players: newPlayers });
  };

  const handleUpdateHonba = (delta: number) => {
    const newHonba = Math.max(0, currentState.honba + delta);
    if (newHonba === currentState.honba) return;
    
    setHistory((prev) => [...prev, currentState]);
    setCurrentState({ ...currentState, honba: newHonba });
  };

  const handleSetupNameChange = (index: number, name: string) => {
    const newNames = [...setupNames];
    newNames[index] = name;
    setSetupNames(newNames);
  };

  const completeSetup = () => {
    const is4P = setupRules.playerCount === 4;
    const startScore = is4P ? STARTING_SCORE_4P : STARTING_SCORE_3P;
    
    // Apply setup names, using defaults if empty
    const newPlayers = Array.from({ length: setupRules.playerCount }).map((_, i) => ({
      id: i + 1,
      name: setupNames[i]?.trim() || `プレイヤー${i + 1}`,
      score: startScore,
      isDealer: i === 0
    }));
    
    setCurrentState({ 
      ...currentState, 
      players: newPlayers,
      rules: setupRules
    });
    setIsSetupComplete(true);
  };

  if (!isLoaded) {
    return <div className="p-8 text-center text-neutral-500 font-bold">読み込み中...</div>;
  }

  if (!isSetupComplete) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-8 max-w-md mx-auto">
        <h2 className="text-2xl font-black mb-6 text-center text-orange-600">ルール設定</h2>  
        <p className="text-sm text-neutral-500 mb-8 text-center">人数、プレイヤー名、ルールを選択してください</p>
        
        <div className="space-y-8">
          <section className="space-y-3">
            <p className="text-lg font-black text-neutral-800 dark:text-neutral-200">1. 人数を選択</p>
            <div className="grid grid-cols-2 gap-2">
              {PLAYER_COUNT_OPTIONS.map(count => (
                <button
                  key={count}
                  onClick={() => {
                    const newCount = count;
                    setSetupRules(prev => ({ 
                      ...prev, 
                      playerCount: newCount,
                      tsumiboPoints: TSUMIBO_OPTIONS_MAP[newCount][0]
                    }));
                    // Ensure setupNames has enough entries
                    if (setupNames.length < newCount) {
                      setSetupNames([...setupNames, ...Array(newCount - setupNames.length).fill("")]);
                    }
                  }}
                  className={`py-3 text-sm font-bold rounded-xl border transition-all ${setupRules.playerCount === count ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-500 text-orange-600' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-400'}`}
                >
                  {count}人麻雀
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <p className="text-lg border-t border-neutral-100 dark:border-neutral-700 pt-8 font-black text-neutral-800 dark:text-neutral-200">2. プレイヤー名を入力</p>
            {Array.from({ length: setupRules.playerCount }).map((_, i) => (
              <div key={i}>
                <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">プレイヤー {i + 1}</label>
                <input
                  type="text"
                  value={setupNames[i] || ""}
                  onChange={(e) => handleSetupNameChange(i, e.target.value)}
                  placeholder={`（入力なしで「プレイヤー${i + 1}」になります）`}
                  className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 font-bold text-base focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
              </div>
            ))}
          </section>

          <section className="pt-8 border-t border-neutral-100 dark:border-neutral-700 space-y-6">
            <p className="text-lg font-black text-neutral-800 dark:text-neutral-200">3. ルール設定</p>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-black text-neutral-800 dark:text-neutral-200">ハコシタ終了</p>
                <p className="text-xs text-neutral-500">0点未満で対局を終了します</p>
              </div>
              <button 
                onClick={() => setSetupRules(prev => ({ ...prev, hasHakoshita: !prev.hasHakoshita }))}
                className={`w-14 h-8 rounded-full transition-all relative ${setupRules.hasHakoshita ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${setupRules.hasHakoshita ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="font-bold text-neutral-700 dark:text-neutral-300 text-sm">積み棒の点数</p>
              <div className="grid grid-cols-2 gap-2">
                {(TSUMIBO_OPTIONS_MAP[setupRules.playerCount] || []).map(val => (
                  <button
                    key={val}
                    onClick={() => setSetupRules(prev => ({ ...prev, tsumiboPoints: val }))}
                    className={`py-2 text-sm font-bold rounded-xl border transition-all ${setupRules.tsumiboPoints === val ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-500 text-orange-600' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-400'}`}
                  >
                    {setupRules.playerCount === 3 ? (val === 200 ? '通常 (200)' : `${val}点`) : (val === 300 ? '通常 (300)' : `${val}点`)}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <button 
          onClick={completeSetup}
          className="w-full py-4 mt-8 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-xl rounded-xl transition-all shadow-sm"
        >
          ゲーム開始！
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex p-1 bg-neutral-100 dark:bg-neutral-900/50 rounded-2xl w-fit mx-auto border border-neutral-200 dark:border-neutral-800">
        <button 
          onClick={() => setActiveTab("scoreboard")}
          className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === "scoreboard" ? "bg-white dark:bg-neutral-800 text-orange-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"}`}
        >
          スコアボード
        </button>
        <button 
          onClick={() => setActiveTab("stats")}
          className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === "stats" ? "bg-white dark:bg-neutral-800 text-orange-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"}`}
        >
          記録・スタッツ
        </button>
      </div>

      {activeTab === "stats" ? (
        <StatsView handRecords={handRecords} />
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Table Center / Game Info */}
          <div className="bg-mahjong-green/50 dark:bg-mahjong-green/20 rounded-2xl border border-mahjong-green dark:border-mahjong-green/30 p-8 flex flex-col items-center justify-center relative shadow-inner">
            <div className="grid grid-cols-2 gap-12 w-full text-center">
              <div className="relative group">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-black uppercase tracking-[0.2em] mb-4">本場</p>
                <div className="flex items-center justify-center gap-6">
                  <button 
                    onClick={() => handleUpdateHonba(-1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800 transition-all text-xl"
                    aria-label="本場を減らす"
                  >
                    −
                  </button>
                  <p className="text-6xl font-black text-neutral-800 dark:text-neutral-100 min-w-[1ch] tabular-nums">{currentState.honba}</p>
                  <button 
                    onClick={() => handleUpdateHonba(1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800 transition-all text-xl"
                    aria-label="本場を増やす"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="relative">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-black uppercase tracking-[0.2em] mb-4">供託</p>
                <p className="text-6xl font-black text-neutral-800 dark:text-neutral-100 tabular-nums">{currentState.kyotaku.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${currentState.rules.playerCount === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
            {currentState.players.map((player) => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                onRiichi={() => handleRiichi(player.id)} 
                onSetDealer={() => handleSetDealer(player.id)}
                onChangeName={(name) => handleNameChange(player.id, name)} 
                canRiichi={player.isRiichi ? true : player.score >= 1000} 
              />
            ))}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <button 
              onClick={() => setIsScoreModalOpen(true)}
              className="px-6 py-3.5 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 font-bold rounded-xl transition-all active:scale-95 shadow-sm"
            >
              和了
            </button>
            <button 
              onClick={() => setIsRyuukyokuModalOpen(true)}
              className="px-6 py-3.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-all active:scale-95"
            >
              流局
            </button>
            <button 
              onClick={() => setIsManualModalOpen(true)}
              className="px-6 py-3.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-all active:scale-95"
            >
              修正
            </button>
            <button 
              onClick={undo}
              disabled={history.length === 0}
              className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-400 dark:text-neutral-600 font-bold rounded-xl border border-transparent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              戻す
            </button>
          </div>
          
          <div className="flex justify-center pt-8 gap-8">
            <button onClick={resetGame} className="text-[20px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
              点数リセット
            </button>
            <button onClick={clearCache} className="text-[20px] font-black uppercase tracking-widest text-red-400/50 hover:text-red-500 transition-colors">
              ゲーム終了
            </button>
          </div>
        </div>
      )}

      <ScoreEntryModal 
        isOpen={isScoreModalOpen} 
        onClose={() => setIsScoreModalOpen(false)} 
        gameState={currentState} 
        onApply={applyStateUpdate} 
      />
      
      <RyuukyokuModal 
        isOpen={isRyuukyokuModalOpen} 
        onClose={() => setIsRyuukyokuModalOpen(false)} 
        gameState={currentState} 
        onApply={applyStateUpdate} 
      />

      <ManualAdjustmentModal 
        isOpen={isManualModalOpen} 
        onClose={() => setIsManualModalOpen(false)} 
        gameState={currentState} 
        onApply={applyStateUpdate} 
      />
    </div>
  );
}
