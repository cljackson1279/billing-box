import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Play, CheckCircle2, Clock, AlertCircle, CalendarIcon, Loader2, DollarSign, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const statusConfig = {
  completed: { icon: CheckCircle2, className: "text-success", bg: "bg-success/10" },
  processing: { icon: Loader2, className: "text-primary", bg: "bg-primary/10" },
  pending: { icon: Clock, className: "text-revenue", bg: "bg-revenue/10" },
  error: { icon: AlertCircle, className: "text-destructive", bg: "bg-destructive/10" },
};

export default function BillingRuns() {
  const [periodStart, setPeriodStart] = useState<Date>(subDays(new Date(), 30));
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date());
  const [running, setRunning] = useState(false);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: runs } = useQuery({
    queryKey: ["billing-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_runs")
        .select("*")
        .order("run_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: charges } = useQuery({
    queryKey: ["calculated-charges", lastResult?.runId],
    enabled: !!lastResult?.runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculated_charges")
        .select("*, clients(name)")
        .eq("billing_run_id", lastResult.runId);
      if (error) throw error;
      return data;
    },
  });

  const handleRunBilling = async () => {
    setRunning(true);
    setLastResult(null);
    try {
      const res = await supabase.functions.invoke("run-billing", {
        body: {
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      setLastResult(res.data);
      queryClient.invalidateQueries({ queryKey: ["billing-runs"] });
      toast({ title: "Billing run complete", description: `$${res.data.totalExpected.toLocaleString()} in recoverable revenue identified across ${res.data.chargeCount} charges.` });
    } catch (err) {
      toast({ title: "Billing run failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  // Group charges by client
  const chargesByClient: Record<string, { name: string; charges: any[]; total: number }> = {};
  for (const c of charges || []) {
    const clientName = (c.clients as any)?.name || "Unknown";
    if (!chargesByClient[c.client_id]) {
      chargesByClient[c.client_id] = { name: clientName, charges: [], total: 0 };
    }
    chargesByClient[c.client_id].charges.push(c);
    chargesByClient[c.client_id].total += c.expected_charge || 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">Calculate charges and identify missing revenue</p>
        </div>
      </div>

      {/* Run Controls */}
      <Card className="shadow-card">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Period Start</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-44 justify-start text-left font-normal", !periodStart && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(periodStart, "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={periodStart} onSelect={(d) => d && setPeriodStart(d)} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Period End</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-44 justify-start text-left font-normal", !periodEnd && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(periodEnd, "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={periodEnd} onSelect={(d) => d && setPeriodEnd(d)} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Button variant="hero" onClick={handleRunBilling} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? "Running..." : "Run Billing"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {lastResult && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="hero"
              size="sm"
              disabled={generatingInvoices}
              onClick={async () => {
                setGeneratingInvoices(true);
                try {
                  const res = await supabase.functions.invoke("generate-invoices", {
                    body: { action: "generate", billing_run_id: lastResult.runId },
                  });
                  if (res.error) throw new Error(res.error.message);
                  if (res.data?.error) throw new Error(res.data.error);
                  toast({ title: "Invoices generated", description: `${res.data.count} invoice(s) created.` });
                  navigate("/invoices");
                } catch (err) {
                  toast({ title: "Generation failed", description: (err as Error).message, variant: "destructive" });
                } finally {
                  setGeneratingInvoices(false);
                }
              }}
            >
              {generatingInvoices ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Generate All Invoices
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-card-foreground">${lastResult.totalExpected?.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total Expected Revenue</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-revenue/10 flex items-center justify-center">
                    <AlertCircle className="h-4.5 w-4.5 text-revenue" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-card-foreground">${lastResult.totalMissing?.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Missing / Recoverable</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4.5 w-4.5 text-success" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-card-foreground">{lastResult.chargeCount}</div>
                    <div className="text-xs text-muted-foreground">Charges Calculated</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charges grouped by client */}
          {Object.entries(chargesByClient).map(([clientId, group]) => (
            <Card key={clientId} className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>{group.name}</span>
                  <span className="text-primary font-bold">${group.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Charge Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead className="text-right">Missing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.charges.map((ch: any) => (
                      <TableRow key={ch.id}>
                        <TableCell className="capitalize font-medium">{ch.charge_type}</TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-xs truncate">{ch.description}</TableCell>
                        <TableCell className="text-right">{ch.quantity?.toLocaleString()}</TableCell>
                        <TableCell className="text-right">${ch.unit_rate?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${ch.expected_charge?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${(ch.billed_charge || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-semibold text-revenue">${(ch.expected_charge - (ch.billed_charge || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Past Runs */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Past Billing Runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Run Date</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Recoverable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(runs || []).map((run) => {
                const sc = statusConfig[run.status as keyof typeof statusConfig] || statusConfig.pending;
                const Icon = sc.icon;
                return (
                  <TableRow key={run.id} className="cursor-pointer hover:bg-muted/20">
                    <TableCell className="font-medium">{run.run_date ? format(new Date(run.run_date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(run.period_start), "MMM d")} – {format(new Date(run.period_end), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sc.className} ${sc.bg}`}>
                        <Icon className="h-3 w-3" /> {run.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">${(run.total_expected_revenue || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">${(run.total_missing_revenue || 0).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
              {(!runs || runs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No billing runs yet. Select a period and click "Run Billing" to start.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
