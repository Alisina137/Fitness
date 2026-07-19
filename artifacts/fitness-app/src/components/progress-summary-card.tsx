import { Dumbbell, Target, Ruler, Camera, Trophy, Flame, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useGetProgressSummary } from "@workspace/api-client-react";

// ─── Stat tile ────────────────────────────────────────────────────────────────

type StatTileProps = {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  loading?: boolean;
};

function StatTile({ icon: Icon, label, value, sub, accent = "text-primary", loading }: StatTileProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-1 relative overflow-hidden group">
      <div className="absolute -right-3 -top-3 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="h-20 w-20" />
      </div>
      <div className={cn("flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground")}>
        <Icon className={cn("h-3 w-3", accent)} />
        {label}
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-secondary rounded animate-pulse mt-1" />
      ) : (
        <div className="text-2xl md:text-3xl font-bold font-mono">{value}</div>
      )}
      {sub && !loading && (
        <div className="text-xs text-muted-foreground truncate">{sub}</div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProgressSummaryCard() {
  const { data, isLoading, isError } = useGetProgressSummary();

  if (isError) {
    return (
      <div className="bg-card border border-border rounded-3xl p-6 text-sm text-muted-foreground text-center">
        Could not load progress summary.
      </div>
    );
  }

  const latestMeasurementLabel = data?.bodyMeasurements.latestDate
    ? formatDistanceToNow(new Date(data.bodyMeasurements.latestDate), { addSuffix: true })
    : "No data";

  const latestMeasurementSub = data?.bodyMeasurements.latestDate
    ? format(new Date(data.bodyMeasurements.latestDate), "MMM d, yyyy")
    : undefined;

  const latestPRLabel = data?.personalRecords.latest
    ? `${data.personalRecords.latest.exerciseName}`
    : "None yet";

  const latestPRSub = data?.personalRecords.latest
    ? `${data.personalRecords.latest.value} ${data.personalRecords.latest.unit} · ${
        formatDistanceToNow(new Date(data.personalRecords.latest.achievedAt), { addSuffix: true })
      }`
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Progress Overview</h2>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatTile
          icon={Dumbbell}
          label="Workouts"
          value={data?.workouts.totalCompleted ?? 0}
          sub={
            (data?.workouts.currentStreak ?? 0) > 0
              ? `${data!.workouts.currentStreak}-day streak 🔥`
              : "No active streak"
          }
          accent="text-blue-500"
          loading={isLoading}
        />

        <StatTile
          icon={Target}
          label="Active Goals"
          value={data?.goals.active ?? 0}
          sub={
            (data?.goals.completed ?? 0) > 0
              ? `${data!.goals.completed} completed`
              : "None completed yet"
          }
          accent="text-green-500"
          loading={isLoading}
        />

        <StatTile
          icon={Ruler}
          label="Last Measurement"
          value={isLoading ? "—" : latestMeasurementLabel}
          sub={latestMeasurementSub}
          accent="text-purple-500"
          loading={isLoading}
        />

        <StatTile
          icon={Camera}
          label="Progress Photos"
          value={data?.progressPhotos.total ?? 0}
          sub="total uploaded"
          accent="text-orange-500"
          loading={isLoading}
        />

        <StatTile
          icon={Trophy}
          label="Personal Records"
          value={data?.personalRecords.total ?? 0}
          sub={latestPRLabel}
          accent="text-yellow-500"
          loading={isLoading}
        />

        <StatTile
          icon={Flame}
          label="Goals Completed"
          value={data?.goals.completed ?? 0}
          sub={
            (data?.goals.active ?? 0) > 0
              ? `${data!.goals.active} active now`
              : "No active goals"
          }
          accent="text-red-500"
          loading={isLoading}
        />
      </div>
    </div>
  );
}
