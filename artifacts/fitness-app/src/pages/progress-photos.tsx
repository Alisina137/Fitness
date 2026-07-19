import React, { useState, useRef, useCallback } from "react";
import {
  usePostProgressPhotos,
  useDeleteProgressPhotosId,
  postProgressPhotos,
} from "@workspace/api-client-react";
import { ProgressPhotoGallery } from "@/components/progress-photo-gallery";
import { BeforeAfterComparison } from "@/components/before-after-comparison";
import { PhotoReminderSettings } from "@/components/photo-reminder-settings";
import { Camera, Upload, Trash2, X, AlertTriangle, CheckCircle2, Loader2, ArrowLeftRight, Images, Bell } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

type PhotoType = "front" | "side" | "back" | "custom";

const PHOTO_TYPE_OPTIONS: { value: PhotoType; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
  { value: "custom", label: "Custom" },
];

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileEntry {
  id: string;
  file: File;
  previewSrc: string;
  photoType: PhotoType | "";
  typeError: boolean;
  status: "pending" | "uploading" | "done" | "error";
  errorMsg?: string;
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [takenAt, setTakenAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFilesSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError(null);
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const invalidFiles = files.filter((f) => !ALLOWED_TYPES.includes(f.type.toLowerCase()));
    if (invalidFiles.length) {
      setGlobalError(
        `Unsupported file type${invalidFiles.length > 1 ? "s" : ""}: ${invalidFiles.map((f) => f.name).join(", ")}. Allowed: JPEG, PNG, WebP, GIF, HEIC.`
      );
      // Only add the valid ones
    }

    const validFiles = files.filter((f) => ALLOWED_TYPES.includes(f.type.toLowerCase()));
    if (!validFiles.length) return;

    const newEntries = await Promise.all(
      validFiles.map(async (file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewSrc: await readFileAsDataUrl(file),
        photoType: "" as PhotoType | "",
        typeError: false,
        status: "pending" as const,
      }))
    );

    setEntries((prev) => [...prev, ...newEntries]);
    // Reset input so same files can be re-added
    e.target.value = "";
  }, []);

  const removeEntry = (id: string) =>
    setEntries((prev) => prev.filter((e) => e.id !== id));

  const setEntryType = (id: string, type: PhotoType) =>
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, photoType: type, typeError: false } : e))
    );

  async function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault();
    setGlobalError(null);

    if (entries.length === 0) {
      setGlobalError("Please select at least one image.");
      return;
    }

    // Validate all entries have a type
    const missingType = entries.some((e) => !e.photoType);
    if (missingType) {
      setEntries((prev) => prev.map((e) => ({ ...e, typeError: !e.photoType })));
      setGlobalError("Please select a photo type for each image.");
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;

    for (const entry of entries) {
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: "uploading" } : e))
      );
      try {
        await postProgressPhotos({
          imageUrl: entry.previewSrc,
          photoType: entry.photoType as PhotoType,
          notes: notes || undefined,
          takenAt: takenAt ? new Date(takenAt).toISOString() : undefined,
          contentType: entry.file.type,
        });
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, status: "done" } : e))
        );
        successCount++;
        setDoneCount(successCount);
      } catch {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, status: "error", errorMsg: "Upload failed" } : e
          )
        );
      }
    }

    setIsSubmitting(false);

    if (successCount > 0) {
      // Invalidate both query keys: the filtered list and the timeline used by the gallery
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/progress-photos"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/progress-photos/timeline"] }),
      ]);
      // Brief pause so user sees completion state, then close
      setTimeout(onClose, 600);
    }
  }

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const totalCount = entries.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Upload Progress Photos
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            {/* Drop zone / file picker */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Photos <span className="text-destructive">*</span>
              </label>
              <div
                className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors h-28 gap-2 text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-7 w-7" />
                <span className="text-sm font-medium">Click to select images</span>
                <span className="text-xs">JPEG, PNG, WebP, GIF, HEIC — multiple allowed</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif"
                  multiple
                  className="hidden"
                  onChange={handleFilesSelected}
                />
              </div>
            </div>

            {/* Selected files list */}
            {entries.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {totalCount} photo{totalCount !== 1 ? "s" : ""} selected
                </p>
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex gap-3 p-3 rounded-xl border transition-colors",
                      entry.status === "done"
                        ? "border-primary/30 bg-primary/5"
                        : entry.status === "error"
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border bg-secondary/30"
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="h-16 w-12 rounded-lg overflow-hidden shrink-0 bg-secondary">
                      <img
                        src={entry.previewSrc}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Type selector + status */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-xs text-muted-foreground truncate">{entry.file.name}</p>
                      <div className="flex gap-1 flex-wrap">
                        {PHOTO_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={entry.status === "done" || isSubmitting}
                            onClick={() => setEntryType(entry.id, opt.value)}
                            className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium border transition-colors",
                              entry.photoType === opt.value
                                ? "bg-primary text-black border-primary"
                                : entry.typeError
                                ? "bg-destructive/10 border-destructive/40 text-muted-foreground"
                                : "bg-background border-border text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {entry.typeError && (
                        <p className="text-xs text-destructive">Select a type</p>
                      )}
                      {entry.status === "error" && (
                        <p className="text-xs text-destructive">{entry.errorMsg}</p>
                      )}
                    </div>

                    {/* Status icon / remove */}
                    <div className="shrink-0 flex items-center">
                      {entry.status === "done" ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : entry.status === "uploading" ? (
                        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                      ) : (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => removeEntry(entry.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Shared fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date Taken</label>
                <input
                  type="date"
                  value={takenAt}
                  onChange={(e) => setTakenAt(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  disabled={isSubmitting}
                  placeholder="e.g. Week 4 check-in"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>

            {/* Global error */}
            {globalError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {globalError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-4 border-t border-border shrink-0 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || entries.length === 0}
              className="flex-1 py-2.5 rounded-lg bg-primary text-black text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? `Uploading ${doneCount + 1} of ${totalCount}…`
                : `Upload ${totalCount > 0 ? `${totalCount} ` : ""}Photo${totalCount !== 1 ? "s" : ""}`}
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
  const queryClient = useQueryClient();

  function handleConfirm() {
    deletePhoto.mutate(
      { id: photoId },
      {
        onSuccess: () => {
          // Invalidate both query keys so the gallery removes the photo immediately
          Promise.all([
            queryClient.invalidateQueries({ queryKey: ["/api/progress-photos"] }),
            queryClient.invalidateQueries({ queryKey: ["/api/progress-photos/timeline"] }),
          ]);
          onConfirm();
        },
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

// ─── Main Page ────────────────────────────────────────────────────────────────

type ActiveTab = "gallery" | "compare" | "reminders";

const TABS: { value: ActiveTab; label: string; Icon: React.ElementType }[] = [
  { value: "gallery", label: "Gallery", Icon: Images },
  { value: "compare", label: "Before & After", Icon: ArrowLeftRight },
  { value: "reminders", label: "Reminders", Icon: Bell },
];

export default function ProgressPhotosPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("gallery");
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

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

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit">
        {TABS.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "gallery" ? (
        <ProgressPhotoGallery
          onDelete={setDeleteTarget}
          onUpload={() => setShowUpload(true)}
        />
      ) : activeTab === "compare" ? (
        <BeforeAfterComparison />
      ) : (
        <PhotoReminderSettings />
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
