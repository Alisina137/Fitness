import { Router } from "express";
import { db } from "@workspace/db";
import { progressPhotosTable } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth.js";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const ALLOWED_PHOTO_TYPES = ["front", "side", "back", "custom"] as const;
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

const CreatePhotoSchema = z.object({
  imageUrl: z.string().min(1, "imageUrl is required"),
  photoType: z.enum(ALLOWED_PHOTO_TYPES, { error: "photoType must be one of: front, side, back, custom" }),
  notes: z.string().max(500).optional().nullable(),
  takenAt: z.string().optional().nullable(),
  contentType: z.string().optional(),
});

// ─── POST /api/progress-photos ────────────────────────────────────────────────

router.post("/progress-photos", requireAuth, async (req, res) => {
  const user = getUser(req);

  const parsed = CreatePhotoSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return res.status(400).json({ error: firstIssue?.message || "Validation failed" });
  }

  const { imageUrl, photoType, notes, takenAt, contentType } = parsed.data;

  // Validate content type if provided
  if (contentType && !ALLOWED_CONTENT_TYPES.includes(contentType.toLowerCase())) {
    return res.status(400).json({
      error: "Unsupported file type. Allowed types: JPEG, PNG, WebP, GIF, HEIC",
    });
  }

  const [photo] = await db
    .insert(progressPhotosTable)
    .values({
      userId: user.id,
      imageUrl,
      photoType,
      notes: notes || null,
      takenAt: takenAt ? new Date(takenAt) : new Date(),
    })
    .returning();

  res.status(201).json(serializePhoto(photo));
});

// ─── GET /api/progress-photos ─────────────────────────────────────────────────

router.get("/progress-photos", requireAuth, async (req, res) => {
  const user = getUser(req);
  const typeFilter = req.query.type as string | undefined;

  // Validate optional type filter
  if (typeFilter && !ALLOWED_PHOTO_TYPES.includes(typeFilter as typeof ALLOWED_PHOTO_TYPES[number])) {
    return res.status(400).json({
      error: `Invalid photo type. Must be one of: ${ALLOWED_PHOTO_TYPES.join(", ")}`,
    });
  }

  const conditions = [eq(progressPhotosTable.userId, user.id)];
  if (typeFilter) {
    conditions.push(eq(progressPhotosTable.photoType, typeFilter as typeof ALLOWED_PHOTO_TYPES[number]));
  }

  const photos = await db
    .select()
    .from(progressPhotosTable)
    .where(and(...conditions))
    .orderBy(desc(progressPhotosTable.takenAt));

  res.json(photos.map(serializePhoto));
});

// ─── GET /api/progress-photos/timeline ───────────────────────────────────────
// Must be registered before /:id to avoid Express matching "timeline" as an id.

router.get("/progress-photos/timeline", requireAuth, async (req, res) => {
  const user = getUser(req);

  const photos = await db
    .select()
    .from(progressPhotosTable)
    .where(eq(progressPhotosTable.userId, user.id))
    .orderBy(desc(progressPhotosTable.takenAt));

  res.json(photos.map(serializePhoto));
});

// ─── GET /api/progress-photos/compare ────────────────────────────────────────
// Must be registered before /:id to avoid Express matching "compare" as an id.

router.get("/progress-photos/compare", requireAuth, async (req, res) => {
  const user = getUser(req);

  const beforePhotoId = Number(req.query.beforePhotoId);
  const afterPhotoId = Number(req.query.afterPhotoId);

  if (!beforePhotoId || isNaN(beforePhotoId) || !afterPhotoId || isNaN(afterPhotoId)) {
    return res.status(400).json({ error: "beforePhotoId and afterPhotoId are required" });
  }

  if (beforePhotoId === afterPhotoId) {
    return res.status(400).json({ error: "Cannot compare a photo with itself" });
  }

  const [beforeRows, afterRows] = await Promise.all([
    db
      .select()
      .from(progressPhotosTable)
      .where(and(eq(progressPhotosTable.id, beforePhotoId), eq(progressPhotosTable.userId, user.id))),
    db
      .select()
      .from(progressPhotosTable)
      .where(and(eq(progressPhotosTable.id, afterPhotoId), eq(progressPhotosTable.userId, user.id))),
  ]);

  const before = beforeRows[0];
  const after = afterRows[0];

  if (!before) return res.status(404).json({ error: "Before photo not found" });
  if (!after) return res.status(404).json({ error: "After photo not found" });

  if (before.photoType !== after.photoType) {
    return res.status(400).json({
      error: `Cannot compare different photo types (${before.photoType} vs ${after.photoType})`,
    });
  }

  const daysBetween = Math.abs(
    Math.floor(
      (new Date(after.takenAt).getTime() - new Date(before.takenAt).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  res.json({
    before: serializePhoto(before),
    after: serializePhoto(after),
    daysBetween,
  });
});

// ─── DELETE /api/progress-photos/:id ─────────────────────────────────────────

router.delete("/progress-photos/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid photo id" });
  }

  const [existing] = await db
    .select({ id: progressPhotosTable.id })
    .from(progressPhotosTable)
    .where(and(eq(progressPhotosTable.id, id), eq(progressPhotosTable.userId, user.id)));

  if (!existing) {
    return res.status(404).json({ error: "Photo not found" });
  }

  await db
    .delete(progressPhotosTable)
    .where(and(eq(progressPhotosTable.id, id), eq(progressPhotosTable.userId, user.id)));

  res.json({ deleted: true, id });
});

// ─── Serializer ───────────────────────────────────────────────────────────────

function serializePhoto(p: typeof progressPhotosTable.$inferSelect) {
  return {
    id: p.id,
    userId: p.userId,
    imageUrl: p.imageUrl,
    photoType: p.photoType,
    notes: p.notes,
    takenAt: p.takenAt,
    createdAt: p.createdAt,
  };
}

export default router;
