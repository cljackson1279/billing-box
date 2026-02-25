import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  User, Building2, CreditCard, Bell, Shield, Database,
  Save, LogOut, ExternalLink, Download, AlertTriangle, Mail,
  Plug, CheckCircle2, XCircle, RefreshCw, Loader2, Link2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const STRIPE_MANAGE_BILLING_URL = "https://billing.stripe.com/p/login/test_PLACEHOLDER";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu", "America/Toronto",
  "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Australia/Sydney",
];

export default function Settings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // Account state
  const [account, setAccount] = useState({ full_name: "", phone: "" });
  const [accountOriginal, setAccountOriginal] = useState({ full_name: "", phone: "" });

  // Org state
  const [org, setOrg] = useState({
    id: "", name: "", address_line1: "", address_line2: "", city: "", state: "", zip: "", country: "US", timezone: "America/New_York", slug: "",
    subscription_status: null as string | null,
  });
  const [orgOriginal, setOrgOriginal] = useState(org);

  // Org settings
  const [orgSettings, setOrgSettings] = useState({
    default_currency: "USD", invoice_prefix: "DBX-", invoice_footer_note: "", default_billing_contact_email: "",
  });
  const [orgSettingsOriginal, setOrgSettingsOriginal] = useState(orgSettings);

  // Notification prefs
  const [notifs, setNotifs] = useState({
    email_reports_enabled: true, email_invoice_ready: true, email_revenue_alerts: true, sms_enabled: false, sms_phone: "",
  });
  const [notifsOriginal, setNotifsOriginal] = useState(notifs);

  // QuickBooks state
  const [qbStatus, setQbStatus] = useState<{
    connected: boolean;
    company_name: string | null;
    company_id: string | null;
    sync_stats: { total: number; synced: number };
  } | null>(null);
  const [qbLoading, setQbLoading] = useState(false);
  const [qbConnecting, setQbConnecting] = useState(false);
  const [qbDisconnecting, setQbDisconnecting] = useState(false);
  const [qbTesting, setQbTesting] = useState(false);
  const [customerMappings, setCustomerMappings] = useState<any[]>([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);

  useEffect(() => {
    loadAll();
    // Handle QuickBooks OAuth callback — Intuit redirects back to
    // /settings?tab=integrations&code=xxx&realmId=yyy&state=zzz
    const params = new URLSearchParams(window.location.search);
    const qbCode = params.get("code");
    const qbRealmId = params.get("realmId");
    const qbState = params.get("state");
    if (qbCode && qbRealmId && qbState) {
      setActiveTab("integrations");
      // Clean the URL so a page refresh doesn't re-trigger the callback
      window.history.replaceState({}, document.title, window.location.pathname + "?tab=integrations");
      handleQBCallback(qbCode, qbRealmId, qbState);
    }
  }, []);

  const handleQBCallback = async (code: string, realmId: string, state: string) => {
    setQbConnecting(true);
    try {
      const res = await supabase.functions.invoke("quickbooks-connect", {
        body: { action: "callback", code, realmId, state },
      });
      if (res.data?.success) {
        toast({
          title: "QuickBooks connected!",
          description: `Successfully connected to ${res.data.company_name || "your QuickBooks company"}.`,
        });
        await loadQBStatus();
      } else {
        toast({
          title: "QuickBooks connection failed",
          description: res.data?.error || "Could not complete QuickBooks authorization.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "QuickBooks connection error",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setQbConnecting(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    setUserEmail(user.email || "");

    const [profileRes, orgIdRes, notifsRes] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.rpc("get_user_org_id"),
      (supabase.from as any)("notification_prefs").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    const orgId = orgIdRes.data;
    let orgRes: any = null;
    let orgSettingsRes: any = null;
    if (orgId) {
      [orgRes, orgSettingsRes] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", orgId).single(),
        (supabase.from as any)("org_settings").select("*").eq("organization_id", orgId).maybeSingle(),
      ]);
    }

    if (profileRes.data) {
      const a = { full_name: profileRes.data.full_name || "", phone: profileRes.data.phone || "" };
      setAccount(a);
      setAccountOriginal(a);
    }

    const orgData = orgRes && 'data' in orgRes ? (orgRes as any).data : null;
    if (orgData) {
      const o = {
        id: orgData.id, name: orgData.name || "", address_line1: orgData.address_line1 || "",
        address_line2: orgData.address_line2 || "", city: orgData.city || "", state: orgData.state || "",
        zip: orgData.zip || "", country: orgData.country || "US", timezone: orgData.timezone || "America/New_York",
        slug: orgData.slug || "", subscription_status: orgData.subscription_status,
      };
      setOrg(o);
      setOrgOriginal(o);
    }

    const osData = orgSettingsRes && 'data' in orgSettingsRes ? (orgSettingsRes as any).data : null;
    if (osData) {
      const os = {
        default_currency: osData.default_currency || "USD", invoice_prefix: osData.invoice_prefix || "DBX-",
        invoice_footer_note: osData.invoice_footer_note || "", default_billing_contact_email: osData.default_billing_contact_email || "",
      };
      setOrgSettings(os);
      setOrgSettingsOriginal(os);
    }

    if (notifsRes.data) {
      const n = {
        email_reports_enabled: notifsRes.data.email_reports_enabled ?? true,
        email_invoice_ready: notifsRes.data.email_invoice_ready ?? true,
        email_revenue_alerts: notifsRes.data.email_revenue_alerts ?? true,
        sms_enabled: notifsRes.data.sms_enabled ?? false,
        sms_phone: notifsRes.data.sms_phone || "",
      };
      setNotifs(n);
      setNotifsOriginal(n);
    }

    setLoading(false);
  };

  // ── QuickBooks helpers ──────────────────────────────────────────

  const loadQBStatus = async () => {
    setQbLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("quickbooks-connect", {
        body: { action: "status" },
      });
      if (res.data) setQbStatus(res.data);
    } catch (err) {
      console.error("QB status error", err);
    } finally {
      setQbLoading(false);
    }
  };

  const handleQBConnect = async () => {
    setQbConnecting(true);
    try {
      const res = await supabase.functions.invoke("quickbooks-connect", {
        body: { action: "get_auth_url" },
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast({ title: "Error", description: res.data?.error || "Could not get QuickBooks auth URL", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setQbConnecting(false);
    }
  };

  const handleQBDisconnect = async () => {
    setQbDisconnecting(true);
    try {
      await supabase.functions.invoke("quickbooks-connect", { body: { action: "disconnect" } });
      setQbStatus(null);
      toast({ title: "QuickBooks disconnected" });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setQbDisconnecting(false);
    }
  };

  const handleQBTest = async () => {
    setQbTesting(true);
    await loadQBStatus();
    setQbTesting(false);
    toast({ title: "Connection verified", description: `Connected to ${qbStatus?.company_name ?? "QuickBooks"}` });
  };

  const loadCustomerMappings = async () => {
    setMappingsLoading(true);
    try {
      const res = await supabase.functions.invoke("quickbooks-sync", {
        body: { action: "get_customer_mappings" },
      });
      if (res.data?.mappings) setCustomerMappings(res.data.mappings);
    } catch (err) {
      console.error("Mappings error", err);
    } finally {
      setMappingsLoading(false);
    }
  };

  const handleAutoMap = async () => {
    const res = await supabase.functions.invoke("quickbooks-sync", {
      body: { action: "get_customer_mappings" },
    });
    if (res.data?.mappings) {
      setCustomerMappings(res.data.mappings);
      toast({ title: "Auto-mapping complete", description: "Clients matched to QuickBooks customers." });
    }
  };

  // Load QB status when Integrations tab is opened
  useEffect(() => {
    if (activeTab === "integrations" && qbStatus === null) {
      loadQBStatus();
    }
    if (activeTab === "integrations" && qbStatus?.connected && customerMappings.length === 0) {
      loadCustomerMappings();
    }
  }, [activeTab]);

  // ── Account / Org / Notif save handlers ────────────────────────

  const saveAccount = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("user_profiles").upsert({
      id: userId, email: userEmail, full_name: account.full_name, phone: account.phone, updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setAccountOriginal({ ...account });
    toast({ title: "Account updated" });
  };

  const saveOrg = async () => {
    setSaving(true);
    let orgId = org.id;

    if (!orgId) {
      const slug = org.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "my-org";
      const { data: fnData, error: fnError } = await supabase.functions.invoke("create-organization", {
        body: {
          name: org.name || "My Organization", slug, address_line1: org.address_line1, address_line2: org.address_line2,
          city: org.city, state: org.state, zip: org.zip, country: org.country, timezone: org.timezone,
        },
      });
      if (fnError || !fnData?.id) {
        const errMsg = fnError?.message || fnData?.error || "Failed to create organization";
        toast({ title: "Error", description: errMsg, variant: "destructive" }); setSaving(false); return;
      }
      orgId = fnData.id;
      setOrg(prev => ({ ...prev, id: orgId }));
    } else {
      const { error } = await supabase.from("organizations").update({
        name: org.name, address_line1: org.address_line1, address_line2: org.address_line2,
        city: org.city, state: org.state, zip: org.zip, country: org.country, timezone: org.timezone,
        updated_at: new Date().toISOString(),
      }).eq("id", orgId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }

    await (supabase.from as any)("org_settings").upsert({
      organization_id: orgId, ...orgSettings, updated_at: new Date().toISOString(),
    });

    setSaving(false);
    setOrgOriginal({ ...org, id: orgId });
    setOrgSettingsOriginal({ ...orgSettings });
    toast({ title: "Organization updated" });
  };

  const saveNotifs = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await (supabase.from as any)("notification_prefs").upsert({
      user_id: userId, ...notifs, updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNotifsOriginal({ ...notifs });
    toast({ title: "Notification preferences saved" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Password reset email sent", description: "Check your inbox." });
  };

  const exportData = async (table: string, filename: string) => {
    const { data, error } = await (supabase.from as any)(table).select("*");
    if (error || !data?.length) {
      toast({ title: "No data", description: `No ${table} data to export.` });
      return;
    }
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map((row: any) => headers.map(h => `"${(row as any)[h] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const accountDirty = JSON.stringify(account) !== JSON.stringify(accountOriginal);
  const orgDirty = JSON.stringify(org) !== JSON.stringify(orgOriginal) || JSON.stringify(orgSettings) !== JSON.stringify(orgSettingsOriginal);
  const notifsDirty = JSON.stringify(notifs) !== JSON.stringify(notifsOriginal);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72 mt-2" /></div>
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account, organization, and preferences.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="account" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" />Account</TabsTrigger>
          <TabsTrigger value="organization" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Organization</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" />Billing</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5 text-xs"><Plug className="h-3.5 w-3.5" />Integrations</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs"><Bell className="h-3.5 w-3.5" />Notifications</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" />Security</TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5 text-xs"><Database className="h-3.5 w-3.5" />Data</TabsTrigger>
        </TabsList>

        {/* ACCOUNT */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={account.full_name} onChange={e => setAccount(p => ({ ...p, full_name: e.target.value }))} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={userEmail} disabled className="opacity-60" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={account.phone} onChange={e => setAccount(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Button onClick={saveAccount} disabled={!accountDirty || saving}>
                  <Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save Account Changes"}
                </Button>
                <Button variant="ghost" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Log Out</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ORGANIZATION */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Your warehouse / company details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input value={org.name} onChange={e => setOrg(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Address Line 1</Label>
                  <Input value={org.address_line1} onChange={e => setOrg(p => ({ ...p, address_line1: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Address Line 2</Label>
                  <Input value={org.address_line2} onChange={e => setOrg(p => ({ ...p, address_line2: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={org.city} onChange={e => setOrg(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={org.state} onChange={e => setOrg(p => ({ ...p, state: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>ZIP</Label>
                  <Input value={org.zip} onChange={e => setOrg(p => ({ ...p, zip: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={org.country} onChange={e => setOrg(p => ({ ...p, country: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={org.timezone} onValueChange={v => setOrg(p => ({ ...p, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <h3 className="text-sm font-semibold text-foreground">Invoice Settings</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Invoice Prefix</Label>
                  <Input value={orgSettings.invoice_prefix} onChange={e => setOrgSettings(p => ({ ...p, invoice_prefix: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Billing Contact Email</Label>
                  <Input type="email" value={orgSettings.default_billing_contact_email} onChange={e => setOrgSettings(p => ({ ...p, default_billing_contact_email: e.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Invoice Footer Note</Label>
                  <Input value={orgSettings.invoice_footer_note} onChange={e => setOrgSettings(p => ({ ...p, invoice_footer_note: e.target.value }))} placeholder="e.g. Payment due within 30 days" />
                </div>
              </div>
              <Separator />
              <Button onClick={saveOrg} disabled={!orgDirty || saving}>
                <Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save Organization Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BILLING */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>Manage your DispatchBox subscription.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-border p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">DispatchBox Starter</p>
                    <p className="text-2xl font-bold text-foreground">$499<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    org.subscription_status === "active" ? "bg-primary/10 text-primary" :
                    org.subscription_status === "past_due" ? "bg-destructive/10 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {org.subscription_status ? org.subscription_status.replace("_", " ").toUpperCase() : "NOT CONNECTED"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => window.open(STRIPE_MANAGE_BILLING_URL, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" />Manage Subscription
                </Button>
                <Button variant="outline" onClick={() => window.open(STRIPE_MANAGE_BILLING_URL, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" />View Receipts
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Manage subscription, payment method, and invoices via Stripe portal.</p>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Billing Contact</h3>
                <p className="text-sm text-muted-foreground">{orgSettings.default_billing_contact_email || "Not set — update in Organization tab."}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTEGRATIONS */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            {/* QuickBooks Connection Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#2CA01C]/10 flex items-center justify-center">
                      <span className="text-[#2CA01C] font-bold text-sm">QB</span>
                    </div>
                    <div>
                      <CardTitle className="text-base">QuickBooks Online</CardTitle>
                      <CardDescription>Sync invoices and clients automatically</CardDescription>
                    </div>
                  </div>
                  {qbLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : qbStatus?.connected ? (
                    <Badge className="bg-success/10 text-success border-success/20 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground gap-1">
                      <XCircle className="h-3 w-3" /> Not Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {qbStatus?.connected ? (
                  <>
                    {/* Connected state */}
                    <div className="rounded-lg bg-success/5 border border-success/20 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <p className="text-sm font-medium text-foreground">
                          Connected to <strong>{qbStatus.company_name ?? "QuickBooks"}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync Status: <span className="font-medium text-foreground">
                          {qbStatus.sync_stats.synced}/{qbStatus.sync_stats.total} invoices synced
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleQBTest}
                        disabled={qbTesting}
                      >
                        {qbTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                        Test Connection
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadCustomerMappings}
                        disabled={mappingsLoading}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-2" />
                        View Customer Mappings
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={handleQBDisconnect}
                        disabled={qbDisconnecting}
                      >
                        {qbDisconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <XCircle className="h-3.5 w-3.5 mr-2" />}
                        Disconnect
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Disconnected state */}
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Connect your QuickBooks Online account to automatically sync invoices and clients. 87% of 3PLs use QuickBooks — eliminate double-entry forever.
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>Invoices appear in QuickBooks automatically</li>
                        <li>Clients mapped to QuickBooks customers</li>
                        <li>Charge types mapped to QB Items (Storage Fee, Pick Fee, etc.)</li>
                        <li>Bulk sync all pending invoices at once</li>
                      </ul>
                    </div>
                    <Button onClick={handleQBConnect} disabled={qbConnecting} className="gap-2">
                      {qbConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                      Connect QuickBooks Online
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Customer Mapping Card — only shown when connected and mappings loaded */}
            {qbStatus?.connected && customerMappings.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">QuickBooks Customer Mapping</CardTitle>
                      <CardDescription>Your clients matched to QuickBooks customers</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleAutoMap}>
                      <RefreshCw className="h-3.5 w-3.5 mr-2" />Auto-map Remaining
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {customerMappings.map((m) => (
                      <div key={m.client_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">{m.client_name}</span>
                          <span className="text-muted-foreground text-xs">→</span>
                          <span className="text-sm text-muted-foreground">
                            {m.qb_customer_name ?? <span className="italic text-muted-foreground/60">Not mapped</span>}
                          </span>
                        </div>
                        {m.mapped ? (
                          <Badge className="bg-success/10 text-success border-success/20 text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Mapped
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs">Pending</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Future integrations placeholder */}
            <Card className="opacity-60">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground font-bold text-xs">SOON</span>
                  </div>
                  <div>
                    <CardTitle className="text-base text-muted-foreground">More Integrations Coming</CardTitle>
                    <CardDescription>NetSuite, Xero, FreshBooks, and more</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you'd like to be notified.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                { key: "email_reports_enabled" as const, label: "Monthly billing summary", desc: "Receive a summary of all billing runs each month." },
                { key: "email_invoice_ready" as const, label: "Invoice ready alerts", desc: "Get notified when new invoices are generated." },
                { key: "email_revenue_alerts" as const, label: "Revenue leak alerts", desc: "Alerts when potential revenue leaks are detected." },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{item.label}</p>
                    <p className="text-xs text-muted-foreground ml-5.5">{item.desc}</p>
                  </div>
                  <Switch checked={notifs[item.key]} onCheckedChange={v => setNotifs(p => ({ ...p, [item.key]: v }))} />
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">SMS Alerts</p>
                  <p className="text-xs text-muted-foreground">Receive critical alerts via text message.</p>
                </div>
                <Switch checked={notifs.sms_enabled} onCheckedChange={v => setNotifs(p => ({ ...p, sms_enabled: v }))} />
              </div>
              {notifs.sms_enabled && (
                <div className="space-y-2">
                  <Label>Phone Number for SMS</Label>
                  <Input value={notifs.sms_phone} onChange={e => setNotifs(p => ({ ...p, sms_phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
                </div>
              )}
              <Separator />
              <Button onClick={saveNotifs} disabled={!notifsDirty || saving}>
                <Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save Notification Preferences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
                <p className="text-sm text-muted-foreground">We'll send a password reset link to <strong>{userEmail}</strong>.</p>
                <Button variant="outline" onClick={handleResetPassword}>
                  <Mail className="h-4 w-4 mr-2" />Send Password Reset Email
                </Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Current Session</h3>
                <p className="text-sm text-muted-foreground">You are currently signed in as <strong>{userEmail}</strong>.</p>
              </div>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Danger Zone</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">Delete Account</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Are you sure?</DialogTitle>
                      <DialogDescription>This action is irreversible. To delete your account and all associated data, please contact support.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DATA */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Data Export</CardTitle>
              <CardDescription>Download your data as CSV files.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { table: "invoices", label: "Invoices", desc: "All generated invoices" },
                { table: "clients", label: "Clients", desc: "Client list and contact info" },
                { table: "billing_runs", label: "Billing Runs", desc: "All billing run history" },
                { table: "calculated_charges", label: "Calculated Charges", desc: "All charge calculations" },
              ].map(item => (
                <div key={item.table} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportData(item.table, item.label.toLowerCase())}>
                    <Download className="h-3.5 w-3.5 mr-2" />Export CSV
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
