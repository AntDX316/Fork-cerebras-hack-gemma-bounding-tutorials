"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import type { AnalyzeResult, Annotation, TaskProfile } from "@/schemas/annotation";
import { pctBox } from "@/lib/scale";
import { Dot } from "./overlay/Dot";
import { RegionBox } from "./overlay/RegionBox";
import { Tooltip } from "./overlay/Tooltip";

const TOOLTIP_W = 264;
const TOOLTIP_H = 240;
const GAP = 12;
const MAX_ZOOM = 5;
const MIN_ZOOM = 1;
const TOUR_MS = 3000;

/** Zoom + pan that frames a single annotation (centered, ~half the viewport). */
function frame(a: Annotation, stageW: number, stageH: number) {
  const [y1, x1, y2, x2] = a.box_2d;
  const bw = Math.max(8, (Math.abs(x2 - x1) / 1000) * stageW);
  const bh = Math.max(8, (Math.abs(y2 - y1) / 1000) * stageH);
  const z = Math.min(MAX_ZOOM, Math.max(2, Math.min((stageW * 0.5) / bw, (stageH * 0.5) / bh)));
  const cx = (((x1 + x2) / 2) / 1000) * stageW;
  const cy = (((y1 + y2) / 2) / 1000) * stageH;
  const x = Math.min(0, Math.max(stageW * (1 - z), stageW / 2 - cx * z));
  const y = Math.min(0, Math.max(stageH * (1 - z), stageH / 2 - cy * z));
  return { z, x, y };
}

/**
 * Pixel-aware tooltip placement in SCREEN space (crisp + constant size at any
 * zoom). Maps a grid coord c to screen px = pan + (c/1000)*stage*zoom.
 */
