import React, { useState, useMemo } from "react";
import { useGetProgressPhotosTimeline } from "@workspace/api-client-react";
import { ImageOff, Trash2, X, ChevronDown, ZoomIn } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Shared types & constants ─────────────────────────────────────────────────

type PhotoType = "front" | "side" | "back" | "custom";
type FilterValue = PhotoType | "all";
type SortValue = "newest" | "oldest";

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  front: "Front",
  side: "Side",
  back: "Back",
  custom: "Custom",
};

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
  { value: "custom", label: "Custom" },
];

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

type GroupValue = "none" | "month" | "week";

const GROUP_OPTIONS: { value: GroupValue; label: string }[] = [
  { value: "none", label: "No grouping" },
  { value: "month", label: "By month" },
  { value: "week", label: "By week" },
];

function groupKey(photo: GalleryPhoto, by: GroupValue): string {
  const d = new Date(photo.takenAt);
  if (by === "month") return format(d, "MMMM yyyy");
  if (by === "week") return format(startOfWeek(d, { weekStartsOn: 1 }), "'Week of' MMM d, yyyy");
  return "";
}

function groupPhotos(
  photos: GalleryPhoto[],
  by: GroupValue
): { label: string; photos: GalleryPhoto[] }[] {
  if (by === "none") return [{ label: "", photos }];
  const map = new Map<string, GalleryPhoto[]>();
  for (const p of photos) {
    const k = groupKey(p, by);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  return Array.from(map.entries()).map(([label, photos]) => ({ label, photos }));
}

type GalleryPhoto = {
  id: number;
  imageUrl: string;
  photoType: string;
  notes?: string | null;
  takenAt: string;
};

// ─── PhotoPreviewModal ────────────────────────────────────────────────────────

function PhotoPreviewModal({
  photo,
  onClose,
}: {
  photo: GalleryPhoto;
  onClose: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const label = PHOTO_TYPE_LABELS[photo.photoType as PhotoType] ?? photo.photoType;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Image */}
        <div className="flex-1 bg-secondary overflow-hidden max-h-[70dvh] flex items-center justify-center">
          {imgError ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-16">
              <ImageOff className="h-10 w-10" />
              <span className="text-sm">Image unavailable</span>
            </div>
          ) : (
            <img
              src={photo.imageUrl}
              alt={`${label} view`}
              className="w-full h-full object-contain"
              onError={() => setImgError(true)}
            />
          )}
        </div>

        {/* Meta */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
              {label}
            </span>
            <span className="text-sm text-muted-foreground">
              {format(new Date(photo.takenAt), "MMMM d, yyyy")}
            </span>
          </div>
          {photo.notes && (
            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px] text-right">
              {photo.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PhotoCard ────────────────────────────────────────────────────────────────

function PhotoCard({
  photo,
  onPreview,
  onDelete,
}: {
  photo: GalleryPhoto;
  onPreview: (photo: GalleryPhoto) => void;
  onDelete: (id: number) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const label = PHOTO_TYPE_LABELS[photo.photoType as PhotoType] ?? photo.photoType;

  return (
    <div className="group relative bg-card border border-border rounded-2xl overflow-hidden">
      {/* Image */}
      <div
        className="aspect-[3/4] bg-secondary overflow-hidden cursor-pointer relative"
        onClick={() => onPreview(photo)}
      >
        {imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-7 w-7" />
            <span className="text-xs">Image unavailable</span>
          </div>
        ) : (
          <>
            <img
              src={photo.imageUrl}
              alt={`${label} view`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
            {/* Zoom hint */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center">
                <ZoomIn className="h-5 w-5 text-white" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Meta */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              {label}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(photo.takenAt), "MMM d, yyyy")}
            </p>
          </div>
          <button
            onClick={() => onDelete(photo.id)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete photo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {photo.notes && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{photo.notes}</p>
        )}
      </div>
    </div>
  );
}

// ─── Shared dropdown ─────────────────────────────────────────────────────────

function SelectDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.value === value)?.label ?? "Select";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-card border border-border rounded-xl shadow-lg py-1 overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm transition-colors",
                  value === opt.value
                    ? "text-primary font-medium bg-primary/5"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── SortDropdown ─────────────────────────────────────────────────────────────


// ─── ProgressPhotoGallery ─────────────────────────────────────────────────────

export function ProgressPhotoGallery({
  onDelete,
  onUpload,
}: {
  onDelete: (id: number) => void;
  onUpload?: () => void;
}) {
  const [typeFilter, setTypeFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("newest");
  const [group, setGroup] = useState<GroupValue>("none");
  const [preview, setPreview] = useState<GalleryPhoto | null>(null);

  const { data: allPhotos, isLoading } = useGetProgressPhotosTimeline();

  // Validate photo type — drop any photo with an unknown type rather than crash
  const validPhotos = useMemo(() => {
    const valid = new Set<string>(["front", "side", "back", "custom"]);
    return (allPhotos ?? []).filter((p) => p.imageUrl && valid.has(p.photoType));
  }, [allPhotos]);

  // Filter
  const filtered = useMemo(
    () =>
      typeFilter === "all"
        ? validPhotos
        : validPhotos.filter((p) => p.photoType === typeFilter),
    [validPhotos, typeFilter]
  );

  // Sort (timeline endpoint already returns newest-first; reverse for oldest)
  const sorted = useMemo(
    () => (sort === "oldest" ? [...filtered].reverse() : filtered),
    [filtered, sort]
  );

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((o) => (
            <Skeleton key={o.value} className="h-8 w-16 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[3/4] rounded-2xl w-full" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty gallery ──────────────────────────────────────────────────────────
  if (validPhotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-lg">No progress photos yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your first photo to start tracking your transformation.
          </p>
        </div>
        {onUpload && (
          <button
            onClick={onUpload}
            className="px-4 py-2.5 rounded-xl bg-primary text-black text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Upload Photo
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Controls row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Type filter pills */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                typeFilter === opt.value
                  ? "bg-primary text-black border-primary"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort + Group */}
        <div className="flex items-center gap-2">
          <SelectDropdown
            value={sort}
            options={SORT_OPTIONS}
            onChange={(v) => setSort(v as SortValue)}
          />
          <SelectDropdown
            value={group}
            options={GROUP_OPTIONS}
            onChange={(v) => setGroup(v as GroupValue)}
          />
        </div>
      </div>

      {/* Filtered-empty state */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
            <ImageOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No progress photos yet.</p>
          <p className="text-sm text-muted-foreground">
            No {PHOTO_TYPE_LABELS[typeFilter as PhotoType]} photos found. Try a different filter.
          </p>
        </div>
      ) : group === "none" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {sorted.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onPreview={setPreview}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {groupPhotos(sorted, group).map(({ label, photos: groupedPhotos }) => (
            <div key={label} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  {label}
                </h2>
                <span className="text-xs text-muted-foreground/60 font-medium">
                  {groupedPhotos.length} photo{groupedPhotos.length !== 1 ? "s" : ""}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {groupedPhotos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    onPreview={setPreview}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <PhotoPreviewModal photo={preview} onClose={() => setPreview(null)} />
      )}
    </>
  );
}
