import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Category patterns for classification ─────────────────────────────────

const CATEGORY_PATTERNS: Record<string, string[]> = {
  client_rates: [
    "storage_rate", "receiving_rate", "pick_fee", "pack_fee", "return_fee",
    "minimum_fee", "kitting_fee", "special_handling", "rate_per_pallet",
    "rate_per_unit", "effective_from", "effective_date", "daily_rate",
    "pallet_rate", "inbound_rate",
  ],
  inventory: [
    "sku", "quantity", "pallet_count", "pallets", "total_pallets",
    "storage_start", "storage_end", "date_in", "received_date",
    "warehouse_location", "location", "bin", "lot",
  ],
  receiving: [
    "pallet_count", "received_pallets", "units_received", "total_units",
    "receiving_date", "inbound_date", "receive_date",
    "inbound", "receiving_type", "receipt",
  ],
  order: [
    "order_id", "order_number", "order_date", "pick_date",
    "handling_type", "activity_type", "pick", "pack",
    "units_processed", "fulfillment", "shipment",
  ],
  returns: [
    "return", "rma", "units_returned", "return_quantity", "rma_units",
    "return_date", "rma_date", "return_reason", "disposition",
    "refund", "credit",
  ],
  adjustments: [
    "credit_amount", "adjustment_amount", "debit_amount",
    "adjustment", "adjustment_date", "write_off", "notes",
  ],
};

// ─── Universal column aliases ──────────────────────────────────────────────
// Maps standard DB field → list of accepted column name variants (case-insensitive)

const COLUMN_ALIASES: Record<string, string[]> = {
  // Shared
  client_id: ["client_id", "client", "client_name", "customer", "customer_name", "account"],

  // Inventory
  pallet_count: ["pallet_count", "pallets", "total_pallets", "num_pallets", "pallet_qty", "pallet_number"],
  sku: ["sku", "sku_id", "item_id", "item_number", "product_id", "product_code", "upc"],
  quantity: ["quantity", "qty", "units", "total_units", "unit_count", "pieces"],
  storage_start_date: ["storage_start_date", "storage_start", "date_in", "received_date", "in_date", "start_date"],
  storage_end_date: ["storage_end_date", "storage_end", "date_out", "out_date", "end_date", "departure_date"],
  warehouse_location: ["warehouse_location", "location", "bin", "bin_location", "aisle", "zone", "slot"],

  // Receiving
  units_received: ["units_received", "total_units", "units", "qty_received", "received_qty", "pieces_received"],
  receiving_date: ["receiving_date", "inbound_date", "receive_date", "date_received", "arrival_date"],
  receiving_type: ["receiving_type", "receipt_type", "inbound_type", "type"],

  // Orders
  order_id: ["order_id", "order_number", "order_num", "order_ref", "reference", "po_number", "po"],
  order_date: ["order_date", "pick_date", "fulfillment_date", "ship_date", "date"],
  handling_type: ["handling_type", "activity_type", "type", "service_type", "operation"],
  units_processed: ["units_processed", "quantity", "qty", "units", "pieces"],

  // Returns
  units_returned: ["units_returned", "return_quantity", "rma_units", "returned_qty", "qty_returned"],
  return_date: ["return_date", "rma_date", "date_returned", "date"],
  return_reason: ["return_reason", "reason", "rma_reason", "notes"],
  disposition: ["disposition", "return_disposition", "action"],

  // Adjustments
  adjustment_amount: ["adjustment_amount", "credit_amount", "debit_amount", "amount", "value"],
  adjustment_date: ["adjustment_date", "date", "credit_date"],
  adjustment_notes: ["notes", "reason", "description", "memo"],

  // Client rates
  storage_rate_per_pallet_per_day: ["storage_rate_per_pallet_per_day", "storage_rate", "pallet_rate", "daily_rate", "rate_per_pallet_per_day", "storage_daily_rate"],
  storage_rate_per_sku_per_day: ["storage_rate_per_sku_per_day", "sku_rate", "rate_per_sku"],
  receiving_rate_per_pallet: ["receiving_rate_per_pallet", "receiving_rate", "inbound_rate", "rate_per_pallet"],
  receiving_rate_per_unit: ["receiving_rate_per_unit", "receiving_unit_rate", "rate_per_unit"],
  pick_fee_per_unit: ["pick_fee_per_unit", "pick_fee", "pick_rate", "pick_charge"],
  pack_fee_per_order: ["pack_fee_per_order", "pack_fee", "pack_rate", "pack_charge"],
  kitting_fee: ["kitting_fee", "kitting_rate", "kit_fee"],
  special_handling_fee: ["special_handling_fee", "special_handling", "special_rate", "handling_fee"],
  monthly_minimum_fee: ["monthly_minimum_fee", "monthly_minimum", "minimum_fee", "min_fee", "minimum"],
  effective_from: ["effective_from", "effective_date", "start_date", "date"],
};

