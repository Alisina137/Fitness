import { Router } from "express";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "monthly",
    features: ["3 workout plans", "Basic exercise library", "7-day progress history"],
    isPopular: false,
  },
  {
    id: "premium_monthly",
    name: "Premium",
    price: 14.99,
    interval: "monthly",
    features: ["Unlimited workout plans", "Full exercise library", "AI coach (50 messages/month)", "Advanced analytics", "Nutrition tracking", "Priority support"],
    isPopular: true,
  },
  {
    id: "elite_monthly",
    name: "Elite",
    price: 29.99,
    interval: "monthly",
    features: ["Everything in Premium", "Unlimited AI coach", "Custom AI workout generation", "Body composition tracking", "1-on-1 coach consultation", "Early access to features"],
    isPopular: false,
  },
  {
    id: "premium_yearly",
    name: "Premium (Annual)",
    price: 119.99,
    interval: "yearly",
    features: ["Unlimited workout plans", "Full exercise library", "AI coach (50 messages/month)", "Advanced analytics", "Nutrition tracking", "Priority support", "2 months free"],
    isPopular: false,
  },
];

router.get("/subscriptions/current", requireAuth, async (req, res) => {
  const user = getUser(req);
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  res.json({
    id: user.id,
    userId: user.id,
    planId: user.subscriptionStatus === "free" ? "free" : "premium_monthly",
    planName: user.subscriptionStatus === "free" ? "Free" : "Premium",
    status: "active",
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
  });
});

router.get("/subscriptions/plans", async (_req, res) => {
  res.json(PLANS);
});

export default router;
