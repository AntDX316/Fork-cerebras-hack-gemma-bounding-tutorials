import type { AnalyzeResult } from "./annotation";

/**
 * What a public share link persists (as a JSON blob) so the /s page can
 * re-render the FULL interactive experience — not just a static PNG.
 *  - imageUrl: the clean, un-annotated scene (overlays are drawn live on top)
 *  - manualUrl: optional reference/manual image (assembly/repair tasks)
 *  - ogUrl: a baked report-card PNG used only for social unfurl previews
 *  - result: the complete AnalyzeResult (profile + annotations + speed)
 */
export interface ShareManifest {
  v: 1;
  title: string;
  imageUrl: string;
  manualUrl?: string;
  ogUrl: string;
  result: AnalyzeResult;
}
