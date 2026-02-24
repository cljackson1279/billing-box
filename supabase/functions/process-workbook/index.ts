import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Column Alias Map ──
// Maps DB fields to all known CSV header aliases (lowercase, stripped)
const COLUMN_ALIASES: Record<string, string[]> = {
  client_id: ["client_id", "clientid", "client", "clientname", "client_name", "customer", "customername", "customer_name", "account"],
  sku: ["sku", "item", "itemcode", "item_code", "productsku", "product_sku", "itemsku"],
  quantity: ["quantity", "qty", "units", "count", "totalqty", "total_qty"],
  pallet_count: ["pallet_count", "palletcount", "pallets", "total_pallets", "totpallets", "num_pallets", "numpallets"],
  storage_start_date: ["storage_start_date", "storagestartdate", "start_date", "startdate", "storagestart", "date_in", "datein"],
  storage_end_date: ["storage_end_date", "storageenddate", "end_date", "enddate", "storageend", "date_out", "dateout"],
  warehouse_location: ["warehouse_location", "warehouselocation", "location", "bin", "lot", "zone"],
  units_received: ["units_received", "unitsreceived", "received_units", "receivedunits", "received_qty", "receivedqty", "qty_received"],
  receiving_date: ["receiving_date", "receivingdate", "receive_date", "receivedate", "receipt_date", "receiptdate", "date_received", "datereceived", "inbound_date"],
  receiving_type: ["receiving_type", "receivingtype", "receipt_type", "receipttype", "type"],
  order_id: ["order_id", "orderid", "order_number", "ordernumber", "orderno", "order_no", "order"],
  order_date: ["order_date", "orderdate", "ship_date", "shipdate", "fulfillment_date", "fulfillmentdate"],
  handling_type: ["handling_type", "handlingtype", "activity_type", "activitytype", "type", "service_type", "servicetype"],
  units_processed: ["units_processed", "unitsprocessed", "processed_units", "processedunits", "shipped_qty", "shippedqty", "qty_shipped"],
  is_return: ["is_return", "isreturn", "return", "rma"],
  return_reason: ["return_reason", "returnreason", "reason", "rma_reason"],
  disposition: ["disposition", "return_disposition", "returndisposition", "action"],
  storage_rate_per_pallet_per_day: ["storage_rate_per_pallet_per_day", "storagerateperpalletperday", "storage_rate", "storagerate", "pallet_rate", "palletrate"],
  receiving_rate_per_pallet: ["receiving_rate_per_pallet", "receivingrateperpalley", "recv_pallet_rate"],
  receiving_rate_per_unit: ["receiving_rate_per_unit", "receivingrateperunit", "recv_unit_rate"],
  pick_fee_per_unit: ["pick_fee_per_unit", "pickfeeperunit", "pick_fee", "pickfee", "pick_rate", "pickrate"],
  pack_fee_per_order: ["pack_fee_per_order", "packfeeperorder", "pack_fee", "packfee", "pack_rate", "packrate"],
  kitting_fee: ["kitting_fee", "kittingfee", "kitting_rate", "kittingrate"],
  special_handling_fee: ["special_handling_fee", "specialhandlingfee", "special_handling", "specialhandling"],
  effective_from: ["effective_from", "effectivefrom", "effective_date", "effectivedate", "start_date", "startdate", "rate_start"],
  monthly_minimum_fee: ["monthly_minimum_fee", "monthlyminimumfee", "minimum_fee", "minimumfee", "min_fee", "monthly_min"],
  returns_processing_fee_per_unit: ["returns_processing_fee_per_unit", "returnsprocessingfeeperunit", "return_fee", "returnfee"],
  returns_restocking_fee_pct: ["returns_restocking_fee_pct", "returnsrestockingfeepct", "restocking_pct", "restockingpct"],
  adjustment_amount: ["adjustment_amount", "adjustmentamount", "credit_amount", "creditamount", "amount", "debit", "write_off"],
  adjustment_date: ["adjustment_date", "adjustmentdate", "credit_date", "creditdate", "date"],
  adjustment_notes: ["adjustment_notes", "adjustmentnotes", "notes", "memo", "description"],
};

