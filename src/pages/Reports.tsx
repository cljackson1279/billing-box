import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, FileText, TrendingUp, DollarSign, Users, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const CHART_COLORS = [
  "hsl(174 72% 36%)",
  "hsl(35 95% 55%)",
  "hsl(220 60% 55%)",
  "hsl(142 70% 40%)",
  "hsl(0 70% 55%)",
  "hsl(280 60% 55%)",
];

export default function Reports() {
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [exportingPdf, setExportingPdf] = useState(false);
  const { toast } = useToast();

  // Fetch all clients
  const { data: clients = [] } = useQuery({
    queryKey: ["report-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all completed billing runs (last 12 months)
  const { data: runs = [] } = useQuery({
    queryKey: ["report-billing-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_runs")
        .select("*")
        .eq("status", "completed")
        .order("period_end", { ascending: true })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all calculated charges
  const { data: allCharges = [] } = useQuery({
    queryKey: ["report-charges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculated_charges")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["report-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Filter charges by selected client
  const filteredCharges = selectedClientId === "all"
    ? allCharges
    : allCharges.filter((c: any) => c.client_id === selectedClientId);

  // Monthly recovery trend (from billing runs)
  const monthlyRecovery = runs.map((r: any) => ({
    month: format(new Date(r.period_end), "MMM yy"),
    recovered: r.total_missing_revenue || 0,
    expected: r.total_expected_revenue || 0,
  }));

  // Revenue by charge type (filtered)
  const chargeTypeBreakdown: Record<string, number> = {};
  for (const c of filteredCharges) {
    const type = (c.charge_type || "other").toLowerCase();
    chargeTypeBreakdown[type] = (chargeTypeBreakdown[type] || 0) + (c.expected_charge || 0);
  }
  const chargeTypePieData = Object.entries(chargeTypeBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value: Math.round(value), color: CHART_COLORS[i % CHART_COLORS.length] }));

  // Revenue by client (stacked bar)
  const clientChargeMap: Record<string, Record<string, number>> = {};
  for (const c of allCharges) {
    const clientName = (c.clients as any)?.name || "Unknown";
    if (!clientChargeMap[clientName]) clientChargeMap[clientName] = {};
    const type = (c.charge_type || "other").toLowerCase();
    clientChargeMap[clientName][type] = (clientChargeMap[clientName][type] || 0) + (c.expected_charge || 0);
  }
  const clientBarData = Object.entries(clientChargeMap)
    .sort((a, b) => Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0))
    .slice(0, 8)
    .map(([client, types]) => ({ client, ...types }));

  // Executive summary stats
  const totalExpected = runs.reduce((s: number, r: any) => s + (r.total_expected_revenue || 0), 0);
  const totalRecovered = runs.reduce((s: number, r: any) => s + (r.total_missing_revenue || 0), 0);
  const totalInvoiced = invoices.reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);
  const returnCharges = allCharges.filter((c: any) => c.charge_type === "returns");
  const totalReturns = returnCharges.reduce((s: number, c: any) => s + (c.expected_charge || 0), 0);

  // Per-client summary table
  const clientSummary: Record<string, { name: string; expected: number; invoiced: number; runs: number }> = {};
  for (const c of allCharges) {
    const id = c.client_id;
    const name = (c.clients as any)?.name || "Unknown";
    if (!clientSummary[id]) clientSummary[id] = { name, expected: 0, invoiced: 0, runs: 0 };
    clientSummary[id].expected += c.expected_charge || 0;
  }
  for (const inv of invoices) {
    const id = (inv as any).client_id;
    if (clientSummary[id]) clientSummary[id].invoiced += (inv as any).total_amount || 0;
  }
  const clientSummaryRows = Object.values(clientSummary).sort((a, b) => b.expected - a.expected);

  // PDF Export
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      // Build a simple HTML report and trigger print
      const reportHtml = `
        <html>
        <head>
          <title>DispatchBoxAI Revenue Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a2e; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; color: #1a7a6e; }
            .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
            .stat { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
            .stat-value { font-size: 22px; font-weight: bold; }
            .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: #f3f4f6; padding: 8px 12px; text-align: left; font-weight: 600; }
            td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
            .footer { margin-top: 32px; font-size: 11px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <h1>DispatchBoxAI — Revenue Recovery Report</h1>
          <div class="subtitle">Generated ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</div>
          <div class="stats">
            <div class="stat"><div class="stat-value">$${totalExpected.toLocaleString()}</div><div class="stat-label">Total Expected Revenue</div></div>
            <div class="stat"><div class="stat-value">$${totalRecovered.toLocaleString()}</div><div class="stat-label">Recoverable Revenue</div></div>
            <div class="stat"><div class="stat-value">$${totalInvoiced.toLocaleString()}</div><div class="stat-label">Total Invoiced</div></div>
            <div class="stat"><div class="stat-value">$${totalReturns.toLocaleString()}</div><div class="stat-label">Returns Revenue</div></div>
          </div>
          <h2>Client Revenue Summary</h2>
          <table>
            <thead><tr><th>Client</th><th>Expected Revenue</th><th>Invoiced</th><th>Variance</th></tr></thead>
            <tbody>
              ${clientSummaryRows.map(r => `
                <tr>
                  <td>${r.name}</td>
                  <td>$${r.expected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>$${r.invoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style="color:${r.expected - r.invoiced > 0 ? '#dc2626' : '#16a34a'}">
                    $${(r.expected - r.invoiced).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="footer">Confidential — DispatchBoxAI Revenue Recovery Platform</div>
        </body>
        </html>
      `;
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(reportHtml);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); }, 500);
      }
      toast({ title: "Report ready", description: "Use your browser's Print → Save as PDF to export." });
    } catch (err) {
      toast({ title: "Export failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Executive dashboard, recovery trends, and client breakdown</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Expected", value: `$${totalExpected.toLocaleString()}`, icon: DollarSign, color: "text-primary bg-primary/10" },
          { label: "Recoverable", value: `$${totalRecovered.toLocaleString()}`, icon: TrendingUp, color: "text-success bg-success/10" },
          { label: "Total Invoiced", value: `$${totalInvoiced.toLocaleString()}`, icon: FileText, color: "text-blue-600 bg-blue-100" },
          { label: "Returns Revenue", value: `$${totalReturns.toLocaleString()}`, icon: RotateCcw, color: "text-red-600 bg-red-100" },
        ].map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-xl font-bold text-card-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Recovery Trend */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Recovery Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {monthlyRecovery.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRecovery}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, ""]} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                    <Area type="monotone" dataKey="expected" name="Expected" stroke="hsl(220 60% 55%)" fill="hsl(220 60% 55% / 0.1)" strokeWidth={1.5} strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="recovered" name="Recoverable" stroke="hsl(174 72% 36%)" fill="hsl(174 72% 36% / 0.15)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No billing run data yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charge Type Breakdown */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {chargeTypePieData.length > 0 ? (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chargeTypePieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                        {chargeTypePieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-2">
                  {chargeTypePieData.slice(0, 5).map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-muted-foreground capitalize">{c.name.replace("_", " ")}</span>
                      </div>
                      <span className="font-medium">${c.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No charge data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Client */}
      {clientBarData.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue by Client &amp; Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
                  <XAxis dataKey="client" tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, ""]} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                  <Bar dataKey="storage" name="Storage" stackId="a" fill={CHART_COLORS[0]} />
                  <Bar dataKey="receiving" name="Receiving" stackId="a" fill={CHART_COLORS[2]} />
                  <Bar dataKey="pick" name="Pick" stackId="a" fill={CHART_COLORS[1]} />
                  <Bar dataKey="pack" name="Pack" stackId="a" fill={CHART_COLORS[3]} />
                  <Bar dataKey="returns" name="Returns" stackId="a" fill={CHART_COLORS[4]} />
                  <Bar dataKey="monthly_minimum" name="Min. Fee" stackId="a" fill={CHART_COLORS[5]} radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Summary Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Multi-Client Executive Summary
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Expected Revenue</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Recovery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientSummaryRows.length > 0 ? clientSummaryRows.map((r) => {
                const variance = r.expected - r.invoiced;
                const recoveryPct = r.expected > 0 ? Math.min(100, (r.invoiced / r.expected) * 100) : 0;
                return (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">${r.expected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">${r.invoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={`text-right font-semibold ${variance > 0 ? "text-revenue" : "text-success"}`}>
                      {variance > 0 ? "-" : "+"}${Math.abs(variance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-20">
                          <div
                            className={`h-full rounded-full ${recoveryPct >= 90 ? "bg-success" : recoveryPct >= 60 ? "bg-amber-500" : "bg-revenue"}`}
                            style={{ width: `${recoveryPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{recoveryPct.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data yet — run billing to populate this report</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
