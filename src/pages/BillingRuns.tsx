import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, Play, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const runs = [
  { id: 1, date: "Feb 15, 2026", period: "Feb 1–15", status: "completed", totalExpected: "$24,480", recovered: "$2,340", clients: 4 },
  { id: 2, date: "Feb 1, 2026", period: "Jan 16–31", status: "completed", totalExpected: "$22,100", recovered: "$3,120", clients: 4 },
  { id: 3, date: "Jan 15, 2026", period: "Jan 1–15", status: "completed", totalExpected: "$19,800", recovered: "$1,890", clients: 3 },
];

const statusConfig = {
  completed: { icon: CheckCircle2, className: "text-success", bg: "bg-success/10" },
  pending: { icon: Clock, className: "text-revenue", bg: "bg-revenue/10" },
  error: { icon: AlertCircle, className: "text-destructive", bg: "bg-destructive/10" },
};

export default function BillingRuns() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">Calculate charges and identify missing revenue</p>
        </div>
        <Button variant="hero" size="sm">
          <Play className="h-4 w-4" /> New Billing Run
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Run Date</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Period</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Clients</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Expected</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Recovered</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const sc = statusConfig[run.status as keyof typeof statusConfig];
                  return (
                    <tr key={run.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer">
                      <td className="py-3 px-4 font-medium text-card-foreground">{run.date}</td>
                      <td className="py-3 px-4 text-muted-foreground">{run.period}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sc.className} ${sc.bg}`}>
                          <sc.icon className="h-3 w-3" /> {run.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{run.clients}</td>
                      <td className="py-3 px-4 text-right font-medium text-card-foreground">{run.totalExpected}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gradient-brand">{run.recovered}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
