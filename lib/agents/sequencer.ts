import type { Annotation } from "@/schemas/annotation";

/**
 * Sequencer agent — orders annotations into a 1..N procedure. The coach already
 * proposes a stepOrder per item; we sort by it and renumber densely so the
 * StepTimeline is always contiguous.
 */
export function sequence(annotations: Annotation[]): Annotation[] {
  const sorted = [...annotations].sort((a, b) => {
    const ao = a.stepOrder > 0 ? a.stepOrder : Number.MAX_SAFE_INTEGER;
    const bo = b.stepOrder > 0 ? b.stepOrder : Number.MAX_SAFE_INTEGER;
    return ao - bo;
  });
  return sorted.map((a, i) => ({ ...a, stepOrder: i + 1 }));
}
