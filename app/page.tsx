import MahjongTracker from "@/components/MahjongTracker";

export default function Home() {
  return (
    <main className="min-h-screen p-4 sm:p-8 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">麻雀点数管理</h1>
          </div>
        </header>
        
        <MahjongTracker />
      </div>
    </main>
  );
}
