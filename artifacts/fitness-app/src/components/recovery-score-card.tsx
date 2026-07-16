import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RecoveryStatus = "excellent" | "good" | "moderate" | "poor";

export type ScoreBreakdown = {
  sleep: number;
  energy: number;
  soreness: number;
  stress: number;
  motivation: number;
};

export type RecoveryScoreData = {
  score: number;
  status: RecoveryStatus;
  label: string;
  recommendation: string;
  breakdown: ScoreBreakdown;
};

// ─── Style maps ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<RecoveryStatus, {
  ring: string;
  text: string;
  bg: string;
  badge: string;
}> = {
  excellent: {
    ring: "#84cc16",
    text: "text-lime-400",
    bg: "bg-lime-500/10",
    badge: "border-lime-500/30 text-lime-400 bg-lime-500/10",
  },
  good: {
    ring: "#3b82f6",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    badge: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  },
  moderate: {
    ring: "#eab308",
    text: "text-yellow-400",
    bg: "bg-yellow-500/10",
    badge: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
  },
  poor: {
    ring: "#ef4444",
    text: "text-red-400",
    bg: "bg-red-500/10",
    badge: "border-red-500/30 text-red-400 bg-red-500/10",
  },
};

const FACTOR_LABELS: Record<keyof ScoreBreakdown, string> = {
  sleep: "Sleep",
  energy: "Energy",
  soreness: "Soreness",
  stress: "Stress",
  motivation: "Motivation",
};

const FACTOR_WEIGHTS: Record<keyof ScoreBreakdown, string> = {
  sleep: "30%",
  energy: "25%",
  soreness: "20%",
  stress: "15%",
  motivation: "10%",
};

// ─── Circular Score Ring ──────────────────────────────────────────────────────

function ScoreRing({
  score,
  status,
  size = 120,
}: {
  score: number;
  status: RecoveryStatus;
  size?: number;
}) {
  const styles = STATUS_STYLES[status];
  const radius = size * 0.44;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const stroke = size * 0.083;
  const center = size / 2;
  const fontSize = size * 0.27;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        className="absolute inset-0 -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: size, height: size }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={styles.ring}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="z-10 text-center">
        <div
          className="font-black leading-none tabular-nums"
          style={{ fontSize, color: styles.ring }}
        >
          {score}
        </div>
        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
          /100
        </div>
      </div>
    </div>
  );
}

// ─── Factor Bar ───────────────────────────────────────────────────────────────

function FactorBar({
  label,
  value,
  weight,
  color,
}: {
  label: string;
  value: number;
  weight: string;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60">{weight}</span>
          <span className="font-bold tabular-nums" style={{ color }}>
            {Math.round(value)}%
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function RecoveryScoreCardSkeleton({ compact }: { compact: boolean }) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-3xl animate-pulse",
        compact ? "p-4" : "p-6",
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className="rounded-full bg-secondary shrink-0"
          style={{ width: compact ? 80 : 120, height: compact ? 80 : 120 }}
        />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-secondary rounded-xl w-32" />
          <div className="h-3 bg-secondary rounded-xl w-48" />
          {!compact && (
            <>
              <div className="h-3 bg-secondary rounded-xl w-full mt-3" />
              <div className="h-3 bg-secondary rounded-xl w-full" />
              <div className="h-3 bg-secondary rounded-xl w-3/4" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function RecoveryScoreCardEmpty({ message }: { message: string }) {
  return (
    <div className="bg-card border border-border border-dashed rounded-3xl p-6 text-center space-y-2">
      <div className="text-2xl">🛌</div>
      <p className="text-sm font-semibold">No recovery score yet</p>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function RecoveryScoreCardError({ message }: { message: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-4 text-center space-y-1">
      <p className="text-sm font-semibold text-red-400">Failed to load score</p>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export type RecoveryScoreCardProps = {
  /** Pass score data directly, or leave undefined while loading/empty. */
  data?: RecoveryScoreData | null;
  /** Show a loading skeleton. */
  loading?: boolean;
  /** Show an error message. */
  error?: string | null;
  /** Show a compact version (smaller ring, no breakdown bars). */
  compact?: boolean;
  /** Extra class names for the wrapper. */
  className?: string;
};

/**
 * RecoveryScoreCard
 *
 * Reusable component that displays a circular recovery score ring, status badge,
 * recommendation text, and per-factor breakdown bars.
 *
 * Usage:
 *   <RecoveryScoreCard loading />
 *   <RecoveryScoreCard data={scoreData} />
 *   <RecoveryScoreCard data={scoreData} compact />
 *   <RecoveryScoreCard error="Could not load score" />
 */
export function RecoveryScoreCard({
  data,
  loading = false,
  error,
  compact = false,
  className,
}: RecoveryScoreCardProps) {
  // ── Loading ──
  if (loading) return <RecoveryScoreCardSkeleton compact={compact} />;

  // ── Error ──
  if (error) return <RecoveryScoreCardError message={error} />;

  // ── Empty ──
  if (!data) {
    return (
      <RecoveryScoreCardEmpty message="Complete today's check-in to generate your recovery score." />
    );
  }

  const styles = STATUS_STYLES[data.status];
  const ringSize = compact ? 80 : 120;

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-3xl overflow-hidden",
        compact ? "p-4" : "p-6",
        className,
      )}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-[0.07] pointer-events-none -translate-y-1/3 translate-x-1/3"
        style={{ backgroundColor: styles.ring }}
      />

      <div className={cn("relative flex gap-5", compact ? "items-center" : "items-start")}>
        {/* Ring */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          <ScoreRing score={data.score} status={data.status} size={ringSize} />

          {!compact && (
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest border rounded-full px-2 py-0.5",
                styles.badge,
              )}
            >
              {data.label}
            </span>
          )}
        </div>

        {/* Right side */}
        <div className="flex-1 min-w-0 space-y-3">
          {compact && (
            <div>
              <p className={cn("text-sm font-bold", styles.text)}>{data.label}</p>
            </div>
          )}

          {!compact && (
            <div className={cn("rounded-2xl p-3 border", styles.bg)}>
              <p className={cn("text-sm font-medium leading-relaxed", styles.text)}>
                {data.recommendation}
              </p>
            </div>
          )}

          {/* Factor breakdown */}
          {!compact && (
            <div className="space-y-2 pt-1">
              {(Object.keys(data.breakdown) as Array<keyof ScoreBreakdown>).map((key) => (
                <FactorBar
                  key={key}
                  label={FACTOR_LABELS[key]}
                  value={data.breakdown[key]}
                  weight={FACTOR_WEIGHTS[key]}
                  color={styles.ring}
                />
              ))}
            </div>
          )}

          {compact && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {data.recommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
