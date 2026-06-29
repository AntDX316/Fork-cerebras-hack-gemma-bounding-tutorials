"use client";

import { useEffect, useState } from "react";
import type { AnalyzeResult } from "@/schemas/annotation";
import { ImageStage } from "./ImageStage";
import { StepTimeline } from "./overlay/StepTimeline";
import { GoodPanel } from "./panels/GoodPanel";
import { ResourcesPanel } from "./panels/ResourcesPanel";
import { SpeedHud } from "./panels/SpeedHud";
import { AskBox } from "./AskBox";

const MODEL = "gemma-4-31b";

/** Read-only, fully interactive render of a shared analysis (hover overlays,
 *  step timeline, speed HUD, follow-up chat). Mirrors the live result panel. */
export function SharedView({
  imageUrl,
  manualUrl,
  result,
}: {
  imageUrl: string;
  manualUrl?: string;
  result: AnalyzeResult;
}) {
  const [activeStep, setActiveStep] = useState(result.profile.sequence ? 1 : 0);
  const [playing, setPlaying] = useState(false);

  // The chat API needs a base64 data URI (not a hosted URL) to ground a
  // follow-up on the image. Fetch the public scene blob and convert it once;
  // degrade to text-only grounding if the fetch is blocked.
  const [imageDataUri, setImageDataUri] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        if (!cancelled && /^data:image\/(png|jpe?g|webp);base64,/.test(dataUri)) {
          setImageDataUri(dataUri);
        }
      } catch {
        /* leave undefined — follow-ups stay text-only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const steps = result.annotations.filter((a) => a.stepOrder > 0);
  const askContext = [
    result.profile.title,
    ...result.summary,
    ...result.annotations.map((a) => `${a.label}: ${a.fix}`),
  ].join("\n");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-3">
        <ImageStage src={imageUrl} manualSrc={manualUrl} result={result} activeStep={activeStep} />

        {result.profile.sequence && steps.length > 0 && (
          <StepTimeline
            steps={steps}
            active={activeStep}
            onChange={setActiveStep}
            playing={playing}
            onPlayingChange={setPlaying}
          />
        )}
      </div>

      <div className="min-w-0 space-y-4">
        <SpeedHud speed={result.speed} model={MODEL} />
        <GoodPanel result={result} />
        <ResourcesPanel result={result} />
        <AskBox context={askContext} image={imageDataUri} />
      </div>
    </div>
  );
}
