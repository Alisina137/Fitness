import React, { useState, useRef } from "react";
import {
  useGetProgressPhotos,
  usePostProgressPhotos,
  useDeleteProgressPhotosId,
} from "@workspace/api-client-react";
import { Camera, Upload, Trash2, X, AlertTriangle, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PhotoType = "front" | "side" | "back" | "custom";

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  front: "Front",
  side: "Side",
  back: "Back",
  custom: "Custom",
};

const PHOTO_TYPE_OPTIONS: { value: PhotoType; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
  { value: "custom", label: "Custom" },
];

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose }: { onClose: () => void }) {
  const [photoType, setPhotoType] = useState<PhotoType | "">("");
  const [notes, setNotes] = useState("");
  const [takenAt, setTakenAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [imageUrl, setImageUrl] = useState("");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPhoto = usePostProgressPhotos();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setError("Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, HEIC.");
      return;
    }
    // For now store as object URL (base64 would be the prod path)
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewSrc(dataUrl);
      setImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!imageUrl) {
      setError("Please select an image.");
      return;
    }
    if (!photoType) {
      setError("Please select a photo type.");
      return;
    }

    createPhoto.mutate(
      {
        data: {
          imageUrl,
          photoType,
          notes: notes || undefined,
          takenAt: takenAt ? new Date(takenAt).toISOString() : undefined,
          contentType: fileInputRef.current?.files?.[0]?.type,
        },
      },
      {
        onSuccess: () => onClose(),
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Upload failed. Please try again.";
          setError(msg);
        },
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> Upload Progress Photo
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">Photo <span className="text-destructive">*</span></label>
            <div
              className={cn(
                "relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden",
                previewSrc ? "border-primary/40 h-48" : "border-border hover:border-primary/50 h-36"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewSrc ? (
                <img src={previewSrc} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-medium">Click to select image</span>
                  <span className="text-xs">JPEG, PNG, WebP, GIF, HEIC</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Photo Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Photo Type <span className="text-destructive">*</span></label>
            <div className="grid grid-cols-4 gap-2">
              {PHOTO_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPhotoType(opt.value)}
                  className={cn(
                    "py-2 rounded-lg text-sm font-medium border transition-colors",
                    photoType === opt.value
                      ? "bg-primary text-black border-primary"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Date Taken</label>
            <input
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes <span className="text-muted-foreground text-xs">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Any notes about this photo..."
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPhoto.isPending}
              className="flex-1 py-2.5 rounded-lg bg-primary text-black text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createPhoto.isPending ? "Uploading…" : "Upload Photo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteDialog({ photoId, onCancel, onConfirm }: { photoId: number; onCancel: () => void; onConfirm: () => void }) {
  const deletePhoto = useDeleteProgressPhotosId();

  function handleConfirm() {
    deletePhoto.mutate(
      { id: photoId },
      {
        onSuccess: onConfirm,
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-bold">Delete Photo?</h3>
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deletePhoto.isPending}
            className="flex-1 py-2.5 rounded-lg bg-destructive text-white text-sm font-bold hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {deletePhoto.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Photo Card ───────────────────────────────────────────────────────────────

function PhotoCard({
  photo,
  onDelete,
}: {
  photo: { id: number; imageUrl: string; photoType: string; notes?: string | null; takenAt: string };
  onDelete: (id: number) => void;
}) {
  return (
    <div className="group relative bg-card border border-border rounded-2xl overflow-hidden">
      <div className="aspect-[3/4] bg-secondary overflow-hidden">
        <img
          src={photo.imageUrl}
          alt={`${photo.photoType} view`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).parentElement!.classList.add("flex", "items-center", "justify-center");
          }}
        />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              {PHOTO_TYPE_LABELS[photo.photoType as PhotoType] ?? photo.photoType}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProgressPhotosPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<PhotoType | "all">("all");

  const { data: photos, isLoading } = useGetProgressPhotos(
    typeFilter !== "all" ? { type: typeFilter } : {}
  );

  const filteredPhotos = photos ?? [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Progress Photos</h1>
          <p className="text-muted-foreground mt-1">Track your physical transformation over time.</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-primary text-black font-bold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm shrink-0"
        >
          <Camera className="h-4 w-4" /> Upload Photo
        </button>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "front", "side", "back", "custom"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
              typeFilter === t
                ? "bg-primary text-black border-primary"
                : "bg-secondary border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "all" ? "All" : PHOTO_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Gallery */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[3/4] rounded-2xl w-full" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-lg">No photos yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {typeFilter !== "all"
                ? `No ${PHOTO_TYPE_LABELS[typeFilter]} photos found. Try a different filter or upload one.`
                : "Upload your first progress photo to start tracking your transformation."}
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-primary text-black font-bold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm"
          >
            <Camera className="h-4 w-4" /> Upload Photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {deleteTarget !== null && (
        <DeleteDialog
          photoId={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
