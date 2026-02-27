"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { HandRecord } from "@/lib/types";

interface ScoreChartProps {
  handRecords: HandRecord[];
}

export default function ScoreChart({ handRecords }: ScoreChartProps) {
  if (handRecords.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
        <p className="text-neutral-400 font-bold italic">局が進むとここにグラフが表示されます</p>
      </div>
    );
  }

  // Transform records into chart data
  // Start with initial scores
  const initialData = {
    index: 0,
    name: "開始",
  } as any;
  
  handRecords[0].preState.players.forEach(p => {
    initialData[p.name] = p.score;
  });

  const chartData = [initialData];

  handRecords.forEach((record, idx) => {
    const dataPoint = {
      index: idx + 1,
      name: `${idx + 1}`,
    } as any;
    
    record.postState.players.forEach(p => {
      dataPoint[p.name] = p.score;
    });
    
    chartData.push(dataPoint);
  });

  const players = handRecords[0].preState.players;
  const colors = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981"];

  return (
    <div className="h-80 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#888', fontSize: 10, fontWeight: 'bold' }}
          />
          <YAxis 
            hide={true} 
            domain={['dataMin - 5000', 'dataMax + 5000']} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontWeight: 'bold'
            }}
            itemStyle={{ fontSize: '12px' }}
          />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', fontSize: '12px' }} />
          {players.map((p, i) => (
            <Line 
              key={p.name}
              type="linear" 
              dataKey={p.name} 
              stroke={colors[i % colors.length]} 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={500}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
