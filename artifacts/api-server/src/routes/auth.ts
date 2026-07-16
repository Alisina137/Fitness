import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken, requireAuth, getUser } from "../lib/auth";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, and name are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = hashPassword(password);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name }).returning();
  await db.insert(userProfilesTable).values({ userId: user.id, fitnessLevel: "beginner", goals: [], equipmentAvailable: [], injuries: [] });
  const token = generateToken(user.id);
  res.status(201).json({ user: serializeUser(user), token });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = generateToken(user.id);
  res.json({ user: serializeUser(user), token });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = getUser(req);

  // If the DB flag is already true, return immediately — fast path.
  if (user.onboardingCompleted) {
    return res.json(serializeUser(user));
  }

  // Slower path: check the profile. Users who completed every onboarding step
  // before the flag-writing bug was fixed will have primaryGoal + fitnessLevel
  // set but onboardingCompleted = false. Detect that here and heal the DB row.
  const [profile] = await db
    .select({ primaryGoal: userProfilesTable.primaryGoal, fitnessLevel: userProfilesTable.fitnessLevel })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, user.id))
    .limit(1);

  const effectivelyOnboarded = !!(profile?.primaryGoal && profile?.fitnessLevel);

  if (effectivelyOnboarded && !user.onboardingCompleted) {
    // Heal the stale flag so future fast-path hits work.
    await db
      .update(usersTable)
      .set({ onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));
  }

  res.json(serializeUser({ ...user, onboardingCompleted: effectivelyOnboarded }));
});

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    subscriptionStatus: user.subscriptionStatus,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt,
  };
}

export default router;
