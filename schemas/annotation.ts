/**
 * Shared data model — consumed by both the server pipeline and the client UI.
 * Contains NO secrets and NO server-only imports, so it is safe in the browser.
 */

/** Bounding box as Gemma emits it: [y1, x1, y2, x2] integers normalized to a 0..1000 grid. */
export type Box2D = [number, number, number, number];

/** A point on the same 0..1000 grid. */
export interface Point {
  x: number;
  y: number;
}

export interface Fact {
  label: string;
  value: string;
}

export interface Citation {
  title: string;
  url: string;
  snippet?: string;
}

export type RenderStyle = "dots" | "regions" | "steps";

/**
 * The runtime "mode". A Planner agent produces this from any user goal + image,
 * which is what makes the engine support unlimited modes (presets just freeze it).
 */
export interface TaskProfile {
  title: string;
  /** Precise noun phrase telling the grounding agent WHAT to locate. */
  targetDescription: string;
  renderStyle: RenderStyle;
  scored: boolean;
  /** 1-2 word noun for the score, e.g. "Form" | "Health"; "" when not scored. */
  scoreLabel: string;
  sequence: boolean;
  research: boolean;
  summaryLabel: string;
}

/** Raw grounding output before coaching is merged in. */
export interface Region {
  id: string;
  label: string;
  box_2d: Box2D;
}

/** Fully merged annotation that the overlay renders. */
export interface Annotation {
  id: string;
  label: string;
  box_2d: Box2D;
  /** Center of box_2d, used for dot rendering. */
  point: Point;
  render: "dot" | "region";
  /** 0 when not scored. */
  score: number;
  scored: boolean;
  /** Hex / rgb() color derived from score (or a stable hue when unscored). */
  color: string;
  whatGood: string[];
  fix: string;
  facts: Fact[];
  /** 0 when not part of a sequence; otherwise 1-based step position. */
  stepOrder: number;
  stepAction: string;
  /** Box in a secondary reference image (manual/diagram), or null. */
  manualRef: Box2D | null;
  citations: Citation[];
}

export interface SpeedReport {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  /** Effective aggregate throughput (completion tokens / wall-clock seconds). */
  tokensPerSecond: number;
  /** Fastest single Cerebras call's generation rate (the true on-device speed). */
  peakTokensPerSecond: number;
  ttftMs: number;
  wallClockMs: number;
  /** Total number of Cerebras model calls made for this request. */
  modelCalls: number;
  keysUsed: number;
  perCall: { agent: string; totalTimeMs: number; totalTokens: number }[];
}

export interface AnalyzeResult {
  profile: TaskProfile;
  annotations: Annotation[];
  overallScore: number | null;
  summary: string[];
  tip: string;
  speed: SpeedReport;
  warnings?: string[];
}

export interface AnalyzeRequest {
  goal?: string;
  presetId?: string;
  /** Data URIs (base64). Index 0 is the primary image; later ones are references. */
  images: string[];
  /** Live/webcam frames: skip reasoning everywhere for minimum latency. */
  fast?: boolean;
}
