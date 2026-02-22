import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { parse } from "https://esm.sh/papaparse@5.4.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Required fields per file type
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

const TABLE_MAP: Record<string, string> = {
  inventory: "inventory_snapshots",
  order: "order_activities",
  receiving: "receiving_logs",
  client_rates: "client_rate_tables",
};

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

    // Also create a user-scoped client to get user info
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's org
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

    // ACTION: parse - parse CSV and return headers + preview rows
    if (action === "parse") {
      const { csvContent, fileName, fileType } = body;

      if (!csvContent || !fileType) {
        return new Response(JSON.stringify({ error: "Missing csvContent or fileType" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const parsed = parse(csvContent, { header: true, skipEmptyLines: true });
      const headers = parsed.meta.fields || [];
      const previewRows = (parsed.data as Record<string, string>[]).slice(0, 10);
      const totalRows = (parsed.data as Record<string, string>[]).length;
      const requiredFields = REQUIRED_FIELDS[fileType] || [];

      // Store the file in storage
      const storagePath = `${orgId}/${Date.now()}_${fileName}`;
      await supabase.storage.from("csv-uploads").upload(storagePath, csvContent, {
        contentType: "text/csv",
        upsert: false,
      });

      // Create source_files record
      const { data: sourceFile, error: sfError } = await supabase
        .from("source_files")
        .insert({
          organization_id: orgId,
          file_type: fileType,
          original_filename: fileName,
          storage_path: storagePath,
          status: "uploaded",
        })
        .select("id")
        .single();

      if (sfError) {
        return new Response(JSON.stringify({ error: sfError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          sourceFileId: sourceFile.id,
          headers,
          previewRows,
          totalRows,
          requiredFields,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ACTION: ingest - map columns and insert data
    if (action === "ingest") {
      const { sourceFileId, columnMapping, fileType } = body;

      if (!sourceFileId || !columnMapping || !fileType) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save column mapping
      await supabase
        .from("source_files")
        .update({ column_mapping: columnMapping, status: "processing" })
        .eq("id", sourceFileId);

      // Get stored file
      const { data: sf } = await supabase
        .from("source_files")
        .select("storage_path")
        .eq("id", sourceFileId)
        .single();

      if (!sf?.storage_path) {
        return new Response(JSON.stringify({ error: "Source file not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: fileData } = await supabase.storage
        .from("csv-uploads")
        .download(sf.storage_path);

      if (!fileData) {
        return new Response(JSON.stringify({ error: "File download failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const csvText = await fileData.text();
      const parsed = parse(csvText, { header: true, skipEmptyLines: true });
      const rows = parsed.data as Record<string, string>[];

      // Get clients for name → id resolution
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", orgId);

      const clientMap = new Map((clients || []).map((c) => [c.name.toLowerCase(), c.id]));

      const tableName = TABLE_MAP[fileType];
      const errors: string[] = [];
      const insertRows: Record<string, unknown>[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const mapped: Record<string, unknown> = {
          organization_id: orgId,
          source_file_id: sourceFileId,
        };

        try {
          for (const [dbField, csvCol] of Object.entries(columnMapping as Record<string, string>)) {
            if (!csvCol) continue;
            let val: unknown = row[csvCol]?.trim();
            if (val === "" || val === undefined) val = null;

            // Resolve client_id from name if needed
            if (dbField === "client_id" && val) {
              const resolved = clientMap.get((val as string).toLowerCase());
              if (!resolved) {
                errors.push(`Row ${i + 1}: Unknown client "${val}"`);
                val = null;
              } else {
                val = resolved;
              }
            }

            // Parse numbers
            if (
              ["quantity", "pallet_count", "units_received", "units_processed"].includes(dbField) &&
              val !== null
            ) {
              val = parseInt(val as string, 10);
              if (isNaN(val as number)) val = null;
            }

            // Parse decimals (rates)
            if (dbField.includes("rate") || dbField.includes("fee")) {
              if (val !== null) {
                val = parseFloat(val as string);
                if (isNaN(val as number)) val = null;
              }
            }

            mapped[dbField] = val;
          }

          // For client_rates, add effective_from if not mapped
          if (fileType === "client_rates" && !mapped.effective_from) {
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
          .eq("id", sourceFileId);

        return new Response(
          JSON.stringify({ error: "No valid rows to insert", errors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Batch insert
      const { error: insertError } = await supabase.from(tableName).insert(insertRows);

      if (insertError) {
        await supabase
          .from("source_files")
          .update({ status: "error", error_message: insertError.message })
          .eq("id", sourceFileId);

        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Mark as processed
      await supabase
        .from("source_files")
        .update({ status: "processed" })
        .eq("id", sourceFileId);

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
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