// ─── Date parsing (handles multiple formats) ──────────────────────────────

function parseDate(val: string): string | null {
  if (!val || val.trim() === "") return null;
  const s = val.trim();

  // ISO: 2026-02-01
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // MM/DD/YYYY or M/D/YY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    const year = y.length === 2 ? (parseInt(y) > 50 ? `19${y}` : `20${y}`) : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // DD-Mon-YY or Mon-DD-YY (e.g. Feb-1, 1-Feb-26)
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const monMatch = s.match(/^(\d{1,2})-([a-zA-Z]{3})-?(\d{2,4})?$/) ||
                   s.match(/^([a-zA-Z]{3})-(\d{1,2})-?(\d{2,4})?$/);
  if (monMatch) {
    const parts = monMatch.slice(1);
    const monthPart = parts.find(p => /^[a-zA-Z]/.test(p))?.toLowerCase().slice(0, 3);
    const dayPart = parts.find(p => /^\d{1,2}$/.test(p));
    const yearPart = parts.find(p => /^\d{3,4}$/.test(p)) || "2026";
    if (monthPart && months[monthPart] && dayPart) {
      const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
      return `${year}-${months[monthPart]}-${dayPart.padStart(2, "0")}`;
    }
  }

  // Try native Date parse as last resort
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────

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
  returns: "order_activities",   // returns stored as order_activities with is_return=true
  adjustments: "billing_adjustments",
};

const REQUIRED_FIELDS: Record<string, string[]> = {
  inventory: ["client_id", "sku", "quantity", "pallet_count", "storage_start_date", "storage_end_date"],
  order: ["client_id", "order_id", "sku", "quantity", "order_date", "handling_type", "units_processed"],
  receiving: ["client_id", "pallet_count", "units_received", "receiving_date", "receiving_type"],
  returns: ["client_id", "order_id", "units_returned", "return_date"],
  adjustments: ["client_id", "adjustment_amount", "adjustment_date"],
  client_rates: [
    "client_id", "storage_rate_per_pallet_per_day", "receiving_rate_per_pallet",
    "pick_fee_per_unit", "pack_fee_per_order", "effective_from",
  ],
};

// ─── Classification ────────────────────────────────────────────────────────

function classifySheetByPatterns(headers: string[]): { category: string; confidence: "high" | "medium" | "low" } {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[\s\-\.]/g, "_"));
  const scores: Record<string, number> = {};

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    let matchCount = 0;
    for (const pattern of patterns) {
      if (normalizedHeaders.some(h => h.includes(pattern))) matchCount++;
    }
    if (matchCount > 0) scores[category] = matchCount / patterns.length;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { category: "unknown", confidence: "low" };

  const [bestCat, bestScore] = sorted[0];
  const confidence = bestScore >= 0.3 ? "high" : bestScore >= 0.15 ? "medium" : "low";
  return { category: bestCat, confidence };
}

function autoMapColumns(headers: string[], category: string): Record<string, string> {
  const required = REQUIRED_FIELDS[category] || [];
  const mapping: Record<string, string> = {};

  for (const field of required) {
    const aliases = COLUMN_ALIASES[field] || [field];
    const match = headers.find(h => {
      const nh = h.toLowerCase().replace(/[\s_\-\.]/g, "");
      return aliases.some(alias => {
        const na = alias.toLowerCase().replace(/[\s_\-\.]/g, "");
        return nh === na || nh.includes(na) || na.includes(nh);
      });
    });
    if (match) mapping[field] = match;
  }

  return mapping;
}

