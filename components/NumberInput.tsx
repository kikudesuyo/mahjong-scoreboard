import { useRef, useEffect, useCallback } from "react";

interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export default function NumberInput({ 
  value, 
  onChange, 
  step = 100, 
  min, 
  max, 
  placeholder, 
  className = "",
  inputClassName = "" 
}: NumberInputProps) {
  
  const valueRef = useRef(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const increment = useCallback(() => {
    const nextVal = valueRef.current + step;
    if (max !== undefined && nextVal > max) return;
    onChange(nextVal);
  }, [max, onChange, step]);
  
  const decrement = useCallback(() => {
    const nextVal = valueRef.current - step;
    if (min !== undefined && nextVal < min) return;
    onChange(nextVal);
  }, [min, onChange, step]);

  const startIncrement = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only trigger on left click
    increment();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(increment, 70);
    }, 400);
  };

  const startDecrement = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only trigger on left click
    decrement();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(decrement, 70);
    }, 400);
  };

  const stopTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  };

  useEffect(() => {
    return stopTimer;
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button 
        type="button" 
        onPointerDown={startDecrement}
        onPointerUp={stopTimer}
        onPointerLeave={stopTimer}
        onPointerCancel={stopTimer}
        onContextMenu={(e) => { e.preventDefault(); stopTimer(); }}
        className="w-12 h-12 shrink-0 flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 rounded-xl text-2xl font-bold hover:bg-neutral-300 dark:hover:bg-neutral-700 active:bg-neutral-400 dark:active:bg-neutral-600 transition-colors shadow-sm select-none touch-none"
      >
        -
      </button>
      <input 
        type="number"
        value={value || ""}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        className={`flex-1 min-w-0 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2 font-mono text-center text-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm ${inputClassName}`}
      />
      <button 
        type="button" 
        onPointerDown={startIncrement}
        onPointerUp={stopTimer}
        onPointerLeave={stopTimer}
        onPointerCancel={stopTimer}
        onContextMenu={(e) => { e.preventDefault(); stopTimer(); }}
        className="w-12 h-12 shrink-0 flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 rounded-xl text-2xl font-bold hover:bg-neutral-300 dark:hover:bg-neutral-700 active:bg-neutral-400 dark:active:bg-neutral-600 transition-colors shadow-sm select-none touch-none"
      >
        +
      </button>
    </div>
  );
}
