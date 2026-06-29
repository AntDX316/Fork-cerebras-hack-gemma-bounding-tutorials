"use client";

import { type CSSProperties, useCallback, useRef, useState } from "react";
import type { AnalyzeResult } from "@/schemas/annotation";
import { getPreset } from "@/prompts/presets";
import { ModePicker } from "./ModePicker";
import { PhotoUpload } from "./PhotoUpload";
import { WebcamCapture } from "./WebcamCapture";
import { ImageStage } from "./ImageStage";
import { StepTimeline } from "./overlay/StepTimeline";
import { GoodPanel } from "./panels/GoodPanel";
import { ResourcesPanel } from "./panels/ResourcesPanel";
import { SpeedHud } from "./panels/SpeedHud";
import { AskBox } from "./AskBox";
import { ExportBar } from "./ExportBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Analyzed {
  src: string;
  manualSrc?: string;
  result: AnalyzeResult;
}

const MODEL = "gemma-4-31b";

/** Thin collapsed rail with a vertical label; click to re-expand the panel. */
function SideRail({ label, side, onOpen }: { label: string; side: "left" | "right"; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Expand ${label} panel`}
      title={`Expand ${label}`}
      className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground lg:h-full lg:flex-col"
    >
      <span className="text-sm leading-none">{side === "left" ? "›" : "‹"}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide lg:[writing-mode:vertical-rl]">
        {label}
      </span>
    </button>
  );
}

/** Small inline collapse control shown at the top of an open side panel (lg only). */
function CollapseButton({ side, onClose }: { side: "left" | "right"; onClose: () => void }) {
  return (
    <div className={`hidden lg:flex ${side === "left" ? "justify-end" : "justify-start"}`}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Collapse panel"
        className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      >
        {side === "left" ? "Hide ‹" : "› Hide"}
      </button>
    </div>
  );
}

export default function Analyzer() {
  const [presetId, setPresetId] = useState<string | undefined>("fridge");
  const [goal, setGoal] = useState("");
  const [captureMode, setCaptureMode] = useState<"upload" | "webcam">("upload");
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [analyzed, setAnalyzed] = useState<Analyzed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [live, setLive] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const inFlight = useRef(false);

  const analyze = useCallback(
    async (imgs: string[]) => {
      if (inFlight.current) return;
      if (!imgs.length) {
        setError("Add a photo or capture a frame first.");
        return;
      }
      inFlight.current = true;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Live webcam frames skip reasoning for minimum latency.
          body: JSON.stringify({ goal: goal || undefined, presetId, images: imgs, fast: live }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Analysis failed");
        const result = data as AnalyzeResult;
        setAnalyzed({ src: imgs[0], manualSrc: imgs[1], result });
        setActiveStep(result.profile.sequence ? 1 : 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed");
      } finally {
        setLoading(false);
        inFlight.current = false;
      }
    },
    [goal, presetId, live],
  );

  const onPreset = (id: string) => {
    setPresetId(id);
    const p = getPreset(id);
    if (p) setGoal(p.goal);
  };
  const onGoal = (g: string) => {
    setGoal(g);
    setPresetId(undefined); // typing a custom goal => Planner mode
  };

  const result = analyzed?.result ?? null;
  const displaySrc = analyzed?.src ?? previewImages[0] ?? null;
  const displayManual = analyzed?.manualSrc ?? previewImages[1];
  const steps = result?.annotations.filter((a) => a.stepOrder > 0) ?? [];
  const askContext = result
    ? [
        result.profile.title,
        ...result.summary,
        ...result.annotations.map((a) => `${a.label}: ${a.fix}`),
      ].join("\n")
    : "";

  const cols = `${leftOpen ? "320px" : "2.75rem"} minmax(0,1fr) ${rightOpen ? "340px" : "2.75rem"}`;

  return (
    <div
      className="grid grid-cols-1 gap-4 lg:[grid-template-columns:var(--vc-cols)]"
      style={{ "--vc-cols": cols } as CSSProperties}
    >
      {/* Left: mode + capture (collapsible) */}
      {!leftOpen ? (
        <SideRail label="Setup" side="left" onOpen={() => setLeftOpen(true)} />
      ) : (
        <div className="min-w-0 space-y-3">
          <CollapseButton side="left" onClose={() => setLeftOpen(false)} />
          <ModePicker presetId={presetId} goal={goal} onPreset={onPreset} onGoal={onGoal} />

        <Card>
          <CardContent>
            <Tabs
              value={captureMode}
              onValueChange={(v) => {
                const m = (v as "upload" | "webcam") ?? "upload";
                setCaptureMode(m);
                if (m === "upload") setLive(false);
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="webcam">Webcam</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-3">
                <PhotoUpload onImages={setPreviewImages} />
                <Button
                  onClick={() => analyze(previewImages)}
                  disabled={loading || previewImages.length === 0}
                  className="mt-3 h-10 w-full"
                >
                  {loading ? "Analyzing…" : "Analyze ⚡"}
                </Button>
              </TabsContent>

              <TabsContent value="webcam" className="mt-3">
                <WebcamCapture
                  onFrame={(frame) => {
                    setPreviewImages([frame]);
                    void analyze([frame]);
                  }}
                  live={live}
                  onToggleLive={setLive}
                  busy={loading}
                />
              </TabsContent>
            </Tabs>

            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </CardContent>
        </Card>
        </div>
      )}

      {/* Center: stage */}
      <div className="min-w-0 space-y-3">
        {displaySrc ? (
          <ImageStage
            src={displaySrc}
            manualSrc={displayManual}
            result={result}
            activeStep={activeStep}
          />
        ) : (
          <div className="mx-auto flex aspect-[3/4] max-w-2xl items-center justify-center rounded-2xl border-2 border-dashed border-input bg-card text-center text-sm text-muted-foreground">
            Upload a photo or use your webcam to begin.
          </div>
        )}

        {result?.profile.sequence && steps.length > 0 && (
          <div className="w-full">
            <StepTimeline
              steps={steps}
              active={activeStep}
              onChange={setActiveStep}
              playing={playing}
              onPlayingChange={setPlaying}
            />
          </div>
        )}

        {loading && (
          <div className="w-full rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-center text-sm font-medium text-primary">
            Gemma 4 is analyzing on Cerebras…
          </div>
        )}

        {result && displaySrc && (
          <ExportBar src={displaySrc} result={result} manualSrc={displayManual} />
        )}
      </div>

      {/* Right: results (collapsible) */}
      {!rightOpen ? (
        <SideRail label="Results" side="right" onOpen={() => setRightOpen(true)} />
      ) : (
        <div className="min-w-0 space-y-4">
          <CollapseButton side="right" onClose={() => setRightOpen(false)} />
          {result ? (
          <>
            <SpeedHud result={result} model={MODEL} />
            <GoodPanel result={result} />
            <ResourcesPanel result={result} />
            {result.warnings && result.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-300/50 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <div className="font-semibold">Notes</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <AskBox context={askContext} image={displaySrc ?? undefined} />
          </>
        ) : (
          <Card>
            <CardContent className="text-sm text-muted-foreground">
              Results, scores, and the Cerebras speed HUD will appear here.
            </CardContent>
          </Card>
          )}
        </div>
      )}
    </div>
  );
}
