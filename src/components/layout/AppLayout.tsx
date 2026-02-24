import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import AppSidebar from "./AppSidebar";
import PaywallOverlay from "@/components/PaywallOverlay";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

// These routes require an active subscription (or admin)
const PAYWALLED_ROUTES = ["/clients", "/uploads", "/billing", "/invoices", "/reports"];

export default function AppLayout() {
  const { session, isLoading, isAdmin, isSubscribed, subscriptionLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !session) {
      navigate("/login");
    }
  }, [isLoading, session, navigate]);

  if (isLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  const needsPaywall = !isAdmin && !isSubscribed && PAYWALLED_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto relative">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
        {needsPaywall && <PaywallOverlay />}
      </main>
    </div>
  );
}
