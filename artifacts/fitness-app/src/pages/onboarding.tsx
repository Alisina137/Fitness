import React, { useState } from "react";
import { useLocation } from "wouter";
import { useUpdateUserProfile, useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronRight, ChevronLeft, AlertCircle, Zap, Activity, Dumbbell, Target, Heart, Apple } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const fadeVariants = {
  initial: (direction: number) => ({ opacity: 0, x: direction > 0 ? 20 : -20 }),
  animate: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction < 0 ? 20 : -20 })
};

const GENDER_OPTIONS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "non_binary", label: "Non-binary" },
  { id: "prefer_not_to_say", label: "Prefer not to say" }
];

const PRIMARY_GOALS = [
  { id: "lose_fat", label: "Lose Fat", icon: <Activity className="w-5 h-5"/> },
  { id: "build_muscle", label: "Build Muscle", icon: <Dumbbell className="w-5 h-5"/> },
  { id: "increase_strength", label: "Increase Strength", icon: <Zap className="w-5 h-5"/> },
  { id: "improve_endurance", label: "Improve Endurance", icon: <Heart className="w-5 h-5"/> },
  { id: "improve_health", label: "Improve Health", icon: <Apple className="w-5 h-5"/> },
  { id: "maintain", label: "Maintain Fitness", icon: <Target className="w-5 h-5"/> }
];

const SECONDARY_GOALS = [
  "Lose Fat", "Build Muscle", "Increase Strength", "Improve Endurance", "Improve Health", "Flexibility", "Mobility", "Mental Health"
];

const FITNESS_LEVELS = [
  { id: "beginner", label: "Beginner", desc: "Just starting out" },
  { id: "intermediate", label: "Intermediate", desc: "Training 1-2 years" },
  { id: "advanced", label: "Advanced", desc: "Training 3+ years" },
  { id: "athlete", label: "Athlete", desc: "Competitive level" }
];

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary", desc: "Office job, little movement" },
  { id: "lightly_active", label: "Lightly Active", desc: "Light exercise 1-2x/week" },
  { id: "moderately_active", label: "Moderately Active", desc: "Moderate exercise 3-5x/week" },
  { id: "very_active", label: "Very Active", desc: "Hard exercise 6-7x/week" },
  { id: "extremely_active", label: "Extremely Active", desc: "Physical job or 2x training/day" }
];

const LOCATIONS = [
  { id: "home", label: "Home" },
  { id: "gym", label: "Gym" },
  { id: "outdoor", label: "Outdoor" },
  { id: "mixed", label: "Mixed" }
];

const EQUIPMENTS = [
  "No Equipment", "Dumbbells", "Resistance Bands", "Barbell", "Machines", "Full Gym"
];

const INJURIES_LIST = [
  "None", "Knee", "Back", "Shoulder", "Wrist", "Ankle", "Hip", "Other"
];

const DIETS = [
  { id: "no_preference", label: "No Preference" },
  { id: "high_protein", label: "High Protein" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "keto", label: "Keto" },
  { id: "mediterranean", label: "Mediterranean" },
  { id: "low_carb", label: "Low Carb" }
];

const MOTIVATIONS = [
  { id: "look_better", label: "Look Better" },
  { id: "feel_healthier", label: "Feel Healthier" },
  { id: "build_confidence", label: "Build Confidence" },
  { id: "improve_performance", label: "Improve Performance" },
  { id: "prepare_for_event", label: "Prepare for an Event" }
];

const SLEEP_HOURS = [
  { id: "lt5", label: "Less than 5h" },
  { id: "h5_7", label: "5-7h" },
  { id: "h7_9", label: "7-9h" },
  { id: "gt9", label: "9+ hours" }
];

