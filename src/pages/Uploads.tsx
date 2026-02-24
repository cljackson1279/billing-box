import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Clock,
  ArrowRight, Loader2, Sparkles, RefreshCw, Layers, Eye, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────

interface SheetInfo {
  name: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  rowCount: number;
  allRows: Record<string, string>[];
}

interface ClassifiedSheet extends SheetInfo {
  category: string;
  categoryLabel: string;
  confidence: "high" | "medium" | "low";
  columnMapping: Record<string, string>;
}

interface IngestionResult {
  sheetName: string;
  category: string;
  rowsInserted: number;
  errors?: string[];
  skipped?: boolean;
  message?: string;
}

// ─── Constants ───────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  client_rates: "Client Rate Table",
  inventory: "Inventory Snapshot",
  receiving: "Receiving Log",
  order: "Order Activities",
  returns: "Returns Log",
  adjustments: "Adjustments",
  unknown: "Unrecognized",
};

const CATEGORY_ICONS: Record<string, string> = {
  client_rates: "💰",
  inventory: "📦",
  receiving: "📥",
  order: "📋",
  returns: "🔄",
  adjustments: "✏️",
  unknown: "❓",
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-success/10 text-success border-success/30",
  medium: "bg-revenue/10 text-revenue border-revenue/30",
  low: "bg-destructive/10 text-destructive border-destructive/30",
};

const INGESTABLE_CATEGORIES = ["client_rates", "inventory", "receiving", "order"];

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

type Step = "upload" | "classifying" | "review" | "remap" | "processing" | "done";

// ─── Component ───────────────────────────────────────────────

