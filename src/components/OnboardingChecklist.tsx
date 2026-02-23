import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, CheckCircle2, Circle, Users, DollarSign, Upload, FileText, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { id: "add_client", label: "Add a Client", icon: Users, route: "/clients" },
  { id: "set_rates", label: "Set Rate Table", icon: DollarSign, route: "/clients" },
  { id: "upload_csv", label: "Upload CSV Data", icon: Upload, route: "/uploads" },
  { id: "run_billing", label: "Run Billing", icon: FileText, route: "/billing" },
  { id: "generate_invoice", label: "Generate Invoice", icon: Receipt, route: "/invoices" },
] as const;

type StepId = typeof STEPS[number]["id"];

export function useOnboardingProgress() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { completed: [] as string[], dismissed: false };
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("has_completed_onboarding, onboarding_progress")
        .eq("id", user.id)
        .maybeSingle();
      return {
        completed: (profile?.onboarding_progress as string[] | null) || [],
        dismissed: profile?.has_completed_onboarding || false,
      };
    },
  });

  const markStep = async (stepId: StepId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const current = data?.completed || [];
    if (current.includes(stepId)) return;
    const updated = [...current, stepId];
    await supabase.from("user_profiles").upsert({
      id: user.id,
      onboarding_progress: updated as any,
      updated_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] });
  };

  return { completed: data?.completed || [], dismissed: data?.dismissed || false, markStep };
}

export default function OnboardingChecklist() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { completed, dismissed } = useOnboardingProgress();
  const [hidden, setHidden] = useState(false);

  const completedCount = completed.length;
  const allDone = completedCount >= STEPS.length;

  useEffect(() => {
    if (allDone && !dismissed) {
      // Auto-dismiss after all steps done
      const timer = setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("user_profiles").upsert({
            id: user.id,
            has_completed_onboarding: true,
            updated_at: new Date().toISOString(),
          });
          queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] });
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allDone, dismissed]);

  if (dismissed || hidden) return null;

  const handleDismiss = async () => {
    setHidden(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_profiles").upsert({
        id: user.id,
        has_completed_onboarding: true,
        updated_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] });
    }
  };

  const handleStepClick = (step: typeof STEPS[number]) => {
    if (location.pathname !== step.route) {
      navigate(step.route);
    }
  };

  return (
    <Card className="shadow-elevated border-primary/20 p-5 mb-6 relative overflow-hidden">
      {/* Teal accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-brand" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 pl-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative h-12 w-12">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeDasharray={`${(completedCount / STEPS.length) * 97.4} 97.4`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                {completedCount}/{STEPS.length}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {allDone ? "🎉 You're all set!" : "Get Started with DispatchBox"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {allDone ? "Your workspace is ready to go." : "Complete these steps to unlock your full dashboard."}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            {STEPS.map((step) => {
              const done = completed.includes(step.id);
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => !done && handleStepClick(step)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    done
                      ? "text-muted-foreground"
                      : "text-foreground hover:bg-muted/50 cursor-pointer"
                  }`}
                  disabled={done}
                >
                  {done ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-accent shrink-0" />
                  ) : (
                    <Circle className="h-4.5 w-4.5 text-muted-foreground/50 shrink-0" />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={done ? "line-through" : "font-medium"}>{step.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleDismiss}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>

        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
