import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Send, Eye } from "lucide-react";

const demoInvoices = [
  { id: "DBXAI-ACME-202602-001", client: "FastShip Co", period: "Feb 1–15, 2026", amount: "$6,240.00", status: "draft" },
  { id: "DBXAI-ACME-202602-002", client: "GreenGoods Inc", period: "Feb 1–15, 2026", amount: "$4,880.50", status: "final" },
  { id: "DBXAI-ACME-202601-003", client: "MegaStore LLC", period: "Jan 16–31, 2026", amount: "$7,120.00", status: "sent" },
  { id: "DBXAI-ACME-202601-004", client: "QuickParts Direct", period: "Jan 16–31, 2026", amount: "$3,450.25", status: "paid" },
  { id: "DBXAI-ACME-202601-005", client: "FastShip Co", period: "Jan 1–15, 2026", amount: "$5,980.00", status: "paid" },
];

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  final: "bg-primary/10 text-primary",
  sent: "bg-revenue/10 text-revenue",
  paid: "bg-success/10 text-success",
};

export default function Invoices() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Generated invoices from billing runs</p>
        </div>
        <Button variant="hero" size="sm">
          <FileText className="h-4 w-4" /> Generate Invoices
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Invoice #</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Period</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {demoInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-medium text-card-foreground">{inv.id}</td>
                    <td className="py-3 px-4 text-card-foreground">{inv.client}</td>
                    <td className="py-3 px-4 text-muted-foreground">{inv.period}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-card-foreground">{inv.amount}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Send className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
