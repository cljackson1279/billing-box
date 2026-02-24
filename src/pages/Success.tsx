import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export default function Success() {
  const { refreshSubscription } = useAuth();

  // Refresh subscription status when landing on success page
  useEffect(() => {
    const timer = setTimeout(() => refreshSubscription(), 2000);
    return () => clearTimeout(timer);
  }, [refreshSubscription]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <BrandIcon size="md" />
            <span className="font-bold text-lg text-foreground">
              DispatchBox<span className="text-gradient-brand">AI</span>
            </span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center shadow-elevated">
          <CardContent className="pt-10 pb-10 px-8">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Subscription Active! 🎉</h1>
            <p className="text-muted-foreground mb-8">
              Welcome to DispatchBoxAI. You now have full access to all revenue recovery features.
            </p>
            <Link to="/dashboard">
              <Button variant="hero" size="lg" className="text-base">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
