import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Package, FileText, ShoppingCart, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function ClientPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setError("No portal token provided.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await supabase.functions.invoke("client-portal", {
          body: { action: "get_portal_data", token },
        });
        if (res.error) throw new Error(res.error.message);
        if (res.data?.error) throw new Error(res.data.error);
        setData(res.data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-lg font-semibold">Portal Unavailable</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">Please contact your warehouse for a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { client, organization, stats, invoices, inventory, orders } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{organization?.name ?? "Warehouse"} — Client Portal</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Welcome, {client?.name}</p>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            <div>Powered by DispatchBoxAI</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Billed", value: `$${Number(stats.total_billed).toLocaleString()}`, icon: DollarSign, color: "text-primary bg-primary/10" },
            { label: "Active Pallets", value: stats.total_pallets.toLocaleString(), icon: Package, color: "text-blue-600 bg-blue-100" },
            { label: "Active SKUs", value: stats.total_skus.toLocaleString(), icon: Package, color: "text-purple-600 bg-purple-100" },
            { label: "Invoices", value: stats.invoice_count.toLocaleString(), icon: FileText, color: "text-green-600 bg-green-100" },
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

        {/* Tabs */}
        <Tabs defaultValue="invoices">
          <TabsList>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          {/* Invoices */}
          <TabsContent value="invoices">
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Invoice History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length > 0 ? invoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoice_number || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {inv.period_start ? format(new Date(inv.period_start), "MMM d") : "—"} – {inv.period_end ? format(new Date(inv.period_end), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "paid" ? "default" : inv.status === "sent" ? "secondary" : "outline"} className="text-xs capitalize">
                            {inv.status || "draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">${Number(inv.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No invoices yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory */}
          <TabsContent value="inventory">
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Current Inventory</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>SKU</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Pallets</TableHead>
                      <TableHead>In Storage Since</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.length > 0 ? inventory.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.sku || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.warehouse_location || "—"}</TableCell>
                        <TableCell className="text-right">{(inv.quantity || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{inv.pallet_count || 0}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {inv.storage_start_date ? format(new Date(inv.storage_start_date), "MMM d, yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No active inventory</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders">
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Order ID</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length > 0 ? orders.map((ord: any) => (
                      <TableRow key={ord.id}>
                        <TableCell className="font-medium">{ord.order_id || "—"}</TableCell>
                        <TableCell>{ord.sku || "—"}</TableCell>
                        <TableCell className="capitalize">{ord.handling_type || "—"}</TableCell>
                        <TableCell className="text-right">{(ord.units_processed || ord.quantity || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {ord.order_date ? format(new Date(ord.order_date), "MMM d, yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No recent orders</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
