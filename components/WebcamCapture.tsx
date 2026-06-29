"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function WebcamCapture({
  onFrame,
  live,
  onToggleLive,
  busy,
}: {
  onFrame: (dataURL: string) => void;
  live: boolean;
  onToggleLive: (live: boolean) => void;
  busy: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Keep latest values for the interval without re-subscribing.
  const busyRef = useRef(busy);
  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Camera unavailable");
      }
    }
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const grab = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    const max = 1024;
    const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  }, []);

  // Live loop: single-flight (skip while a request is in flight).
  useEffect(() => {
    if (!live || !ready) return;
    const id = setInterval(() => {
      if (busyRef.current) return;
      const frame = grab();
      if (frame) onFrameRef.current(frame);
    }, 900);
    return () => clearInterval(id);
  }, [live, ready, grab]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl bg-slate-900 ring-1 ring-slate-200">
        <video ref={videoRef} playsInline muted className="block w-full" />
        <canvas ref={canvasRef} className="hidden" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
            {error}
          </div>
        )}
        {live && (
          <Badge variant="destructive" className="absolute right-2 top-2 gap-1 bg-red-600 text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> LIVE
          </Badge>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          onClick={() => {
            const frame = grab();
            if (frame) onFrame(frame);
          }}
          disabled={!ready}
          className="h-9 flex-1"
        >
          Analyze frame
        </Button>
        <Button
          variant={live ? "destructive" : "outline"}
          onClick={() => onToggleLive(!live)}
          disabled={!ready}
          className="h-9"
        >
          {live ? "Stop live" : "Go live"}
        </Button>
      </div>
    </div>
  );
}
