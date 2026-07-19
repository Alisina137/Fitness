import React, { useState, useMemo } from "react";
import { useGetProgressPhotosTimeline } from "@workspace/api-client-react";
import { ImageOff, ArrowLeftRight, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BeforeAfterSlider } from "@/components/before-after-slider";

// ─── Types & constants ────────────────────────────────────────────────────────

type PhotoType = "front" | "side" | "back" | "custom";

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  front: "Front",
  side: "Side",
  back: "Back",
  custom: "Custom",
};

const PHOTO_TYPES: PhotoType[] = ["front", "side", "back", "custom"];

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type GalleryPhoto = {
  id: number;
  imageUrl: string;
  photoType: string;
  notes?: string | null;
  takenAt: string;
};

type CompareResult = {
  before: GalleryPhoto;
  after: GalleryPhoto;
  daysBetween: number;
};

// ─── Auth helper ──────────────────────────────────────────────────────────────

function getToken(): string | null {
  try {
    return JSON.parse(localStorage.getItem("auth-storage") || "{}").state?.token ?? null;
  } catch {
    return null;
  }
}

// ─── PhotoSelectDropdown ──────────────────────────────────────────────────────

function PhotoSelectDropdown({
  photos,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  photos: GalleryPhoto[];
  value: number | null;
  onChange: (id: number) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = photos.find((p) => p.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors",
          disabled
            ? "opacity-50 cursor-not-allowed bg-secondary border-border text-muted-foreground"
            : "bg-secondary border-border text-foreground hover:bg-secondary/80 cursor-pointer"
        )}
      >
        <span className={cn("truncate", selected ? "text-foreground" : "text-muted-foreground")}>
          {selected
            ? `${PHOTO_TYPE_LABELS[selected.photoType as PhotoType] ?? selected.photoType} — ${format(new Date(selected.takenAt), "MMM d, yyyy")}`
            : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto">
            {photos.map((p) => {
              const label = PHOTO_TYPE_LABELS[p.photoType as PhotoType] ?? p.photoType;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors",
                    p.id === value
                      ? "text-primary font-medium bg-primary/5"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  <div className="h-10 w-8 rounded-lg overflow-hidden shrink-0 bg-secondary">
                    <img
                      src={p.imageUrl}
                      alt={label}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.takenAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ComparePhotoPanel ────────────────────────────────────────────────────────

function ComparePhotoPanel({
  label,
  photo,
}: {
  label: "Before" | "After";
  photo: GalleryPhoto | null;
}) {
  const [imgError, setImgError] = useState(false);
  const typeLabel = photo
    ? (PHOTO_TYPE_LABELS[photo.photoType as PhotoType] ?? photo.photoType)
    : null;

  return (
    <div className="flex-1 flex flex-col gap-3 min-w-0">
      {/* Label row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
            label === "Before"
              ? "bg-secondary text-muted-foreground"
              : "bg-primary/10 text-primary"
          )}
        >
          {label}
        </span>
        {photo && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(photo.takenAt), "MMMM d, yyyy")}
          </span>
        )}
      </div>

      {/* Image */}
      <div className="aspect-[3/4] bg-secondary rounded-2xl overflow-hidden border border-border flex items-center justify-center">
        {photo ? (
          imgError ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageOff className="h-8 w-8" />
              <span className="text-xs">Image unavailable</span>
            </div>
          ) : (
            <img
              src={photo.imageUrl}
              alt={`${label} — ${typeLabel}`}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          )
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/40 p-8 text-center">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs">Select a photo</span>
          </div>
        )}
      </div>

      {/* Type badge */}
      {typeLabel && (
        <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide self-start">
          {typeLabel}
        </span>
      )}
    </div>
  );
}

// ─── BeforeAfterComparison ────────────────────────────────────────────────────

export function BeforeAfterComparison() {
  const [selectedType, setSelectedType] = useState<PhotoType | null>(null);
  const [beforeId, setBeforeId] = useState<number | null>(null);
  const [afterId, setAfterId] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Compare result fetched manually so we can control exactly when it fires
  const [comparison, setComparison] = useState<CompareResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const { data: allPhotos, isLoading: photosLoading } = useGetProgressPhotosTimeline();

  // Group valid photos by type
  const photosByType = useMemo(() => {
    const valid = new Set<string>(["front", "side", "back", "custom"]);
    const grouped: Record<PhotoType, GalleryPhoto[]> = {
      front: [],
      side: [],
      back: [],
      custom: [],
    };
    for (const p of allPhotos ?? []) {
      if (p.imageUrl && valid.has(p.photoType)) {
        grouped[p.photoType as PhotoType].push(p as GalleryPhoto);
      }
    }
    return grouped;
  }, [allPhotos]);

  const totalPhotos = useMemo(
    () => Object.values(photosByType).reduce((sum, arr) => sum + arr.length, 0),
    [photosByType]
  );

  const typePhotos = selectedType ? photosByType[selectedType] : [];
  const beforePhotos = typePhotos;
  const afterPhotos = typePhotos.filter((p) => p.id !== beforeId);

  // Fetch comparison from API
  async function fetchComparison(bId: number, aId: number) {
    setCompareLoading(true);
    setCompareError(null);
    setComparison(null);
    try {
      const token = getToken();
      const res = await fetch(
        `${BASE}/api/progress-photos/compare?beforePhotoId=${bId}&afterPhotoId=${aId}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setCompareError((body as { error?: string }).error ?? "Failed to load comparison.");
        return;
      }
      setComparison(await res.json());
    } catch {
      setCompareError("Could not reach the server. Please try again.");
    } finally {
      setCompareLoading(false);
    }
  }

  function handleTypeSelect(type: PhotoType) {
    setSelectedType(type);
    setBeforeId(null);
    setAfterId(null);
    setValidationError(null);
    setComparison(null);
    setCompareError(null);
  }

  function handleBeforeSelect(id: number) {
    setBeforeId(id);
    setValidationError(null);
    setComparison(null);
    setCompareError(null);
    // Reset after if it was the same photo
    if (id === afterId) setAfterId(null);
  }

  function handleAfterSelect(id: number) {
    if (id === beforeId) {
      setValidationError("Before and After must be different photos.");
      return;
    }
    setAfterId(id);
    setValidationError(null);
    setCompareError(null);
    // Auto-fetch
    if (beforeId !== null) {
      fetchComparison(beforeId, id);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (photosLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2 flex-wrap">
          {PHOTO_TYPES.map((t) => (
            <Skeleton key={t} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          <Skeleton className="aspect-[3/4] rounded-2xl" />
          <Skeleton className="aspect-[3/4] rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── No photos at all ─────────────────────────────────────────────────────
  if (totalPhotos === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-lg">No progress photos yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload photos to start comparing your progress.
          </p>
        </div>
      </div>
    );
  }

  // ── Not enough photos of any single type ─────────────────────────────────
  const typesWithEnough = PHOTO_TYPES.filter((t) => photosByType[t].length >= 2);
  if (typesWithEnough.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-lg">Need more photos to compare.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload at least 2 photos of the same type (e.g. Front) to use Before &amp; After.
          </p>
        </div>
      </div>
    );
  }

  const canCompare = beforeId !== null && afterId !== null && beforeId !== afterId;

  return (
    <div className="space-y-6">
      {/* Step 1 — type selector */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Select photo type to compare
        </p>
        <div className="flex gap-2 flex-wrap">
          {PHOTO_TYPES.map((type) => {
            const count = photosByType[type].length;
            const enabled = count >= 2;
            return (
              <button
                key={type}
                disabled={!enabled}
                onClick={() => handleTypeSelect(type)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
                  selectedType === type
                    ? "bg-primary text-black border-primary"
                    : enabled
                    ? "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    : "bg-secondary border-border text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                {PHOTO_TYPE_LABELS[type]}
                <span className="ml-1.5 text-xs opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — photo selectors */}
      {selectedType && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Before photo</label>
            <PhotoSelectDropdown
              photos={beforePhotos}
              value={beforeId}
              onChange={handleBeforeSelect}
              placeholder="Select before photo…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">After photo</label>
            <PhotoSelectDropdown
              photos={afterPhotos}
              value={afterId}
              onChange={handleAfterSelect}
              placeholder={beforeId ? "Select after photo…" : "Select before first…"}
              disabled={!beforeId}
            />
          </div>
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {validationError}
        </div>
      )}

      {/* Prompt when type is selected but photos aren't yet chosen */}
      {selectedType && !canCompare && !validationError && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2 text-muted-foreground">
          <ArrowLeftRight className="h-7 w-7 opacity-30" />
          <p className="text-sm">Select a before and after photo to see the comparison.</p>
        </div>
      )}

      {/* Step 3 — comparison result */}
      {canCompare && (
        <div className="space-y-6">
          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary border border-border px-3 py-1 rounded-full">
              <ArrowLeftRight className="h-3 w-3" />
              Comparison
            </div>
            <div className="flex-1 h-px bg-border" />
          </div>

          {compareLoading ? (
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <Skeleton className="aspect-[3/4] rounded-2xl" />
              <Skeleton className="aspect-[3/4] rounded-2xl" />
            </div>
          ) : compareError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2">
                {compareError}
              </p>
              <button
                onClick={() => beforeId && afterId && fetchComparison(beforeId, afterId)}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Try again
              </button>
            </div>
          ) : comparison ? (
            <>
              {/* Days between banner */}
              <div className="text-center">
                <span className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-5 py-2 text-sm shadow-sm">
                  <span className="font-bold text-primary text-base">
                    {comparison.daysBetween}
                  </span>
                  <span className="text-muted-foreground">
                    {comparison.daysBetween === 1 ? "day" : "days"} of progress
                  </span>
                </span>
              </div>

              {/* Interactive slider */}
              <BeforeAfterSlider
                beforeSrc={comparison.before.imageUrl}
                afterSrc={comparison.after.imageUrl}
                beforeLabel={`Before · ${format(new Date(comparison.before.takenAt), "MMM d, yyyy")}`}
                afterLabel={`After · ${format(new Date(comparison.after.takenAt), "MMM d, yyyy")}`}
              />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
