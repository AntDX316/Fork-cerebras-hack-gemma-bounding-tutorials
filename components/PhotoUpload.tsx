"use client";

import { useRef, useState } from "react";
import { fileToDownscaledDataURL } from "@/lib/client/image";

export function PhotoUpload({ onImages }: { onImages: (imgs: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 5);
    const imgs = await Promise.all(list.map((f) => fileToDownscaledDataURL(f)));
    setThumbs(imgs);
    onImages(imgs);
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-primary bg-muted" : "border-input hover:border-muted-foreground/50"
        }`}
      >
        <div className="text-2xl" aria-hidden>
          📷
        </div>
        <div className="mt-1 text-sm font-medium text-foreground">Drop a photo or click</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          1st image = scene · 2nd = optional manual/reference (up to 5)
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {thumbs.length > 0 && (
        <div className="mt-2 flex gap-2">
          {thumbs.map((t, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={t}
              alt={`upload ${i + 1}`}
              className="h-12 w-12 rounded-md object-cover ring-1 ring-border"
            />
          ))}
        </div>
      )}
    </div>
  );
}
