import { Badge } from "@/components/ui/badge";

/** Numeric score pill — dynamic per-score color, built on the shadcn Badge. */
export function ScoreBadge({ score, color }: { score: number; color: string }) {
  return (
    <Badge
      variant="secondary"
      className="h-auto bg-white px-1.5 py-0.5 text-[11px] font-bold leading-none shadow-md ring-1 ring-black/5"
      style={{ color }}
    >
      {score.toFixed(1)}
    </Badge>
  );
}