function tooltipStyle(
  a: Annotation,
  stageW: number,
  stageH: number,
  zoom: number,
  panX: number,
  panY: number,
): CSSProperties {
  const [y1, x1, y2, x2] = a.box_2d;
  const toX = (gx: number) => panX + (gx / 1000) * stageW * zoom;
  const toY = (gy: number) => panY + (gy / 1000) * stageH * zoom;

  // Anchor EDGES (screen px). The tooltip sits beside the box (right or left)
  // and above/below it; flip whenever that side would clip the stage.
  const rightX = a.render === "dot" ? toX(a.point.x) : toX(Math.max(x1, x2));
  const leftX = a.render === "dot" ? toX(a.point.x) : toX(Math.min(x1, x2));
  const topY = a.render === "dot" ? toY(a.point.y) : toY(Math.min(y1, y2));
  const botY = a.render === "dot" ? toY(a.point.y) : toY(Math.max(y1, y2));

  // Decide from the actual anchor edge (not the center) so a box near the top
  // correctly flips its tooltip BELOW instead of running off the top.
  const flipX = rightX + GAP + TOOLTIP_W > stageW;
  const flipY = topY - GAP - TOOLTIP_H < 0;

  return {
    left: flipX ? leftX : rightX,
    top: flipY ? botY : topY,
    maxHeight: Math.max(140, stageH - 2 * GAP),
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

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2 py-1 text-[11px] font-medium backdrop-blur transition-colors ${
        active
          ? "bg-amber-400 text-slate-900"
          : "bg-slate-900/70 text-white/80 hover:bg-slate-900/90"
      }`}
    >
      {children}
    </button>
  );
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
  const stageRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aspect, setAspect] = useState(4 / 3);
  const [loaded, setLoaded] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);
  const [hover, setHover] = useState<string | null>(null);
  const [areaW, setAreaW] = useState(0);
  const [vh, setVh] = useState(800);

  // Manual zoom/pan state (used when auto-zoom is OFF).
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  // Toggles: automated guided-zoom tour + show resource links on the tooltip.
  const [autoZoom, setAutoZoom] = useState(false);
  const [showResources, setShowResources] = useState(true);
  const [tourIndex, setTourIndex] = useState(0);
  // Theater mode: expand the output to fill the viewport.
  const [expanded, setExpanded] = useState(false);

  // Latest *visible* view for the (stable) native wheel handler.
  const view = useRef({ zoom: 1, panX: 0, panY: 0, boxW: 0, boxH: 0 });

  // Reset transient view when the source changes.
  if (prevSrc !== src) {
    setPrevSrc(src);
    setLoaded(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setAutoZoom(false);
    setTourIndex(0);
  }

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

  // Theater mode: lock body scroll + close on Escape.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [expanded]);

  const openHover = (id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHover(id);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHover(null), 140);
  };

  const clampPan = (x: number, y: number, z: number, bw: number, bh: number) => ({
    x: Math.min(0, Math.max(bw * (1 - z), x)),
    y: Math.min(0, Math.max(bh * (1 - z), y)),
  });

  // Manual zoom toward a viewport point; takes over from the auto tour.
  const zoomTo = useCallback((nextZoom: number, vx: number, vy: number) => {
    const v = view.current;
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    const wx = (vx - v.panX) / v.zoom;
    const wy = (vy - v.panY) / v.zoom;
    const x = Math.min(0, Math.max(v.boxW * (1 - z), vx - wx * z));
    const y = Math.min(0, Math.max(v.boxH * (1 - z), vy - wy * z));
    setAutoZoom(false);
    setZoom(z);
    setPan(z === 1 ? { x: 0, y: 0 } : { x, y });
  }, []);

  const reset = () => {
    setAutoZoom(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom (native, non-passive so we can prevent page scroll).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomTo(view.current.zoom * Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomTo]);

  // Auto-tour advance for non-sequenced tasks (sequenced tasks follow activeStep).
  const profile = result?.profile ?? null;
  const annotations = loaded && result ? result.annotations : [];
  const isSteps = profile?.renderStyle === "steps";

  useEffect(() => {
    if (!autoZoom || isSteps || annotations.length < 2) return;
    const id = setInterval(() => setTourIndex((i) => i + 1), TOUR_MS);
    return () => clearInterval(id);
  }, [autoZoom, isSteps, annotations.length]);

  // Fit the image into the available area (width-bound or height-bound).
  const maxH = Math.max(320, vh * (expanded ? 0.9 : 0.82));
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

  // The annotation the auto-tour is currently framing.
  const autoTarget =
    autoZoom && ready && annotations.length
      ? isSteps
        ? annotations.find((a) => a.stepOrder === activeStep) ?? annotations[0]
        : annotations[tourIndex % annotations.length]
      : null;

  // Effective (visible) transform: derived from the tour target when auto-zooming,
  // otherwise the manual zoom/pan state.
  let effZoom = zoom;
  let effX = pan.x;
  let effY = pan.y;
  if (autoTarget) {
    const f = frame(autoTarget, boxW, boxH);
    effZoom = f.z;
    effX = f.x;
    effY = f.y;
  }
  const zoomed = effZoom > 1.01;

  // Publish the visible view for the wheel handler / take-over math.
  useEffect(() => {
    view.current = { zoom: effZoom, panX: effX, panY: effY, boxW, boxH };
  });

  const worldTransform: CSSProperties = {
    transform: `translate(${effX}px, ${effY}px) scale(${effZoom})`,
    transformOrigin: "0 0",
    transition: autoZoom && !panning ? "transform 650ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
    willChange: "transform",
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!zoomed) return;
    setAutoZoom(false);
    setZoom(effZoom);
    setPan({ x: effX, y: effY });
    drag.current = { sx: e.clientX, sy: e.clientY, px: effX, py: effY };
    setPanning(true);
    stageRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setPan(clampPan(d.px + (e.clientX - d.sx), d.py + (e.clientY - d.sy), effZoom, boxW, boxH));
  };
  const endPan = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    setPanning(false);
    try {
      stageRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be released */
    }
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (zoomed) reset();
    else zoomTo(2.6, e.clientX - rect.left, e.clientY - rect.top);
  };

  const tooltipAnno =
    autoTarget ??
    annotations.find((a) => a.id === hover) ??
    (isSteps ? annotations.find((a) => a.stepOrder === activeStep) ?? null : null);

  const activeManualRef = manualSrc ? tooltipAnno?.manualRef ?? null : null;

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-50 flex flex-col gap-3 overflow-auto bg-background p-3"
          : "w-full"
      }
    >
      <div
        ref={areaRef}
        className={`flex w-full min-w-0 justify-center ${expanded ? "flex-1 items-center" : ""}`}
      >
        <div
          ref={stageRef}
          className={`relative select-none overflow-hidden rounded-2xl bg-muted ring-1 ring-border ${
            zoomed && !autoZoom ? (panning ? "cursor-grabbing" : "cursor-grab") : ""
          }`}
          style={{ ...boxStyle, touchAction: zoomed ? "none" : "auto" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onDoubleClick={onDoubleClick}
        >
          {/* World layer: image + markers transform together for zoom/pan. */}
          <div className="absolute inset-0" style={worldTransform}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Scene being analyzed"
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain"
              onLoad={(e) => {
                const t = e.currentTarget;
                if (t.naturalWidth && t.naturalHeight) setAspect(t.naturalWidth / t.naturalHeight);
                setLoaded(true);
              }}
            />

            {annotations.map((a) => {
              const dimmed = isSteps && activeStep > 0 && a.stepOrder !== activeStep;
              const active = hover === a.id || a.id === autoTarget?.id || (isSteps && a.stepOrder === activeStep);
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
          </div>

          {/* Tooltip in screen space (crisp, constant size). Hidden while panning. */}
          {tooltipAnno && profile && !panning && (
            <Tooltip
              a={tooltipAnno}
              profile={profile}
              showResources={showResources}
              style={tooltipStyle(tooltipAnno, boxW, boxH, effZoom, effX, effY)}
              onMouseEnter={() => openHover(tooltipAnno.id)}
              onMouseLeave={scheduleClose}
            />
          )}

          {/* Mode toggles. */}
          {ready && annotations.length > 0 && (
            <div className="absolute left-2 top-2 z-30 flex gap-1">
              <ToggleChip active={autoZoom} onClick={() => setAutoZoom((v) => !v)}>
                {autoZoom ? "◉ Auto-zoom" : "Auto-zoom"}
              </ToggleChip>
              <ToggleChip active={showResources} onClick={() => setShowResources((v) => !v)}>
                Resources
              </ToggleChip>
            </div>
          )}

          {/* Zoom controls. */}
          {ready && (
            <div className="absolute right-2 top-2 z-30 flex items-center gap-1 rounded-lg bg-slate-900/70 p-1 text-white backdrop-blur">
              <button
                type="button"
                aria-label="Zoom out"
                className="flex h-7 w-7 items-center justify-center rounded-md text-base leading-none hover:bg-white/15 disabled:opacity-40"
                disabled={!zoomed}
                onClick={() => zoomTo(effZoom / 1.5, boxW / 2, boxH / 2)}
              >
                −
              </button>
              <span className="min-w-[2.5rem] text-center text-[11px] tabular-nums">
                {Math.round(effZoom * 100)}%
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                className="flex h-7 w-7 items-center justify-center rounded-md text-base leading-none hover:bg-white/15 disabled:opacity-40"
                disabled={effZoom >= MAX_ZOOM}
                onClick={() => zoomTo(effZoom * 1.5, boxW / 2, boxH / 2)}
              >
                +
              </button>
              <button
                type="button"
                aria-label="Reset zoom"
                className="ml-0.5 flex h-7 items-center justify-center rounded-md px-2 text-[11px] hover:bg-white/15 disabled:opacity-40"
                disabled={!zoomed}
                onClick={reset}
              >
                Reset
              </button>
              <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden />
              <button
                type="button"
                aria-label={expanded ? "Collapse output" : "Expand output"}
                className="flex h-7 items-center justify-center rounded-md px-2 text-[13px] leading-none hover:bg-white/15"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "⤡ Close" : "⤢ Expand"}
              </button>
            </div>
          )}

          {ready && annotations.length > 0 && (
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-slate-900/60 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur">
              {autoZoom ? "Guided tour — drag to take over" : "scroll or double-click to zoom · drag to pan"}
              {expanded ? " · Esc to close" : ""}
            </div>
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
