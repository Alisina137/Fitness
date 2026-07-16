import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

const AI_RESPONSES = [
  "Based on your recent workouts, I recommend increasing your protein intake to support muscle recovery. Aim for around 1.6g per kg of bodyweight.",
  "Your consistency this week has been excellent! Keep maintaining that streak — rest days are equally important. Consider a mobility session tomorrow.",
  "Looking at your progress data, you've made significant strength gains. I suggest progressing to the next difficulty level in your push workout.",
  "Hydration is key for performance. Make sure you're drinking at least 2-3L of water daily, especially on training days.",
  "Your sleep and recovery metrics suggest you might benefit from incorporating some active recovery sessions — light yoga or a walk can accelerate adaptation.",
  "Great work hitting your weekly target! Your body composition data shows you're trending in the right direction. Stay consistent.",
  "I've analyzed your workout history and noticed you rarely train your posterior chain. Adding Romanian deadlifts or glute bridges would bring more balance.",
  "For your goals, a progressive overload approach works best. Try adding 2.5kg to your main lifts every two weeks.",
];

router.get("/ai/conversations", requireAuth, async (req, res) => {
  const user = getUser(req);
  const conversations = await db.select().from(conversationsTable).where(eq(conversationsTable.userId, user.id)).orderBy(desc(conversationsTable.createdAt));
  res.json(conversations);
});

router.post("/ai/conversations", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { title } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  const [conversation] = await db.insert(conversationsTable).values({ userId: user.id, title }).returning();
  res.status(201).json(conversation);
});

router.get("/ai/conversations/:id/messages", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversationsTable).where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, user.id))).limit(1);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const messages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
  res.json(messages);
});

router.post("/ai/conversations/:id/messages", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "content is required" }); return; }

  const [conv] = await db.select().from(conversationsTable).where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, user.id))).limit(1);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }

  const [userMessage] = await db.insert(messagesTable).values({ conversationId: id, role: "user", content }).returning();

  // Stub AI response
  const aiContent = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
  const [aiMessage] = await db.insert(messagesTable).values({ conversationId: id, role: "assistant", content: aiContent }).returning();

  await db.update(conversationsTable).set({ lastMessageAt: new Date(), messageCount: conv.messageCount + 2 }).where(eq(conversationsTable.id, id));

  res.status(201).json(aiMessage);
});

export default router;
