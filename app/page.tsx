import Analyzer from "@/components/Analyzer";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Visual Coach <span className="text-cyan-600">·</span> Gemma 4 on Cerebras
            </h1>
            <p className="text-xs text-muted-foreground">
              Point at anything — get instant on-image guidance, not a wall of text.
            </p>
          </div>
          <Button variant="outline" size="sm" render={<a href="/api/health?live=1" />}>
            Health check
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[1700px] px-4 py-6">
        <Analyzer />
      </div>

      <footer className="mx-auto max-w-[1700px] px-4 py-8 text-center text-xs text-muted-foreground">
        Multi-agent pipeline · Planner → Grounding → Coach (parallel) → Research → Sequencer ·
        powered by gemma-4-31b on Cerebras
      </footer>
    </main>
  );
}
