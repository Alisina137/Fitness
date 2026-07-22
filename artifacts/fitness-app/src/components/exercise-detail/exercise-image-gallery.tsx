import React, { useState, useCallback } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Exercise } from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GalleryImage {
  src: string;
  alt: string;
}

// ─── Build image list from exercise ──────────────────────────────────────────

function buildImages(exercise: Exercise): GalleryImage[] {
  const images: GalleryImage[] = [];
  if (exercise.imageUrl) {
    images.push({ src: exercise.imageUrl, alt: exercise.name });
  }
  if (exercise.thumbnailUrl && exercise.thumbnailUrl !== exercise.imageUrl) {
    images.push({ src: exercise.thumbnailUrl, alt: `${exercise.name} thumbnail` });
  }
  return images;
}

// ─── Placeholder ──────────────────────────────────────────────────────────────

function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 bg-secondary/40 text-muted-foreground select-none",
        className,
      )}
    >
      <ImageOff className="h-10 w-10 opacity-40" />
      <span className="text-sm font-medium opacity-60">No image available</span>
    </div>
  );
}

// ─── Main image ───────────────────────────────────────────────────────────────

interface MainImageProps {
  image: GalleryImage | null;
  transitioning: boolean;
}

function MainImage({ image, transitioning }: MainImageProps) {
  const [errored, setErrored] = useState(false);

  // Reset error state when the image src changes
  React.useEffect(() => {
    setErrored(false);
  }, [image?.src]);

  const showPlaceholder = !image || errored;

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-secondary/30">
      {showPlaceholder ? (
        <ImagePlaceholder className="absolute inset-0 rounded-2xl" />
      ) : (
        <img
          key={image.src}
          src={image.src}
          alt={image.alt}
          loading="lazy"
          onError={() => setErrored(true)}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            transitioning ? "opacity-0" : "opacity-100",
          )}
        />
      )}
    </div>
  );
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

interface ThumbnailProps {
  image: GalleryImage;
  isActive: boolean;
  onClick: () => void;
}

function Thumbnail({ image, isActive, onClick }: ThumbnailProps) {
  const [errored, setErrored] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "border-primary shadow-md shadow-primary/20 scale-[1.04]"
          : "border-border hover:border-primary/40 hover:scale-[1.02]",
      )}
      aria-label={image.alt}
      aria-pressed={isActive}
    >
      {errored ? (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/60">
          <ImageOff className="h-4 w-4 text-muted-foreground opacity-50" />
        </div>
      ) : (
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          onError={() => setErrored(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ExerciseImageGallerySkeleton() {
  return (
    <section className="space-y-3 animate-pulse">
      <div className="w-full aspect-video rounded-2xl bg-secondary/50" />
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shrink-0 w-20 h-14 rounded-xl bg-secondary/50" />
        ))}
      </div>
    </section>
  );
}

// ─── Main gallery component ───────────────────────────────────────────────────

interface ExerciseImageGalleryProps {
  exercise: Exercise;
}

export function ExerciseImageGallery({ exercise }: ExerciseImageGalleryProps) {
  const images = buildImages(exercise);
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const handleSelect = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      setTransitioning(true);
      setTimeout(() => {
        setActiveIndex(index);
        setTransitioning(false);
      }, 150);
    },
    [activeIndex],
  );

  const activeImage = images[activeIndex] ?? null;

  return (
    <section className="space-y-3">
      {/* Main display */}
      <MainImage image={activeImage} transitioning={transitioning} />

      {/* Thumbnails — only shown when there are multiple images */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {images.map((img, i) => (
            <Thumbnail
              key={img.src}
              image={img}
              isActive={i === activeIndex}
              onClick={() => handleSelect(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
