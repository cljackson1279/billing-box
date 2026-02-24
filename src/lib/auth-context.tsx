import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  organization_id: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_status: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  organization: Organization | null;
  isLoading: boolean;
  displayName: string;
  initials: string;
  isAdmin: boolean;
  isSubscribed: boolean;
  subscriptionLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  startCheckout: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  organization: null,
  isLoading: true,
  displayName: "User",
  initials: "U",
  isAdmin: false,
  isSubscribed: false,
  subscriptionLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshSubscription: async () => {},
  startCheckout: async () => {},
  openCustomerPortal: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function getDisplayName(profile: UserProfile | null, user: User | null): string {
  if (profile?.full_name) return profile.full_name;
  const email = profile?.email || user?.email;
  if (email) {
    const name = email.split("@")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return "User";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_profiles")
      .select("id, full_name, email, avatar_url, role, organization_id")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
      if (data.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id, name, slug, subscription_status")
          .eq("id", data.organization_id)
          .single();
        setOrganization(org || null);
      } else {
        setOrganization(null);
      }
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!session) {
      setIsSubscribed(false);
      setIsAdmin(false);
      setSubscriptionLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("Subscription check error:", error);
        setSubscriptionLoading(false);
        return;
      }
      setIsSubscribed(data?.subscribed || false);
      setIsAdmin(data?.isAdmin || false);
    } catch (err) {
      console.error("Subscription check failed:", err);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [session]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          setTimeout(() => fetchProfile(newSession.user.id), 0);
        } else {
          setProfile(null);
          setOrganization(null);
          setIsAdmin(false);
          setIsSubscribed(false);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Check subscription when session changes
  useEffect(() => {
    if (session) {
      refreshSubscription();
    } else {
      setSubscriptionLoading(false);
    }
  }, [session, refreshSubscription]);

  // Periodic subscription refresh (every 60s)
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(refreshSubscription, 60000);
    return () => clearInterval(interval);
  }, [session, refreshSubscription]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setOrganization(null);
    setIsAdmin(false);
    setIsSubscribed(false);
  }, []);

  const startCheckout = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-checkout");
    if (error) {
      console.error("Checkout error:", error);
      return;
    }
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  }, []);

  const openCustomerPortal = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) {
      console.error("Portal error:", error);
      return;
    }
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  }, []);

  const displayName = getDisplayName(profile, user);
  const initials = getInitials(displayName);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        organization,
        isLoading,
        displayName,
        initials,
        isAdmin,
        isSubscribed,
        subscriptionLoading,
        signOut,
        refreshProfile,
        refreshSubscription,
        startCheckout,
        openCustomerPortal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
