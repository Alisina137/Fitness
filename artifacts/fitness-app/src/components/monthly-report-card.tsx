import { Dumbbell, Clock, Trophy, Target, Camera, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonthlyReportData = {
  month: number;
  year: number;
  totalWorkouts: number;
  totalWorkoutMinutes: number;
  totalPersonalRecords: number;
  bodyMeasurementsAdded: number;
  progressPhotosAdded: number;
  goalsCompleted: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDuration(minutes: number): string {
  if (minutes === 0) return "0 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

type TileProps = {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent: string;
};

function Tile({ icon: Icon, label, value, sub, accent }: TileProps) {
  return (
    <div className="bg-background border border-border rounded-2xl p-5 flex flex-col gap-1 relative overflow-hidden group">
      <div className="absolute -right-3 -top-3 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="h-20 w-20" />
      </div>
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className={cn("h-3 w-3", accent)} />
        {label}
      </div>
      <div className="text-2xl md:text-3xl font-bold font-mono">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type MonthlyReportCardProps = {
  data: MonthlyReportData;
};

export function MonthlyReportCard({ data }: MonthlyReportCardProps) {
  const monthLabel = `${MONTH_NAMES[data.month - 1]} ${data.year}`;
  const isEmpty =
    data.totalWorkouts === 0 &&
    data.totalPersonalRecords === 0 &&
    data.bodyMeasurementsAdded === 0 &&
    data.progressPhotosAdded === 0 &&
    data.goalsCompleted === 0;

  return (
    <div className="bg-card border border-border rounded-3xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{monthLabel}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Monthly progress summary</p>
        </div>
        {isEmpty && (
          <span className="text-xs font-medium bg-secondary text-muted-foreground px-3 py-1 rounded-full">
            No data
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="py-10 text-center text-muted-foreground">
          <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No activity recorded for {monthLabel}.</p>
          <p className="text-sm mt-1">Log workouts, measurements, or photos to see your report.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Tile
            icon={Dumbbell}
            label="Workouts"
            value={data.totalWorkouts}
            sub={data.totalWorkouts === 1 ? "session" : "sessions"}
            accent="text-blue-500"
          />
          <Tile
            icon={Clock}
            label="Workout Time"
            value={formatDuration(data.totalWorkoutMinutes)}
            sub={`${data.totalWorkoutMinutes} minutes total`}
            accent="text-cyan-500"
          />
          <Tile
            icon={Trophy}
            label="Personal Records"
            value={data.totalPersonalRecords}
            sub={data.totalPersonalRecords === 1 ? "new PR" : "new PRs"}
            accent="text-yellow-500"
          />
          <Tile
            icon={Target}
            label="Goals Completed"
            value={data.goalsCompleted}
            sub={data.goalsCompleted === 1 ? "goal reached" : "goals reached"}
            accent="text-green-500"
          />
          <Tile
            icon={Ruler}
            label="Measurements"
            value={data.bodyMeasurementsAdded}
            sub="entries logged"
            accent="text-purple-500"
          />
          <Tile
            icon={Camera}
            label="Progress Photos"
            value={data.progressPhotosAdded}
            sub={data.progressPhotosAdded === 1 ? "photo taken" : "photos taken"}
            accent="text-orange-500"
          />
        </div>
      )}
    </div>
  );
}
