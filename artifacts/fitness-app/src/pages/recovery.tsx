import React, { useState, useCallback, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Moon, Zap, Activity, Brain, Target, Flame, ChevronRight,
  CheckCircle, AlertTriangle, XCircle, Dumbbell, Clock,
  TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type ReadinessCategory = "excellent" | "good" | "moderate" | "poor";

type Readiness = {
  category: ReadinessCategory;
  label: string;
  recommendation: string;
  color: string;
  intensityModifier: number;
};

type CheckIn = {
  id: number;
  date: string;
  sleepQuality: string;
  energyLevel: number;
  stressLevel: number;
  muscleSoreness: number;
  motivationLevel: number;
  mood?: string | null;
  notes?: string | null;
  recoveryScore: number | null;
};

type MuscleRecovery = {
  id: number;
  muscleGroup: string;
  lastTrainedDate: string | null;
  trainingVolume: number;
  sorenessLevel: number;
  recoveryPercentage: number;
};

type RecoveryProfile = {
  recoveryScore: number;
  readinessScore: number;
  fatigueLevel: string;
  recoveryTrend: string;
  lastUpdated: string;
};

type TodayData = {
  checkedInToday: boolean;
  checkIn: CheckIn | null;
  profile: RecoveryProfile | null;
  score: number | null;
  readiness: Readiness | null;
  muscles: MuscleRecovery[];
  recommendation: string | null;
};

type HistoryItem = CheckIn;

// ─── API helpers ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const READINESS_COLORS: Record<ReadinessCategory, { ring: string; bg: string; text: string; badge: string }> = {
  excellent: { ring: "#84cc16", bg: "bg-lime-500/10", text: "text-lime-400", badge: "border-lime-500/30 text-lime-400 bg-lime-500/10" },
  good:      { ring: "#3b82f6", bg: "bg-blue-500/10",  text: "text-blue-400",  badge: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  moderate:  { ring: "#eab308", bg: "bg-yellow-500/10", text: "text-yellow-400", badge: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" },
  poor:      { ring: "#ef4444", bg: "bg-red-500/10",   text: "text-red-400",   badge: "border-red-500/30 text-red-400 bg-red-500/10" },
};

function muscleColor(pct: number) {
  if (pct >= 80) return "#84cc16";
  if (pct >= 60) return "#3b82f6";
  if (pct >= 40) return "#eab308";
  return "#ef4444";
}

function muscleStatus(pct: number): { label: string; icon: React.ReactNode } {
  if (pct >= 80) return { label: "Recovered", icon: <CheckCircle className="h-3 w-3 text-lime-400" /> };
  if (pct >= 60) return { label: "Recovering", icon: <RefreshCw className="h-3 w-3 text-blue-400" /> };
  if (pct >= 40) return { label: "Fatigued", icon: <AlertTriangle className="h-3 w-3 text-yellow-400" /> };
  return { label: "Rest Needed", icon: <XCircle className="h-3 w-3 text-red-400" /> };
}

function hoursAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const h = Math.round((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function trendIcon(trend: string) {
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-lime-400" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

// ─── Recovery Score Ring ─────────────────────────────────────────────────────

function RecoveryRing({ score, category }: { score: number; category: ReadinessCategory }) {
  const radius = 62;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = READINESS_COLORS[category].ring;

  return (
    <div className="relative flex items-center justify-center w-44 h-44">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-4xl font-black" style={{ color }}>{score}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">/100</div>
      </div>
    </div>
  );
}

// ─── Check-In Form ───────────────────────────────────────────────────────────

const SLEEP_OPTIONS = [
  { value: "poor", label: "Poor", emoji: "😴" },
  { value: "average", label: "Average", emoji: "😐" },
  { value: "good", label: "Good", emoji: "🙂" },
  { value: "excellent", label: "Excellent", emoji: "😄" },
];

type CheckInData = {
  sleepQuality: string;
  energyLevel: number;
  stressLevel: number;
  muscleSoreness: number;
  motivationLevel: number;
};

function CheckInForm({ onComplete }: { onComplete: (data: CheckInData) => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<CheckInData>>({});

  const steps = [
    {
      key: "sleepQuality",
      icon: Moon,
      title: "How was your sleep last night?",
      subtitle: "Sleep is the foundation of recovery",
      type: "sleep" as const,
    },
    {
      key: "energyLevel",
      icon: Zap,
      title: "Energy level right now?",
      subtitle: "How energised do you feel?",
      type: "scale" as const,
    },
    {
      key: "muscleSoreness",
      icon: Activity,
      title: "Muscle soreness?",
      subtitle: "Overall body soreness level",
      type: "scale" as const,
    },
    {
      key: "stressLevel",
      icon: Brain,
      title: "Stress level today?",
      subtitle: "Physical and mental stress combined",
      type: "scale" as const,
    },
    {
      key: "motivationLevel",
      icon: Flame,
      title: "Training motivation?",
      subtitle: "How keen are you to train today?",
      type: "scale" as const,
    },
  ] as const;

  const current = steps[step];
  const StepIcon = current.icon;
  const progress = ((step) / steps.length) * 100;

  function selectSleep(v: string) {
    const next = { ...data, sleepQuality: v };
    setData(next);
    setTimeout(() => setStep(1), 280);
  }

  function selectScale(key: string, v: number) {
    const next = { ...data, [key]: v };
    setData(next);
    if (step < steps.length - 1) {
      setTimeout(() => setStep((s) => s + 1), 220);
    } else {
      // Submit
      onComplete(next as CheckInData);
    }
  }

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* Step header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center mx-auto">
            <StepIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Step {step + 1} of {steps.length}
            </div>
            <h2 className="text-xl font-bold">{current.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{current.subtitle}</p>
          </div>
        </div>

        {/* Sleep options */}
        {current.type === "sleep" && (
          <div className="grid grid-cols-2 gap-3">
            {SLEEP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => selectSleep(opt.value)}
                className={cn(
                  "rounded-2xl border-2 p-5 text-center space-y-2 transition-all hover:scale-[1.02] active:scale-[0.98]",
                  data.sleepQuality === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/30 hover:border-primary/50"
                )}
              >
                <div className="text-3xl">{opt.emoji}</div>
                <div className="font-semibold text-sm">{opt.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Scale 1-10 */}
        {current.type === "scale" && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => {
                const selected = data[current.key as keyof CheckInData] === v;
                let ringColor = "";
                // Color gradient: 1-3 red, 4-5 orange, 6-7 yellow, 8-10 green
                if (v <= 3) ringColor = selected ? "border-red-500 bg-red-500/20 text-red-400" : "border-border hover:border-red-500/50";
                else if (v <= 5) ringColor = selected ? "border-orange-500 bg-orange-500/20 text-orange-400" : "border-border hover:border-orange-500/50";
                else if (v <= 7) ringColor = selected ? "border-yellow-500 bg-yellow-500/20 text-yellow-400" : "border-border hover:border-yellow-500/50";
                else ringColor = selected ? "border-lime-500 bg-lime-500/20 text-lime-400" : "border-border hover:border-lime-500/50";

                return (
                  <button
                    key={v}
                    onClick={() => selectScale(current.key, v)}
                    className={cn(
                      "aspect-square rounded-xl border-2 font-bold text-sm transition-all hover:scale-110 active:scale-95",
                      ringColor,
                    )}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>Very Low</span>
              <span>Very High</span>
            </div>
          </div>
        )}

        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Metric Pill ─────────────────────────────────────────────────────────────

function MetricPill({ icon: Icon, label, value, max = 10, unit }: {
  icon: React.ElementType; label: string; value: string | number; max?: number; unit?: string;
}) {
  const numVal = typeof value === "number" ? value : null;
  const pct = numVal !== null ? (numVal / max) * 100 : null;

  return (
    <div className="bg-secondary/40 rounded-2xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-3 w-3 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="font-bold text-lg leading-none">
        {value}{unit && <span className="text-xs text-muted-foreground font-normal ml-1">{unit}</span>}
      </div>
      {pct !== null && (
        <div className="h-1 bg-background rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// ─── Muscle Card ─────────────────────────────────────────────────────────────

function MuscleCard({ m }: { m: MuscleRecovery }) {
  const status = muscleStatus(m.recoveryPercentage);
  const color = muscleColor(m.recoveryPercentage);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status.icon}
          <span className="font-semibold text-sm">{m.muscleGroup}</span>
        </div>
        <span className="text-sm font-bold" style={{ color }}>{m.recoveryPercentage}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${m.recoveryPercentage}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{status.label}</span>
        <span>{hoursAgo(m.lastTrainedDate)}</span>
      </div>
    </div>
  );
}

// ─── History Bar Chart ───────────────────────────────────────────────────────

function RecoveryTrendChart({ history }: { history: HistoryItem[] }) {
  const data = [...history]
    .reverse()
    .slice(-14)
    .map((h) => ({
      date: new Date(h.date).toLocaleDateString("en", { weekday: "short" }).slice(0, 1),
      score: h.recoveryScore ?? 0,
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="font-bold text-sm">14-Day Recovery Trend</span>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} barSize={20}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const score = payload[0].value as number;
              return (
                <div className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs font-bold">
                  {score}/100
                </div>
              );
            }}
          />
          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.score >= 85 ? "#84cc16" : d.score >= 70 ? "#3b82f6" : d.score >= 50 ? "#eab308" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Empty / No check-in prompt ──────────────────────────────────────────────

function NoCheckInPrompt({ onStart }: { onStart: () => void }) {
  return (
    <div className="bg-card border border-border rounded-3xl p-8 text-center space-y-5">
      <div className="inline-flex h-20 w-20 rounded-3xl bg-primary/10 items-center justify-center mx-auto">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold">Good morning!</h2>
        <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
          Take 30 seconds to check in and get today's personalised training recommendation.
        </p>
      </div>
      <Button
        size="lg"
        className="h-12 px-8 font-bold text-black rounded-2xl shadow-lg shadow-primary/20"
        onClick={onStart}
      >
        Start Check-In <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecoveryPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [today, setToday] = useState<TodayData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [todayData, historyData] = await Promise.all([
        apiFetch<TodayData>("/recovery/today"),
        apiFetch<HistoryItem[]>("/recovery/history?days=14"),
      ]);
      setToday(todayData);
      setHistory(historyData);
      setShowForm(!todayData.checkedInToday);
    } catch (err) {
      toast({ title: "Failed to load recovery data", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCheckInSubmit = useCallback(async (data: CheckInData) => {
    setSubmitting(true);
    const todayStr = new Date().toISOString().split("T")[0];
    try {
      await apiFetch("/recovery/check-in", {
        method: "POST",
        body: JSON.stringify({ date: todayStr, ...data }),
      });
      toast({ title: "Check-in complete!", description: "Your recovery score has been calculated." });
      setShowForm(false);
      await load();
    } catch (err) {
      toast({ title: "Check-in failed", description: (err as Error).message, variant: "destructive" });
      setSubmitting(false);
    }
  }, [load, toast]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5 animate-pulse">
        <div className="h-8 bg-secondary rounded-xl w-48" />
        <div className="bg-card border border-border rounded-3xl h-64" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-card border border-border rounded-2xl h-24" />)}
        </div>
        <div className="bg-card border border-border rounded-3xl h-40" />
      </div>
    );
  }

  // ── Check-in form ──
  if (showForm) {
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-black">Daily Check-In</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        {submitting ? (
          <div className="bg-card border border-border rounded-3xl p-12 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="font-semibold">Calculating your recovery score…</p>
          </div>
        ) : (
          <CheckInForm onComplete={handleCheckInSubmit} />
        )}
      </div>
    );
  }

  // ── No check-in yet (first-time state) ──
  if (!today?.checkedInToday) {
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-black">Recovery</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <NoCheckInPrompt onStart={() => setShowForm(true)} />
        {history.length > 0 && <RecoveryTrendChart history={history} />}
      </div>
    );
  }

  const score = today.score ?? 75;
  const readiness = today.readiness;
  const profile = today.profile;
  const category = (readiness?.category ?? "good") as ReadinessCategory;
  const colors = READINESS_COLORS[category];
  const checkIn = today.checkIn!;

  const sleepEmoji = { excellent: "😄", good: "🙂", average: "😐", poor: "😴" }[checkIn.sleepQuality] ?? "😐";

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5 animate-in fade-in duration-500 pb-10">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Recovery</h1>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl text-xs"
          onClick={() => setShowForm(true)}
        >
          <RefreshCw className="h-3 w-3 mr-1.5" /> Re-check
        </Button>
      </div>

      {/* Hero recovery card */}
      <div className={cn("bg-card border border-border rounded-3xl p-6 relative overflow-hidden")}>
        {/* Background glow */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none -translate-y-1/3 translate-x-1/3"
          style={{ backgroundColor: colors.ring }}
        />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <RecoveryRing score={score} category={category} />
            <Badge className={cn("border text-[10px] font-bold uppercase tracking-widest", colors.badge)}>
              {readiness?.label ?? "—"}
            </Badge>
          </div>

          <div className="flex-1 space-y-4">
            {/* Trend + fatigue */}
            <div className="flex items-center gap-3 flex-wrap">
              {profile?.recoveryTrend && (
                <div className="flex items-center gap-1.5 bg-secondary/60 rounded-xl px-3 py-1.5">
                  {trendIcon(profile.recoveryTrend)}
                  <span className="text-xs font-medium capitalize">{profile.recoveryTrend}</span>
                </div>
              )}
              {profile?.fatigueLevel && profile.fatigueLevel !== "normal" && (
                <div className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium",
                  profile.fatigueLevel === "overtraining_risk"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-yellow-500/10 text-yellow-400",
                )}>
                  <AlertTriangle className="h-3 w-3" />
                  {profile.fatigueLevel === "overtraining_risk" ? "Overtraining Risk" : "High Fatigue"}
                </div>
              )}
            </div>

            {/* Recommendation */}
            {today.recommendation && (
              <div className={cn("rounded-2xl p-4 border", colors.bg, `border-[${colors.ring}]/20`)}>
                <div className="flex items-start gap-2">
                  <Target className={cn("h-4 w-4 shrink-0 mt-0.5", colors.text)} />
                  <p className={cn("text-sm font-medium leading-relaxed", colors.text)}>
                    {today.recommendation}
                  </p>
                </div>
              </div>
            )}

            {/* Last updated */}
            {profile?.lastUpdated && (
              <p className="text-[10px] text-muted-foreground">
                Updated {new Date(profile.lastUpdated).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Fatigue warning banner */}
      {profile?.fatigueLevel === "overtraining_risk" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-red-400 text-sm">Overtraining Risk Detected</div>
            <p className="text-sm text-muted-foreground mt-1">
              Your recovery indicators suggest reducing training intensity this week. Take a rest day or schedule a deload.
            </p>
          </div>
        </div>
      )}

      {/* Check-in metrics strip */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-0.5">Today's Check-In</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <MetricPill icon={Moon} label="Sleep" value={`${sleepEmoji} ${checkIn.sleepQuality}`} max={10} />
          <MetricPill icon={Zap} label="Energy" value={checkIn.energyLevel} max={10} unit="/10" />
          <MetricPill icon={Activity} label="Soreness" value={checkIn.muscleSoreness} max={10} unit="/10" />
          <MetricPill icon={Brain} label="Stress" value={checkIn.stressLevel} max={10} unit="/10" />
          <MetricPill icon={Flame} label="Motivation" value={checkIn.motivationLevel} max={10} unit="/10" />
        </div>
      </div>

      {/* Muscle recovery grid */}
      {today.muscles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Muscle Recovery</h2>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-lime-400 inline-block" />Ready</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />Recovering</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400 inline-block" />Fatigued</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {today.muscles.map((m) => <MuscleCard key={m.id} m={m} />)}
          </div>
        </div>
      )}

      {/* No muscle data placeholder */}
      {today.muscles.length === 0 && today.checkedInToday && (
        <div className="bg-card border border-border border-dashed rounded-3xl p-8 text-center space-y-2">
          <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold">No muscle data yet</p>
          <p className="text-xs text-muted-foreground">Complete a workout to start tracking muscle-level recovery.</p>
        </div>
      )}

      {/* Trend chart */}
      {history.length >= 2 && <RecoveryTrendChart history={history} />}

      {/* Score legend */}
      <div className="bg-card border border-border rounded-3xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Recovery Scale</h2>
        <div className="space-y-3">
          {[
            { range: "85–100", label: "Peak Recovery", desc: "Full intensity training", color: "#84cc16" },
            { range: "70–84", label: "Well Recovered", desc: "Train as planned", color: "#3b82f6" },
            { range: "50–69", label: "Moderate Recovery", desc: "Reduce intensity 20–30%", color: "#eab308" },
            { range: "0–49", label: "Poor Recovery", desc: "Rest or light movement", color: "#ef4444" },
          ].map((item) => (
            <div key={item.range} className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold">{item.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{item.desc}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{item.range}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Future integrations teaser */}
      <div className="border border-border border-dashed rounded-3xl p-5 opacity-60">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Coming Soon</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Connect your WHOOP, Oura Ring, Apple Health, Garmin, or Google Fit for automatic recovery data. Manual check-ins will always remain available.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {["WHOOP", "Oura", "Apple Health", "Garmin", "Google Fit", "Fitbit"].map((name) => (
            <span key={name} className="text-[10px] font-medium px-2 py-1 bg-secondary rounded-lg text-muted-foreground">
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
