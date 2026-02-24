import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, TrendingUp, Zap } from "lucide-react";

export default function PaywallOverlay() {
  const { startCheckout } = useAuth();

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border-2 border-primary/30 bg-card shadow-elevated p-8 text-center">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-card-foreground mb-2">
          Unlock Revenue Recovery
        </h2>
        <p className="text-muted-foreground mb-6">
          Subscribe to access Clients, CSV Uploads, Billing Runs, Invoices, and Reports.
        </p>

        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mb-6 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <span className="text-foreground">$3K–$5K/mo recovered on average</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <span className="text-foreground">742% ROI vs $499/mo cost</span>
          </div>
        </div>

        <div className="mb-4">
          <span className="text-4xl font-extrabold text-foreground">$499</span>
          <span className="text-muted-foreground text-lg">/month</span>
        </div>

        <Button variant="hero" size="lg" className="w-full text-base" onClick={startCheckout}>
          Start $499/mo Subscription <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          Cancel anytime. No long-term contracts.
        </p>
      </div>
    </div>
  );
}
