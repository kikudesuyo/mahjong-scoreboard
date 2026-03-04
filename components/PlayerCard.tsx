import { useState } from "react";
import { Player } from "@/lib/types";

interface PlayerCardProps {
  player: Player;
  onRiichi: () => void;
  onAgari: () => void;
  onSetDealer?: () => void;
  onChangeName: (newName: string) => void;
  canRiichi: boolean;
}

export default function PlayerCard({ player, onRiichi, onAgari, onSetDealer, onChangeName, canRiichi }: PlayerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(player.name);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      onChangeName(tempName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className={`bg-mahjong-tile dark:bg-mahjong-tile rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-t-4 p-5 flex flex-col justify-between h-full transition-all duration-200 ${player.isRiichi ? 'border-orange-400/50' : 'border-neutral-200/50 dark:border-neutral-700/50'}`}>
      <div className="flex justify-between items-start mb-4">
        {isEditing ? (
          <form onSubmit={handleNameSubmit} className="flex-1 mr-2">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleNameSubmit}
              autoFocus
              className="w-full bg-neutral-100/50 dark:bg-neutral-900/50 border-none rounded px-2 py-1 text-lg font-bold focus:ring-1 focus:ring-mahjong-accent outline-none"
            />
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <h2 
              className="text-lg font-bold text-neutral-600 dark:text-neutral-300 truncate cursor-pointer hover:text-mahjong-accent transition-colors"
              onClick={() => setIsEditing(true)}
              title="クリックして名前を変更"
            >
              {player.name}
            </h2>
            {player.isDealer ? (
              <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-[20px] px-2 py-0.5 rounded border border-red-500/20 font-black">
                親
              </span>
            ) : (
              <button 
                onClick={onSetDealer}
                className="text-[20px] text-neutral-400 hover:text-red-500 hover:border-red-500/30 font-bold border border-neutral-200 dark:border-neutral-700/50 rounded px-1.5 py-0.5 transition-colors"
              >
                子
              </button>
            )}
            {player.isRiichi && (
              <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] px-2 py-0.5 rounded border border-orange-500/20 font-black">
                立直
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        {player.isRiichi ? (
          <div className="mb-4 animate-in fade-in zoom-in duration-300">
            <img 
              src="/riichi-stick.svg" 
              alt="Riichi Stick" 
              className="w-full h-auto max-h-6 object-contain opacity-90 dark:opacity-80"
            />
          </div>
        ) : (
          <div className="h-10 invisible" aria-hidden="true" />
        )}

        <div className="text-4xl font-black mb-6 text-neutral-800 dark:text-neutral-100 tabular-nums tracking-tighter">
          {player.score.toLocaleString()}
        </div>
        
        <div className="flex flex-col gap-4">
          <button
            onClick={onRiichi}
            disabled={!canRiichi}
            className={`w-full py-2.5 text-sm font-bold rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              player.isRiichi 
                ? "bg-neutral-100 dark:bg-neutral-800 text-orange-600 border border-orange-500/30 hover:bg-neutral-200 dark:hover:bg-neutral-700" 
                : "bg-neutral-200/50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            {player.isRiichi ? "立直取消" : "立直"}
          </button>
          <button
            onClick={onAgari}
            className="w-full py-3 text-sm font-bold rounded-lg bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            和了
          </button>
        </div>
      </div>
    </div>
  );
}
