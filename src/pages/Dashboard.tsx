import { useState } from "react";
import { DollarSign, TrendingUp, AlertTriangle, FileText, ArrowUpRight, ArrowDownRight, Zap, Target, Bell, CheckCircle2, RotateCcw, TrendingDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import OnboardingChecklist from "@/components/OnboardingChecklist";

const PIE_COLORS = [
  "hsl(174 72% 36%)",
  "hsl(35 95% 55%)",
  "hsl(220 60% 55%)",
  "hsl(142 70% 40%)",
  "hsl(0 70% 55%)",
];

const alertTypeConfig: Record<string, { label: string; icon: typeof AlertTriangle; className: string; bg: string }> = {
  unbilled_storage:   { label: "Unbilled Storage",  icon: AlertTriangle, className: "text-amber-600",  bg: "bg-amber-50" },
  unbilled_pick:      { label: "Unbilled Pick",      icon: AlertTriangle, className: "text-orange-600", bg: "bg-orange-50" },
  monthly_minimum:    { label: "Monthly Minimum",    icon: TrendingDown,  className: "text-blue-600",   bg: "bg-blue-50" },
  returns_unbilled:   { label: "Returns Unbilled",   icon: RotateCcw,     className: "text-red-600",    bg: "bg-red-50" },
};

export default function Dashboard() {
  const queryClient = useQueryClient();

  // ROI Calculator state
  const [roiMonthlyRevenue, setRoiMonthlyRevenue] = useState("50000");
  const [roiLeakPct, setRoiLeakPct] = useState("12");

  // Fetch billing runs
  const { data: runs } = useQuery({
    queryKey: ["dashboard-billing-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_runs")
        .select("*")
        .eq("status", "completed")
        .order("run_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch charges from latest run for leakage breakdown
  const latestRunId = runs?.[0]?.id;
  const { data: latestCharges } = useQuery({
    queryKey: ["dashboard-charges", latestRunId],
    enabled: !!latestRunId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculated_charges")
        .select("*, clients(name)")
        .eq("billing_run_id", latestRunId!);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch revenue alerts
  const { data: alerts } = useQuery({
    queryKey: ["revenue-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_alerts")
        .select("*, clients(name)")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch client health scores
  const { data: healthScores } = useQuery({
    queryKey: ["client-health-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_health_scores")
        .select("*, clients(name)")
        .order("leak_risk_score", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  // Resolve alert mutation
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("revenue_alerts")
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["revenue-alerts"] }),
  });

  // Compute metrics
  const latestRun = runs?.[0];
  const totalRecoverable = latestRun?.total_missing_revenue || 0;
  const totalBilled = latestRun?.total_expected_revenue || 0;
  const prevRun = runs?.[1];
  const prevRecoverable = prevRun?.total_missing_revenue || 0;
  const recoverableChange = prevRecoverable > 0 ? ((totalRecoverable - prevRecoverable) / prevRecoverable * 100).toFixed(1) : "0";

  // Leakage by client (from latest run charges)
  const leakageByClient: { name: string; value: number; color: string }[] = [];
  const clientTotals: Record<string, { name: string; total: number }> = {};
  for (const c of latestCharges || []) {
    const name = (c.clients as any)?.name || "Unknown";
    if (!clientTotals[c.client_id]) clientTotals[c.client_id] = { name, total: 0 };
    clientTotals[c.client_id].total += (c.expected_charge || 0) - (c.billed_charge || 0);
  }
  Object.values(clientTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .forEach((c, i) => leakageByClient.push({ name: c.name, value: Math.round(c.total), color: PIE_COLORS[i % PIE_COLORS.length] }));

  const totalLeakage = leakageByClient.reduce((s, c) => s + c.value, 0);

  // Monthly chart data from runs
  const monthlyData = (runs || [])
    .slice(0, 6)
    .reverse()
    .map((r) => ({
      month: format(new Date(r.period_end), "MMM"),
      billed: r.total_expected_revenue || 0,
      recovered: r.total_missing_revenue || 0,
    }));

  const metrics = [
    { title: "Recoverable Revenue", value: `$${totalRecoverable.toLocaleString()}`, change: `${Number(recoverableChange) >= 0 ? "+" : ""}${recoverableChange}%`, trend: Number(recoverableChange) >= 0 ? "up" as const : "down" as const, icon: DollarSign, accent: "primary" },
    { title: "Total Expected (Latest)", value: `$${totalBilled.toLocaleString()}`, change: "", trend: "up" as const, icon: TrendingUp, accent: "success" },
    { title: "Billing Leakage", value: `$${totalLeakage.toLocaleString()}`, change: "", trend: "down" as const, icon: AlertTriangle, accent: "revenue" },
    { title: "Active Alerts", value: `${(alerts || []).length}`, change: "", trend: "down" as const, icon: Bell, accent: "revenue" },
  ];

  // ROI Calculator
  const monthlyRev = parseFloat(roiMonthlyRevenue.replace(/,/g, "")) || 0;
  const leakPct = parseFloat(roiLeakPct) || 0;
  const monthlyLeak = monthlyRev * (leakPct / 100);
  const annualLeak = monthlyLeak * 12;
  const annualROI = annualLeak - (499 * 12); // $499/mo DispatchBoxAI cost
  const roiMultiple = annualROI > 0 ? (annualROI / (499 * 12)).toFixed(1) : "0";
  const paybackDays = monthlyLeak > 499 ? Math.ceil(499 / (monthlyLeak / 30)) : null;

  return (
    <div className="space-y-8">
      <OnboardingChecklist />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Revenue recovery overview</p>
        </div>
        <div className="flex gap-3">
          <Link to="/uploads"><Button variant="outline" size="sm">Upload Data</Button></Link>
          <Link to="/billing"><Button variant="hero" size="sm">Run Billing</Button></Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.title} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${m.accent === "primary" ? "bg-primary/10" : m.accent === "success" ? "bg-success/10" : "bg-revenue/10"}`}>
                  <m.icon className={`h-4.5 w-4.5 ${m.accent === "primary" ? "text-primary" : m.accent === "success" ? "text-success" : "text-revenue"}`} />
                </div>
                {m.change && (
                  <span className={`inline-flex items-center text-xs font-medium ${m.trend === "up" ? "text-success" : "text-revenue"}`}>
                    {m.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {m.change}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-card-foreground">{m.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.title}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Leak Alerts */}
      {(alerts || []).length > 0 && (
        <Card className="shadow-card border-l-4 border-l-revenue">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-revenue" />
                Revenue Leak Alerts
                <Badge variant="destructive" className="text-xs">{(alerts || []).length}</Badge>
              </CardTitle>
              <Link to="/billing">
                <Button variant="ghost" size="sm" className="text-xs">Run Billing to Refresh</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(alerts || []).map((alert: any) => {
              const cfg = alertTypeConfig[alert.alert_type] || alertTypeConfig.unbilled_storage;
              const Icon = cfg.icon;
              return (
                <div key={alert.id} className={`flex items-start justify-between gap-3 rounded-lg p-3 ${cfg.bg}`}>
                  <div className="flex items-start gap-3 min-w-0">
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.className}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${cfg.className}`}>{cfg.label}</span>
                        {(alert.clients as any)?.name && (
                          <span className="text-xs text-muted-foreground">— {(alert.clients as any).name}</span>
                        )}
                        {alert.leak_amount > 0 && (
                          <span className="text-xs font-bold text-revenue">${Number(alert.leak_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 h-7 text-xs"
                    onClick={() => resolveAlert.mutate(alert.id)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Expected vs Recoverable Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, ""]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(220 15% 90%)", fontSize: 13 }} />
                    <Bar dataKey="billed" name="Expected" fill="hsl(174 72% 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recovered" name="Recoverable" fill="hsl(35 95% 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No billing data yet. <Link to="/billing" className="text-primary ml-1 underline">Run your first billing</Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Leakage by Client</CardTitle>
          </CardHeader>
          <CardContent>
            {leakageByClient.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leakageByClient} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                        {leakageByClient.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {leakageByClient.map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-muted-foreground">{c.name}</span>
                      </div>
                      <span className="font-medium text-card-foreground">${c.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No leakage data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROI Calculator + Client Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROI Calculator */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              ROI Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Monthly Warehouse Revenue ($)</Label>
                <Input
                  type="number"
                  value={roiMonthlyRevenue}
                  onChange={e => setRoiMonthlyRevenue(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="50000"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estimated Billing Leak (%)</Label>
                <Input
                  type="number"
                  value={roiLeakPct}
                  onChange={e => setRoiLeakPct(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="12"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly revenue leaking</span>
                <span className="font-semibold text-revenue">${monthlyLeak.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Annual revenue at risk</span>
                <span className="font-semibold text-revenue">${annualLeak.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">DispatchBoxAI annual cost</span>
                <span className="font-medium text-muted-foreground">$5,988</span>
              </div>
              <div className="border-t border-primary/20 pt-2 flex justify-between">
                <span className="text-sm font-semibold text-foreground">Net Annual ROI</span>
                <span className={`text-lg font-bold ${annualROI >= 0 ? "text-success" : "text-revenue"}`}>
                  ${annualROI.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ROI multiple</span>
                <span className="font-bold text-primary">{roiMultiple}x</span>
              </div>
              {paybackDays && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payback period</span>
                  <span className="font-semibold text-success">{paybackDays} days</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Client Health Scores */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Client Risk Scores
              </CardTitle>
              <Link to="/clients">
                <Button variant="ghost" size="sm" className="text-xs">View All <ChevronRight className="h-3 w-3 ml-1" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(healthScores || []).length > 0 ? (
              <div className="space-y-3">
                {(healthScores || []).map((hs: any) => {
                  const risk = Number(hs.leak_risk_score || 0);
                  const riskColor = risk >= 70 ? "text-red-600 bg-red-100" : risk >= 40 ? "text-amber-600 bg-amber-100" : "text-green-600 bg-green-100";
                  const barColor = risk >= 70 ? "bg-red-500" : risk >= 40 ? "bg-amber-500" : "bg-green-500";
                  return (
                    <div key={hs.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-card-foreground truncate">{(hs.clients as any)?.name || "Unknown"}</span>
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${riskColor}`}>
                          {risk >= 70 ? "High Risk" : risk >= 40 ? "Medium" : "Healthy"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, risk)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{risk.toFixed(0)}%</span>
                      </div>
                      {hs.total_recovered > 0 && (
                        <div className="text-xs text-muted-foreground">
                          ${Number(hs.total_recovered).toLocaleString()} recovered this period
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <Target className="h-8 w-8 text-muted-foreground/30" />
                <span>Run billing to generate client risk scores</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Billing Runs */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Billing Runs</CardTitle>
            <Link to="/billing"><Button variant="ghost" size="sm" className="text-xs">View All</Button></Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Expected</th>
                  <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Recoverable</th>
                </tr>
              </thead>
              <tbody>
                {(runs || []).slice(0, 5).map((run) => (
                  <tr key={run.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 text-card-foreground">{run.run_date ? format(new Date(run.run_date), "MMM d, yyyy") : "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">{run.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-card-foreground">${(run.total_expected_revenue || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-primary">${(run.total_missing_revenue || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {(!runs || runs.length === 0) && (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No billing runs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
