import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandIcon from "@/components/BrandIcon";
import {
  LayoutDashboard,
  Users,
  Upload,
  Calculator,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  User,
  CreditCard,
  Lock,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", requiresSub: false },
  { label: "Clients", icon: Users, href: "/clients", requiresSub: true },
  { label: "Uploads", icon: Upload, href: "/uploads", requiresSub: true },
  { label: "Billing Runs", icon: Calculator, href: "/billing", requiresSub: true },
  { label: "Invoices", icon: FileText, href: "/invoices", requiresSub: true },
  { label: "Reports", icon: BarChart3, href: "/reports", requiresSub: true },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const {
    displayName,
    initials,
    profile,
    organization,
    isAdmin,
    isSubscribed,
    signOut,
    startCheckout,
    openCustomerPortal,
  } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const hasAccess = isAdmin || isSubscribed;

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <BrandIcon size="md" />
            <span className="font-bold text-sm text-sidebar-foreground">
              DispatchBox<span className="text-sidebar-primary">AI</span>
            </span>
          </Link>
        )}
        {collapsed && (
          <BrandIcon size="md" className="mx-auto" />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "h-6 w-6 rounded flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
            collapsed && "mx-auto mt-2"
          )}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.href;
          const locked = item.requiresSub && !hasAccess;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : locked
                  ? "text-sidebar-foreground/40 cursor-default"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5 shrink-0", active && "text-sidebar-primary")} />
              {!collapsed && (
                <span className="flex-1">{item.label}</span>
              )}
              {!collapsed && locked && <Lock className="h-3 w-3 text-sidebar-foreground/30" />}
            </Link>
          );
        })}

        {/* Admin link */}
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              location.pathname === "/admin"
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span>Admin Panel</span>}
          </Link>
        )}
      </nav>

      {/* Subscribe CTA for non-subscribers */}
      {!hasAccess && !collapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={startCheckout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-brand text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <BrandIcon size="md" />
            Subscribe — $499/mo
          </button>
        </div>
      )}

      {/* Bottom: Settings + User Profile */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Settings className="h-4.5 w-4.5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* User profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors",
                collapsed && "justify-center"
              )}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                    {displayName}
                    {isAdmin && <Crown className="h-3 w-3 text-amber-400 shrink-0" />}
                  </div>
                  {organization && (
                    <div className="text-[10px] text-sidebar-foreground/50 truncate">
                      {organization.name}
                    </div>
                  )}
                </div>
              )}
              {!collapsed && <ChevronDown className="h-3 w-3 text-sidebar-foreground/50 shrink-0" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{displayName}</span>
                {isAdmin && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600">
                    👑 ADMIN
                  </Badge>
                )}
                {isSubscribed && !isAdmin && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-success text-success">
                    ✅ Active
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{profile?.role || "Admin"}</div>
              {organization && (
                <div className="text-xs text-muted-foreground mt-0.5">Org: {organization.name}</div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <User className="h-4 w-4 mr-2" /> Profile Settings
            </DropdownMenuItem>
            {isSubscribed && (
              <DropdownMenuItem onClick={openCustomerPortal}>
                <CreditCard className="h-4 w-4 mr-2" /> Manage Billing
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/admin")}>
                <ShieldCheck className="h-4 w-4 mr-2" /> Admin Panel
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" /> Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
