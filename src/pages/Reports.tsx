import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";

const monthlyRecovery = [
  { month: "Sep", recovered: 4200 },
  { month: "Oct", recovered: 6800 },
  { month: "Nov", recovered: 5100 },
  { month: "Dec", recovered: 8200 },
  { month: "Jan", recovered: 9400 },
  { month: "Feb", recovered: 12480 },
];

const clientBreakdown = [
  { client: "FastShip", storage: 4200, handling: 3100, receiving: 2800, accessorial: 1200 },
  { client: "GreenGoods", storage: 3100, handling: 2400, receiving: 1800, accessorial: 620 },
  { client: "MegaStore", storage: 5800, handling: 4200, receiving: 3400, accessorial: 1800 },
  { client: "QuickParts", storage: 2100, handling: 1800, receiving: 1200, accessorial: 400 },
];

const storageUtil = [
  { week: "W1", pallets: 320, capacity: 500 },
  { week: "W2", pallets: 345, capacity: 500 },
  { week: "W3", pallets: 380, capacity: 500 },
  { week: "W4", pallets: 410, capacity: 500 },
  { week: "W5", pallets: 395, capacity: 500 },
  { week: "W6", pallets: 425, capacity: 500 },
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Monthly recovery, client breakdown, and utilization</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Recovery Trend */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Recovery Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRecovery}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Recovered"]} />
                  <Area type="monotone" dataKey="recovered" stroke="hsl(174 72% 36%)" fill="hsl(174 72% 36% / 0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Storage Utilization */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Storage Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={storageUtil}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
                  <XAxis dataKey="week" tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="capacity" stroke="hsl(220 15% 80%)" fill="hsl(220 15% 90% / 0.3)" strokeWidth={1} strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="pallets" stroke="hsl(35 95% 55%)" fill="hsl(35 95% 55% / 0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Client Revenue Breakdown */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue by Client & Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
                  <XAxis dataKey="client" tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 46%)" }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, ""]} />
                  <Bar dataKey="storage" name="Storage" stackId="a" fill="hsl(174 72% 36%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="handling" name="Handling" stackId="a" fill="hsl(35 95% 55%)" />
                  <Bar dataKey="receiving" name="Receiving" stackId="a" fill="hsl(220 60% 55%)" />
                  <Bar dataKey="accessorial" name="Accessorial" stackId="a" fill="hsl(142 70% 40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
