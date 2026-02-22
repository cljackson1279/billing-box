import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Clock, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const fileTypes = [
  { value: "inventory", label: "Inventory Snapshot" },
  { value: "order", label: "Order Activities" },
  { value: "receiving", label: "Receiving Log" },
  { value: "client_rates", label: "Client Rate Table" },
];

const REQUIRED_FIELDS: Record<string, { key: string; label: string }[]> = {
  inventory: [
    { key: "client_id", label: "Client" },
    { key: "sku", label: "SKU" },
    { key: "quantity", label: "Quantity" },
    { key: "pallet_count", label: "Pallet Count" },
    { key: "storage_start_date", label: "Storage Start Date" },
    { key: "storage_end_date", label: "Storage End Date" },
    { key: "warehouse_location", label: "Warehouse Location" },
  ],
  order: [
    { key: "client_id", label: "Client" },
    { key: "order_id", label: "Order ID" },
    { key: "sku", label: "SKU" },
    { key: "quantity", label: "Quantity" },
    { key: "order_date", label: "Order Date" },
    { key: "handling_type", label: "Handling Type" },
    { key: "units_processed", label: "Units Processed" },
  ],
  receiving: [
    { key: "client_id", label: "Client" },
    { key: "pallet_count", label: "Pallet Count" },
    { key: "units_received", label: "Units Received" },
    { key: "receiving_date", label: "Receiving Date" },
    { key: "receiving_type", label: "Receiving Type" },
  ],
  client_rates: [
    { key: "client_id", label: "Client" },
    { key: "storage_rate_per_pallet_per_day", label: "Storage Rate / Pallet / Day" },
    { key: "storage_rate_per_sku_per_day", label: "Storage Rate / SKU / Day" },
    { key: "receiving_rate_per_pallet", label: "Receiving Rate / Pallet" },
    { key: "receiving_rate_per_unit", label: "Receiving Rate / Unit" },
    { key: "pick_fee_per_unit", label: "Pick Fee / Unit" },
    { key: "pack_fee_per_order", label: "Pack Fee / Order" },
    { key: "kitting_fee", label: "Kitting Fee" },
    { key: "special_handling_fee", label: "Special Handling Fee" },
    { key: "effective_from", label: "Effective From" },
  ],
};

const statusConfig: Record<string, { icon: typeof CheckCircle2; className: string; bg: string }> = {
  processed: { icon: CheckCircle2, className: "text-success", bg: "bg-success/10" },
  error: { icon: AlertCircle, className: "text-destructive", bg: "bg-destructive/10" },
  uploaded: { icon: Clock, className: "text-revenue", bg: "bg-revenue/10" },
  processing: { icon: Loader2, className: "text-primary", bg: "bg-primary/10" },
};

type Step = "upload" | "mapping" | "preview" | "done";

