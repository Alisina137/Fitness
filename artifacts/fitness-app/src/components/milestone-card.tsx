import { CheckCircle2, Circle, Trophy, Target, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export type Milestone = {
  id: number;
  goalId: number;
  milestonePercentage: number;
  milestoneValue: number | null;
  title: string;
  description: string | null;
  achieved: boolean;
  achievedAt: string | null;
};

const MILESTONE_ICONS: Record<number, React.ElementType> = {
  25:  Zap,
  50:  Target,
  75:  Star,
  100: Trophy,
};

const MILESTONE_COLORS: Record<number, string> = {
  25:  "text-orange-400 bg-orange-400/10 border-orange-400/20",
  50:  "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  75:  "text-lime-400 bg-lime-400/10 border-lime-400/20",
  100: "text-primary bg-primary/10 border-primary/20",
};

type MilestoneCardProps = {
  milestone: Milestone;
  className?: string;
};

export function MilestoneCard({ milestone, className }: MilestoneCardProps) {
  const Icon = MILESTONE_ICONS[milestone.milestonePercentage] ?? Target;
  const colors = MILESTONE_COLORS[milestone.milestonePercentage] ?? "text-primary bg-primary/10 border-primary/20";

  return (
    <div
      className={cn(
        "relative flex items-start gap-4 p-4 rounded-2xl border transition-all",
        milestone.achieved
          ? cn("bg-card border-border", colors.split(" ")[2])
          : "bg-card/50 border-border/50 opacity-60",
        className,
      )}
    >
      {/* Icon */}
      <div className={cn("shrink-0 h-10 w-10 rounded-xl border flex items-center justify-center", colors)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold">{milestone.title}</span>
          <span className={cn("text-xs font-black tabular-nums", colors.split(" ")[0])}>
            {milestone.milestonePercentage}%
          </span>
        </div>
        {milestone.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{milestone.description}</p>
        )}
        {milestone.achieved && milestone.achievedAt && (
          <p className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider opacity-70">
            Achieved {format(new Date(milestone.achievedAt), "MMM d, yyyy")}
          </p>
        )}
      </div>

      {/* Status badge */}
      <div className="shrink-0 mt-0.5">
        {milestone.achieved ? (
          <CheckCircle2 className={cn("h-5 w-5", colors.split(" ")[0])} />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/30" />
        )}
      </div>

      {/* Achieved glow */}
      {milestone.achieved && (
        <div className={cn("absolute inset-0 rounded-2xl pointer-events-none opacity-5", colors.split(" ")[1])} />
      )}
    </div>
  );
}

export function MilestoneCardSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-border bg-card animate-pulse">
      <div className="h-10 w-10 rounded-xl bg-secondary shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-secondary rounded w-2/3" />
        <div className="h-3 bg-secondary rounded w-full" />
      </div>
      <div className="h-5 w-5 bg-secondary rounded-full shrink-0 mt-0.5" />
    </div>
  );
}
