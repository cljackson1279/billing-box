import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users, Crown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  organization_id: string | null;
  created_at: string | null;
  isAdmin: boolean;
}

export default function AdminPanel() {
  const { isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      // Fetch all user profiles (admin can see via RLS on user_profiles — 
      // but actually admin needs to see all users. We'll use a workaround:
      // fetch user_roles to find admins, and user_profiles for all users)
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, role, organization_id, created_at")
        .order("created_at", { ascending: false });

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const adminIds = new Set(
        (roles || []).filter((r) => r.role === "admin").map((r) => r.user_id)
      );

      setUsers(
        (profiles || []).map((p) => ({
          ...p,
          isAdmin: adminIds.has(p.id),
        }))
      );
      setLoadingUsers(false);
    };

    fetchUsers();
  }, [isAdmin]);

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (currentlyAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" as any });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isAdmin: !currentlyAdmin } : u))
    );
    toast({ title: currentlyAdmin ? "Admin removed" : "Admin granted" });
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <Badge variant="outline" className="border-amber-400 text-amber-600">
            👑 ADMIN
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users and platform settings
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Joined</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {u.full_name || "—"}
                          </span>
                          {u.isAdmin && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{u.email || "—"}</td>
                      <td className="py-3">
                        {u.isAdmin ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            User
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => toggleAdmin(u.id, u.isAdmin)}
                        >
                          {u.isAdmin ? "Remove Admin" : "Make Admin"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