export default function Uploads() {
  const [dragOver, setDragOver] = useState(false);
  const [fileType, setFileType] = useState("");
  const [step, setStep] = useState<Step>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [sourceFileId, setSourceFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch recent uploads
  const { data: recentUploads } = useQuery({
    queryKey: ["source-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("source_files")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const resetFlow = () => {
    setStep("upload");
    setCsvHeaders([]);
    setPreviewRows([]);
    setTotalRows(0);
    setColumnMapping({});
    setSourceFileId(null);
    setSelectedFile(null);
  };

  const processFile = async (file: File) => {
    if (!fileType) {
      toast({ title: "Select file type", description: "Please select a file type before uploading.", variant: "destructive" });
      return;
    }
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Only CSV files are supported.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setSelectedFile(file);

    try {
      const csvContent = await file.text();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("process-csv", {
        body: { action: "parse", csvContent, fileName: file.name, fileType },
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data;

      setCsvHeaders(result.headers);
      setPreviewRows(result.previewRows);
      setTotalRows(result.totalRows);
      setSourceFileId(result.sourceFileId);

      // Auto-map matching column names
      const autoMap: Record<string, string> = {};
      const requiredFields = REQUIRED_FIELDS[fileType] || [];
      for (const field of requiredFields) {
        const match = result.headers.find(
          (h: string) => h.toLowerCase().replace(/[\s_-]/g, "") === field.key.replace(/_/g, "")
        );
        if (match) autoMap[field.key] = match;
      }
      setColumnMapping(autoMap);
      setStep("mapping");
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [fileType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleIngest = async () => {
    if (!sourceFileId || !fileType) return;

    // Check required fields have mappings
    const required = REQUIRED_FIELDS[fileType]?.filter(f => 
      !["warehouse_location", "storage_rate_per_sku_per_day", "effective_from"].includes(f.key)
    ) || [];
    const coreRequired = required.filter(f => f.key === "client_id");
    const missing = coreRequired.filter(f => !columnMapping[f.key]);
    
    if (missing.length > 0) {
      toast({
        title: "Missing required mappings",
        description: `Please map: ${missing.map(f => f.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await supabase.functions.invoke("process-csv", {
        body: { action: "ingest", sourceFileId, columnMapping, fileType },
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data;

      if (result.error) throw new Error(result.error);

      toast({
        title: "Import complete",
        description: `${result.rowsInserted} rows inserted${result.errors ? ` with ${result.errors.length} warnings` : ""}`,
      });

      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["source-files"] });
    } catch (err) {
      toast({ title: "Ingestion failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Build mapped preview
  const mappedPreview = previewRows.map(row => {
    const mapped: Record<string, string> = {};
    for (const [dbField, csvCol] of Object.entries(columnMapping)) {
      if (csvCol) mapped[dbField] = row[csvCol] || "";
    }
    return mapped;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CSV Uploads</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload inventory, order, and receiving data</p>
        </div>
        {step !== "upload" && (
          <Button variant="outline" size="sm" onClick={resetFlow}>
            ← New Upload
          </Button>
        )}
      </div>

      {/* Step indicators */}
      {step !== "upload" && step !== "done" && (
        <div className="flex items-center gap-2 text-sm">
          {["upload", "mapping", "preview"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              <span className={`px-2 py-1 rounded-md font-medium ${
                step === s ? "bg-primary/10 text-primary" : 
                ["upload"].indexOf(s) < ["upload", "mapping", "preview"].indexOf(step) 
                  ? "text-success" : "text-muted-foreground"
              }`}>
                {s === "upload" ? "1. Upload" : s === "mapping" ? "2. Map Columns" : "3. Preview & Confirm"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* STEP: Upload */}
      {step === "upload" && (
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select file type" />
                </SelectTrigger>
                <SelectContent>
                  {fileTypes.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-3">
                {loading ? (
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-card-foreground">
                    {loading ? "Parsing CSV..." : "Drag & drop your CSV file here"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse • CSV files up to 50MB</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP: Column Mapping */}
      {step === "mapping" && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Map Columns — {selectedFile?.name} ({totalRows} rows)</span>
              <Button onClick={() => setStep("preview")} disabled={!columnMapping.client_id}>
                Preview Mapped Data <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {(REQUIRED_FIELDS[fileType] || []).map((field) => (
                <div key={field.key} className="flex items-center gap-4">
                  <span className="w-56 text-sm font-medium text-card-foreground flex items-center gap-2">
                    {field.label}
                    {field.key === "client_id" && (
                      <span className="text-xs text-destructive">*</span>
                    )}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select
                    value={columnMapping[field.key] || ""}
                    onValueChange={(val) =>
                      setColumnMapping((prev) => ({ ...prev, [field.key]: val === "__none__" ? "" : val }))
                    }
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select CSV column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Skip —</SelectItem>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP: Preview */}
      {step === "preview" && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Preview Mapped Data (first 10 of {totalRows} rows)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep("mapping")}>
                  ← Edit Mapping
                </Button>
                <Button onClick={handleIngest} disabled={loading}>
                  {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Confirm & Process
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {Object.keys(columnMapping).filter(k => columnMapping[k]).map((key) => (
                      <TableHead key={key} className="text-xs whitespace-nowrap">
                        {REQUIRED_FIELDS[fileType]?.find(f => f.key === key)?.label || key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedPreview.map((row, i) => (
                    <TableRow key={i}>
                      {Object.keys(columnMapping).filter(k => columnMapping[k]).map((key) => (
                        <TableCell key={key} className="text-xs whitespace-nowrap">
                          {row[key] || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP: Done */}
      {step === "done" && (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-card-foreground">Import Complete</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Your data has been processed and saved.
            </p>
            <Button onClick={resetFlow}>Upload Another File</Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Uploads */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentUploads || []).map((upload) => {
                  const sc = statusConfig[upload.status || "uploaded"] || statusConfig.uploaded;
                  const Icon = sc.icon;
                  return (
                    <TableRow key={upload.id}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 font-medium text-card-foreground">
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                          {upload.original_filename || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {(upload.file_type || "").replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sc.className} ${sc.bg}`}>
                          <Icon className="h-3 w-3" /> {upload.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {upload.created_at ? new Date(upload.created_at).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!recentUploads || recentUploads.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No uploads yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
