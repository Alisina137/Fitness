import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Utensils, TrendingUp, MessageSquare, UserCircle, LogOut, Sparkles, Heart, Target } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { cn } from "@/lib/utils";

const MAIN_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workouts", label: "Workouts", icon: Activity },
  { href: "/exercises", label: "Exercises", icon: Activity },
  { href: "/nutrition", label: "Nutrition", icon: Utensils },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/recovery", label: "Recovery", icon: Heart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/ai/generate", label: "AI Generator", icon: Sparkles },
  { href: "/ai", label: "AI Coach", icon: MessageSquare },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <Activity className="h-5 w-5 text-black" />
          </div>
          <span className="font-bold text-xl tracking-tight uppercase">FITCORE</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {MAIN_NAV.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <Link 
            href="/profile"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              location === "/profile" 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <UserCircle className="h-5 w-5" />
            Profile
          </Link>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-background md:rounded-tl-2xl md:border-t md:border-l md:border-border relative">
        <div className="min-h-full pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around px-2 py-2 pb-safe">
        {MAIN_NAV.slice(0, 5).map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-14",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