async function classifyWithAI(sheets: SheetInfo[]): Promise<ClassifiedSheet[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return sheets.map(sheet => {
      const { category, confidence } = classifySheetByPatterns(sheet.headers);
      return {
        ...sheet,
        category,
        categoryLabel: CATEGORY_LABELS[category] || "Unrecognized",
        confidence,
        columnMapping: autoMapColumns(sheet.headers, category),
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
        tools: [
          {
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
                        category: {
                          type: "string",
                          enum: ["client_rates", "inventory", "receiving", "order", "returns", "adjustments", "unknown"],
                        },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        columnMapping: {
                          type: "object",
                          description: "Map of standard_db_field -> csv_column_header",
                          additionalProperties: { type: "string" },
                        },
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
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_sheets" } },
      }),
    });

    if (!response.ok) throw new Error("AI API failed");

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);
    return sheets.map((sheet, i) => {
      const aiResult = result.classifications.find((c: { sheetIndex: number }) => c.sheetIndex === i);
      if (aiResult) {
        const patternMapping = autoMapColumns(sheet.headers, aiResult.category);
        return {
          ...sheet,
          category: aiResult.category,
          categoryLabel: CATEGORY_LABELS[aiResult.category] || "Unrecognized",
          confidence: aiResult.confidence,
          columnMapping: { ...patternMapping, ...aiResult.columnMapping },
        };
      }
      const { category, confidence } = classifySheetByPatterns(sheet.headers);
      return {
        ...sheet,
        category,
        categoryLabel: CATEGORY_LABELS[category] || "Unrecognized",
        confidence,
        columnMapping: autoMapColumns(sheet.headers, category),
      };
    });
  } catch (err) {
    console.error("AI classification error:", err);
    return sheets.map(sheet => {
      const { category, confidence } = classifySheetByPatterns(sheet.headers);
      return {
        ...sheet,
        category,
        categoryLabel: CATEGORY_LABELS[category] || "Unrecognized",
        confidence,
        columnMapping: autoMapColumns(sheet.headers, category),
      };
    });
  }
}

// ─── Revenue calculation preview ──────────────────────────────────────────

interface RevenuePreview {
  storage: number;
  receiving: number;
  handling: number;
  returns: number;
  adjustments: number;
  monthly_minimum: number;
  grand_total: number;
  debug_lines: string[];
}

