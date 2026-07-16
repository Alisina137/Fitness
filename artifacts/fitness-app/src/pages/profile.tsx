import React, { useState } from "react";
import { useGetUserProfile, useGetMe, useUpdateUserProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Shield, CreditCard, UserCircle, Activity, ChevronRight, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const EditChip = ({ label, selected, onClick }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-4 py-2 rounded-full text-sm font-bold transition-all border-2",
      selected 
        ? "bg-primary text-black border-primary shadow-lg shadow-primary/20" 
        : "bg-card border-border text-muted-foreground hover:border-primary/50"
    )}
  >
    {label}
  </button>
);

const SectionCard = ({ title, isEditing, onEdit, onCancel, onSave, isSaving, children, editChildren, lastUpdated }: any) => (
  <div className="bg-card border border-border p-6 md:p-8 rounded-3xl overflow-hidden relative shadow-sm hover-elevate no-hover-interaction-elevate transition-all duration-300">
    <div className="flex justify-between items-center mb-6 pb-4 border-b border-border/50">
      <div>
        <h3 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h3>
        {lastUpdated && <p className="text-xs text-muted-foreground mt-1">Updated {new Date(lastUpdated).toLocaleDateString()}</p>}
      </div>
      {!isEditing ? (
        <Button variant="outline" size="sm" onClick={onEdit} className="rounded-full px-4 border-2 border-border hover:border-primary/50 transition-colors bg-secondary/50">
          <Edit2 className="w-3.5 h-3.5 mr-2"/> Edit
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-full">Cancel</Button>
          <Button size="sm" className="bg-primary text-black rounded-full px-5 font-bold" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
    <div className="relative">
      <motion.div
        key={isEditing ? "edit" : "view"}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isEditing ? editChildren : children}
      </motion.div>
    </div>
  </div>
);

const renderField = (label: string, value: any) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
    <div className="font-bold text-lg md:text-xl text-foreground">
      {value ? String(value).replace(/_/g, ' ') : "—"}
    </div>
  </div>
);

const renderList = (label: string, items: string[] | undefined) => (
  <div className="space-y-2.5">
    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
    <div className="flex flex-wrap gap-2">
      {items && items.length > 0 ? items.map(item => (
        <span key={item} className="px-3.5 py-1.5 bg-secondary/80 border border-border rounded-full text-sm font-bold text-foreground capitalize">
          {item.replace(/_/g, ' ')}
        </span>
      )) : <span className="text-sm font-medium text-muted-foreground">—</span>}
    </div>
  </div>
);