const CATEGORY_PATTERNS: Record<string, string[]> = {
  client_rates: [
    "storage_rate", "receiving_rate", "pick_fee", "pack_fee", "return_fee",
    "minimum_fee", "kitting_fee", "special_handling", "rate_per_pallet",
    "rate_per_unit", "effective_from", "effective_date",
  ],
  inventory: [
    "sku", "quantity", "pallet_count", "storage_start", "storage_end",
    "warehouse_location", "location", "bin", "lot",
  ],
  receiving: [
    "pallet_count", "units_received", "receiving_date", "receive_date",
    "inbound", "receiving_type", "receipt",
  ],
  order: [
    "order_id", "order_date", "handling_type", "pick", "pack",
    "units_processed", "fulfillment", "shipment",
  ],
  returns: [
    "return", "rma", "units_returned", "return_date", "return_reason",
    "disposition", "refund", "credit",
  ],
  adjustments: [
    "credit_amount", "adjustment", "adjustment_date", "debit",
    "write_off", "notes",
  ],
};

interface SheetInfo {
  name: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  rowCount: number;
}

interface ClassifiedSheet extends SheetInfo {
  category: string;
  categoryLabel: string;
  confidence: "high" | "medium" | "low";
  columnMapping: Record<string, string>;
}

const CATEGORY_LABELS: Record<string, string> = {
  client_rates: "Client Rate Table",
  inventory: "Inventory Snapshot",
  receiving: "Receiving Log",
  order: "Order Activities",
  returns: "Returns Log",
  adjustments: "Adjustments",
  unknown: "Unrecognized",
};

const TABLE_MAP: Record<string, string> = {
  inventory: "inventory_snapshots",
  order: "order_activities",
  receiving: "receiving_logs",
  client_rates: "client_rate_tables",
  returns: "order_activities", // returns go into order_activities with is_return=true
  adjustments: "billing_adjustments",
};

const REQUIRED_FIELDS: Record<string, string[]> = {
  inventory: ["client_id", "sku", "quantity", "pallet_count", "storage_start_date", "storage_end_date"],
  order: ["client_id", "order_id", "sku", "quantity", "order_date", "handling_type", "units_processed"],
  receiving: ["client_id", "pallet_count", "units_received", "receiving_date", "receiving_type"],
  client_rates: [
    "client_id", "storage_rate_per_pallet_per_day", "receiving_rate_per_pallet",
    "receiving_rate_per_unit", "pick_fee_per_unit", "pack_fee_per_order",
    "kitting_fee", "special_handling_fee", "effective_from",
  ],
  returns: ["client_id", "order_id", "sku", "quantity", "order_date"],
  adjustments: ["client_id", "adjustment_amount"],
};