const SelectCard = ({ selected, onClick, label, desc, icon }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "p-4 md:p-5 rounded-2xl border-2 text-left transition-all w-full flex items-start gap-4 hover-elevate focus:outline-none focus:ring-2 focus:ring-primary/50",
      selected 
        ? "border-primary bg-primary/10" 
        : "border-border bg-card hover:border-muted-foreground/50"
    )}
  >
    {icon && <div className={cn("mt-1", selected ? "text-primary" : "text-muted-foreground")}>{icon}</div>}
    <div className="flex-1">
      <div className="flex justify-between items-center">
        <span className={cn("font-bold text-lg", selected && "text-primary")}>{label}</span>
        {selected && <Check className="h-5 w-5 text-primary shrink-0 ml-2" />}
      </div>
      {desc && <p className="text-muted-foreground mt-1 text-sm leading-snug">{desc}</p>}
    </div>
  </button>
);

const Chip = ({ selected, onClick, label }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-5 py-2.5 rounded-full border-2 transition-all text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50",
      selected 
        ? "bg-primary text-black border-primary shadow-lg shadow-primary/20" 
        : "bg-card border-border hover:border-primary/50 text-foreground"
    )}
  >
    {label}
  </button>
);

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const updateProfile = useUpdateUserProfile();
  
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  
  // Form State
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm"|"ft">("cm");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg"|"lbs">("lbs");
  
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [secondaryGoals, setSecondaryGoals] = useState<string[]>([]);
  
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  
  const [workoutLocation, setWorkoutLocation] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);
  
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [duration, setDuration] = useState(45);
  
  const [injuries, setInjuries] = useState<string[]>([]);
  const [injuryNotes, setInjuryNotes] = useState("");
  
  const [diet, setDiet] = useState("");
  const [foodRestrictions, setFoodRestrictions] = useState("");
  
  const [motivation, setMotivation] = useState("");
  const [sleep, setSleep] = useState("");

  const nextStep = (targetStep: number) => {
    setError(null);
    setDirection(1);
    setStep(targetStep);
  };

  const prevStep = (targetStep: number) => {
    setError(null);
    setDirection(-1);
    setStep(targetStep);
  };

  const handleSaveStep = (data: any, targetStep: number) => {
    updateProfile.mutate({ data }, {
      onSuccess: (res) => {
        if (targetStep === 11) {
          setScore(res.fitnessReadinessScore || 85);
        }
        nextStep(targetStep);
      },
      onError: () => {
        setError("Failed to save. Please try again.");
      }
    });
  };

  const validateStep2 = () => {
    if (!age || parseInt(age) < 13 || parseInt(age) > 99) return setError("Age must be between 13 and 99.");
    if (!height || parseFloat(height) <= 0) return setError("Please enter a valid height.");
    if (!weight || parseFloat(weight) <= 0) return setError("Please enter a valid weight.");
    
    let h = parseFloat(height);
    if (heightUnit === "ft") {
      const ft = Math.floor(h);
      const inch = Math.round((h - ft) * 100);
      h = (ft * 30.48) + (inch * 2.54);
    }
    let w = parseFloat(weight);
    if (weightUnit === "lbs") {
      w = w * 0.453592;
    }
    
    handleSaveStep({
      age: parseInt(age),
      gender: gender || undefined,
      heightCm: Math.round(h),
      weightKg: Math.round(w)
    }, 3);
  };

  const validateStep3 = () => {
    if (!primaryGoal) return setError("Please select a primary goal.");
    handleSaveStep({ primaryGoal: primaryGoal as any, secondaryGoals }, 4);
  };

  const validateStep4 = () => {
    if (!fitnessLevel) return setError("Please select your fitness experience level.");
    handleSaveStep({ fitnessLevel: fitnessLevel as any }, 5);
  };

  const validateStep5 = () => {
    if (!activityLevel) return setError("Please select your current activity level.");
    handleSaveStep({ activityLevel: activityLevel as any }, 6);
  };

  const validateStep6 = () => {
    if (!workoutLocation) return setError("Please select a workout environment.");
    if (equipment.length === 0) return setError("Please select at least one equipment option (or 'No Equipment').");
    handleSaveStep({ workoutLocation: workoutLocation as any, equipmentAvailable: equipment }, 7);
  };

  const validateStep7 = () => {
    handleSaveStep({ weeklyWorkoutTarget: daysPerWeek, workoutDurationMinutes: duration }, 8);
  };

  const validateStep8 = () => {
    if (injuries.length === 0) return setError("Please select any injuries, or 'None'.");
    handleSaveStep({ injuries, injuryNotes: injuryNotes || undefined }, 9);
  };

  const validateStep9 = () => {
    if (!diet) return setError("Please select a diet preference.");
    const restrictions = foodRestrictions.split(',').map(s => s.trim()).filter(s => s.length > 0);
    handleSaveStep({ dietPreference: diet as any, foodRestrictions: restrictions }, 10);
  };

  const validateStep10 = () => {
    if (!motivation) return setError("Please select what motivates you.");
    if (!sleep) return setError("Please select your average sleep hours.");
    handleSaveStep({ motivation: motivation as any, sleepHours: sleep as any }, 11);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col font-sans overflow-x-hidden">
      {step > 1 && step <= 10 && (
        <div className="w-full bg-secondary h-1.5 fixed top-0 z-50">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / 10) * 100}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto p-4 md:p-8 pt-12">
        {step > 1 && step <= 10 && (
          <div className="mb-8">
            <Button variant="ghost" size="sm" onClick={() => prevStep(step - 1)} className="text-muted-foreground -ml-4 hover:text-foreground">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        )}

        <div className="flex-1 relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full pb-24"
            >
              
              {step === 1 && (
                <div className="flex flex-col items-center justify-center text-center space-y-8 min-h-[60vh]">
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Zap className="h-12 w-12 text-primary" />
                  </div>
                  <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
                    Let's build your personalized fitness journey{me?.name ? `, ${me.name.split(' ')[0]}` : ''}.
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-lg mx-auto">
                    Answer 9 quick questions and we'll create a plan built exactly for you.
                  </p>
                  <Button size="lg" className="mt-8 h-14 px-10 text-lg font-bold text-black rounded-full shadow-xl shadow-primary/20" onClick={() => nextStep(2)}>
                    Get Started <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Basic Information</h2>
                    <p className="text-muted-foreground text-lg">Help us calculate your biological baselines.</p>
                  </div>
                  
                  {error && <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-3 font-medium"><AlertCircle className="w-5 h-5 shrink-0"/> {error}</div>}

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Age</Label>
                      <Input 
                        type="number" 
                        value={age} 
                        onChange={(e) => setAge(e.target.value)} 
                        placeholder="e.g. 28" 
                        className="h-14 text-xl bg-card border-2 border-border focus-visible:border-primary"
                      />
                    </div>

                    <div className="space-y-4">
                      <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Gender (Optional)</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {GENDER_OPTIONS.map(g => (
                          <SelectCard 
                            key={g.id} 
                            label={g.label} 
                            selected={gender === g.id} 
                            onClick={() => setGender(g.id)} 
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Height</Label>
                        <div className="flex bg-secondary rounded-lg p-1">
                          <button className={cn("px-4 py-1 text-xs font-bold rounded-md transition-colors", heightUnit==="cm" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")} onClick={()=>setHeightUnit("cm")}>cm</button>
                          <button className={cn("px-4 py-1 text-xs font-bold rounded-md transition-colors", heightUnit==="ft" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")} onClick={()=>setHeightUnit("ft")}>ft</button>
                        </div>
                      </div>
                      <Input 
                        type="number" 
                        step={heightUnit === "ft" ? "0.01" : "1"}
                        value={height} 
                        onChange={(e) => setHeight(e.target.value)} 
                        placeholder={heightUnit === "cm" ? "e.g. 180" : "e.g. 5.11"} 
                        className="h-14 text-xl bg-card border-2 border-border focus-visible:border-primary"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Weight</Label>
                        <div className="flex bg-secondary rounded-lg p-1">
                          <button className={cn("px-4 py-1 text-xs font-bold rounded-md transition-colors", weightUnit==="kg" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")} onClick={()=>setWeightUnit("kg")}>kg</button>
                          <button className={cn("px-4 py-1 text-xs font-bold rounded-md transition-colors", weightUnit==="lbs" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")} onClick={()=>setWeightUnit("lbs")}>lbs</button>
                        </div>
                      </div>
                      <Input 
                        type="number" 
                        value={weight} 
                        onChange={(e) => setWeight(e.target.value)} 
                        placeholder={weightUnit === "kg" ? "e.g. 75" : "e.g. 165"} 
                        className="h-14 text-xl bg-card border-2 border-border focus-visible:border-primary"
                      />
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button size="lg" className="w-full h-14 text-lg font-bold text-black rounded-full" onClick={validateStep2} disabled={updateProfile.isPending}>
                      {updateProfile.isPending ? "Saving..." : "Continue"} <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Primary Goal</h2>
                    <p className="text-muted-foreground text-lg">What's your main objective?</p>
                  </div>
                  
                  {error && <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-3 font-medium"><AlertCircle className="w-5 h-5 shrink-0"/> {error}</div>}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {PRIMARY_GOALS.map(g => (
                      <SelectCard 
                        key={g.id} 
                        label={g.label} 
                        icon={g.icon}
                        selected={primaryGoal === g.id} 
                        onClick={() => setPrimaryGoal(g.id)} 
                      />
                    ))}
                  </div>

                  <div className="pt-6">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 block">Any secondary goals? (Optional)</Label>
                    <div className="flex flex-wrap gap-3">
                      {SECONDARY_GOALS.map(g => (
                        <Chip 
                          key={g} 
                          label={g} 
                          selected={secondaryGoals.includes(g)}
                          onClick={() => setSecondaryGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button size="lg" className="w-full h-14 text-lg font-bold text-black rounded-full" onClick={validateStep3} disabled={updateProfile.isPending}>
                      Continue <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Fitness Experience</h2>
                    <p className="text-muted-foreground text-lg">Where are you starting from today?</p>
                  </div>
                  
                  {error && <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-3 font-medium"><AlertCircle className="w-5 h-5 shrink-0"/> {error}</div>}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {FITNESS_LEVELS.map(f => (
                      <SelectCard 
                        key={f.id} 
                        label={f.label} 
                        desc={f.desc}
                        selected={fitnessLevel === f.id} 
                        onClick={() => setFitnessLevel(f.id)} 
                      />
                    ))}
                  </div>

                  <div className="pt-8">
                    <Button size="lg" className="w-full h-14 text-lg font-bold text-black rounded-full" onClick={validateStep4} disabled={updateProfile.isPending}>
                      Continue <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Activity Level</h2>
                    <p className="text-muted-foreground text-lg">How active is your daily life outside the gym?</p>
                  </div>
                  
                  {error && <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-3 font-medium"><AlertCircle className="w-5 h-5 shrink-0"/> {error}</div>}

                  <div className="flex flex-col gap-4">
                    {ACTIVITY_LEVELS.map(a => (
                      <SelectCard 
                        key={a.id} 
                        label={a.label} 
                        desc={a.desc}
                        selected={activityLevel === a.id} 
                        onClick={() => setActivityLevel(a.id)} 
                      />
                    ))}
                  </div>

                  <div className="pt-8">
                    <Button size="lg" className="w-full h-14 text-lg font-bold text-black rounded-full" onClick={validateStep5} disabled={updateProfile.isPending}>
                      Continue <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Workout Environment</h2>
                    <p className="text-muted-foreground text-lg">Where will you train and what tools do you have?</p>
                  </div>
                  
                  {error && <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-3 font-medium"><AlertCircle className="w-5 h-5 shrink-0"/> {error}</div>}

                  <div className="space-y-4">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Location</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {LOCATIONS.map(l => (
                        <SelectCard 
                          key={l.id} 
                          label={l.label} 
                          selected={workoutLocation === l.id} 
                          onClick={() => setWorkoutLocation(l.id)} 
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Available Equipment</Label>
                    <div className="flex flex-wrap gap-3">
                      {EQUIPMENTS.map(e => (
                        <Chip 
                          key={e} 
                          label={e} 
                          selected={equipment.includes(e)}
                          onClick={() => {
                            if (e === "No Equipment") setEquipment(["No Equipment"]);
                            else setEquipment(prev => prev.filter(x => x !== "No Equipment").includes(e) ? prev.filter(x => x !== e) : [...prev.filter(x => x !== "No Equipment"), e])
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button size="lg" className="w-full h-14 text-lg font-bold text-black rounded-full" onClick={validateStep6} disabled={updateProfile.isPending}>
                      Continue <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Time Commitment</h2>
                    <p className="text-muted-foreground text-lg">Consistency beats intensity. Be realistic.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Days Per Week</Label>
                    <div className="bg-card border-2 border-border p-8 rounded-3xl flex flex-col items-center shadow-sm">
                      <div className="text-8xl font-mono font-bold text-primary mb-8 tracking-tighter">{daysPerWeek}</div>
                      <div className="flex gap-2 sm:gap-4 flex-wrap justify-center">
                        {[1, 2, 3, 4, 5, 6, 7].map(num => (
                          <button
                            key={num}
                            onClick={() => setDaysPerWeek(num)}
                            className={cn(
                              "h-12 w-12 sm:h-14 sm:w-14 rounded-full text-lg sm:text-xl font-bold flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-primary",
                              daysPerWeek === num
                                ? "bg-primary text-black scale-110 shadow-lg shadow-primary/20"
                                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                            )}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Workout Duration</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {[10, 20, 30, 45, 60, 90].map(mins => (
                        <button
                          key={mins}
                          onClick={() => setDuration(mins)}
                          className={cn(
                            "py-4 rounded-xl border-2 font-bold transition-all text-center focus:outline-none focus:ring-2 focus:ring-primary/50 hover-elevate",
                            duration === mins
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          <span className="text-2xl block mb-1 leading-none">{mins}</span> 
                          <span className="text-xs font-semibold opacity-70 uppercase tracking-wider block">min</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button size="lg" className="w-full h-14 text-lg font-bold text-black rounded-full" onClick={validateStep7} disabled={updateProfile.isPending}>
                      Continue <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 8 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Limitations & Safety</h2>
                    <p className="text-muted-foreground text-lg">Your AI coach will use this to keep routines safe.</p>
                  </div>
                  
                  {error && <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-3 font-medium"><AlertCircle className="w-5 h-5 shrink-0"/> {error}</div>}

                  <div className="space-y-4">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Injuries / Problem Areas</Label>
                    <div className="flex flex-wrap gap-3">
                      {INJURIES_LIST.map(i => (
                        <Chip 
                          key={i} 
                          label={i} 
                          selected={injuries.includes(i)}
                          onClick={() => {
                            if (i === "None") setInjuries(["None"]);
                            else setInjuries(prev => prev.filter(x => x !== "None").includes(i) ? prev.filter(x => x !== i) : [...prev.filter(x => x !== "None"), i])
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {(injuries.includes("Other") || (injuries.length > 0 && !injuries.includes("None"))) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden pt-4"
                      >
                        <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Provide Details</Label>
                        <Textarea 
                          value={injuryNotes}
                          onChange={e => setInjuryNotes(e.target.value)}
                          placeholder="e.g. Sharp pain in right knee when squatting below parallel..."
                          className="min-h-[120px] text-base p-4 bg-card border-2 border-border focus-visible:border-primary"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-8">
                    <Button size="lg" className="w-full h-14 text-lg font-bold text-black rounded-full" onClick={validateStep8} disabled={updateProfile.isPending}>
                      Continue <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 9 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Nutrition Engine</h2>
                    <p className="text-muted-foreground text-lg">Fuel the machine correctly.</p>
                  </div>
                  
                  {error && <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-3 font-medium"><AlertCircle className="w-5 h-5 shrink-0"/> {error}</div>}

                  <div className="space-y-4">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Diet Preference</Label>
                    <div className="flex flex-wrap gap-3">
                      {DIETS.map(d => (
                        <Chip 
                          key={d.id} 
                          label={d.label} 
                          selected={diet === d.id}
                          onClick={() => setDiet(d.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Allergies & Restrictions (Optional)</Label>
                    <Input 
                      value={foodRestrictions}
                      onChange={e => setFoodRestrictions(e.target.value)}
                      placeholder="e.g. Peanuts, Gluten, Dairy (comma separated)"
                      className="h-14 text-lg bg-card border-2 border-border focus-visible:border-primary"
                    />
                  </div>

                  <div className="pt-8">
                    <Button size="lg" className="w-full h-14 text-lg font-bold text-black rounded-full" onClick={validateStep9} disabled={updateProfile.isPending}>
                      Continue <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 10 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Mind & Recovery</h2>
                    <p className="text-muted-foreground text-lg">The hidden pillars of peak performance.</p>
                  </div>
                  
                  {error && <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-3 font-medium"><AlertCircle className="w-5 h-5 shrink-0"/> {error}</div>}

                  <div className="space-y-4">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">What motivates you?</Label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {MOTIVATIONS.map(m => (
                        <SelectCard 
                          key={m.id} 
                          label={m.label} 
                          selected={motivation === m.id}
                          onClick={() => setMotivation(m.id)} 
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Average Sleep</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {SLEEP_HOURS.map(s => (
                        <SelectCard 
                          key={s.id} 
                          label={s.label} 
                          selected={sleep === s.id}
                          onClick={() => setSleep(s.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button size="lg" className="w-full h-14 text-lg font-bold text-black rounded-full" onClick={validateStep10} disabled={updateProfile.isPending}>
                      {updateProfile.isPending ? "Finalizing Plan..." : "Complete Setup"} <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 11 && (
                <div className="flex flex-col items-center justify-center text-center space-y-8 py-12 min-h-[60vh]">
                  <h2 className="text-4xl font-bold tracking-tight text-balance">Your Fitness Readiness Score</h2>
                  
                  <div className="relative w-64 h-64 flex items-center justify-center my-8">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="128" cy="128" r="116" className="stroke-secondary" strokeWidth="24" fill="none" />
                      <motion.circle 
                        cx="128" cy="128" r="116" 
                        className="stroke-primary drop-shadow-[0_0_15px_rgba(132,204,22,0.5)]" 
                        strokeWidth="24" 
                        strokeLinecap="round"
                        fill="none" 
                        strokeDasharray="728.8"
                        initial={{ strokeDashoffset: 728.8 }}
                        animate={{ strokeDashoffset: 728.8 * (1 - (score || 0) / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1, type: "spring" }}
                        className="text-7xl font-mono font-bold text-primary tracking-tighter"
                      >
                        {score}
                      </motion.span>
                      <span className="text-muted-foreground font-bold uppercase tracking-widest mt-1 text-sm">Score</span>
                    </div>
                  </div>
                  
                  <p className="text-xl text-muted-foreground max-w-md mx-auto text-balance">
                    Your personalized plan is ready. Every aspect has been tailored to your unique profile.
                  </p>
                  
                  <Button 
                    size="lg" 
                    className="mt-8 h-14 px-10 text-lg font-bold text-black rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform" 
                    onClick={() => setLocation("/dashboard")}
                  >
                    Go to Dashboard <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
