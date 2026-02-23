import { DollarSign, TrendingUp, AlertTriangle, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import OnboardingChecklist from "@/components/OnboardingChecklist";

const PIE_COLORS = [
  "hsl(174 72% 36%)",
  "hsl(35 95% 55%)",
  "hsl(220 60% 55%)",
  "hsl(142 70% 40%)",
  "hsl(0 70% 55%)",
];

export default function Dashboard() {
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
    { title: "Billing Runs", value: `${(runs || []).length}`, change: "", trend: "up" as const, icon: FileText, accent: "primary" },
  ];

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
