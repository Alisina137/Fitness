import React, { useState, useRef, useCallback, useEffect } from "react";
import { ImageOff, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** CSS aspect-ratio value, e.g. "3/4", "1/1", "16/9". Default: "3/4" */
  aspectRatio?: string;
  className?: string;
}

// ─── BeforeAfterSlider ────────────────────────────────────────────────────────

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
  aspectRatio = "3/4",
  className,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50); // 0–100 percent
  const [isDragging, setIsDragging] = useState(false);
  const [beforeError, setBeforeError] = useState(false);
  const [afterError, setAfterError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Coordinate → position ─────────────────────────────────────────────────
  const positionFromClientX = useCallback((clientX: number): number => {
    const el = containerRef.current;
    if (!el) return 50;
    const { left, width } = el.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientX - left) / width) * 100));
  }, []);

  // ── Mouse events ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setPosition(positionFromClientX(e.clientX));
    },
    [positionFromClientX]
  );

  // ── Touch events ──────────────────────────────────────────────────────────
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (t) {
        setIsDragging(true);
        setPosition(positionFromClientX(t.clientX));
      }
    },
    [positionFromClientX]
  );

  // ── Global move/up listeners (mounted only while dragging) ────────────────
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => setPosition(positionFromClientX(e.clientX));
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setPosition(positionFromClientX(t.clientX));
    };
    const onUp = () => setIsDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [isDragging, positionFromClientX]);

  const reset = () => setPosition(50);
  const atCenter = Math.round(position) === 50;

  // ── Both images failed ────────────────────────────────────────────────────
  if (beforeError && afterError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 bg-secondary rounded-2xl border border-border text-muted-foreground",
          className
        )}
        style={{ aspectRatio }}
      >
        <ImageOff className="h-10 w-10" />
        <span className="text-sm">Images unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* ── Slider container ─────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-border bg-secondary select-none touch-none cursor-ew-resize"
        style={{ aspectRatio }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        aria-label="Before and after image comparison slider"
        role="slider"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* After image — full width, shown on the right ─────────────────── */}
        {afterError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-7 w-7" />
            <span className="text-xs">Image unavailable</span>
          </div>
        ) : (
          <img
            src={afterSrc}
            alt={afterLabel}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
            onError={() => setAfterError(true)}
          />
        )}

        {/* Before image — clipped to reveal only the left portion ─────────
            clip-path: inset(top right bottom left)
            right = (100 - position)% → reveals position% from the left     */}
        {!beforeError && (
          <img
            src={beforeSrc}
            alt={beforeLabel}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              clipPath: `inset(0 ${100 - position}% 0 0)`,
              // suppress transition during drag; animate on reset
              transition: isDragging ? "none" : "clip-path 0.25s ease",
            }}
            draggable={false}
            onError={() => setBeforeError(true)}
          />
        )}

        {/* Divider line ────────────────────────────────────────────────── */}
        <div
          className="absolute top-0 bottom-0 w-0.5 z-10 bg-white"
          style={{
            left: `${position}%`,
            transform: "translateX(-50%)",
            boxShadow: "0 0 6px rgba(0,0,0,0.55)",
            transition: isDragging ? "none" : "left 0.25s ease",
            pointerEvents: "none",
          }}
        />

        {/* Drag handle ─────────────────────────────────────────────────── */}
        <div
          className={cn(
            "absolute top-1/2 z-20 flex items-center justify-center",
            "h-10 w-10 rounded-full bg-white shadow-xl cursor-ew-resize",
            isDragging && "scale-110"
          )}
          style={{
            left: `${position}%`,
            transform: `translate(-50%, -50%) ${isDragging ? "scale(1.1)" : "scale(1)"}`,
            transition: isDragging ? "none" : "left 0.25s ease, transform 0.15s ease",
            pointerEvents: "none",
          }}
        >
          {/* Double chevron icon built from two lines */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className="text-gray-600"
          >
            <path
              d="M6.5 4L2 9L6.5 14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11.5 4L16 9L11.5 14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Before label ─────────────────────────────────────────────────── */}
        <span
          className="absolute top-3 left-3 z-20 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/55 text-white backdrop-blur-sm pointer-events-none select-none"
          style={{
            opacity: position < 15 ? (position / 15) : 1,
            transition: "opacity 0.15s",
          }}
        >
          {beforeLabel}
        </span>

        {/* After label ──────────────────────────────────────────────────── */}
        <span
          className="absolute top-3 right-3 z-20 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/55 text-white backdrop-blur-sm pointer-events-none select-none"
          style={{
            opacity: position > 85 ? ((100 - position) / 15) : 1,
            transition: "opacity 0.15s",
          }}
        >
          {afterLabel}
        </span>

        {/* Invisible full-area drag target on top while dragging ──────── */}
        {isDragging && (
          <div className="absolute inset-0 z-30 cursor-ew-resize" />
        )}
      </div>

      {/* ── Reset button ─────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={reset}
          disabled={atCenter}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
            atCenter
              ? "text-muted-foreground/40 border-border/40 cursor-not-allowed"
              : "text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
          )}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>
    </div>
  );
}
