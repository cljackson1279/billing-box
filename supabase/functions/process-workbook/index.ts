import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// DB table names for categories that can be ingested
const TABLE_MAP: Record<string, string> = {
  inventory: "inventory_snapshots",
  order: "order_activities",
  receiving: "receiving_logs",
  client_rates: "client_rate_tables",
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
};

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

function autoMapColumns(headers: string[], category: string): Record<string, string> {
  const required = REQUIRED_FIELDS[category] || [];
  const mapping: Record<string, string> = {};

  for (const field of required) {
    const normalizedField = field.replace(/_/g, "");
    const match = headers.find(h => {
      const nh = h.toLowerCase().replace(/[\s_\-\.]/g, "");
      return nh === normalizedField || nh.includes(normalizedField) || normalizedField.includes(nh);
    });
    if (match) mapping[field] = match;
  }

  return mapping;
}

async function classifyWithAI(sheets: SheetInfo[]): Promise<ClassifiedSheet[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    // Fallback to pattern matching
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

    if (!response.ok) {
      console.error("AI classification failed, falling back to patterns");
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

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);
    const classifications = result.classifications;

    return sheets.map((sheet, i) => {
      const aiResult = classifications.find((c: { sheetIndex: number }) => c.sheetIndex === i);
      if (aiResult) {
        // Merge AI mapping with pattern-based mapping as fallback
        const patternMapping = autoMapColumns(sheet.headers, aiResult.category);
        const mergedMapping = { ...patternMapping, ...aiResult.columnMapping };
        return {
          ...sheet,
          category: aiResult.category,
          categoryLabel: CATEGORY_LABELS[aiResult.category] || "Unrecognized",
          confidence: aiResult.confidence,
          columnMapping: mergedMapping,
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.organization_id;
    const body = await req.json();
    const { action } = body;

    // ACTION: classify - receive sheet info and classify with AI
    if (action === "classify") {
      const { sheets } = body as { sheets: SheetInfo[] };
      if (!sheets || !Array.isArray(sheets)) {
        return new Response(JSON.stringify({ error: "Missing sheets data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const classified = await classifyWithAI(sheets);

      return new Response(JSON.stringify({ classifications: classified }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: ingest-sheet - process a single classified sheet's data
    if (action === "ingest-sheet") {
      const { sheetName, category, columnMapping, rows, fileName } = body;

      if (!category || !columnMapping || !rows || !Array.isArray(rows)) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tableName = TABLE_MAP[category];
      if (!tableName) {
        return new Response(JSON.stringify({
          success: true,
          rowsInserted: 0,
          skipped: true,
          message: `Category "${category}" is not yet supported for ingestion`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create source file record
      const { data: sourceFile, error: sfError } = await supabase
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
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get clients for name → id resolution
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", orgId);

      const clientMap = new Map((clients || []).map((c) => [c.name.toLowerCase(), c.id]));

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
            if (val === "" || val === undefined) val = null;

            if (dbField === "client_id" && val) {
              const resolved = clientMap.get((val as string).toLowerCase());
              if (!resolved) {
                errors.push(`Row ${i + 1}: Unknown client "${val}"`);
                val = null;
              } else {
                val = resolved;
              }
            }

            if (
              ["quantity", "pallet_count", "units_received", "units_processed"].includes(dbField) &&
              val !== null
            ) {
              val = parseInt(val as string, 10);
              if (isNaN(val as number)) val = null;
            }

            if (dbField.includes("rate") || dbField.includes("fee")) {
              if (val !== null) {
                val = parseFloat(val as string);
                if (isNaN(val as number)) val = null;
              }
            }

            mapped[dbField] = val;
          }

          if (category === "client_rates" && !mapped.effective_from) {
            mapped.effective_from = new Date().toISOString();
          }

          if (!mapped.client_id) {
            errors.push(`Row ${i + 1}: Missing client_id`);
            continue;
          }

          insertRows.push(mapped);
        } catch (e) {
          errors.push(`Row ${i + 1}: ${(e as Error).message}`);
        }
      }

      if (insertRows.length === 0) {
        await supabase
          .from("source_files")
          .update({ status: "error", error_message: errors.join("; ").slice(0, 1000) })
          .eq("id", sourceFile.id);

        return new Response(
          JSON.stringify({ error: "No valid rows to insert", errors, rowsInserted: 0 }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: insertError } = await supabase.from(tableName).insert(insertRows);

      if (insertError) {
        await supabase
          .from("source_files")
          .update({ status: "error", error_message: insertError.message })
          .eq("id", sourceFile.id);

        return new Response(
          JSON.stringify({ error: insertError.message, rowsInserted: 0 }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await supabase
        .from("source_files")
        .update({ status: "processed" })
        .eq("id", sourceFile.id);

      return new Response(
        JSON.stringify({
          success: true,
          rowsInserted: insertRows.length,
          errors: errors.length > 0 ? errors : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-workbook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
