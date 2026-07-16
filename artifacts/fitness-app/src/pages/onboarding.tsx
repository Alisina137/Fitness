import React, { useState } from "react";
import { useLocation } from "wouter";
import { useUpdateUserProfile, useGetMe } from "@workspace/api-client-react";
import { useAuthStore } from "../store/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronRight, Activity, Target, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

const GOALS = [
  { id: "muscle_gain", label: "Build Muscle" },
  { id: "fat_loss", label: "Lose Fat" },
  { id: "endurance", label: "Improve Endurance" },
  { id: "strength", label: "Max Strength" },
  { id: "general_health", label: "General Health" }
];

const FITNESS_LEVELS = [
  { id: "beginner", label: "Beginner", desc: "Just starting out or returning after a long break" },
  { id: "intermediate", label: "Intermediate", desc: "Consistent training for 6+ months" },
  { id: "advanced", label: "Advanced", desc: "Serious athlete, years of consistent training" }
];

const EQUIPMENT = [
  { id: "full_gym", label: "Full Commercial Gym" },
  { id: "home_gym", label: "Home Gym (Barbells, Racks)" },
  { id: "dumbbells", label: "Dumbbells Only" },
  { id: "bodyweight", label: "Bodyweight / No Equipment" }
];

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const { refetch } = useGetMe();
  
  // Form State
  const [goals, setGoals] = useState<string[]>([]);
  const [fitnessLevel, setFitnessLevel] = useState<string>("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);

  const updateProfile = useUpdateUserProfile();

  const handleComplete = () => {
    updateProfile.mutate(
      {
        data: {
          goals,
          fitnessLevel: fitnessLevel as any,
          equipmentAvailable: equipment,
          weeklyWorkoutTarget: daysPerWeek
        }
      },
      {
        onSuccess: async () => {
          await refetch(); // Refetch user to update onboardingCompleted status
          setLocation("/dashboard");
          toast({ title: "Profile customized. Welcome to FitCore." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to save profile." });
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-2 w-full bg-secondary">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
          
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center space-y-4 mb-12">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl font-bold">What's the objective?</h1>
                <p className="text-xl text-muted-foreground">Select all that apply.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {GOALS.map((goal) => {
                  const isSelected = goals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      onClick={() => {
                        if (isSelected) setGoals(goals.filter(g => g !== goal.id));
                        else setGoals([...goals, goal.id]);
                      }}
                      className={cn(
                        "p-6 rounded-2xl border-2 text-left transition-all",
                        isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-border bg-card hover:border-muted-foreground"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-lg">{goal.label}</span>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-8">
                <Button 
                  size="lg" 
                  onClick={() => setStep(2)} 
                  disabled={goals.length === 0}
                  className="px-8 text-black"
                >
                  Continue <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
              <div className="text-center space-y-4 mb-12">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl font-bold">Assess your level</h1>
                <p className="text-xl text-muted-foreground">Be honest. We scale from here.</p>
              </div>

              <div className="space-y-4">
                {FITNESS_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setFitnessLevel(level.id)}
                    className={cn(
                      "w-full p-6 rounded-2xl border-2 text-left transition-all",
                      fitnessLevel === level.id 
                        ? "border-primary bg-primary/10" 
                        : "border-border bg-card hover:border-muted-foreground"
                    )}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-xl">{level.label}</span>
                      {fitnessLevel === level.id && <Check className="h-6 w-6 text-primary" />}
                    </div>
                    <p className="text-muted-foreground">{level.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-8">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button 
                  size="lg" 
                  onClick={() => setStep(3)} 
                  disabled={!fitnessLevel}
                  className="px-8 text-black"
                >
                  Continue <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
              <div className="text-center space-y-4 mb-12">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Dumbbell className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl font-bold">What's your arena?</h1>
                <p className="text-xl text-muted-foreground">Select your available equipment.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {EQUIPMENT.map((eq) => {
                  const isSelected = equipment.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      onClick={() => {
                        if (isSelected) setEquipment(equipment.filter(e => e !== eq.id));
                        else setEquipment([...equipment, eq.id]);
                      }}
                      className={cn(
                        "p-6 rounded-2xl border-2 text-left transition-all",
                        isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-border bg-card hover:border-muted-foreground"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{eq.label}</span>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between pt-8">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button 
                  size="lg" 
                  onClick={() => setStep(4)} 
                  disabled={equipment.length === 0}
                  className="px-8 text-black"
                >
                  Continue <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
              <div className="text-center space-y-4 mb-12">
                <h1 className="text-4xl font-bold">Set the standard</h1>
                <p className="text-xl text-muted-foreground">How many days a week will you commit?</p>
              </div>

              <div className="bg-card border border-border p-12 rounded-3xl flex flex-col items-center">
                <div className="text-8xl font-mono font-bold text-primary mb-8">{daysPerWeek}</div>
                <div className="flex gap-4">
                  {[2, 3, 4, 5, 6, 7].map(num => (
                    <button
                      key={num}
                      onClick={() => setDaysPerWeek(num)}
                      className={cn(
                        "h-14 w-14 rounded-full text-xl font-bold flex items-center justify-center transition-all",
                        daysPerWeek === num
                          ? "bg-primary text-black scale-110"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <p className="mt-8 text-center text-muted-foreground max-w-md">
                  {daysPerWeek <= 3 && "A solid foundation for maintaining health and building baseline strength."}
                  {daysPerWeek === 4 && "The optimal balance of volume and recovery for consistent progress."}
                  {daysPerWeek >= 5 && "High volume territory. Requires meticulous attention to nutrition and sleep."}
                </p>
              </div>

              <div className="flex justify-between pt-8">
                <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
                <Button 
                  size="lg" 
                  onClick={handleComplete} 
                  disabled={updateProfile.isPending}
                  className="px-8 text-black font-bold"
                >
                  {updateProfile.isPending ? "Generating Plan..." : "Initialize FitCore"}
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
