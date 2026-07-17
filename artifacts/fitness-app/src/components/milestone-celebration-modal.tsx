import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Zap, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Milestone } from "./milestone-card";

// ─── Confetti particle ────────────────────────────────────────────────────────

type Particle = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  shape: "rect" | "circle";
};

const COLORS = ["#84cc16", "#facc15", "#fb923c", "#c084fc", "#38bdf8", "#f472b6", "#4ade80"];

function useConfetti(active: boolean, canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Spawn particles
    particlesRef.current = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      angle: Math.random() * Math.PI * 2,
      speed: 3 + Math.random() * 6,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      shape: Math.random() > 0.4 ? "rect" : "circle",
    }));

    let tick = 0;

    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => p.y < canvas.height + 20);

      for (const p of particlesRef.current) {
        p.x += Math.cos(p.angle) * p.speed * 0.8;
        p.y += Math.sin(p.angle) * p.speed * 0.8 + 1.5; // gravity
        p.speed *= 0.98;
        p.rotation += p.rotationSpeed;
        p.angle += (Math.random() - 0.5) * 0.1;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - tick / 180);

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (tick < 200 && particlesRef.current.length > 0) {
        animRef.current = requestAnimationFrame(draw);
      }
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, canvasRef]);
}

// ─── Milestone icons ──────────────────────────────────────────────────────────

const MILESTONE_ICONS: Record<number, React.ElementType> = {
  25:  Zap,
  50:  Target,
  75:  Star,
  100: Trophy,
};

const MILESTONE_COLORS: Record<number, string> = {
  25:  "from-orange-500 to-orange-400",
  50:  "from-yellow-500 to-yellow-400",
  75:  "from-lime-500 to-lime-400",
  100: "from-primary to-lime-400",
};

// ─── MilestoneCelebrationModal ────────────────────────────────────────────────

type Props = {
  milestone: Milestone | null;
  goalTitle?: string;
  onClose: () => void;
};

export function MilestoneCelebrationModal({ milestone, goalTitle, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const open = milestone !== null;

  useConfetti(open, canvasRef);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && milestone && (() => {
        const Icon = MILESTONE_ICONS[milestone.milestonePercentage] ?? Trophy;
        const gradient = MILESTONE_COLORS[milestone.milestonePercentage] ?? "from-primary to-lime-400";

        return (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Canvas for confetti */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none z-10"
              style={{ width: "100%", height: "100%" }}
            />

            {/* Modal */}
            <motion.div
              className="relative z-20 bg-card border border-border rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl overflow-hidden"
              initial={{ scale: 0.7, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 18, stiffness: 300 }}
            >
              {/* Glow bg */}
              <div className={cn("absolute inset-0 opacity-5 bg-gradient-to-br pointer-events-none", gradient)} />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Icon */}
              <motion.div
                className="relative mx-auto mb-6 h-20 w-20"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 260, delay: 0.1 }}
              >
                <div className={cn("h-20 w-20 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", gradient)}>
                  <Icon className="h-10 w-10 text-black/80" />
                </div>
              </motion.div>

              {/* Emoji */}
              <motion.div
                className="text-4xl mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                🎉
              </motion.div>

              <motion.h2
                className="text-2xl font-black mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                Congratulations!
              </motion.h2>

              <motion.p
                className="text-muted-foreground text-sm mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {milestone.description ?? `You've reached ${milestone.milestonePercentage}% of your goal.`}
              </motion.p>

              {goalTitle && (
                <motion.p
                  className="text-xs text-muted-foreground/60 mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  Goal: <span className="font-semibold text-muted-foreground">{goalTitle}</span>
                </motion.p>
              )}

              {/* Milestone badge */}
              <motion.div
                className={cn("inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold mb-6 bg-gradient-to-r text-black/80", gradient)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Icon className="h-4 w-4" />
                {milestone.milestonePercentage === 100 ? "Goal Complete!" : `${milestone.milestonePercentage}% Milestone`}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
              >
                <Button onClick={onClose} className="w-full font-bold">
                  Keep Going 💪
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
