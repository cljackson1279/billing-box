import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, MoreHorizontal, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const demoClients = [
  { id: "1", name: "FastShip Co", email: "billing@fastship.com", created: "Jan 5, 2026", activeRates: true, monthlyRevenue: "$12,400" },
  { id: "2", name: "GreenGoods Inc", email: "ops@greengoods.com", created: "Jan 12, 2026", activeRates: true, monthlyRevenue: "$8,920" },
  { id: "3", name: "MegaStore LLC", email: "warehouse@megastore.com", created: "Feb 1, 2026", activeRates: false, monthlyRevenue: "$15,200" },
  { id: "4", name: "QuickParts Direct", email: "logistics@quickparts.com", created: "Feb 10, 2026", activeRates: true, monthlyRevenue: "$6,300" },
];

export default function Clients() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const filtered = demoClients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Client created", description: "New client has been added to your organization." });
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your warehouse clients and rate tables</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm">
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddClient} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input id="clientName" placeholder="Acme Fulfillment" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Contact Email</Label>
                <Input id="clientEmail" type="email" placeholder="billing@acme.com" />
              </div>
              <Button type="submit" variant="hero" className="w-full">Create Client</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rate Table</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Monthly Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Added</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-card-foreground">{client.name}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> {client.email}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {client.activeRates ? (
                        <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Active</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-revenue/10 px-2 py-0.5 text-xs font-medium text-revenue">Not Set</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-card-foreground">{client.monthlyRevenue}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{client.created}</td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
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