function calculateRevenuePreview(
  sheets: Array<{ category: string; columnMapping: Record<string, string>; allRows: Record<string, string>[] }>,
  rates: { storage_rate_per_pallet_per_day?: number; receiving_rate_per_pallet?: number; pick_fee_per_unit?: number; pack_fee_per_order?: number; return_fee_per_unit?: number; monthly_minimum_fee?: number } | null,
  debug: boolean
): RevenuePreview {
  const debugLines: string[] = [];
  let storage = 0, receiving = 0, handling = 0, returns = 0, adjustments = 0;

  const storageRate = rates?.storage_rate_per_pallet_per_day || 0;
  const receivingRate = rates?.receiving_rate_per_pallet || 0;
  const pickRate = rates?.pick_fee_per_unit || 0;
  const packRate = rates?.pack_fee_per_order || 0;
  const returnRate = rates?.return_fee_per_unit || 0;
  const monthlyMin = rates?.monthly_minimum_fee || 0;

  for (const sheet of sheets) {
    const { category, columnMapping, allRows } = sheet;

    if (category === "inventory") {
      let totalPallets = 0, totalDays = 0, count = 0;
      for (const row of allRows) {
        const pallets = parseFloat(row[columnMapping.pallet_count] || "0") || 0;
        const startStr = row[columnMapping.storage_start_date] || "";
        const endStr = row[columnMapping.storage_end_date] || "";
        const start = parseDate(startStr);
        const end = parseDate(endStr);
        const days = start && end
          ? Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
          : 30;
        const rowCharge = pallets * days * storageRate;
        storage += rowCharge;
        totalPallets += pallets;
        totalDays = days;
        count++;
      }
      if (debug) debugLines.push(`Inventory: ${count} rows, ${totalPallets} total pallets → $${storage.toFixed(2)} storage @ $${storageRate}/pallet/day`);
    }

    if (category === "receiving") {
      let totalPallets = 0;
      for (const row of allRows) {
        const pallets = parseFloat(row[columnMapping.pallet_count] || "0") || 0;
        totalPallets += pallets;
        receiving += pallets * receivingRate;
      }
      if (debug) debugLines.push(`Receiving: ${totalPallets} pallets × $${receivingRate} = $${receiving.toFixed(2)}`);
    }

    if (category === "order") {
      let pickUnits = 0, packOrders = 0, kitting = 0, special = 0;
      for (const row of allRows) {
        const type = (row[columnMapping.handling_type] || "").toLowerCase();
        const units = parseFloat(row[columnMapping.units_processed] || row[columnMapping.quantity] || "0") || 0;
        if (type.includes("pick")) { handling += units * pickRate; pickUnits += units; }
        else if (type.includes("pack")) { handling += units * packRate; packOrders += units; }
        else if (type.includes("kit")) { handling += units * (pickRate * 2); kitting += units; }
        else if (type.includes("special")) { handling += units * (pickRate * 3); special += units; }
        else { handling += units * pickRate; pickUnits += units; }
      }
      if (debug) debugLines.push(`Orders: pick ${pickUnits}u, pack ${packOrders}u, kit ${kitting}u, special ${special}u → $${handling.toFixed(2)}`);
    }

    if (category === "returns") {
      let totalUnits = 0;
      for (const row of allRows) {
        const units = parseFloat(row[columnMapping.units_returned] || "0") || 0;
        totalUnits += units;
        returns += units * returnRate;
      }
      if (debug) debugLines.push(`Returns: ${totalUnits} units × $${returnRate} = $${returns.toFixed(2)}`);
    }

    if (category === "adjustments") {
      for (const row of allRows) {
        const amt = parseFloat(row[columnMapping.adjustment_amount] || "0") || 0;
        adjustments += amt;
      }
      if (debug) debugLines.push(`Adjustments: $${adjustments.toFixed(2)}`);
    }
  }

  const subtotal = storage + receiving + handling + returns + adjustments;
  const minApplied = subtotal < monthlyMin ? monthlyMin - subtotal : 0;
  const grandTotal = subtotal + minApplied;

  if (debug) {
    debugLines.push(`Rates applied: $${storageRate}/pallet/day storage, $${receivingRate}/pallet receiving, $${pickRate}/unit pick, $${packRate}/order pack`);
    debugLines.push(`Monthly minimum: $${monthlyMin} — ${minApplied > 0 ? `applied $${minApplied.toFixed(2)} shortfall` : "not applied (total exceeds minimum)"}`);
    debugLines.push(`GRAND TOTAL: $${grandTotal.toFixed(2)}`);
  }

  return { storage, receiving, handling, returns, adjustments, monthly_minimum: minApplied, grand_total: grandTotal, debug_lines: debugLines };
}

