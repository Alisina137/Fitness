import { db } from "@workspace/db";
import { workoutPlansTable, workoutDaysTable, workoutDayExercisesTable, exercisesTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";

// ─── Helper: look up exercises by name ───────────────────────────────────────

async function findExercise(name: string): Promise<{ id: number; name: string } | null> {
  const [ex] = await db.select({ id: exercisesTable.id, name: exercisesTable.name })
    .from(exercisesTable)
    .where(eq(exercisesTable.name, name))
    .limit(1);
  return ex ?? null;
}

type ExerciseRef = {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds?: number;
  notes?: string;
};

async function resolveExercises(refs: ExerciseRef[]) {
  const results = [];
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];
    const ex = await findExercise(ref.name);
    if (!ex) {
      console.warn(`  ⚠️  Exercise not found: "${ref.name}" — skipping`);
      continue;
    }
    results.push({ ...ref, exerciseId: ex.id, exerciseName: ex.name, orderIndex: i });
  }
  return results;
}

// ─── Template definitions ─────────────────────────────────────────────────────

const TEMPLATES: Array<{
  name: string;
  description: string;
  goal: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  durationWeeks: number;
  durationMinutes: number;
  weeklySchedule: { days: number[]; frequency: number };
  days: Array<{
    dayNumber: number;
    title: string;
    focusArea: string;
    estimatedDurationMinutes: number;
    isRestDay?: boolean;
    exercises: ExerciseRef[];
  }>;
}> = [
  // ─── 1. Full Body Beginner (4 weeks, 3x/week) ────────────────────────────────
  {
    name: "Full Body Beginner",
    description: "The perfect starting point for anyone new to structured training. Three full-body sessions per week build the foundational movement patterns and conditioning needed for long-term progress.",
    goal: "general_fitness",
    difficulty: "beginner",
    category: "Full Body",
    durationWeeks: 4,
    durationMinutes: 45,
    weeklySchedule: { days: [1, 3, 5], frequency: 3 }, // Mon, Wed, Fri
    days: [
      {
        dayNumber: 1,
        title: "Full Body — Session A",
        focusArea: "Compound Movements",
        estimatedDurationMinutes: 45,
        exercises: [
          { name: "Goblet Squat", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90, notes: "Keep chest tall and elbows inside knees" },
          { name: "Dumbbell Bench Press", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Single-Arm Dumbbell Row", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Dumbbell Shoulder Press", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 75 },
          { name: "Plank", sets: 3, repsMin: 30, repsMax: 45, restSeconds: 60, notes: "Hold 30–45 seconds" },
          { name: "Glute Bridge", sets: 3, repsMin: 15, repsMax: 20, restSeconds: 60 },
        ],
      },
      {
        dayNumber: 2,
        title: "Full Body — Session B",
        focusArea: "Compound Movements",
        estimatedDurationMinutes: 45,
        exercises: [
          { name: "Walking Lunges", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90, notes: "10–12 reps per leg" },
          { name: "Push-up", sets: 3, repsMin: 10, repsMax: 15, restSeconds: 75 },
          { name: "Lat Pulldown", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Lateral Raise", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60 },
          { name: "Dead Bug", sets: 3, repsMin: 8, repsMax: 10, restSeconds: 60, notes: "8–10 per side" },
          { name: "Standing Calf Raise", sets: 3, repsMin: 15, repsMax: 20, restSeconds: 60 },
        ],
      },
      {
        dayNumber: 3,
        title: "Full Body — Session C",
        focusArea: "Compound Movements + Core",
        estimatedDurationMinutes: 45,
        exercises: [
          { name: "Leg Press", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 90 },
          { name: "Incline Dumbbell Press", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Seated Cable Row", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 75 },
          { name: "Barbell Overhead Press", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Crunch", sets: 3, repsMin: 15, repsMax: 20, restSeconds: 60 },
          { name: "Hip Flexor Stretch", sets: 2, repsMin: 30, repsMax: 45, restSeconds: 45, notes: "Hold 30–45 sec per side — cool down" },
        ],
      },
    ],
  },

  // ─── 2. Weight Loss Beginner (6 weeks) ────────────────────────────────────────
  {
    name: "Weight Loss Starter",
    description: "A 6-week calorie-burning program mixing resistance training with metabolic conditioning. Designed to maximise fat loss while preserving muscle for beginners.",
    goal: "fat_loss",
    difficulty: "beginner",
    category: "HIIT",
    durationWeeks: 6,
    durationMinutes: 40,
    weeklySchedule: { days: [1, 2, 4, 5], frequency: 4 }, // Mon, Tue, Thu, Fri
    days: [
      {
        dayNumber: 1,
        title: "Resistance Circuit A",
        focusArea: "Upper Body + Core",
        estimatedDurationMinutes: 40,
        exercises: [
          { name: "Push-up", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60 },
          { name: "Seated Cable Row", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60 },
          { name: "Dumbbell Shoulder Press", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60 },
          { name: "Bicycle Crunch", sets: 3, repsMin: 20, repsMax: 30, restSeconds: 45 },
          { name: "Mountain Climber", sets: 3, repsMin: 20, repsMax: 30, restSeconds: 45, notes: "30 seconds each set" },
        ],
      },
      {
        dayNumber: 2,
        title: "Cardio Blast",
        focusArea: "Cardiovascular Conditioning",
        estimatedDurationMinutes: 35,
        exercises: [
          { name: "Jumping Jacks", sets: 3, repsMin: 40, repsMax: 50, restSeconds: 30, notes: "Warm-up" },
          { name: "Burpee", sets: 4, repsMin: 8, repsMax: 12, restSeconds: 60 },
          { name: "High Knees", sets: 4, repsMin: 30, repsMax: 40, restSeconds: 45, notes: "30 seconds each set" },
          { name: "Jump Rope", sets: 4, repsMin: 30, repsMax: 45, restSeconds: 45, notes: "30–45 seconds each set" },
          { name: "Mountain Climber", sets: 3, repsMin: 20, repsMax: 30, restSeconds: 30 },
        ],
      },
      {
        dayNumber: 3,
        title: "Resistance Circuit B",
        focusArea: "Lower Body + Glutes",
        estimatedDurationMinutes: 40,
        exercises: [
          { name: "Goblet Squat", sets: 4, repsMin: 15, repsMax: 20, restSeconds: 60 },
          { name: "Walking Lunges", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60, notes: "Each leg" },
          { name: "Glute Bridge", sets: 3, repsMin: 20, repsMax: 25, restSeconds: 45 },
          { name: "Step-up", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60, notes: "Each leg" },
          { name: "Standing Calf Raise", sets: 3, repsMin: 20, repsMax: 25, restSeconds: 45 },
        ],
      },
      {
        dayNumber: 4,
        title: "Full Body HIIT Finisher",
        focusArea: "Metabolic Conditioning",
        estimatedDurationMinutes: 35,
        exercises: [
          { name: "Burpee", sets: 5, repsMin: 10, repsMax: 12, restSeconds: 45 },
          { name: "Push-up", sets: 3, repsMin: 10, repsMax: 15, restSeconds: 45 },
          { name: "Goblet Squat", sets: 4, repsMin: 15, repsMax: 20, restSeconds: 45 },
          { name: "Mountain Climber", sets: 4, repsMin: 30, repsMax: 40, restSeconds: 30, notes: "30 seconds" },
          { name: "Dead Bug", sets: 2, repsMin: 10, repsMax: 12, restSeconds: 45, notes: "Cool down core work" },
        ],
      },
    ],
  },

  // ─── 3. Push Pull Legs ────────────────────────────────────────────────────────
  {
    name: "Push Pull Legs",
    description: "The classic hypertrophy split. Each muscle group gets direct training twice per week across 6 sessions, making this one of the most effective volume-distribution strategies for muscle growth.",
    goal: "muscle_gain",
    difficulty: "intermediate",
    category: "Push/Pull/Legs",
    durationWeeks: 8,
    durationMinutes: 60,
    weeklySchedule: { days: [1, 2, 3, 4, 5, 6], frequency: 6 }, // Mon–Sat
    days: [
      {
        dayNumber: 1,
        title: "Push Day",
        focusArea: "Chest, Shoulders, Triceps",
        estimatedDurationMinutes: 65,
        exercises: [
          { name: "Barbell Bench Press", sets: 4, repsMin: 6, repsMax: 8, restSeconds: 180, notes: "Primary strength movement" },
          { name: "Incline Dumbbell Press", sets: 4, repsMin: 8, repsMax: 10, restSeconds: 120 },
          { name: "Cable Fly", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 90 },
          { name: "Barbell Overhead Press", sets: 3, repsMin: 8, repsMax: 10, restSeconds: 120 },
          { name: "Lateral Raise", sets: 4, repsMin: 15, repsMax: 20, restSeconds: 60 },
          { name: "Skull Crusher", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Tricep Pushdown", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 75 },
        ],
      },
      {
        dayNumber: 2,
        title: "Pull Day",
        focusArea: "Back, Biceps, Rear Delts",
        estimatedDurationMinutes: 65,
        exercises: [
          { name: "Conventional Deadlift", sets: 4, repsMin: 4, repsMax: 6, restSeconds: 210, notes: "Primary strength movement" },
          { name: "Barbell Row", sets: 4, repsMin: 6, repsMax: 8, restSeconds: 180 },
          { name: "Lat Pulldown", sets: 4, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Seated Cable Row", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 90 },
          { name: "Face Pull", sets: 4, repsMin: 15, repsMax: 20, restSeconds: 60, notes: "Shoulder health priority" },
          { name: "Barbell Bicep Curl", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 75 },
          { name: "Hammer Curl", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60 },
        ],
      },
      {
        dayNumber: 3,
        title: "Legs Day",
        focusArea: "Quads, Hamstrings, Glutes, Calves",
        estimatedDurationMinutes: 65,
        exercises: [
          { name: "Barbell Back Squat", sets: 4, repsMin: 6, repsMax: 8, restSeconds: 210 },
          { name: "Romanian Deadlift", sets: 4, repsMin: 8, repsMax: 10, restSeconds: 150 },
          { name: "Leg Press", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 120 },
          { name: "Bulgarian Split Squat", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 120, notes: "Each leg" },
          { name: "Leg Curl", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 90 },
          { name: "Standing Calf Raise", sets: 4, repsMin: 12, repsMax: 15, restSeconds: 75 },
        ],
      },
      {
        dayNumber: 4,
        title: "Push Day 2",
        focusArea: "Chest, Shoulders, Triceps (Volume)",
        estimatedDurationMinutes: 60,
        exercises: [
          { name: "Incline Barbell Press", sets: 4, repsMin: 8, repsMax: 10, restSeconds: 150 },
          { name: "Dumbbell Bench Press", sets: 4, repsMin: 10, repsMax: 12, restSeconds: 120 },
          { name: "Pec Deck Machine", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 90 },
          { name: "Arnold Press", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Cable Lateral Raise", sets: 4, repsMin: 15, repsMax: 20, restSeconds: 60 },
          { name: "Close-Grip Bench Press", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Overhead Tricep Extension", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 75 },
        ],
      },
      {
        dayNumber: 5,
        title: "Pull Day 2",
        focusArea: "Back, Biceps, Rear Delts (Volume)",
        estimatedDurationMinutes: 60,
        exercises: [
          { name: "Pull-up", sets: 4, repsMin: 6, repsMax: 10, restSeconds: 150 },
          { name: "T-Bar Row", sets: 4, repsMin: 8, repsMax: 10, restSeconds: 150 },
          { name: "Single-Arm Dumbbell Row", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 90 },
          { name: "Straight Arm Pulldown", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 90 },
          { name: "Rear Delt Fly", sets: 4, repsMin: 15, repsMax: 20, restSeconds: 60 },
          { name: "Preacher Curl", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 75 },
          { name: "Incline Dumbbell Curl", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60 },
        ],
      },
      {
        dayNumber: 6,
        title: "Legs Day 2",
        focusArea: "Quads, Hamstrings, Glutes (Volume)",
        estimatedDurationMinutes: 60,
        exercises: [
          { name: "Hack Squat", sets: 4, repsMin: 10, repsMax: 12, restSeconds: 150 },
          { name: "Stiff-Leg Deadlift", sets: 4, repsMin: 10, repsMax: 12, restSeconds: 120 },
          { name: "Leg Extension", sets: 3, repsMin: 15, repsMax: 20, restSeconds: 90 },
          { name: "Leg Curl", sets: 3, repsMin: 15, repsMax: 20, restSeconds: 90 },
          { name: "Hip Thrust", sets: 4, repsMin: 12, repsMax: 15, restSeconds: 90 },
          { name: "Seated Calf Raise", sets: 4, repsMin: 15, repsMax: 20, restSeconds: 60 },
        ],
      },
    ],
  },

  // ─── 4. Upper Lower Split ─────────────────────────────────────────────────────
  {
    name: "Upper Lower Split",
    description: "A proven 4-day split that trains each muscle group twice a week with heavy compound work. Ideal for intermediate lifters looking to build strength and size simultaneously.",
    goal: "strength",
    difficulty: "intermediate",
    category: "Upper/Lower",
    durationWeeks: 8,
    durationMinutes: 60,
    weeklySchedule: { days: [1, 2, 4, 5], frequency: 4 }, // Mon, Tue, Thu, Fri
    days: [
      {
        dayNumber: 1,
        title: "Upper — Heavy",
        focusArea: "Strength Focus",
        estimatedDurationMinutes: 65,
        exercises: [
          { name: "Barbell Bench Press", sets: 4, repsMin: 4, repsMax: 6, restSeconds: 210 },
          { name: "Barbell Row", sets: 4, repsMin: 4, repsMax: 6, restSeconds: 210 },
          { name: "Barbell Overhead Press", sets: 3, repsMin: 6, repsMax: 8, restSeconds: 180 },
          { name: "Pull-up", sets: 3, repsMin: 6, repsMax: 8, restSeconds: 180 },
          { name: "Close-Grip Bench Press", sets: 3, repsMin: 8, repsMax: 10, restSeconds: 120 },
          { name: "Barbell Bicep Curl", sets: 3, repsMin: 8, repsMax: 10, restSeconds: 90 },
        ],
      },
      {
        dayNumber: 2,
        title: "Lower — Heavy",
        focusArea: "Strength Focus",
        estimatedDurationMinutes: 65,
        exercises: [
          { name: "Barbell Back Squat", sets: 4, repsMin: 4, repsMax: 6, restSeconds: 240 },
          { name: "Romanian Deadlift", sets: 4, repsMin: 6, repsMax: 8, restSeconds: 180 },
          { name: "Leg Press", sets: 3, repsMin: 8, repsMax: 10, restSeconds: 150 },
          { name: "Leg Curl", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Hip Thrust", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Standing Calf Raise", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 75 },
        ],
      },
      {
        dayNumber: 3,
        title: "Upper — Volume",
        focusArea: "Hypertrophy Focus",
        estimatedDurationMinutes: 60,
        exercises: [
          { name: "Incline Dumbbell Press", sets: 4, repsMin: 10, repsMax: 12, restSeconds: 120 },
          { name: "Lat Pulldown", sets: 4, repsMin: 10, repsMax: 12, restSeconds: 120 },
          { name: "Arnold Press", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Seated Cable Row", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 90 },
          { name: "Lateral Raise", sets: 4, repsMin: 15, repsMax: 20, restSeconds: 60 },
          { name: "Skull Crusher", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90 },
          { name: "Hammer Curl", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 75 },
        ],
      },
      {
        dayNumber: 4,
        title: "Lower — Volume",
        focusArea: "Hypertrophy Focus",
        estimatedDurationMinutes: 60,
        exercises: [
          { name: "Hack Squat", sets: 4, repsMin: 10, repsMax: 12, restSeconds: 150 },
          { name: "Bulgarian Split Squat", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 120, notes: "Each leg" },
          { name: "Leg Extension", sets: 3, repsMin: 15, repsMax: 20, restSeconds: 90 },
          { name: "Stiff-Leg Deadlift", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 90 },
          { name: "Hip Thrust", sets: 4, repsMin: 12, repsMax: 15, restSeconds: 90 },
          { name: "Seated Calf Raise", sets: 4, repsMin: 15, repsMax: 20, restSeconds: 60 },
        ],
      },
    ],
  },

  // ─── 5. No Equipment Fat Loss ─────────────────────────────────────────────────
  {
    name: "No Equipment Fat Loss",
    description: "Zero equipment needed — just your body and determination. This 4-week program delivers a calorie-burning HIIT and strength circuit you can do anywhere.",
    goal: "fat_loss",
    difficulty: "beginner",
    category: "Full Body",
    durationWeeks: 4,
    durationMinutes: 35,
    weeklySchedule: { days: [1, 3, 5, 6], frequency: 4 }, // Mon, Wed, Fri, Sat
    days: [
      {
        dayNumber: 1,
        title: "Upper Body Blast",
        focusArea: "Push, Pull, Core",
        estimatedDurationMinutes: 35,
        exercises: [
          { name: "Push-up", sets: 4, repsMin: 10, repsMax: 20, restSeconds: 60 },
          { name: "Wide-Grip Push-up", sets: 3, repsMin: 10, repsMax: 15, restSeconds: 60 },
          { name: "Diamond Push-up", sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60 },
          { name: "Inverted Row", sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60 },
          { name: "Plank", sets: 3, repsMin: 30, repsMax: 60, restSeconds: 45, notes: "30–60 seconds" },
          { name: "Mountain Climber", sets: 3, repsMin: 20, repsMax: 30, restSeconds: 45 },
        ],
      },
      {
        dayNumber: 2,
        title: "Lower Body & Cardio",
        focusArea: "Legs, Glutes, Conditioning",
        estimatedDurationMinutes: 35,
        exercises: [
          { name: "Goblet Squat", sets: 4, repsMin: 15, repsMax: 20, restSeconds: 60 },
          { name: "Walking Lunges", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60, notes: "Each leg" },
          { name: "Glute Bridge", sets: 3, repsMin: 20, repsMax: 25, restSeconds: 45 },
          { name: "Wall Sit", sets: 3, repsMin: 30, repsMax: 45, restSeconds: 60, notes: "30–45 seconds" },
          { name: "Box Jump", sets: 3, repsMin: 8, repsMax: 10, restSeconds: 75 },
          { name: "High Knees", sets: 3, repsMin: 30, repsMax: 40, restSeconds: 30, notes: "30 seconds" },
        ],
      },
      {
        dayNumber: 3,
        title: "Full Body HIIT",
        focusArea: "Metabolic Conditioning",
        estimatedDurationMinutes: 30,
        exercises: [
          { name: "Burpee", sets: 5, repsMin: 8, repsMax: 10, restSeconds: 60 },
          { name: "Push-up", sets: 3, repsMin: 10, repsMax: 15, restSeconds: 45 },
          { name: "Goblet Squat", sets: 4, repsMin: 15, repsMax: 20, restSeconds: 45 },
          { name: "Mountain Climber", sets: 4, repsMin: 20, repsMax: 30, restSeconds: 30 },
          { name: "Jumping Jacks", sets: 3, repsMin: 30, repsMax: 40, restSeconds: 30 },
        ],
      },
      {
        dayNumber: 4,
        title: "Active Recovery & Mobility",
        focusArea: "Flexibility, Mobility",
        estimatedDurationMinutes: 25,
        exercises: [
          { name: "Cat-Cow Stretch", sets: 2, repsMin: 10, repsMax: 15, restSeconds: 30, notes: "Slow and controlled" },
          { name: "Hip Flexor Stretch", sets: 2, repsMin: 30, repsMax: 45, restSeconds: 30, notes: "Each side" },
          { name: "World's Greatest Stretch", sets: 2, repsMin: 5, repsMax: 6, restSeconds: 30, notes: "Each side" },
          { name: "Pigeon Pose", sets: 2, repsMin: 45, repsMax: 60, restSeconds: 30, notes: "Each side, 45–60 sec" },
          { name: "Thoracic Spine Rotation", sets: 2, repsMin: 8, repsMax: 10, restSeconds: 30, notes: "Each side" },
        ],
      },
    ],
  },

  // ─── 6. 30-Minute Home Fitness ────────────────────────────────────────────────
  {
    name: "30-Minute Home Fitness",
    description: "Efficient, balanced workouts for busy people. Each session is designed to deliver maximum stimulus in exactly 30 minutes — ideal for maintaining fitness on a tight schedule.",
    goal: "general_fitness",
    difficulty: "beginner",
    category: "Full Body",
    durationWeeks: 4,
    durationMinutes: 30,
    weeklySchedule: { days: [1, 3, 5], frequency: 3 }, // Mon, Wed, Fri
    days: [
      {
        dayNumber: 1,
        title: "Push & Core",
        focusArea: "Chest, Shoulders, Triceps, Core",
        estimatedDurationMinutes: 30,
        exercises: [
          { name: "Push-up", sets: 3, repsMin: 10, repsMax: 15, restSeconds: 60 },
          { name: "Dumbbell Shoulder Press", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60 },
          { name: "Tricep Bench Dip", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60 },
          { name: "Lateral Raise", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 45 },
          { name: "Plank", sets: 3, repsMin: 30, repsMax: 45, restSeconds: 45, notes: "30–45 sec" },
          { name: "Mountain Climber", sets: 2, repsMin: 20, repsMax: 30, restSeconds: 30 },
        ],
      },
      {
        dayNumber: 2,
        title: "Pull & Back",
        focusArea: "Back, Biceps",
        estimatedDurationMinutes: 30,
        exercises: [
          { name: "Inverted Row", sets: 3, repsMin: 8, repsMax: 12, restSeconds: 75 },
          { name: "Dumbbell Bicep Curl", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60 },
          { name: "Hammer Curl", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60 },
          { name: "Rear Delt Fly", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60 },
          { name: "Dead Bug", sets: 3, repsMin: 8, repsMax: 10, restSeconds: 45 },
          { name: "Side Plank", sets: 2, repsMin: 25, repsMax: 35, restSeconds: 45, notes: "Each side" },
        ],
      },
      {
        dayNumber: 3,
        title: "Legs & Cardio",
        focusArea: "Lower Body + Conditioning",
        estimatedDurationMinutes: 30,
        exercises: [
          { name: "Goblet Squat", sets: 4, repsMin: 12, repsMax: 15, restSeconds: 60 },
          { name: "Walking Lunges", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60 },
          { name: "Glute Bridge", sets: 3, repsMin: 15, repsMax: 20, restSeconds: 45 },
          { name: "Standing Calf Raise", sets: 3, repsMin: 15, repsMax: 20, restSeconds: 45 },
          { name: "Jumping Jacks", sets: 3, repsMin: 30, repsMax: 40, restSeconds: 30 },
          { name: "High Knees", sets: 2, repsMin: 20, repsMax: 30, restSeconds: 30 },
        ],
      },
    ],
  },
];

// ─── Seeder ───────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding workout templates…");

  // Remove existing templates
  const existingTemplates = await db.select({ id: workoutPlansTable.id })
    .from(workoutPlansTable)
    .where(eq(workoutPlansTable.isTemplate, true));

  if (existingTemplates.length > 0) {
    const ids = existingTemplates.map(t => t.id);
    await db.delete(workoutDayExercisesTable)
      .where(inArray(
        workoutDayExercisesTable.workoutDayId,
        db.select({ id: workoutDaysTable.id })
          .from(workoutDaysTable)
          .where(inArray(workoutDaysTable.workoutPlanId, ids)) as unknown as number[]
      )).catch(() => {});
    await db.delete(workoutDaysTable).where(inArray(workoutDaysTable.workoutPlanId, ids)).catch(() => {});
    await db.delete(workoutPlansTable).where(inArray(workoutPlansTable.id, ids));
    console.log(`  Removed ${existingTemplates.length} existing templates`);
  }

  for (const template of TEMPLATES) {
    console.log(`\n  Creating template: "${template.name}"`);

    // Create the plan (template — userId=0 sentinel, owned by system)
    // We use userId=0 but the table requires a valid user ref. Instead, we'll
    // use a special admin user or the first user in the DB for foreign key purposes.
    // For seeding, we'll use a virtual userId that satisfies the FK by inserting
    // a placeholder if needed. Actually, the FK is on usersTable which requires
    // a real user. We'll skip FK by using a raw sql insert workaround.
    // Better: templates have no userId requirement — we need to relax the FK
    // or use a seed user. Let's use userId=NULL by making the column nullable
    // in the future, but for now use userId=1 (will be created on first signup).
    // Actually, looking at the schema: userId is NOT NULL. For templates, we'll
    // insert with userId=1 assuming it exists, else skip gracefully.

    let seedUserId = 1;
    // Check if user with id=1 exists
    const { usersTable } = await import("@workspace/db/schema");
    const [seedUser] = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
    if (!seedUser) {
      console.log("  ⚠️  No users in DB — templates require at least one user. Skipping.");
      console.log("     Create an account via the app first, then re-run this seed.");
      continue;
    }
    seedUserId = seedUser.id;

    const [plan] = await db.insert(workoutPlansTable).values({
      userId: seedUserId,
      name: template.name,
      description: template.description,
      goal: template.goal,
      status: "active",
      durationMinutes: template.durationMinutes,
      durationWeeks: template.durationWeeks,
      difficulty: template.difficulty,
      category: template.category,
      isTemplate: true,
      weeklySchedule: template.weeklySchedule,
      progressionRules: { type: "linear", incrementKg: 2.5 },
      exercises: [],
    }).returning();

    console.log(`    Plan created (id=${plan.id})`);

    for (const dayDef of template.days) {
      const [day] = await db.insert(workoutDaysTable).values({
        workoutPlanId: plan.id,
        dayNumber: dayDef.dayNumber,
        title: dayDef.title,
        focusArea: dayDef.focusArea,
        estimatedDurationMinutes: dayDef.estimatedDurationMinutes,
        isRestDay: dayDef.isRestDay ?? false,
      }).returning();

      const resolved = await resolveExercises(dayDef.exercises);
      if (resolved.length > 0) {
        await db.insert(workoutDayExercisesTable).values(
          resolved.map(e => ({
            workoutDayId: day.id,
            exerciseId: e.exerciseId,
            exerciseName: e.exerciseName,
            orderIndex: e.orderIndex,
            sets: e.sets,
            repsMin: e.repsMin,
            repsMax: e.repsMax,
            restSeconds: e.restSeconds ?? 90,
            notes: e.notes ?? null,
            weightKg: null,
            tempo: null,
            durationSeconds: null,
          }))
        );
      }
      console.log(`    Day ${dayDef.dayNumber} "${dayDef.title}" — ${resolved.length} exercises`);
    }
  }

  console.log("\n✅ Workout template seed complete.");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
