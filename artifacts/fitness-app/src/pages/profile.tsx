import React, { useState } from "react";
import { useGetUserProfile, useGetMe, useUpdateUserProfile } from "@workspace/api-client-react";
import { useAuthStore } from "../store/auth";
import { UserCircle, Settings, Shield, CreditCard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { data: profile, isLoading } = useGetUserProfile();
  const updateProfile = useUpdateUserProfile();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    heightCm: "",
    weightKg: "",
    weeklyWorkoutTarget: "",
  });

  // Sync form when profile loads
  React.useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        heightCm: profile.heightCm?.toString() || "",
        weightKg: profile.weightKg?.toString() || "",
        weeklyWorkoutTarget: profile.weeklyWorkoutTarget?.toString() || "",
      });
    }
  }, [profile, isEditing]);

  const handleSave = () => {
    updateProfile.mutate({
      data: {
        heightCm: parseInt(formData.heightCm) || undefined,
        weightKg: parseInt(formData.weightKg) || undefined,
        weeklyWorkoutTarget: parseInt(formData.weeklyWorkoutTarget) || undefined,
      }
    }, {
      onSuccess: () => {
        setIsEditing(false);
        toast({ title: "Profile updated" });
      }
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Identity</h1>
        <p className="text-muted-foreground mt-1">Manage your account and biological data.</p>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        {/* Left Column: Nav/Overview */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-card border border-border p-6 rounded-3xl text-center flex flex-col items-center">
            <div className="h-24 w-24 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-primary">{user?.name?.charAt(0) || "U"}</span>
            </div>
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>
            
            <div className="inline-block px-3 py-1 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider rounded-full">
              {user?.subscriptionStatus || "Free Tier"}
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl overflow-hidden">
            {[
              { icon: UserCircle, label: "Biological Data", active: true },
              { icon: Settings, label: "Preferences" },
              { icon: Shield, label: "Security" },
              { icon: CreditCard, label: "Subscription" },
            ].map((item, i) => (
              <button 
                key={i}
                className={`w-full flex items-center justify-between p-4 px-6 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors ${item.active ? "bg-secondary/30 text-primary font-medium" : "text-muted-foreground"}`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" /> {item.label}
                </span>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Content */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-card border border-border p-6 md:p-8 rounded-3xl">
            <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
              <h3 className="text-xl font-bold">Biological Data</h3>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit Stats</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button size="sm" className="bg-primary text-black" onClick={handleSave} disabled={updateProfile.isPending}>Save</Button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-6">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Height (cm)</Label>
                    {isEditing ? (
                      <Input 
                        type="number" 
                        value={formData.heightCm} 
                        onChange={(e) => setFormData({...formData, heightCm: e.target.value})}
                      />
                    ) : (
                      <div className="p-3 bg-secondary/30 rounded-xl font-mono text-lg">{profile?.heightCm || "—"}</div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Weight (kg)</Label>
                    {isEditing ? (
                      <Input 
                        type="number" 
                        value={formData.weightKg} 
                        onChange={(e) => setFormData({...formData, weightKg: e.target.value})}
                      />
                    ) : (
                      <div className="p-3 bg-secondary/30 rounded-xl font-mono text-lg">{profile?.weightKg || "—"}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Weekly Target (Days)</Label>
                    {isEditing ? (
                      <Input 
                        type="number" 
                        value={formData.weeklyWorkoutTarget} 
                        onChange={(e) => setFormData({...formData, weeklyWorkoutTarget: e.target.value})}
                      />
                    ) : (
                      <div className="p-3 bg-secondary/30 rounded-xl font-mono text-lg">{profile?.weeklyWorkoutTarget || "—"}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fitness Level</Label>
                    <div className="p-3 bg-secondary/30 rounded-xl font-medium capitalize text-lg">
                      {profile?.fitnessLevel || "—"}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Objectives</Label>
                    <div className="flex flex-wrap gap-2">
                      {profile?.goals?.map(g => (
                        <span key={g} className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-sm capitalize">
                          {g.replace("_", " ")}
                        </span>
                      )) || <span className="text-sm text-muted-foreground">No goals set</span>}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Environment</Label>
                    <div className="flex flex-wrap gap-2">
                      {profile?.equipmentAvailable?.map(e => (
                        <span key={e} className="px-3 py-1 bg-secondary rounded-md text-sm capitalize">
                          {e.replace("_", " ")}
                        </span>
                      )) || <span className="text-sm text-muted-foreground">Not specified</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
