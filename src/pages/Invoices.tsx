import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Send, Eye, Loader2, CheckCircle2 } from "lucide-react";
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

export default function Invoices() {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [generatingFrom, setGeneratingFrom] = useState<string | null>(null);
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

  // Get billing runs without invoices for generation
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

  const handleViewDetail = (inv: any) => {
    setSelectedInvoice(inv);
    setDetailOpen(true);
  };

  const downloadCSV = (inv: any) => {
    if (!lineItems || lineItems.length === 0) {
      // Fetch and download
      supabase.from("invoice_line_items").select("*").eq("invoice_id", inv.id).then(({ data }) => {
        if (data) generateCSV(inv, data);
      });
    } else if (selectedInvoice?.id === inv.id) {
      generateCSV(inv, lineItems);
    } else {
      supabase.from("invoice_line_items").select("*").eq("invoice_id", inv.id).then(({ data }) => {
        if (data) generateCSV(inv, data);
      });
    }
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

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Generated invoices from billing runs</p>
        </div>
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
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoices || []).map((inv) => (
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
                  <TableCell className="text-right font-medium">${(inv.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDetail(inv)} title="View">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadCSV(inv)} title="Download CSV">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      {inv.status === "draft" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStatusUpdate(inv.id, "sent")} title="Mark as Sent">
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {inv.status === "sent" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStatusUpdate(inv.id, "paid")} title="Mark as Paid">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!invoices || invoices.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
            <DialogTitle className="font-mono text-lg">{selectedInvoice?.invoice_number}</DialogTitle>
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

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">Bill To:</p>
                <p className="text-sm text-muted-foreground">{(selectedInvoice.clients as any)?.name || "—"}</p>
              </div>

              {/* Line Items */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(lineItems || []).map((li) => (
                    <TableRow key={li.id}>
                      <TableCell>
                        <span className="capitalize font-medium">{li.charge_type}</span>
                        {li.description && <p className="text-xs text-muted-foreground">{li.description}</p>}
                      </TableCell>
                      <TableCell className="text-right">{li.quantity?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${li.unit_rate?.toFixed(4)}</TableCell>
                      <TableCell className="text-right font-medium">${li.line_total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${selectedInvoice.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${(selectedInvoice.tax_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                  <span>Total</span>
                  <span className="text-primary">${selectedInvoice.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end print:hidden">
                <Button variant="outline" size="sm" onClick={() => downloadCSV(selectedInvoice)}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={printInvoice}>
                  <FileText className="h-4 w-4 mr-1" /> Print / PDF
                </Button>
                {selectedInvoice.status === "draft" && (
                  <Select onValueChange={(val) => handleStatusUpdate(selectedInvoice.id, val)}>
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="final">Mark as Final</SelectItem>
                      <SelectItem value="sent">Mark as Sent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {selectedInvoice.status === "sent" && (
                  <Button variant="hero" size="sm" onClick={() => handleStatusUpdate(selectedInvoice.id, "paid")}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Paid
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
