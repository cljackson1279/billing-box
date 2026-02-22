import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fileTypes = [
  { value: "inventory", label: "Inventory Snapshot" },
  { value: "order", label: "Order Activities" },
  { value: "receiving", label: "Receiving Log" },
  { value: "client_rates", label: "Client Rate Table" },
];

const recentUploads = [
  { id: 1, filename: "inventory_feb_2026.csv", type: "inventory", status: "processed", rows: 1247, date: "Feb 14, 2026" },
  { id: 2, filename: "orders_feb_wk1.csv", type: "order", status: "processed", rows: 532, date: "Feb 10, 2026" },
  { id: 3, filename: "receiving_jan.csv", type: "receiving", status: "error", rows: 0, date: "Feb 8, 2026" },
  { id: 4, filename: "rates_fastship.csv", type: "client_rates", status: "uploaded", rows: 0, date: "Feb 5, 2026" },
];

const statusConfig = {
  processed: { icon: CheckCircle2, className: "text-success", bg: "bg-success/10" },
  error: { icon: AlertCircle, className: "text-destructive", bg: "bg-destructive/10" },
  uploaded: { icon: Clock, className: "text-revenue", bg: "bg-revenue/10" },
  processing: { icon: Clock, className: "text-primary", bg: "bg-primary/10" },
};

export default function Uploads() {
  const [dragOver, setDragOver] = useState(false);
  const [fileType, setFileType] = useState("");
  const { toast } = useToast();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    toast({ title: "File received", description: "Processing your CSV file..." });
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CSV Uploads</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload inventory, order, and receiving data</p>
      </div>

      {/* Upload Area */}
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
          <div
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragOver(false)}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-card-foreground">Drag & drop your CSV file here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse • CSV files up to 50MB</p>
              </div>
              <Button variant="outline" size="sm" className="mt-2">Browse Files</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Uploads */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">File</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Rows</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {recentUploads.map((upload) => {
                  const sc = statusConfig[upload.status as keyof typeof statusConfig];
                  return (
                    <tr key={upload.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-2 font-medium text-card-foreground">
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                          {upload.filename}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">{upload.type.replace("_", " ")}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sc.className} ${sc.bg}`}>
                          <sc.icon className="h-3 w-3" /> {upload.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{upload.rows > 0 ? upload.rows.toLocaleString() : "—"}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{upload.date}</td>
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