// ─── Main handler ─────────────────────────────────────────────────────────

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.organization_id;
    const body = await req.json();
    const { action } = body;

    // ── ACTION: classify ──────────────────────────────────────────────────
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

    // ── ACTION: preview-revenue ───────────────────────────────────────────
    if (action === "preview-revenue") {
      const { sheets, debug } = body as {
        sheets: Array<{ category: string; columnMapping: Record<string, string>; allRows: Record<string, string>[] }>;
        debug?: boolean;
      };

      // Fetch latest client rates for the org
      const { data: latestRates } = await supabaseAdmin
        .from("client_rate_tables")
        .select("*")
        .eq("organization_id", orgId)
        .order("effective_from", { ascending: false })
        .limit(1)
        .single();

      // Also check if rates are in the uploaded sheets
      const ratesSheet = sheets.find(s => s.category === "client_rates");
      let ratesFromSheet: Record<string, number> | null = null;
      if (ratesSheet && ratesSheet.allRows.length > 0) {
        const row = ratesSheet.allRows[0];
        const m = ratesSheet.columnMapping;
        ratesFromSheet = {
          storage_rate_per_pallet_per_day: parseFloat(row[m.storage_rate_per_pallet_per_day] || "0") || 0,
          receiving_rate_per_pallet: parseFloat(row[m.receiving_rate_per_pallet] || "0") || 0,
          pick_fee_per_unit: parseFloat(row[m.pick_fee_per_unit] || "0") || 0,
          pack_fee_per_order: parseFloat(row[m.pack_fee_per_order] || "0") || 0,
          return_fee_per_unit: parseFloat(row[m.return_fee_per_unit || m.returns_processing_fee_per_unit] || "0") || 0,
          monthly_minimum_fee: parseFloat(row[m.monthly_minimum_fee] || "0") || 0,
        };
      }

      const rates = ratesFromSheet || latestRates;
      const preview = calculateRevenuePreview(sheets, rates, debug ?? false);

      return new Response(JSON.stringify({ preview }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: ingest-sheet ──────────────────────────────────────────────
    if (action === "ingest-sheet") {
      const { sheetName, category, columnMapping, rows, fileName } = body;

      if (!category || !columnMapping || !rows || !Array.isArray(rows)) {
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

      // Create source file record
      const { data: sourceFile, error: sfError } = await supabaseAdmin
        .from("source_files")
        .insert({
          organization_id: orgId,
          file_type: category,
          original_filename: `${fileName} → ${sheetName}`,
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
      const { data: clients } = await supabaseAdmin
        .from("clients")
        .select("id, name")
        .eq("organization_id", orgId);

      const clientMap = new Map((clients || []).map((c) => [c.name.toLowerCase().trim(), c.id]));

      const errors: string[] = [];
      const insertRows: Record<string, unknown>[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const mapped: Record<string, unknown> = {
          organization_id: orgId,
          source_file_id: sourceFile.id,
        };

        try {
          for (const [dbField, csvCol] of Object.entries(columnMapping as Record<string, string>)) {
            if (!csvCol) continue;
            let val: unknown = row[csvCol]?.toString().trim();
            if (val === "" || val === undefined || val === null) { val = null; continue; }

            // Client ID resolution
            if (dbField === "client_id" && val) {
              const resolved = clientMap.get((val as string).toLowerCase().trim());
              if (!resolved) {
                errors.push(`Row ${i + 1}: Unknown client "${val}" — skipping row`);
                val = null;
              } else {
                val = resolved;
              }
            }

            // Integer fields
            if (["quantity", "pallet_count", "units_received", "units_processed", "units_returned"].includes(dbField) && val !== null) {
              val = parseInt(val as string, 10);
              if (isNaN(val as number)) val = null;
            }

            // Numeric/rate fields
            if ((dbField.includes("rate") || dbField.includes("fee") || dbField.includes("amount") || dbField.includes("minimum")) && val !== null) {
              val = parseFloat((val as string).replace(/[$,]/g, ""));
              if (isNaN(val as number)) val = null;
            }

            // Date fields
            if (dbField.includes("date") || dbField === "effective_from") {
              val = parseDate(val as string);
            }

            mapped[dbField] = val;
          }

          // Category-specific defaults and transforms
          if (category === "client_rates" && !mapped.effective_from) {
            mapped.effective_from = new Date().toISOString().slice(0, 10);
          }

          if (category === "returns") {
            mapped.is_return = true;
            mapped.handling_type = "returns";
            // Map return-specific fields
            if (!mapped.order_id) mapped.order_id = `RET-${Date.now()}-${i}`;
            if (mapped.units_returned) {
              mapped.units_processed = mapped.units_returned;
              mapped.quantity = mapped.units_returned;
            }
            if (mapped.return_date) mapped.order_date = mapped.return_date;
            if (mapped.return_reason) mapped.return_reason = mapped.return_reason;
          }

          if (!mapped.client_id) {
            errors.push(`Row ${i + 1}: Missing or unresolved client_id — skipping`);
            continue;
          }

          insertRows.push(mapped);
        } catch (e) {
          errors.push(`Row ${i + 1}: ${(e as Error).message}`);
        }
      }

      if (insertRows.length === 0) {
        await supabaseAdmin
          .from("source_files")
          .update({ status: "error", error_message: errors.join("; ").slice(0, 1000) })
          .eq("id", sourceFile.id);

        return new Response(
          JSON.stringify({ error: "No valid rows to insert", errors, rowsInserted: 0 }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: insertError } = await supabaseAdmin.from(tableName).insert(insertRows);

      if (insertError) {
        await supabaseAdmin
          .from("source_files")
          .update({ status: "error", error_message: insertError.message })
          .eq("id", sourceFile.id);

        return new Response(
          JSON.stringify({ error: insertError.message, rowsInserted: 0 }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await supabaseAdmin
        .from("source_files")
        .update({ status: "processed" })
        .eq("id", sourceFile.id);

      return new Response(
        JSON.stringify({ success: true, rowsInserted: insertRows.length, errors: errors.length > 0 ? errors : undefined }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
