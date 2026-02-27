"use client";

import { HandRecord, PlayerStats } from "@/lib/types";
import ScoreChart from "./ScoreChart";

interface StatsViewProps {
  handRecords: HandRecord[];
}

export default function StatsView({ handRecords }: StatsViewProps) {
  // Calculate statistics
  const calculateStats = (): PlayerStats[] => {
    if (handRecords.length === 0) return [];

    const players = handRecords[0].preState.players;
    const statsMap: Record<number, PlayerStats> = {};

    players.forEach(p => {
      statsMap[p.id] = {
        playerId: p.id,
        name: p.name,
        agariCount: 0,
        houjuuCount: 0,
        tenpaiCount: 0,
        totalHands: 0,
        totalPoints: 0,
        riichiCount: 0,
        avgAgariPoints: 0,
        agariRate: 0,
        houjuuRate: 0,
        tenpaiRate: 0,
      };
    });

    handRecords.forEach(record => {
      const { result, preState } = record;
      
      // Multi-winner Ron handles multiple winner increases
      if (result.winnerIds) {
        result.winnerIds.forEach(id => {
          if (statsMap[id]) {
            statsMap[id].agariCount++;
            // Use basePoints for average calculation (excludes Honba/Kyotaku), fallback to total gain if missing
            const gain = result.basePoints?.[id] ?? result.points?.[id] ?? 0;
            statsMap[id].totalPoints += gain;
          }
        });
      }

      if (result.loserId !== undefined && result.loserId !== null) {
        if (statsMap[result.loserId]) {
          statsMap[result.loserId].houjuuCount++;
        }
      }

      // Track tenpai for ryuukyoku (winnerIds contains tenpai players in ryuukyoku result)
      if (result.type === "ryuukyoku" && result.winnerIds) {
        result.winnerIds.forEach(id => {
          if (statsMap[id]) {
            statsMap[id].tenpaiCount++;
          }
        });
      }

      // Riichi count (checked by comparing riichi status change)
      // Actually, we should probably have recorded Riichi in HandResult.
      // For now, check preState.players
      preState.players.forEach(p => {
        if (p.isRiichi && statsMap[p.id]) {
          statsMap[p.id].riichiCount++;
        }
      });

      // Total hands counter
      players.forEach(p => {
        if (statsMap[p.id]) statsMap[p.id].totalHands++;
      });
    });

    return Object.values(statsMap).map(s => {
      const total = s.totalHands || 1;
      return {
        ...s,
        agariRate: (s.agariCount / total) * 100,
        houjuuRate: (s.houjuuCount / total) * 100,
        tenpaiRate: (s.tenpaiCount / total) * 100, // This is simplified
        avgAgariPoints: s.agariCount > 0 ? s.totalPoints / s.agariCount : 0
      };
    });
  };

  const stats = calculateStats();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Score Chart */}
      <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-sm">
        <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-4">点数推移</h3>
        <ScoreChart handRecords={handRecords} />
      </section>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.playerId} className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-6 bg-orange-500 rounded-full" />
              <h4 className="font-black text-xl truncate">{s.name}</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <StatItem label="和了率" value={`${s.agariRate.toFixed(1)}%`} />
              <StatItem label="放銃率" value={`${s.houjuuRate.toFixed(1)}%`} />
              <StatItem label="和了回数" value={`${s.agariCount}回`} />
              <StatItem label="放銃回数" value={`${s.houjuuCount}回`} />
              <StatItem label="平均打点" value={`${Math.round(s.avgAgariPoints).toLocaleString()}点`} />
              <StatItem label="総局数" value={`${s.totalHands}局`} />
            </div>
          </div>
        ))}
      </div>

      {/* 3. History List */}
      <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm">
        <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest p-6 pb-2">対局履歴</h3>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
          {handRecords.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 font-bold italic">履歴がありません</div>
          ) : (
            [...handRecords].reverse().map((record, idx) => (
              <div key={record.id} className="p-6 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded uppercase tracking-tighter">
                      {record.result.type === "ryuukyoku" ? "流局" : record.result.type === "ron" ? "ロン" : record.result.type === "tsumo" ? "ツモ" : "修正"}
                    </span>
                    <span className="font-black text-lg">
                      {record.result.winnerIds?.map(id => record.preState.players.find(p => p.id === id)?.name).join(' ・ ') || "（なし）"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-bold">
                    {record.result.han ? `${record.result.han}翻 ${record.result.fu}符` : "-"}
                    {record.result.loserId && ` (放銃: ${record.preState.players.find(p => p.id === record.result.loserId)?.name})`}
                  </p>
                </div>
                <div className="text-right">
                   <div className="text-xs text-neutral-400 font-bold mb-1">点数状況</div>
                   <div className="flex gap-2">
                     {record.postState.players.map(p => (
                       <div key={p.id} className="text-[10px] font-black tabular-nums">
                         {p.name[0]}: {p.score}
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-lg font-black text-neutral-800 dark:text-neutral-200 tabular-nums">{value}</p>
    </div>
  );
}