export default function Uploads() {
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [classifiedSheets, setClassifiedSheets] = useState<ClassifiedSheet[]>([]);
  const [ingestionResults, setIngestionResults] = useState<IngestionResult[]>([]);
  const [processProgress, setProcessProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [remapSheetIndex, setRemapSheetIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    setClassifiedSheets([]);
    setIngestionResults([]);
    setProcessProgress(0);
    setFileName("");
    setRemapSheetIndex(null);
  };

  const parseExcelFile = (file: File): Promise<SheetInfo[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheets: SheetInfo[] = [];

          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });
            if (json.length === 0) continue;

            const headers = Object.keys(json[0]);
            sheets.push({
              name: sheetName,
              headers,
              sampleRows: json.slice(0, 5),
              rowCount: json.length,
              allRows: json,
            });
          }

          resolve(sheets);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseCsvFile = (file: File): Promise<SheetInfo[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const workbook = XLSX.read(text, { type: "string" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });

          if (json.length === 0) {
            resolve([]);
            return;
          }

          resolve([{
            name: file.name.replace(/\.\w+$/, ""),
            headers: Object.keys(json[0]),
            sampleRows: json.slice(0, 5),
            rowCount: json.length,
            allRows: json,
          }]);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const processFile = async (file: File) => {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const isCsv = /\.csv$/i.test(file.name);

    if (!isExcel && !isCsv) {
      toast({ title: "Unsupported file", description: "Please upload an Excel (.xlsx, .xls) or CSV file.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setFileName(file.name);
    setStep("classifying");

    try {
      const sheets = isExcel ? await parseExcelFile(file) : await parseCsvFile(file);

      if (sheets.length === 0) {
        toast({ title: "Empty file", description: "No data sheets found in the file.", variant: "destructive" });
        setStep("upload");
        return;
      }

      // Send to edge function for AI classification
      const sheetsForClassification = sheets.map(s => ({
        name: s.name,
        headers: s.headers,
        sampleRows: s.sampleRows,
        rowCount: s.rowCount,
      }));

      const res = await supabase.functions.invoke("process-workbook", {
        body: { action: "classify", sheets: sheetsForClassification },
      });

      if (res.error) throw new Error(res.error.message);

      const classifications: ClassifiedSheet[] = res.data.classifications.map(
        (c: ClassifiedSheet, i: number) => ({
          ...c,
          allRows: sheets[i].allRows,
        })
      );

      setClassifiedSheets(classifications);
      setStep("review");
    } catch (err) {
      toast({ title: "Processing failed", description: (err as Error).message, variant: "destructive" });
      setStep("upload");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const updateSheetCategory = (index: number, newCategory: string) => {
    setClassifiedSheets(prev => prev.map((s, i) =>
      i === index ? {
        ...s,
        category: newCategory,
        categoryLabel: CATEGORY_LABELS[newCategory] || "Unrecognized",
        confidence: "high" as const,
        columnMapping: {},
      } : s
    ));
  };

  const updateSheetMapping = (sheetIndex: number, dbField: string, csvCol: string) => {
    setClassifiedSheets(prev => prev.map((s, i) =>
      i === sheetIndex ? {
        ...s,
        columnMapping: { ...s.columnMapping, [dbField]: csvCol === "__none__" ? "" : csvCol },
      } : s
    ));
  };

  const processAllSheets = async () => {
    setStep("processing");
    const results: IngestionResult[] = [];
    const ingestableSheets = classifiedSheets.filter(s => INGESTABLE_CATEGORIES.includes(s.category));
    const total = ingestableSheets.length;

    for (let i = 0; i < ingestableSheets.length; i++) {
      const sheet = ingestableSheets[i];
      setProcessProgress(Math.round(((i) / total) * 100));

      try {
        const res = await supabase.functions.invoke("process-workbook", {
          body: {
            action: "ingest-sheet",
            sheetName: sheet.name,
            category: sheet.category,
            columnMapping: sheet.columnMapping,
            rows: sheet.allRows,
            fileName,
          },
        });

        if (res.error) throw new Error(res.error.message);
        const data = res.data;

        results.push({
          sheetName: sheet.name,
          category: sheet.category,
          rowsInserted: data.rowsInserted || 0,
          errors: data.errors,
          skipped: data.skipped,
          message: data.message,
        });
      } catch (err) {
        results.push({
          sheetName: sheet.name,
          category: sheet.category,
          rowsInserted: 0,
          errors: [(err as Error).message],
        });
      }
    }

    // Handle skipped non-ingestable sheets
    for (const sheet of classifiedSheets) {
      if (!INGESTABLE_CATEGORIES.includes(sheet.category)) {
        results.push({
          sheetName: sheet.name,
          category: sheet.category,
          rowsInserted: 0,
          skipped: true,
          message: `"${sheet.categoryLabel}" not yet supported for auto-ingestion`,
        });
      }
    }

    setIngestionResults(results);
    setProcessProgress(100);
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["source-files"] });
  };

  const totalRowsInserted = ingestionResults.reduce((acc, r) => acc + r.rowsInserted, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Smart Data Import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag your monthly Excel workbook — AI auto-detects and maps all sheets
          </p>
        </div>
        {step !== "upload" && (
          <Button variant="outline" size="sm" onClick={resetFlow}>
            ← New Upload
          </Button>
        )}
      </div>

      {/* ─── STEP: Upload ─── */}
      {step === "upload" && (
        <Card className="shadow-card">
          <CardContent className="p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div
              className={`relative border-2 border-dashed rounded-xl p-16 text-center transition-all cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Drag your complete monthly workbook
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    AI auto-detects ALL sheets and maps to:
                    <span className="block mt-1 font-medium text-foreground">
                      Rates · Inventory · Receiving · Orders · Returns · Adjustments
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Excel (.xlsx, .xls) or CSV files up to 50MB
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── STEP: Classifying ─── */}
      {step === "classifying" && (
        <Card className="shadow-card">
          <CardContent className="p-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Sparkles className="h-12 w-12 text-primary animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">AI is analyzing your workbook...</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Scanning sheets and classifying column patterns in <span className="font-medium">{fileName}</span>
                </p>
              </div>
              <Loader2 className="h-6 w-6 text-primary animate-spin mt-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── STEP: Review Classifications ─── */}
      {step === "review" && (
        <>
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI detected {classifiedSheets.length} sheet{classifiedSheets.length !== 1 ? "s" : ""} in {fileName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {classifiedSheets.map((sheet, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{CATEGORY_ICONS[sheet.category] || "❓"}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        "{sheet.name}"
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sheet.rowCount} rows · {sheet.headers.length} columns
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />

                    <Select
                      value={sheet.category}
                      onValueChange={(val) => updateSheetCategory(i, val)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Badge
                      variant="outline"
                      className={`text-xs ${CONFIDENCE_STYLES[sheet.confidence]}`}
                    >
                      {sheet.confidence}
                    </Badge>

                    {INGESTABLE_CATEGORIES.includes(sheet.category) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemapSheetIndex(remapSheetIndex === i ? null : i)}
                        title="Edit column mapping"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* Inline remap panel */}
              {remapSheetIndex !== null && INGESTABLE_CATEGORIES.includes(classifiedSheets[remapSheetIndex]?.category) && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      Column Mapping — "{classifiedSheets[remapSheetIndex].name}"
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => setRemapSheetIndex(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    {(REQUIRED_FIELDS[classifiedSheets[remapSheetIndex].category] || []).map((field) => (
                      <div key={field.key} className="flex items-center gap-3">
                        <span className="w-48 text-sm font-medium text-foreground flex items-center gap-1">
                          {field.label}
                          {field.key === "client_id" && <span className="text-xs text-destructive">*</span>}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <Select
                          value={classifiedSheets[remapSheetIndex].columnMapping[field.key] || ""}
                          onValueChange={(val) => updateSheetMapping(remapSheetIndex, field.key, val)}
                        >
                          <SelectTrigger className="w-56">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Skip —</SelectItem>
                            {classifiedSheets[remapSheetIndex].headers.map((h) => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {classifiedSheets[remapSheetIndex].columnMapping[field.key] && (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Preview rows */}
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">Preview (first 5 rows)</p>
                    <div className="overflow-x-auto rounded border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            {classifiedSheets[remapSheetIndex].headers.slice(0, 8).map(h => (
                              <TableHead key={h} className="text-xs whitespace-nowrap py-2">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {classifiedSheets[remapSheetIndex].sampleRows.slice(0, 3).map((row, ri) => (
                            <TableRow key={ri}>
                              {classifiedSheets[remapSheetIndex].headers.slice(0, 8).map(h => (
                                <TableCell key={h} className="text-xs whitespace-nowrap py-1.5">
                                  {row[h] || <span className="text-muted-foreground">—</span>}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <div className="px-6 pb-6 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {classifiedSheets.filter(s => INGESTABLE_CATEGORIES.includes(s.category)).length} of {classifiedSheets.length} sheets ready for processing
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetFlow}>Cancel</Button>
                <Button
                  onClick={processAllSheets}
                  disabled={classifiedSheets.filter(s => INGESTABLE_CATEGORIES.includes(s.category)).length === 0}
                >
                  <Sparkles className="mr-1 h-4 w-4" />
                  Process All Sheets
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ─── STEP: Processing ─── */}
      {step === "processing" && (
        <Card className="shadow-card">
          <CardContent className="p-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Processing sheets...</h2>
                <p className="text-sm text-muted-foreground mt-1">Ingesting data from {fileName}</p>
              </div>
              <div className="w-64 mt-2">
                <Progress value={processProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{processProgress}% complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── STEP: Done ─── */}
      {step === "done" && (
        <Card className="shadow-card">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-3" />
              <h2 className="text-xl font-bold text-foreground">Import Complete!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {totalRowsInserted} total rows imported from {fileName}
              </p>
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              {ingestionResults.map((result, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    result.skipped ? "bg-muted/30" :
                    result.errors && result.errors.length > 0 && result.rowsInserted === 0
                      ? "bg-destructive/5 border-destructive/20"
                      : "bg-success/5 border-success/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_ICONS[result.category] || "❓"}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{result.sheetName}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[result.category]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {result.skipped ? (
                      <span className="text-xs text-muted-foreground">Skipped</span>
                    ) : result.rowsInserted > 0 ? (
                      <span className="text-sm font-semibold text-success">
                        ✓ {result.rowsInserted} rows
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-destructive">Failed</span>
                    )}
                    {result.errors && result.errors.length > 0 && (
                      <p className="text-xs text-destructive">{result.errors.length} warning(s)</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-3 mt-6">
              <Button variant="outline" onClick={resetFlow}>
                <RefreshCw className="mr-1 h-4 w-4" /> Upload Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Recent Uploads ─── */}
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
                        <span className="inline-flex items-center gap-2 font-medium text-foreground">
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
