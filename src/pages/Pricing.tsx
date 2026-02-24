import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";

const features = [
  "Revenue leak detection",
  "Automated billing calculations",
  "Invoice generation (PDF & CSV)",
  "Monthly recovery reports",
  "Unlimited CSV uploads",
  "Cancel anytime",
];

export default function Pricing() {
  const { session, isSubscribed, isAdmin, startCheckout, openCustomerPortal } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">
              DispatchBox<span className="text-gradient-brand">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {session ? (
              <Link to="/dashboard">
                <Button variant="hero" size="sm">Go to Dashboard <ArrowRight className="h-3.5 w-3.5" /></Button>
              </Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
                <Link to="/signup"><Button variant="hero" size="sm">Sign Up</Button></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Pricing Hero */}
      <section className="pt-32 pb-10">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Simple, Transparent <span className="text-gradient-brand">Pricing</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Recover lost warehouse revenue automatically. One plan, everything included.
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="pb-24">
        <div className="container flex justify-center">
          <Card className="w-full max-w-md border-2 border-primary/30 shadow-elevated relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />
            {(isSubscribed || isAdmin) && (
              <div className="absolute top-4 right-4">
                <Badge className="bg-success/10 text-success border-success/30">✅ Your Plan</Badge>
              </div>
            )}
            <CardHeader className="text-center pb-2 pt-8">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mx-auto mb-4">
                <Zap className="h-3 w-3" /> Most Popular
              </span>
              <CardTitle className="text-2xl font-bold">DispatchBox Starter</CardTitle>
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-extrabold text-foreground">$499</span>
                <span className="text-muted-foreground text-lg">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Everything you need to stop revenue leakage
              </p>
            </CardHeader>
            <CardContent className="pt-6 pb-8 px-8">
              <ul className="space-y-3 mb-8">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              {isSubscribed || isAdmin ? (
                <Button variant="outline" size="lg" className="w-full text-base" onClick={openCustomerPortal}>
                  Manage Subscription
                </Button>
              ) : session ? (
                <Button variant="hero" size="lg" className="w-full text-base" onClick={startCheckout}>
                  Start Subscription <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Link to="/signup" className="block">
                  <Button variant="hero" size="lg" className="w-full text-base">
                    Sign Up & Subscribe <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <p className="text-xs text-muted-foreground text-center mt-3">
                No long-term contracts. Cancel anytime.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-brand flex items-center justify-center">
              <Zap className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">DispatchBoxAI</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 DispatchBoxAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
