import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Download, Send, Eye, Loader2, CheckCircle2, RefreshCw, CloudUpload, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  final: "bg-primary/10 text-primary",
  sent: "bg-revenue/10 text-revenue",
  paid: "bg-success/10 text-success",
};

const qbSyncStyles: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground border-muted", icon: <AlertCircle className="h-3 w-3" /> },
  syncing: { label: "Syncing…", className: "bg-primary/10 text-primary border-primary/20", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  synced: { label: "Synced ✓", className: "bg-success/10 text-success border-success/20", icon: <CheckCircle2 className="h-3 w-3" /> },
  error: { label: "Error", className: "bg-destructive/10 text-destructive border-destructive/20", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function Invoices() {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [generatingFrom, setGeneratingFrom] = useState<string | null>(null);
  const [syncingInvoice, setSyncingInvoice] = useState<string | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, clients(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: lineItems } = useQuery({
    queryKey: ["invoice-line-items", selectedInvoice?.id],
    enabled: !!selectedInvoice?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_line_items")
        .select("*")
        .eq("invoice_id", selectedInvoice.id);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: availableRuns } = useQuery({
    queryKey: ["billing-runs-for-invoices"],
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

  // Check if QB is connected
  const { data: qbConnected } = useQuery({
    queryKey: ["qb-connected"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("quickbooks-connect", { body: { action: "status" } });
      return res.data?.connected ?? false;
    },
    staleTime: 60000,
  });

  const pendingCount = (invoices || []).filter(
    (inv: any) => inv.qb_sync_status === "pending" || inv.qb_sync_status === "error" || !inv.qb_sync_status
  ).length;

  const handleGenerateInvoices = async (runId: string) => {
    setGeneratingFrom(runId);
    try {
      const res = await supabase.functions.invoke("generate-invoices", {
        body: { action: "generate", billing_run_id: runId },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Invoices generated", description: `${res.data.count} invoice(s) created.` });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } catch (err) {
      toast({ title: "Generation failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setGeneratingFrom(null);
    }
  };

  const handleStatusUpdate = async (invoiceId: string, status: string) => {
    try {
      const res = await supabase.functions.invoke("generate-invoices", {
        body: { action: "update_status", invoice_id: invoiceId, status },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice((prev: any) => prev ? { ...prev, status } : null);
      }
      toast({ title: "Status updated" });
    } catch (err) {
      toast({ title: "Update failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleSyncToQB = async (invoiceId: string) => {
    setSyncingInvoice(invoiceId);
    try {
      const res = await supabase.functions.invoke("quickbooks-sync", {
        body: { action: "sync_invoice", invoice_id: invoiceId },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Synced to QuickBooks", description: `QB Invoice #${res.data.qb_invoice_id} created.` });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice((prev: any) => prev ? { ...prev, qb_sync_status: "synced", qb_invoice_id: res.data.qb_invoice_id } : null);
      }
    } catch (err) {
      toast({ title: "QB Sync failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSyncingInvoice(null);
    }
  };

  const handleBulkSync = async () => {
    setBulkSyncing(true);
    try {
      const res = await supabase.functions.invoke("quickbooks-sync", {
        body: { action: "sync_all_pending" },
      });
      if (res.error) throw new Error(res.error.message);
      const { synced, failed } = res.data;
      toast({
        title: "Bulk sync complete",
        description: `${synced} invoice(s) synced to QuickBooks${failed > 0 ? `, ${failed} failed` : ""}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } catch (err) {
      toast({ title: "Bulk sync failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBulkSyncing(false);
    }
  };

  const handleViewDetail = (inv: any) => {
    setSelectedInvoice(inv);
    setDetailOpen(true);
  };

  const downloadCSV = (inv: any) => {
    supabase.from("invoice_line_items").select("*").eq("invoice_id", inv.id).then(({ data }) => {
      if (data) generateCSV(inv, data);
    });
  };

  const generateCSV = (inv: any, items: any[]) => {
    const header = "Charge Type,Description,Quantity,Unit Rate,Line Total\n";
    const rows = items.map(li =>
      `"${li.charge_type}","${li.description}",${li.quantity},${li.unit_rate?.toFixed(2)},${li.line_total?.toFixed(2)}`
    ).join("\n");
    const footer = `\n\nSubtotal,,,,${inv.subtotal?.toFixed(2)}\nTax,,,,${(inv.tax_amount || 0).toFixed(2)}\nTotal,,,,${inv.total_amount?.toFixed(2)}`;
    const csv = header + rows + footer;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoice_number}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-1">Generated invoices from billing runs</p>
          </div>
          {/* Bulk QB Sync button */}
          {qbConnected && pendingCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkSync}
              disabled={bulkSyncing}
              className="gap-2 border-[#2CA01C]/40 text-[#2CA01C] hover:bg-[#2CA01C]/5"
            >
              {bulkSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
              Sync All Pending to QuickBooks ({pendingCount})
            </Button>
          )}
        </div>

        {/* Generate from billing run */}
        {availableRuns && availableRuns.length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Generate Invoices from Billing Run</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {availableRuns.slice(0, 5).map((run) => (
                  <Button
                    key={run.id}
                    variant="outline"
                    size="sm"
                    disabled={generatingFrom === run.id}
                    onClick={() => handleGenerateInvoices(run.id)}
                  >
                    {generatingFrom === run.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                    {format(new Date(run.period_start), "MMM d")} – {format(new Date(run.period_end), "MMM d, yyyy")}
                    {" "}(${(run.total_expected_revenue || 0).toLocaleString()})
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice List */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  {qbConnected && <TableHead>QB Sync</TableHead>}
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoices || []).map((inv: any) => {
                  const qbStatus = inv.qb_sync_status || "pending";
                  const qbStyle = qbSyncStyles[qbStatus] ?? qbSyncStyles.pending;
                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{(inv.clients as any)?.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {inv.period_start && inv.period_end
                          ? `${format(new Date(inv.period_start), "MMM d")} – ${format(new Date(inv.period_end), "MMM d, yyyy")}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[inv.status || "draft"]}`}>
                          {inv.status}
                        </span>
                      </TableCell>
                      {qbConnected && (
                        <TableCell>
                          <Badge variant="outline" className={`text-xs gap-1 ${qbStyle.className}`}>
                            {qbStyle.icon}
                            {qbStatus === "synced" && inv.qb_invoice_number
                              ? `QB #${inv.qb_invoice_number}`
                              : qbStyle.label}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right font-medium">${(inv.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDetail(inv)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadCSV(inv)}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download CSV</TooltipContent>
                          </Tooltip>
                          {inv.status === "draft" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStatusUpdate(inv.id, "sent")}>
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mark as Sent</TooltipContent>
                            </Tooltip>
                          )}
                          {inv.status === "sent" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStatusUpdate(inv.id, "paid")}>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mark as Paid</TooltipContent>
                            </Tooltip>
                          )}
                          {/* QB Sync button */}
                          {qbConnected && qbStatus !== "synced" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-[#2CA01C] hover:text-[#2CA01C] hover:bg-[#2CA01C]/10"
                                  onClick={() => handleSyncToQB(inv.id)}
                                  disabled={syncingInvoice === inv.id}
                                >
                                  {syncingInvoice === inv.id
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <RefreshCw className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Sync to QuickBooks</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!invoices || invoices.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={qbConnected ? 7 : 6} className="text-center text-muted-foreground py-8">
                      No invoices yet. Generate from a billing run above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invoice Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="font-mono text-lg">{selectedInvoice?.invoice_number}</DialogTitle>
                {/* QB sync button in detail view */}
                {qbConnected && selectedInvoice && selectedInvoice.qb_sync_status !== "synced" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-[#2CA01C]/40 text-[#2CA01C] hover:bg-[#2CA01C]/5"
                    onClick={() => handleSyncToQB(selectedInvoice.id)}
                    disabled={syncingInvoice === selectedInvoice.id}
                  >
                    {syncingInvoice === selectedInvoice.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <RefreshCw className="h-3.5 w-3.5" />}
                    Sync to QuickBooks
                  </Button>
                )}
                {qbConnected && selectedInvoice?.qb_sync_status === "synced" && (
                  <Badge className="bg-success/10 text-success border-success/20 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    QB #{selectedInvoice.qb_invoice_number ?? selectedInvoice.qb_invoice_id}
                  </Badge>
                )}
              </div>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-6 print:space-y-4" id="invoice-print">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">INVOICE</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedInvoice.period_start && selectedInvoice.period_end
                        ? `${format(new Date(selectedInvoice.period_start), "MMM d, yyyy")} – ${format(new Date(selectedInvoice.period_end), "MMM d, yyyy")}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium">{selectedInvoice.invoice_number}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize mt-1 ${statusStyles[selectedInvoice.status || "draft"]}`}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                </div>

                {/* Client */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bill To</p>
                  <p className="font-medium text-foreground">{(selectedInvoice.clients as any)?.name || "—"}</p>
                </div>

                {/* Line Items */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Line Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">Charge Type</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs text-right">Qty</TableHead>
                        <TableHead className="text-xs text-right">Rate</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(lineItems || []).map((li: any) => (
                        <TableRow key={li.id}>
                          <TableCell className="text-xs capitalize">{li.charge_type}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{li.description}</TableCell>
                          <TableCell className="text-xs text-right">{li.quantity}</TableCell>
                          <TableCell className="text-xs text-right">${li.unit_rate?.toFixed(4)}</TableCell>
                          <TableCell className="text-xs text-right font-medium">${li.line_total?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="border-t border-border pt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${selectedInvoice.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${(selectedInvoice.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2">
                    <span>Total</span>
                    <span>${selectedInvoice.total_amount?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => downloadCSV(selectedInvoice)}>
                    <Download className="h-3.5 w-3.5 mr-2" />Download CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    Print
                  </Button>
                  {selectedInvoice.status === "draft" && (
                    <Button size="sm" onClick={() => handleStatusUpdate(selectedInvoice.id, "sent")}>
                      <Send className="h-3.5 w-3.5 mr-2" />Mark as Sent
                    </Button>
                  )}
                  {selectedInvoice.status === "sent" && (
                    <Button size="sm" onClick={() => handleStatusUpdate(selectedInvoice.id, "paid")}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2" />Mark as Paid
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
