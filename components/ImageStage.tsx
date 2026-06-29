"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { AnalyzeResult, Annotation, TaskProfile } from "@/schemas/annotation";
import { pctBox } from "@/lib/scale";
import { Dot } from "./overlay/Dot";
import { RegionBox } from "./overlay/RegionBox";
import { Tooltip } from "./overlay/Tooltip";

const TOOLTIP_W = 264;
const TOOLTIP_H = 200;
const GAP = 12;

/** Pixel-aware tooltip placement: flips/anchors so it stays inside the stage. */
function tooltipStyle(a: Annotation, stageW: number, stageH: number): CSSProperties {
  const [y1, x1, y2, x2] = a.box_2d;
  const cx = a.render === "dot" ? a.point.x : (x1 + x2) / 2;
  const cy = a.render === "dot" ? a.point.y : (y1 + y2) / 2;

  const px = stageW ? (cx / 1000) * stageW : cx * 0.672;
  const py = stageH ? (cy / 1000) * stageH : cy * 0.5;
  const flipX = stageW ? px + GAP + TOOLTIP_W > stageW : cx > 600;
  const flipY = stageH ? py - GAP - TOOLTIP_H < 0 : cy < 360;

  const anchorX = a.render === "dot" ? a.point.x : flipX ? Math.min(x1, x2) : Math.max(x1, x2);
  const anchorY = a.render === "dot" ? a.point.y : flipY ? Math.max(y1, y2) : Math.min(y1, y2);

  return {
    left: `${anchorX / 10}%`,
    top: `${anchorY / 10}%`,
    transform: `translate(${flipX ? `calc(-100% - ${GAP}px)` : `${GAP}px`}, ${
      flipY ? `${GAP}px` : `calc(-100% - ${GAP}px)`
    })`,
  };
}

function ariaLabelFor(a: Annotation, profile: TaskProfile): string {
  const score = a.scored ? `, ${profile.scoreLabel} ${a.score} out of 10` : "";
  const step = a.stepOrder > 0 ? `, step ${a.stepOrder}` : "";
  return `${a.label}${score}${step}`;
}

export function ImageStage({
  src,
  manualSrc,
  result,
  activeStep,
}: {
  src: string;
  manualSrc?: string;
  result: AnalyzeResult | null;
  activeStep: number;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aspect, setAspect] = useState(4 / 3);
  const [loaded, setLoaded] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);
  const [hover, setHover] = useState<string | null>(null);
  const [areaW, setAreaW] = useState(0);
  const [vh, setVh] = useState(800);

  // Reset the loaded guard during render when the source changes.
  if (prevSrc !== src) {
    setPrevSrc(src);
    setLoaded(false);
  }

  // Measure available width + viewport height so the image can fill the screen.
  useEffect(() => {
    const el = areaRef.current;
    if (el && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        const r = entries[0]?.contentRect;
        if (r) setAreaW(r.width);
      });
      ro.observe(el);
      const onResize = () => setVh(window.innerHeight);
      onResize();
      window.addEventListener("resize", onResize);
      return () => {
        ro.disconnect();
        window.removeEventListener("resize", onResize);
      };
    }
  }, []);

  const openHover = (id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHover(id);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHover(null), 140);
  };

  // Fit the image into the available area (width-bound or height-bound),
  // preserving aspect so percentage overlay coords stay accurate.
  const maxH = Math.max(320, vh * 0.82);
  let boxW = areaW;
  let boxH = areaW / aspect;
  if (boxH > maxH) {
    boxH = maxH;
    boxW = maxH * aspect;
  }
  if (boxW > areaW) {
    boxW = areaW;
    boxH = areaW / aspect;
  }
  const ready = areaW > 0;
  const boxStyle: CSSProperties = ready
    ? { width: boxW, height: boxH }
    : { width: "100%", aspectRatio: String(aspect) };

  const profile = result?.profile ?? null;
  const annotations = loaded && result ? result.annotations : [];
  const isSteps = profile?.renderStyle === "steps";

  const tooltipAnno =
    annotations.find((a) => a.id === hover) ??
    (isSteps ? annotations.find((a) => a.stepOrder === activeStep) ?? null : null);

  const activeManualRef = manualSrc ? tooltipAnno?.manualRef ?? null : null;

  return (
    <div className="w-full">
      <div ref={areaRef} className="flex w-full justify-center">
        <div
          className="relative overflow-hidden rounded-2xl bg-muted ring-1 ring-border"
          style={boxStyle}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Scene being analyzed"
            className="absolute inset-0 h-full w-full object-contain"
            onLoad={(e) => {
              const t = e.currentTarget;
              if (t.naturalWidth && t.naturalHeight) setAspect(t.naturalWidth / t.naturalHeight);
              setLoaded(true);
            }}
          />

          {annotations.map((a) => {
            const dimmed = isSteps && activeStep > 0 && a.stepOrder !== activeStep;
            const active = hover === a.id || (isSteps && a.stepOrder === activeStep);
            const ariaLabel = profile ? ariaLabelFor(a, profile) : a.label;
            if (a.render === "dot") {
              return (
                <Dot
                  key={a.id}
                  a={a}
                  active={active}
                  ariaLabel={ariaLabel}
                  onEnter={() => openHover(a.id)}
                  onLeave={scheduleClose}
                />
              );
            }
            return (
              <RegionBox
                key={a.id}
                a={a}
                active={active}
                dimmed={dimmed}
                ariaLabel={ariaLabel}
                onEnter={() => openHover(a.id)}
                onLeave={scheduleClose}
              />
            );
          })}

          {tooltipAnno && profile && (
            <Tooltip
              a={tooltipAnno}
              profile={profile}
              style={tooltipStyle(tooltipAnno, boxW, boxH)}
              onMouseEnter={() => openHover(tooltipAnno.id)}
              onMouseLeave={scheduleClose}
            />
          )}
        </div>
      </div>

      {/* Manual / reference image with the relevant region highlighted. */}
      {manualSrc && (
        <div className="relative mx-auto mt-3 w-full max-w-md overflow-hidden rounded-xl bg-muted ring-1 ring-border">
          <div className="absolute left-2 top-2 z-10 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
            Reference / manual
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={manualSrc} alt="Reference manual" className="block w-full" />
          {activeManualRef && (
            <div
              className="absolute rounded border-2 border-amber-400"
              style={{
                ...pctBox(activeManualRef),
                boxShadow: "0 0 0 3px rgba(251,191,36,0.35), 0 0 18px rgba(251,191,36,0.6)",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
