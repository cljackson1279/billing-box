import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: profile } = await userClient.from("user_profiles").select("organization_id").single();
    if (!profile?.organization_id) throw new Error("No org found");
    const orgId = profile.organization_id;

    const { action, billing_run_id, invoice_id, status } = await req.json();

    if (action === "generate") {
      if (!billing_run_id) throw new Error("billing_run_id required");

      // Get org slug
      const { data: org } = await adminClient.from("organizations").select("slug").eq("id", orgId).single();
      const slug = (org?.slug || "ORG").toUpperCase();

      // Get billing run
      const { data: run } = await adminClient.from("billing_runs").select("*").eq("id", billing_run_id).eq("organization_id", orgId).single();
      if (!run) throw new Error("Billing run not found");

      // Get charges grouped by client
      const { data: charges } = await adminClient
        .from("calculated_charges")
        .select("*, clients(name)")
        .eq("billing_run_id", billing_run_id)
        .eq("organization_id", orgId);

      if (!charges || charges.length === 0) throw new Error("No charges found for this billing run");

      // Group by client
      const byClient: Record<string, any[]> = {};
      for (const c of charges) {
        if (!byClient[c.client_id]) byClient[c.client_id] = [];
        byClient[c.client_id].push(c);
      }

      // Get existing invoice count for sequence
      const periodMonth = new Date(run.period_start).toISOString().slice(0, 7).replace("-", "");
      const { count: existingCount } = await adminClient
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .like("invoice_number", `DBXAI-${slug}-${periodMonth}%`);

      let seq = (existingCount || 0) + 1;
      const createdInvoices: any[] = [];

      for (const [clientId, clientCharges] of Object.entries(byClient)) {
        const clientName = (clientCharges[0].clients as any)?.name || "Unknown";
        const invoiceNumber = `DBXAI-${slug}-${periodMonth}-${String(seq).padStart(3, "0")}`;
        seq++;

        // Aggregate line items by charge_type
        const lineItemMap: Record<string, { charge_type: string; description: string; quantity: number; unit_rate: number; line_total: number }> = {};
        for (const ch of clientCharges) {
          const ct = ch.charge_type || "other";
          if (!lineItemMap[ct]) {
            lineItemMap[ct] = { charge_type: ct, description: ch.description || ct, quantity: 0, unit_rate: ch.unit_rate || 0, line_total: 0 };
          }
          lineItemMap[ct].quantity += ch.quantity || 0;
          lineItemMap[ct].line_total += ch.expected_charge || 0;
        }

        const lineItems = Object.values(lineItemMap);
        // Recalculate unit_rate as average
        for (const li of lineItems) {
          if (li.quantity > 0) li.unit_rate = li.line_total / li.quantity;
        }

        const subtotal = lineItems.reduce((s, li) => s + li.line_total, 0);
        const taxAmount = 0; // MVP: no tax
        const totalAmount = subtotal + taxAmount;

        // Insert invoice
        const { data: invoice, error: invErr } = await adminClient
          .from("invoices")
          .insert({
            organization_id: orgId,
            client_id: clientId,
            billing_run_id,
            invoice_number: invoiceNumber,
            period_start: run.period_start,
            period_end: run.period_end,
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: "draft",
          })
          .select()
          .single();
        if (invErr) throw invErr;

        // Insert line items
        const lineItemRows = lineItems.map((li) => ({
          organization_id: orgId,
          invoice_id: invoice.id,
          charge_type: li.charge_type,
          description: li.description,
          quantity: li.quantity,
          unit_rate: li.unit_rate,
          line_total: li.line_total,
        }));

        const { error: liErr } = await adminClient.from("invoice_line_items").insert(lineItemRows);
        if (liErr) console.error("Line item insert error:", liErr);

        createdInvoices.push({
          id: invoice.id,
          invoice_number: invoiceNumber,
          client_name: clientName,
          subtotal,
          total_amount: totalAmount,
          line_items_count: lineItems.length,
        });
      }

      return new Response(
        JSON.stringify({ invoices: createdInvoices, count: createdInvoices.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_status") {
      if (!invoice_id || !status) throw new Error("invoice_id and status required");
      const validStatuses = ["draft", "final", "sent", "paid"];
      if (!validStatuses.includes(status)) throw new Error("Invalid status");

      const { error } = await adminClient
        .from("invoices")
        .update({ status })
        .eq("id", invoice_id)
        .eq("organization_id", orgId);
      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Unknown action. Use 'generate' or 'update_status'.");
  } catch (err) {
    console.error("Invoice error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