export default function ProfilePage() {
  const { data: user } = useGetMe();
  const { data: profile, isLoading, refetch } = useGetUserProfile();
  const updateProfile = useUpdateUserProfile();
  const { toast } = useToast();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  const handleEdit = (section: string) => {
    setFormData({ ...profile });
    setEditingSection(section);
  };

  const handleSave = () => {
    updateProfile.mutate({ data: formData }, {
      onSuccess: () => {
        setEditingSection(null);
        refetch();
        toast({ title: "Profile updated successfully.", className: "bg-card border-2 border-primary text-foreground" });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to update profile." });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid md:grid-cols-12 gap-8">
          <Skeleton className="md:col-span-4 h-96 rounded-3xl" />
          <div className="md:col-span-8 space-y-6">
            <Skeleton className="h-64 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  const score = profile?.fitnessReadinessScore || 0;
  const dashOffset = 439.8 * (1 - score / 100);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 font-sans pb-24">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(132,204,22,0.15)]">
            <span className="text-4xl font-bold text-primary">{user?.name?.charAt(0) || "U"}</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{user?.name}</h1>
            <p className="text-lg text-muted-foreground">{user?.email}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-widest rounded-full">
              <Zap className="w-3 h-3 text-primary" />
              {user?.subscriptionStatus || "Free Tier"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        
        {/* Left Column: Score & Nav */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-card border border-border p-8 rounded-3xl text-center flex flex-col items-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-blue-500" />
            <h2 className="text-lg font-bold tracking-tight mb-6">Readiness Score</h2>
            
            <div className="relative w-40 h-40 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" className="stroke-secondary" strokeWidth="12" fill="none" />
                <motion.circle 
                  cx="80" cy="80" r="70" 
                  className="stroke-primary drop-shadow-[0_0_10px_rgba(132,204,22,0.4)]" 
                  strokeWidth="12" 
                  strokeLinecap="round"
                  fill="none" 
                  strokeDasharray="439.8"
                  initial={{ strokeDashoffset: 439.8 }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-mono font-bold text-primary tracking-tighter">{score}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Score</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your AI coach uses this score to calibrate intensity and recovery perfectly.
            </p>
          </div>

          <div className="bg-card border border-border rounded-3xl overflow-hidden p-2">
            {[
              { icon: UserCircle, label: "Biological Profile", active: true },
              { icon: Activity, label: "Performance Data" },
              { icon: Shield, label: "Security & Privacy" },
              { icon: CreditCard, label: "Billing & Plan" },
            ].map((item, i) => (
              <button 
                key={i}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl transition-all",
                  item.active ? "bg-secondary/80 text-foreground font-bold" : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground font-medium"
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon className={cn("h-5 w-5", item.active && "text-primary")} /> {item.label}
                </span>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Sections */}
        <div className="md:col-span-8 space-y-6">
          
          <SectionCard 
            title="Personal Information" 
            isEditing={editingSection === "personal"}
            onEdit={() => handleEdit("personal")}
            onCancel={() => setEditingSection(null)}
            onSave={handleSave}
            isSaving={updateProfile.isPending}
            lastUpdated={user?.createdAt}
          >
            {!editingSection || editingSection !== "personal" ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                {renderField("Age", profile?.age)}
                {renderField("Gender", profile?.gender)}
                {renderField("Height", profile?.heightCm ? `${profile.heightCm} cm` : undefined)}
                {renderField("Weight", profile?.weightKg ? `${profile.weightKg} kg` : undefined)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Age</Label>
                  <Input type="number" value={formData.age || ''} onChange={e => setFormData({...formData, age: parseInt(e.target.value) || undefined})} className="h-12 border-2 focus-visible:border-primary bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Gender</Label>
                  <div className="flex flex-wrap gap-2">
                    {["male", "female", "non_binary", "prefer_not_to_say"].map(g => (
                      <EditChip key={g} label={g.replace(/_/g, ' ')} selected={formData.gender === g} onClick={() => setFormData({...formData, gender: g})} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Height (cm)</Label>
                  <Input type="number" value={formData.heightCm || ''} onChange={e => setFormData({...formData, heightCm: parseInt(e.target.value) || undefined})} className="h-12 border-2 focus-visible:border-primary bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Weight (kg)</Label>
                  <Input type="number" value={formData.weightKg || ''} onChange={e => setFormData({...formData, weightKg: parseInt(e.target.value) || undefined})} className="h-12 border-2 focus-visible:border-primary bg-background" />
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard 
            title="Fitness Goals" 
            isEditing={editingSection === "goals"}
            onEdit={() => handleEdit("goals")}
            onCancel={() => setEditingSection(null)}
            onSave={handleSave}
            isSaving={updateProfile.isPending}
          >
            {editingSection !== "goals" ? (
              <div className="space-y-8">
                {renderField("Primary Objective", profile?.primaryGoal)}
                {renderList("Secondary Goals", profile?.secondaryGoals)}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Primary Objective</Label>
                  <div className="flex flex-wrap gap-2">
                    {["lose_fat", "build_muscle", "increase_strength", "improve_endurance", "improve_health", "maintain"].map(g => (
                      <EditChip key={g} label={g.replace(/_/g, ' ')} selected={formData.primaryGoal === g} onClick={() => setFormData({...formData, primaryGoal: g})} />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Secondary Goals</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Lose Fat", "Build Muscle", "Increase Strength", "Improve Endurance", "Improve Health", "Flexibility", "Mobility", "Mental Health"].map(g => (
                      <EditChip 
                        key={g} 
                        label={g} 
                        selected={(formData.secondaryGoals || []).includes(g)} 
                        onClick={() => {
                          const current = formData.secondaryGoals || [];
                          setFormData({...formData, secondaryGoals: current.includes(g) ? current.filter((x:any) => x !== g) : [...current, g]});
                        }} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard 
            title="Experience & Activity" 
            isEditing={editingSection === "activity"}
            onEdit={() => handleEdit("activity")}
            onCancel={() => setEditingSection(null)}
            onSave={handleSave}
            isSaving={updateProfile.isPending}
          >
            {editingSection !== "activity" ? (
              <div className="grid sm:grid-cols-2 gap-8">
                {renderField("Fitness Level", profile?.fitnessLevel)}
                {renderField("Daily Activity", profile?.activityLevel)}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Fitness Level</Label>
                  <div className="flex flex-wrap gap-2">
                    {["beginner", "intermediate", "advanced", "athlete"].map(f => (
                      <EditChip key={f} label={f.replace(/_/g, ' ')} selected={formData.fitnessLevel === f} onClick={() => setFormData({...formData, fitnessLevel: f})} />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Daily Activity</Label>
                  <div className="flex flex-wrap gap-2">
                    {["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"].map(a => (
                      <EditChip key={a} label={a.replace(/_/g, ' ')} selected={formData.activityLevel === a} onClick={() => setFormData({...formData, activityLevel: a})} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard 
            title="Workout Preferences" 
            isEditing={editingSection === "workout"}
            onEdit={() => handleEdit("workout")}
            onCancel={() => setEditingSection(null)}
            onSave={handleSave}
            isSaving={updateProfile.isPending}
          >
            {editingSection !== "workout" ? (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {renderField("Location", profile?.workoutLocation)}
                  {renderField("Target Days", profile?.weeklyWorkoutTarget ? `${profile.weeklyWorkoutTarget} days/wk` : undefined)}
                  {renderField("Duration", profile?.workoutDurationMinutes ? `${profile.workoutDurationMinutes} mins` : undefined)}
                </div>
                {renderList("Available Equipment", profile?.equipmentAvailable)}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider">Location</Label>
                    <div className="flex flex-wrap gap-2">
                      {["home", "gym", "outdoor", "mixed"].map(l => (
                        <EditChip key={l} label={l.replace(/_/g, ' ')} selected={formData.workoutLocation === l} onClick={() => setFormData({...formData, workoutLocation: l})} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider">Target Days / Week</Label>
                    <Input type="number" min="1" max="7" value={formData.weeklyWorkoutTarget || ''} onChange={e => setFormData({...formData, weeklyWorkoutTarget: parseInt(e.target.value) || undefined})} className="h-12 border-2 focus-visible:border-primary bg-background" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Equipment</Label>
                  <div className="flex flex-wrap gap-2">
                    {["No Equipment", "Dumbbells", "Resistance Bands", "Barbell", "Machines", "Full Gym"].map(e => (
                      <EditChip 
                        key={e} 
                        label={e} 
                        selected={(formData.equipmentAvailable || []).includes(e)} 
                        onClick={() => {
                          const current = formData.equipmentAvailable || [];
                          if (e === "No Equipment") setFormData({...formData, equipmentAvailable: ["No Equipment"]});
                          else setFormData({...formData, equipmentAvailable: current.includes(e) ? current.filter((x:any) => x !== e) : [...current.filter((x:any) => x !== "No Equipment"), e]});
                        }} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard 
            title="Health & Limitations" 
            isEditing={editingSection === "health"}
            onEdit={() => handleEdit("health")}
            onCancel={() => setEditingSection(null)}
            onSave={handleSave}
            isSaving={updateProfile.isPending}
          >
            {editingSection !== "health" ? (
              <div className="space-y-8">
                {renderList("Injuries", profile?.injuries)}
                {profile?.injuryNotes && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clinical Notes</Label>
                    <div className="p-4 bg-secondary/30 rounded-xl text-sm leading-relaxed border border-border">
                      {profile.injuryNotes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Injuries</Label>
                  <div className="flex flex-wrap gap-2">
                    {["None", "Knee", "Back", "Shoulder", "Wrist", "Ankle", "Hip", "Other"].map(i => (
                      <EditChip 
                        key={i} 
                        label={i} 
                        selected={(formData.injuries || []).includes(i)} 
                        onClick={() => {
                          const current = formData.injuries || [];
                          if (i === "None") setFormData({...formData, injuries: ["None"]});
                          else setFormData({...formData, injuries: current.includes(i) ? current.filter((x:any) => x !== i) : [...current.filter((x:any) => x !== "None"), i]});
                        }} 
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Clinical Notes</Label>
                  <Textarea 
                    value={formData.injuryNotes || ''} 
                    onChange={e => setFormData({...formData, injuryNotes: e.target.value})} 
                    className="min-h-[100px] border-2 bg-background focus-visible:border-primary"
                    placeholder="Details about injuries or physical limitations..."
                  />
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard 
            title="Nutrition & Diet" 
            isEditing={editingSection === "nutrition"}
            onEdit={() => handleEdit("nutrition")}
            onCancel={() => setEditingSection(null)}
            onSave={handleSave}
            isSaving={updateProfile.isPending}
          >
            {editingSection !== "nutrition" ? (
              <div className="space-y-8">
                {renderField("Diet Style", profile?.dietPreference)}
                {renderList("Food Restrictions", profile?.foodRestrictions)}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Diet Style</Label>
                  <div className="flex flex-wrap gap-2">
                    {["no_preference", "high_protein", "vegetarian", "vegan", "keto", "mediterranean", "low_carb"].map(d => (
                      <EditChip key={d} label={d.replace(/_/g, ' ')} selected={formData.dietPreference === d} onClick={() => setFormData({...formData, dietPreference: d})} />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Food Restrictions</Label>
                  <Input 
                    value={(formData.foodRestrictions || []).join(", ")} 
                    onChange={e => setFormData({...formData, foodRestrictions: e.target.value.split(',').map((s:string) => s.trim()).filter(Boolean)})} 
                    className="h-12 border-2 bg-background focus-visible:border-primary"
                    placeholder="e.g. Peanuts, Gluten (comma separated)"
                  />
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard 
            title="Mind & Lifestyle" 
            isEditing={editingSection === "lifestyle"}
            onEdit={() => handleEdit("lifestyle")}
            onCancel={() => setEditingSection(null)}
            onSave={handleSave}
            isSaving={updateProfile.isPending}
          >
            {editingSection !== "lifestyle" ? (
              <div className="grid sm:grid-cols-2 gap-8">
                {renderField("Core Motivation", profile?.motivation)}
                {renderField("Average Sleep", profile?.sleepHours)}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Core Motivation</Label>
                  <div className="flex flex-wrap gap-2">
                    {["look_better", "feel_healthier", "build_confidence", "improve_performance", "prepare_for_event"].map(m => (
                      <EditChip key={m} label={m.replace(/_/g, ' ')} selected={formData.motivation === m} onClick={() => setFormData({...formData, motivation: m})} />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Average Sleep</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "lt5", label: "Less than 5h" },
                      { id: "h5_7", label: "5-7h" },
                      { id: "h7_9", label: "7-9h" },
                      { id: "gt9", label: "9+ hours" }
                    ].map(s => (
                      <EditChip key={s.id} label={s.label} selected={formData.sleepHours === s.id} onClick={() => setFormData({...formData, sleepHours: s.id})} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

        </div>
      </div>
    </div>
  );
}
