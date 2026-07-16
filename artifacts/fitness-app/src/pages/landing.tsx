import React from "react";
import { Link } from "wouter";
import { ArrowRight, Activity, Zap, Target, BarChart2 } from "lucide-react";
import heroImg from "@assets/generated_images/hero-fitness.jpg";
import aiImg from "@assets/generated_images/feature-ai.jpg";
import nutritionImg from "@assets/generated_images/feature-nutrition.jpg";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-black" />
            </div>
            <span className="font-bold text-xl tracking-tight uppercase">FITCORE</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Log In
            </Link>
            <Link href="/signup" className="text-sm font-medium bg-primary text-black px-4 py-2 rounded-full hover:bg-primary/90 transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src={heroImg} 
              alt="Athlete training" 
              className="w-full h-full object-cover object-center opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
          </div>
          
          <div className="container mx-auto px-4 z-10 relative">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Now with AI Coach V2
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
                Master your <br className="hidden md:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">
                  biological potential.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
                FitCore is the premium command center for your body. Real-time metrics, AI-driven coaching, and brutal precision for those who take their health seriously.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <Link href="/signup" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
                  Start Your Journey <ArrowRight className="h-5 w-5" />
                </Link>
                <p className="text-sm text-muted-foreground">14-day free trial. Cancel anytime.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Value Prop Section */}
        <section className="py-24 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Not just tracking. <br/> Total optimization.</h2>
              <p className="text-muted-foreground">We replaced generic fitness plans with dynamic, data-driven systems that adapt to your body's daily capacity.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Dynamic Load", desc: "Workouts scale in difficulty based on your recent performance and recovery data." },
                { icon: Target, title: "Macro Precision", desc: "Nutrition tracking that actually understands your metabolic demands." },
                { icon: BarChart2, title: "Deep Analytics", desc: "Visualize trends across weeks and months. Spot the invisible variables." }
              ].map((feature, i) => (
                <div key={i} className="bg-background border border-border p-8 rounded-2xl hover:border-primary/50 transition-colors">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Feature Section */}
        <section className="py-24 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-6 order-2 md:order-1">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Your coach <br/> never sleeps.</h2>
                <p className="text-lg text-muted-foreground">
                  Chat with the FitCore AI anytime. It knows your workout history, your nutrition logs, and your goals. Ask for form checks, substitute exercises, or get a pep talk when you're dragging.
                </p>
                <ul className="space-y-4 pt-4">
                  {[
                    "Instant exercise substitutions based on available equipment",
                    "Form cues tailored to your mobility restrictions",
                    "Macro adjustments for unexpected meals"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-muted-foreground">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative order-1 md:order-2">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-primary/20 blur-3xl rounded-full" />
                <img src={aiImg} alt="AI Interface" className="relative rounded-2xl border border-border shadow-2xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Nutrition Section */}
        <section className="py-24 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <img src={nutritionImg} alt="Nutrition Tracking" className="rounded-2xl border border-border shadow-2xl" />
                <div className="absolute -bottom-6 -right-6 bg-background border border-border p-6 rounded-xl shadow-xl w-64 backdrop-blur-md">
                  <div className="text-sm text-muted-foreground mb-1">Today's Macros</div>
                  <div className="font-mono text-2xl font-bold mb-4">2,450 kcal</div>
                  <div className="space-y-3">
                    {[{label: "Protein", val: 180, total: 200, color: "bg-primary"}, {label: "Carbs", val: 210, total: 250, color: "bg-blue-500"}].map((m, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span>{m.label}</span>
                          <span className="font-mono">{m.val}/{m.total}g</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full ${m.color}`} style={{width: `${(m.val/m.total)*100}%`}} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Fuel the machine.</h2>
                <p className="text-lg text-muted-foreground">
                  Stop guessing. Log your meals with our lightning-fast database and watch your macro rings close. FitCore connects your fuel directly to your performance output.
                </p>
                <Link href="/signup" className="inline-flex items-center gap-2 text-primary font-medium hover:underline pt-4">
                  Explore Nutrition Tracking <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5" />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-extrabold mb-6">Stop playing games.</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Join the elite tier of athletes who demand more from their data. Your potential is waiting.
            </p>
            <Link href="/signup" className="inline-block bg-primary text-black px-10 py-4 rounded-full font-bold text-lg hover:bg-primary/90 transition-transform hover:scale-105">
              Create Your Account
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-background border-t border-border py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">FITCORE</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FitCore. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