// ── Flexible Date Parser ──
function parseFlexDate(val: string): string | null {
  if (!val || val.trim() === "") return null;
  const s = val.trim();

  // ISO format: 2024-01-15 or 2024-01-15T00:00:00
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // MM/DD/YYYY or M/D/YYYY
  const slashFull = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashFull) {
    const d = new Date(parseInt(slashFull[3]), parseInt(slashFull[1]) - 1, parseInt(slashFull[2]));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // M/D/YY
  const slashShort = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (slashShort) {
    let yr = parseInt(slashShort[3]);
    yr = yr < 50 ? 2000 + yr : 1900 + yr;
    const d = new Date(yr, parseInt(slashShort[1]) - 1, parseInt(slashShort[2]));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Mon-DD or DD-Mon-YY (e.g., Feb-1, 15-Jan-24)
  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const monDay = s.match(/^([A-Za-z]{3})-?(\d{1,2})$/);
  if (monDay) {
    const mon = monthNames[monDay[1].toLowerCase()];
    if (mon !== undefined) {
      const d = new Date(new Date().getFullYear(), mon, parseInt(monDay[2]));
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
  }

  const ddMonYY = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (ddMonYY) {
    const mon = monthNames[ddMonYY[2].toLowerCase()];
    if (mon !== undefined) {
      let yr = parseInt(ddMonYY[3]);
      if (yr < 100) yr = yr < 50 ? 2000 + yr : 1900 + yr;
      const d = new Date(yr, mon, parseInt(ddMonYY[1]));
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
  }

  // Last resort: try native Date parse
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ── Alias-based Column Mapping ──
function autoMapColumns(headers: string[], category: string): Record<string, string> {
  const required = REQUIRED_FIELDS[category] || [];
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[\s_\-\.]/g, ""));

  for (const field of required) {
    const aliases = COLUMN_ALIASES[field] || [field];
    const normalizedAliases = aliases.map(a => a.toLowerCase().replace(/[\s_\-\.]/g, ""));

    let matchIdx = -1;
    // Exact match first
    for (const alias of normalizedAliases) {
      matchIdx = normalizedHeaders.findIndex(nh => nh === alias);
      if (matchIdx >= 0) break;
    }
    // Substring match fallback
    if (matchIdx < 0) {
      for (const alias of normalizedAliases) {
        matchIdx = normalizedHeaders.findIndex(nh => nh.includes(alias) || alias.includes(nh));
        if (matchIdx >= 0) break;
      }
    }
    if (matchIdx >= 0) {
      mapping[field] = headers[matchIdx];
    }
  }

  return mapping;
}

function classifySheetByPatterns(headers: string[]): { category: string; confidence: "high" | "medium" | "low" } {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[\s\-\.]/g, "_"));
  const scores: Record<string, number> = {};

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    let matchCount = 0;
    for (const pattern of patterns) {
      if (normalizedHeaders.some(h => h.includes(pattern))) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      scores[category] = matchCount / patterns.length;
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { category: "unknown", confidence: "low" };

  const [bestCat, bestScore] = sorted[0];
  const confidence = bestScore >= 0.3 ? "high" : bestScore >= 0.15 ? "medium" : "low";
  return { category: bestCat, confidence };
}

async function classifyWithAI(sheets: SheetInfo[]): Promise<ClassifiedSheet[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return sheets.map(sheet => {
      const { category, confidence } = classifySheetByPatterns(sheet.headers);
      return {
        ...sheet, category,
        categoryLabel: CATEGORY_LABELS[category] || "Unrecognized",
        confidence, columnMapping: autoMapColumns(sheet.headers, category),
      };
    });
  }

  const prompt = `You are a warehouse billing data classifier. Given Excel sheet names and their column headers, classify each sheet into one of these categories:
- client_rates: Rate/pricing tables (storage rates, pick fees, pack fees, etc.)
- inventory: Inventory snapshots (SKUs, quantities, pallet counts, storage dates)
- receiving: Receiving/inbound logs (pallets received, units, dates)
- order: Order/fulfillment activities (picks, packs, orders, shipments)
- returns: Returns/RMA data (returned units, reasons, dispositions)
- adjustments: Credits/adjustments (credit amounts, adjustment dates)
- unknown: Cannot determine

For each sheet, also suggest column mappings to standard database fields.

Sheets to classify:
${sheets.map((s, i) => `Sheet ${i + 1}: "${s.name}" - Headers: [${s.headers.join(", ")}]`).join("\n")}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You classify warehouse data sheets. Return structured JSON only." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_sheets",
            description: "Classify Excel sheets into warehouse billing categories",
            parameters: {
              type: "object",
              properties: {
                classifications: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      sheetIndex: { type: "number" },
                      category: { type: "string", enum: ["client_rates", "inventory", "receiving", "order", "returns", "adjustments", "unknown"] },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                      columnMapping: { type: "object", additionalProperties: { type: "string" } },
                    },
                    required: ["sheetIndex", "category", "confidence", "columnMapping"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["classifications"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_sheets" } },
      }),
    });

    if (!response.ok) {
      console.error("AI classification failed, falling back to patterns");
      return sheets.map(sheet => {
        const { category, confidence } = classifySheetByPatterns(sheet.headers);
        return { ...sheet, category, categoryLabel: CATEGORY_LABELS[category] || "Unrecognized", confidence, columnMapping: autoMapColumns(sheet.headers, category) };
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);
    const classifications = result.classifications;

    return sheets.map((sheet, i) => {
      const aiResult = classifications.find((c: { sheetIndex: number }) => c.sheetIndex === i);
      if (aiResult) {
        const patternMapping = autoMapColumns(sheet.headers, aiResult.category);
        const mergedMapping = { ...patternMapping, ...aiResult.columnMapping };
        return { ...sheet, category: aiResult.category, categoryLabel: CATEGORY_LABELS[aiResult.category] || "Unrecognized", confidence: aiResult.confidence, columnMapping: mergedMapping };
      }
      const { category, confidence } = classifySheetByPatterns(sheet.headers);
      return { ...sheet, category, categoryLabel: CATEGORY_LABELS[category] || "Unrecognized", confidence, columnMapping: autoMapColumns(sheet.headers, category) };
    });
  } catch (err) {
    console.error("AI classification error:", err);
    return sheets.map(sheet => {
      const { category, confidence } = classifySheetByPatterns(sheet.headers);
      return { ...sheet, category, categoryLabel: CATEGORY_LABELS[category] || "Unrecognized", confidence, columnMapping: autoMapColumns(sheet.headers, category) };
    });
  }
}

// ── Date field sets per category ──
const DATE_FIELDS: Record<string, string[]> = {
  inventory: ["storage_start_date", "storage_end_date"],
  receiving: ["receiving_date"],
  order: ["order_date"],
  client_rates: ["effective_from"],
  returns: ["order_date"],
  adjustments: ["adjustment_date"],
};

const INT_FIELDS = ["quantity", "pallet_count", "units_received", "units_processed"];
const FLOAT_FIELDS_PATTERNS = ["rate", "fee", "pct", "adjustment_amount"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase.from("user_profiles").select("organization_id").eq("id", user.id).single();
    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.organization_id;
    const body = await req.json();
    const { action, debug } = body;

    // ── ACTION: classify ──
    if (action === "classify") {
      const { sheets } = body as { sheets: SheetInfo[] };
      if (!sheets || !Array.isArray(sheets)) {
        return new Response(JSON.stringify({ error: "Missing sheets data" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const classified = await classifyWithAI(sheets);
      return new Response(JSON.stringify({ classifications: classified }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: preview-revenue ──
    if (action === "preview-revenue") {
      const { sheets: classifiedSheets } = body as { sheets: ClassifiedSheet[] };
      if (!classifiedSheets) {
        return new Response(JSON.stringify({ error: "Missing sheets" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get clients + rates for revenue preview
      const { data: clients } = await supabase.from("clients").select("id, name").eq("organization_id", orgId);
      const clientMap = new Map((clients || []).map(c => [c.name.toLowerCase(), c.id]));

      const { data: rates } = await supabase.from("client_rate_tables").select("*").eq("organization_id", orgId);

      const rateMap = new Map<string, Record<string, number>>();
      for (const r of rates || []) {
        rateMap.set(r.client_id, {
          storage_rate: r.storage_rate_per_pallet_per_day || 0,
          pick_fee: r.pick_fee_per_unit || 0,
          pack_fee: r.pack_fee_per_order || 0,
          receiving_rate_pallet: r.receiving_rate_per_pallet || 0,
          receiving_rate_unit: r.receiving_rate_per_unit || 0,
        });
      }

      const breakdown: Record<string, { category: string; rowCount: number; estimatedRevenue: number }> = {};

      for (const sheet of classifiedSheets) {
        let est = 0;
        // Simple estimation based on row counts and average rates
        if (sheet.category === "order" || sheet.category === "returns") {
          const avgPickFee = [...rateMap.values()].reduce((s, r) => s + r.pick_fee, 0) / Math.max(rateMap.size, 1);
          est = sheet.rowCount * avgPickFee;
        } else if (sheet.category === "receiving") {
          const avgRecvRate = [...rateMap.values()].reduce((s, r) => s + r.receiving_rate_unit, 0) / Math.max(rateMap.size, 1);
          est = sheet.rowCount * avgRecvRate;
        } else if (sheet.category === "inventory") {
          const avgStorageRate = [...rateMap.values()].reduce((s, r) => s + r.storage_rate, 0) / Math.max(rateMap.size, 1);
          est = sheet.rowCount * avgStorageRate;
        }
        breakdown[sheet.name] = { category: sheet.category, rowCount: sheet.rowCount, estimatedRevenue: Math.round(est * 100) / 100 };
      }

      const totalEstimated = Object.values(breakdown).reduce((s, b) => s + b.estimatedRevenue, 0);

      return new Response(JSON.stringify({
        breakdown,
        totalEstimatedRevenue: Math.round(totalEstimated * 100) / 100,
        clientCount: clients?.length || 0,
        ratesConfigured: rates?.length || 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── ACTION: ingest-sheet ──
    if (action === "ingest-sheet") {
      const { sheetName, category, columnMapping: providedMapping, rows, fileName } = body;

      if (!category || !rows || !Array.isArray(rows)) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tableName = TABLE_MAP[category];
      if (!tableName) {
        return new Response(JSON.stringify({
          success: true, rowsInserted: 0, skipped: true,
          message: `Category "${category}" is not yet supported for ingestion`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Auto-build column mapping if empty or missing
      let columnMapping = providedMapping;
      if (!columnMapping || Object.keys(columnMapping).length === 0) {
        // Infer headers from first row keys
        const sampleHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];
        columnMapping = autoMapColumns(sampleHeaders, category);
        console.log(`[process-workbook] Auto-mapped columns for ${category}:`, JSON.stringify(columnMapping));
      }

      // Create source file record
      const { data: sourceFile, error: sfError } = await supabase
        .from("source_files")
        .insert({
          organization_id: orgId,
          file_type: category,
          original_filename: `${fileName || "upload"} → ${sheetName || category}`,
          status: "processing",
          column_mapping: columnMapping,
        })
        .select("id")
        .single();

      if (sfError) {
        return new Response(JSON.stringify({ error: sfError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get clients for name → id resolution
      const { data: clients } = await supabase.from("clients").select("id, name").eq("organization_id", orgId);
      const clientMap = new Map((clients || []).map(c => [c.name.toLowerCase(), c.id]));

      // If there's only one client and no client_id mapping, auto-assign
      const hasClientMapping = columnMapping && (columnMapping as Record<string, string>).client_id;
      const singleClientId = (clients && clients.length === 1) ? clients[0].id : null;

      // Helper: resolve client name → UUID, auto-creating the client if it doesn't exist yet
      const autoResolveClient = async (rawName: string): Promise<string | null> => {
        const key = rawName.toLowerCase().trim();
        if (clientMap.has(key)) return clientMap.get(key)!;

        // Normalize display name: replace underscores/hyphens with spaces, title-case
        const displayName = rawName.replace(/[_\-]+/g, " ").replace(/\b\w/g, l => l.toUpperCase()).trim();

        // Try to find by normalized name one more time
        const normalized = displayName.toLowerCase();
        if (clientMap.has(normalized)) return clientMap.get(normalized)!;

        // Auto-create the client
        const { data: newClient, error: createErr } = await supabase
          .from("clients")
          .insert({ organization_id: orgId, name: displayName, status: "active" })
          .select("id")
          .single();

        if (createErr || !newClient) {
          console.error(`[process-workbook] Failed to auto-create client "${displayName}":`, createErr?.message);
          return null;
        }

        console.log(`[process-workbook] Auto-created client "${displayName}" → ${newClient.id}`);
        clientMap.set(key, newClient.id);
        clientMap.set(normalized, newClient.id);
        return newClient.id;
      };

      const dateFields = DATE_FIELDS[category] || [];
      const errors: string[] = [];
      const insertRows: Record<string, unknown>[] = [];
      const debugRows: Record<string, unknown>[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const mapped: Record<string, unknown> = {
          organization_id: orgId,
          source_file_id: sourceFile.id,
        };

        // For returns, set is_return flag
        if (category === "returns") {
          mapped.is_return = true;
        }

        try {
          for (const [dbField, csvCol] of Object.entries(columnMapping as Record<string, string>)) {
            if (!csvCol) continue;
            let val: unknown = row[csvCol]?.toString().trim();
            if (val === "" || val === undefined) val = null;

            // Client name → ID resolution (auto-creates client if not found)
            if (dbField === "client_id" && val) {
              const resolved = await autoResolveClient(val as string);
              if (!resolved) {
                errors.push(`Row ${i + 1}: Could not resolve or create client "${val}"`);
                val = null;
              } else {
                val = resolved;
              }
            }

            // Date parsing
            if (dateFields.includes(dbField) && val !== null) {
              val = parseFlexDate(val as string);
            }

            // Integer fields
            if (INT_FIELDS.includes(dbField) && val !== null) {
              val = parseInt(val as string, 10);
              if (isNaN(val as number)) val = null;
            }

            // Float fields (rates, fees, amounts)
            if (FLOAT_FIELDS_PATTERNS.some(p => dbField.includes(p)) && val !== null) {
              val = parseFloat(val as string);
              if (isNaN(val as number)) val = null;
            }

            // Boolean fields
            if (dbField === "is_return" && val !== null) {
              val = ["true", "1", "yes", "y"].includes((val as string).toLowerCase());
            }

            mapped[dbField] = val;
          }

          // Defaults
          if (category === "client_rates" && !mapped.effective_from) {
            mapped.effective_from = new Date().toISOString();
          }

          if (!mapped.client_id && singleClientId) {
            mapped.client_id = singleClientId;
          }

          if (!mapped.client_id) {
            errors.push(`Row ${i + 1}: Missing client_id`);
            if (debug) debugRows.push({ rowIndex: i, rawRow: row, mapped, reason: "missing_client_id" });
            continue;
          }

          insertRows.push(mapped);
          if (debug && i < 5) debugRows.push({ rowIndex: i, rawRow: row, mapped, status: "ok" });
        } catch (e) {
          errors.push(`Row ${i + 1}: ${(e as Error).message}`);
        }
      }

      if (insertRows.length === 0) {
        await supabase.from("source_files")
          .update({ status: "error", error_message: errors.join("; ").slice(0, 1000) })
          .eq("id", sourceFile.id);

        const resp: Record<string, unknown> = { error: "No valid rows to insert", errors, rowsInserted: 0 };
        if (debug) resp.debugRows = debugRows;
        resp.columnMappingUsed = columnMapping;
        return new Response(JSON.stringify(resp), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: insertError } = await supabase.from(tableName).insert(insertRows);

      if (insertError) {
        await supabase.from("source_files")
          .update({ status: "error", error_message: insertError.message })
          .eq("id", sourceFile.id);
        return new Response(JSON.stringify({ error: insertError.message, rowsInserted: 0 }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("source_files").update({ status: "processed" }).eq("id", sourceFile.id);

      const resp: Record<string, unknown> = {
        success: true,
        rowsInserted: insertRows.length,
        errors: errors.length > 0 ? errors : undefined,
      };
      if (debug) {
        resp.debugRows = debugRows;
        resp.columnMappingUsed = columnMapping;
      }

      return new Response(JSON.stringify(resp), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-workbook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
