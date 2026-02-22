import { DollarSign, TrendingUp, AlertTriangle, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const metrics = [
  {
    title: "Recoverable Revenue",
    value: "$12,480",
    change: "+18.2%",
    trend: "up" as const,
    icon: DollarSign,
    accent: "primary",
  },
  {
    title: "Total Billed (MTD)",
    value: "$48,320",
    change: "+5.4%",
    trend: "up" as const,
    icon: TrendingUp,
    accent: "success",
  },
  {
    title: "Billing Leakage",
    value: "$3,240",
    change: "-12.1%",
    trend: "down" as const,
    icon: AlertTriangle,
    accent: "revenue",
  },
  {
    title: "Invoices Generated",
    value: "24",
    change: "+8",
    trend: "up" as const,
    icon: FileText,
    accent: "primary",
  },
];

const monthlyData = [
  { month: "Sep", billed: 38000, recovered: 4200 },
  { month: "Oct", billed: 42000, recovered: 6800 },
  { month: "Nov", billed: 39500, recovered: 5100 },
  { month: "Dec", billed: 45000, recovered: 8200 },
  { month: "Jan", billed: 44200, recovered: 9400 },
  { month: "Feb", billed: 48320, recovered: 12480 },
];

const leakageByClient = [
  { name: "FastShip Co", value: 1420, color: "hsl(174 72% 36%)" },
  { name: "GreenGoods", value: 980, color: "hsl(35 95% 55%)" },
  { name: "MegaStore", value: 540, color: "hsl(220 60% 55%)" },
  { name: "QuickParts", value: 300, color: "hsl(142 70% 40%)" },
];

const recentRuns = [
  { id: 1, date: "Feb 15, 2026", status: "completed", clients: 4, recovered: "$2,340" },
  { id: 2, date: "Feb 1, 2026", status: "completed", clients: 4, recovered: "$3,120" },
  { id: 3, date: "Jan 15, 2026", status: "completed", clients: 3, recovered: "$1,890" },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Revenue recovery overview for February 2026</p>
        </div>
        <div className="flex gap-3">
          <Link to="/uploads">
            <Button variant="outline" size="sm">Upload Data</Button>
          </Link>
          <Link to="/billing">
            <Button variant="hero" size="sm">Run Billing</Button>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.title} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                  m.accent === "primary" ? "bg-primary/10" :
                  m.accent === "success" ? "bg-success/10" : "bg-revenue/10"
                }`}>
                  <m.icon className={`h-4.5 w-4.5 ${
                    m.accent === "primary" ? "text-primary" :
                    m.accent === "success" ? "text-success" : "text-revenue"
                  }`} />
                </div>
                <span className={`inline-flex items-center text-xs font-medium ${
                  m.trend === "up" ? "text-success" : "text-revenue"
                }`}>
                  {m.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {m.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-card-foreground">{m.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.title}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Billed vs Recovered Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(220 15% 90%)", fontSize: 13 }}
                  />
                  <Bar dataKey="billed" name="Billed" fill="hsl(174 72% 36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recovered" name="Recovered" fill="hsl(35 95% 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leakage by Client */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Leakage by Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leakageByClient}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    stroke="none"
                  >
                    {leakageByClient.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
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
          </CardContent>
        </Card>
      </div>

      {/* Recent Billing Runs */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Billing Runs</CardTitle>
            <Link to="/billing">
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Clients</th>
                  <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Recovered</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 text-card-foreground">{run.date}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        {run.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{run.clients}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-card-foreground">{run.recovered}</td>
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
