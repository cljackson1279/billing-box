import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, MoreHorizontal, Mail, Phone, Edit, Trash2, DollarSign, FileText, Download, ExternalLink, Copy, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOnboardingProgress } from "@/components/OnboardingChecklist";
import { format } from "date-fns";

interface ClientForm {
  name: string;
  contact_email: string;
  phone: string;
  notes: string;
}

const emptyForm: ClientForm = { name: "", contact_email: "", phone: "", notes: "" };

export default function Clients() {
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ratesDialogOpen, setRatesDialogOpen] = useState(false);
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [generatingPortalLink, setGeneratingPortalLink] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { markStep } = useOnboardingProgress();

  // Rate form
  const [rateForm, setRateForm] = useState({
    clientId: "",
    storage_rate_per_pallet_per_day: "",
    storage_rate_per_sku_per_day: "",
    receiving_rate_per_pallet: "",
    receiving_rate_per_unit: "",
    pick_fee_per_unit: "",
    pack_fee_per_order: "",
    kitting_fee: "",
    special_handling_fee: "",
    effective_from: new Date().toISOString().split("T")[0],
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch rate tables for detail view
  const { data: rateTables = [] } = useQuery({
    queryKey: ["client-rate-tables", detailClientId],
    enabled: !!detailClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_rate_tables")
        .select("*")
        .eq("client_id", detailClientId!)
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent invoices for detail view
  const { data: clientInvoices = [] } = useQuery({
    queryKey: ["client-invoices", detailClientId],
    enabled: !!detailClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", detailClientId!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const getOrgId = async () => {
    let { data: orgId } = await supabase.rpc("get_user_org_id");
    if (!orgId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");
      const { data: newOrg, error: orgErr } = await supabase.from("organizations").insert({
        name: "My Organization", slug: `org-${user.id.slice(0, 8)}`,
      }).select("id").single();
      if (orgErr || !newOrg) throw new Error("Failed to create organization.");
      orgId = newOrg.id;
      await supabase.from("user_profiles").upsert({
        id: user.id, organization_id: orgId, email: user.email, updated_at: new Date().toISOString(),
      });
    }
    return orgId;
  };

  const addClient = useMutation({
    mutationFn: async (f: ClientForm) => {
      const orgId = await getOrgId();
      const { error } = await supabase.from("clients").insert({
        name: f.name,
        contact_email: f.contact_email || null,
        phone: f.phone || null,
        notes: f.notes || null,
        organization_id: orgId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client saved!", description: "New client has been added." });
      setAddDialogOpen(false);
      setForm(emptyForm);
      markStep("add_client");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...f }: ClientForm & { id: string }) => {
      const { error } = await supabase.from("clients").update({
        name: f.name,
        contact_email: f.contact_email || null,
        phone: f.phone || null,
        notes: f.notes || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client updated!" });
      setEditDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client deleted" });
      setDeleteDialogOpen(false);
      setDeletingId(null);
      if (detailClientId === deletingId) setDetailClientId(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveRates = useMutation({
    mutationFn: async () => {
      const orgId = await getOrgId();
      const { error } = await supabase.from("client_rate_tables").insert({
        client_id: rateForm.clientId,
        organization_id: orgId,
        effective_from: rateForm.effective_from,
        storage_rate_per_pallet_per_day: parseFloat(rateForm.storage_rate_per_pallet_per_day) || null,
        storage_rate_per_sku_per_day: parseFloat(rateForm.storage_rate_per_sku_per_day) || null,
        receiving_rate_per_pallet: parseFloat(rateForm.receiving_rate_per_pallet) || null,
        receiving_rate_per_unit: parseFloat(rateForm.receiving_rate_per_unit) || null,
        pick_fee_per_unit: parseFloat(rateForm.pick_fee_per_unit) || null,
        pack_fee_per_order: parseFloat(rateForm.pack_fee_per_order) || null,
        kitting_fee: parseFloat(rateForm.kitting_fee) || null,
        special_handling_fee: parseFloat(rateForm.special_handling_fee) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-rate-tables"] });
      toast({ title: "Rates updated!" });
      setRatesDialogOpen(false);
      markStep("set_rates");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateClient.mutate({ id: editingId, ...form });
    } else {
      addClient.mutate(form);
    }
  };

  const openEdit = (client: any) => {
    setForm({
      name: client.name,
      contact_email: client.contact_email || "",
      phone: client.phone || "",
      notes: client.notes || "",
    });
    setEditingId(client.id);
    setEditDialogOpen(true);
  };

  const openRates = (clientId: string) => {
    setRateForm(prev => ({ ...prev, clientId }));
    setRatesDialogOpen(true);
  };

  const generatePortalLink = async (clientId: string) => {
    setGeneratingPortalLink(clientId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("client-portal", {
        body: { action: "generate_link", client_id: clientId },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      const portalUrl = res.data.url;
      await navigator.clipboard.writeText(portalUrl).catch(() => {});
      toast({
        title: "Portal link generated!",
        description: "Link copied to clipboard. Share it with your client.",
      });
    } catch (err) {
      toast({ title: "Error generating portal link", description: (err as Error).message, variant: "destructive" });
    } finally {
      setGeneratingPortalLink(null);
    }
  };

  const exportCSV = () => {
    if (!clients.length) return;
    const headers = ["Name", "Contact Email", "Phone", "Notes", "Created"];
    const rows = clients.map(c => [
      c.name,
      c.contact_email || "",
      (c as any).phone || "",
      (c as any).notes || "",
      c.created_at ? new Date(c.created_at).toLocaleDateString() : "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "clients.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_email || "").toLowerCase().includes(search.toLowerCase())
  );

  const detailClient = clients.find(c => c.id === detailClientId);

  // Client form dialog content (reused for add/edit)
  const ClientFormContent = ({ isEdit }: { isEdit: boolean }) => (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="space-y-2">
        <Label htmlFor="clientName">Name *</Label>
        <Input id="clientName" placeholder="Walmart Retail Inc." required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="clientEmail">Contact Email</Label>
        <Input id="clientEmail" type="email" placeholder="billing@acme.com" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="clientPhone">Phone</Label>
        <Input id="clientPhone" placeholder="+1 (555) 123-4567" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="clientNotes">Notes</Label>
        <Textarea id="clientNotes" placeholder="Big box retailer, DC Midwest" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
      </div>
      <DialogFooter>
        <Button type="submit" variant="hero" className="w-full" disabled={addClient.isPending || updateClient.isPending}>
          {(addClient.isPending || updateClient.isPending) ? "Saving..." : isEdit ? "Update Client" : "Save Client"}
        </Button>
      </DialogFooter>
    </form>
  );

  // Detail view
  if (detailClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDetailClientId(null)}>← Back</Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{detailClient.name}</h1>
            <p className="text-sm text-muted-foreground">{detailClient.contact_email || "No email"}</p>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rates">Billing Rules</TabsTrigger>
            <TabsTrigger value="billing">Recent Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="shadow-card">
              <CardContent className="p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Contact Email</p>
                    <p className="text-sm text-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{detailClient.contact_email || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Phone</p>
                    <p className="text-sm text-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{(detailClient as any).phone || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Notes</p>
                    <p className="text-sm text-foreground">{(detailClient as any).notes || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Added</p>
                    <p className="text-sm text-foreground">{detailClient.created_at ? format(new Date(detailClient.created_at), "MMM d, yyyy") : "—"}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(detailClient)}><Edit className="h-3.5 w-3.5 mr-1" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => openRates(detailClient.id)}><DollarSign className="h-3.5 w-3.5 mr-1" />Set Rates</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generatePortalLink(detailClient.id)}
                    disabled={generatingPortalLink === detailClient.id}
                  >
                    {generatingPortalLink === detailClient.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5 mr-1" />}
                    Client Portal Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rates">
            <Card className="shadow-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Rate Tables</CardTitle>
                <Button size="sm" variant="hero" onClick={() => openRates(detailClient.id)}>
                  <Plus className="h-3.5 w-3.5" /> Add Rate
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Effective From</TableHead>
                        <TableHead>Storage/Pallet/Day</TableHead>
                        <TableHead>Pick/Unit</TableHead>
                        <TableHead>Pack/Order</TableHead>
                        <TableHead>Receiving/Pallet</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rateTables.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No rate tables yet</TableCell></TableRow>
                      ) : rateTables.map(rt => (
                        <TableRow key={rt.id}>
                          <TableCell>{rt.effective_from ? format(new Date(rt.effective_from), "MMM d, yyyy") : "—"}</TableCell>
                          <TableCell>${rt.storage_rate_per_pallet_per_day?.toFixed(2) || "—"}</TableCell>
                          <TableCell>${rt.pick_fee_per_unit?.toFixed(2) || "—"}</TableCell>
                          <TableCell>${rt.pack_fee_per_order?.toFixed(2) || "—"}</TableCell>
                          <TableCell>${rt.receiving_rate_per_pallet?.toFixed(2) || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent Invoices</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientInvoices.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No invoices yet</TableCell></TableRow>
                      ) : clientInvoices.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              inv.status === "sent" ? "bg-success/10 text-success" :
                              inv.status === "draft" ? "bg-muted text-muted-foreground" :
                              "bg-primary/10 text-primary"
                            }`}>{inv.status}</span>
                          </TableCell>
                          <TableCell>${(inv.total_amount || 0).toLocaleString()}</TableCell>
                          <TableCell>{inv.created_at ? format(new Date(inv.created_at), "MMM d, yyyy") : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog (shared) */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
            <ClientFormContent isEdit />
          </DialogContent>
        </Dialog>

        {/* Rates Dialog (shared) */}
        <Dialog open={ratesDialogOpen} onOpenChange={setRatesDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Set Rate Table</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: "storage_rate_per_pallet_per_day", label: "Storage / Pallet / Day" },
                  { key: "storage_rate_per_sku_per_day", label: "Storage / SKU / Day" },
                  { key: "receiving_rate_per_pallet", label: "Receiving / Pallet" },
                  { key: "receiving_rate_per_unit", label: "Receiving / Unit" },
                  { key: "pick_fee_per_unit", label: "Pick Fee / Unit" },
                  { key: "pack_fee_per_order", label: "Pack Fee / Order" },
                  { key: "kitting_fee", label: "Kitting Fee" },
                  { key: "special_handling_fee", label: "Special Handling" },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={(rateForm as any)[f.key]}
                      onChange={e => setRateForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Effective From</Label>
                <Input type="date" value={rateForm.effective_from} onChange={e => setRateForm(p => ({ ...p, effective_from: e.target.value }))} />
              </div>
              <Button variant="hero" className="w-full" onClick={() => saveRates.mutate()} disabled={saveRates.isPending}>
                {saveRates.isPending ? "Saving..." : "Save Rates"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your warehouse clients and rate tables</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!clients.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) setForm(emptyForm); }}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm"><Plus className="h-4 w-4" /> New Client</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
              <ClientFormContent isEdit={false} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No clients found. Add your first client above.</TableCell></TableRow>
                ) : filtered.map(client => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setDetailClientId(client.id)}
                  >
                    <TableCell className="font-medium text-card-foreground">{client.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> {client.contact_email || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        {(client as any).phone ? <><Phone className="h-3.5 w-3.5" />{(client as any).phone}</> : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {client.created_at ? format(new Date(client.created_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(client)}>
                            <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openRates(client.id)}>
                            <DollarSign className="h-3.5 w-3.5 mr-2" /> Set Rates
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDetailClientId(client.id)}>
                            <FileText className="h-3.5 w-3.5 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => generatePortalLink(client.id)}
                            disabled={generatingPortalLink === client.id}
                          >
                            {generatingPortalLink === client.id ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5 mr-2" />}
                            Generate Portal Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { setDeletingId(client.id); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <ClientFormContent isEdit />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Client</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure? This will remove the client and cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deletingId && deleteClient.mutate(deletingId)} disabled={deleteClient.isPending}>
              {deleteClient.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rates Dialog */}
      <Dialog open={ratesDialogOpen} onOpenChange={setRatesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Set Rate Table</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { key: "storage_rate_per_pallet_per_day", label: "Storage / Pallet / Day" },
                { key: "storage_rate_per_sku_per_day", label: "Storage / SKU / Day" },
                { key: "receiving_rate_per_pallet", label: "Receiving / Pallet" },
                { key: "receiving_rate_per_unit", label: "Receiving / Unit" },
                { key: "pick_fee_per_unit", label: "Pick Fee / Unit" },
                { key: "pack_fee_per_order", label: "Pack Fee / Order" },
                { key: "kitting_fee", label: "Kitting Fee" },
                { key: "special_handling_fee", label: "Special Handling" },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={(rateForm as any)[f.key]}
                    onChange={e => setRateForm(p => ({ ...p, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Effective From</Label>
              <Input type="date" value={rateForm.effective_from} onChange={e => setRateForm(p => ({ ...p, effective_from: e.target.value }))} />
            </div>
            <Button variant="hero" className="w-full" onClick={() => saveRates.mutate()} disabled={saveRates.isPending}>
              {saveRates.isPending ? "Saving..." : "Save Rates"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
