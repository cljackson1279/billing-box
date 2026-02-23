import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QB_CLIENT_ID = Deno.env.get("QB_CLIENT_ID") ?? "";
const QB_CLIENT_SECRET = Deno.env.get("QB_CLIENT_SECRET") ?? "";

// Refresh QB access token if expired
async function refreshTokenIfNeeded(supabase: any, orgId: string): Promise<{ access_token: string; company_id: string } | null> {
  const { data: conn } = await supabase
    .from("quickbooks_connections")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (!conn) return null;

  const isExpired = new Date(conn.expires_at) <= new Date(Date.now() + 60000);
  if (!isExpired) return { access_token: conn.access_token, company_id: conn.company_id };

  // Refresh
  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
    }),
  });

  if (!res.ok) return null;

  const tokens = await res.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from("quickbooks_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? conn.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId);

  return { access_token: tokens.access_token, company_id: conn.company_id };
}

// Map charge_type to QB Item name
function chargeTypeToQBItem(chargeType: string): string {
  const map: Record<string, string> = {
    storage: "Storage Fee",
    storage_pallet: "Storage Fee",
    storage_sku: "Storage Fee",
    receiving: "Receiving Fee",
    pick: "Pick Fee",
    pick_fee: "Pick Fee",
    pack: "Pack Fee",
    pack_fee: "Pack Fee",
    kitting: "Kitting Fee",
    special_handling: "Special Handling Fee",
    handling: "Handling Fee",
  };
  return map[chargeType?.toLowerCase()] ?? "Warehouse Service";
}

// Find or create QB Customer for a client
async function findOrCreateQBCustomer(
  supabase: any,
  orgId: string,
  clientId: string,
  clientName: string,
  accessToken: string,
  companyId: string
): Promise<string | null> {
  // Check existing mapping
  const { data: existing } = await supabase
    .from("quickbooks_customer_map")
    .select("qb_customer_id")
    .eq("organization_id", orgId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (existing?.qb_customer_id) return existing.qb_customer_id;

  // Search QB for customer by name
  const searchRes = await fetch(
    `https://quickbooks.api.intuit.com/v3/company/${companyId}/query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${clientName.replace(/'/g, "\\'")}'`)}&minorversion=65`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } }
  );

  let qbCustomerId: string | null = null;

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    const customers = searchData?.QueryResponse?.Customer ?? [];
    if (customers.length > 0) {
      qbCustomerId = customers[0].Id;
    }
  }

  // Create QB customer if not found
  if (!qbCustomerId) {
    const createRes = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${companyId}/customer?minorversion=65`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ DisplayName: clientName }),
      }
    );

    if (createRes.ok) {
      const createData = await createRes.json();
      qbCustomerId = createData?.Customer?.Id ?? null;
    }
  }

  // Save mapping
  if (qbCustomerId) {
    await supabase.from("quickbooks_customer_map").upsert({
      organization_id: orgId,
      client_id: clientId,
      qb_customer_id: qbCustomerId,
      qb_customer_name: clientName,
      mapped_at: new Date().toISOString(),
    }, { onConflict: "organization_id,client_id" });
  }

  return qbCustomerId;
}

// Sync a single invoice to QB
async function syncInvoiceToQB(
  supabase: any,
  invoice: any,
  lineItems: any[],
  accessToken: string,
  companyId: string,
  qbCustomerId: string
): Promise<{ qb_invoice_id: string; qb_invoice_number: string } | null> {
  const qbLineItems = lineItems.map((li, idx) => ({
    Id: String(idx + 1),
    LineNum: idx + 1,
    Amount: Number(li.line_total ?? 0),
    DetailType: "SalesItemLineDetail",
    SalesItemLineDetail: {
      ItemRef: { value: "1", name: chargeTypeToQBItem(li.charge_type) },
      Qty: Number(li.quantity ?? 1),
      UnitPrice: Number(li.unit_rate ?? 0),
    },
    Description: li.description ?? li.charge_type,
  }));

  const qbInvoice = {
    Line: qbLineItems,
    CustomerRef: { value: qbCustomerId },
    DocNumber: invoice.invoice_number,
    TxnDate: invoice.period_end
      ? new Date(invoice.period_end).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  };

  const res = await fetch(
    `https://quickbooks.api.intuit.com/v3/company/${companyId}/invoice?minorversion=65`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(qbInvoice),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("QB invoice create error:", err);
    return null;
  }

  const data = await res.json();
  return {
    qb_invoice_id: data?.Invoice?.Id ?? "",
    qb_invoice_number: data?.Invoice?.DocNumber ?? invoice.invoice_number,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return new Response(JSON.stringify({ error: "No organization" }), { status: 400, headers: corsHeaders });
  }

  const orgId = profile.organization_id;
  const body = await req.json().catch(() => ({}));
  const { action, invoice_id } = body;

  try {
    const tokens = await refreshTokenIfNeeded(supabase, orgId);
    if (!tokens) {
      return new Response(JSON.stringify({ error: "QuickBooks not connected or token refresh failed" }), { status: 400, headers: corsHeaders });
    }

    // ── SYNC SINGLE INVOICE ────────────────────────────────────────
    if (action === "sync_invoice" && invoice_id) {
      // Mark as syncing
      await supabase.from("invoices").update({ qb_sync_status: "syncing" }).eq("id", invoice_id);

      const { data: invoice } = await supabase
        .from("invoices")
        .select("*, clients(name)")
        .eq("id", invoice_id)
        .eq("organization_id", orgId)
        .single();

      if (!invoice) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: corsHeaders });
      }

      const { data: lineItems } = await supabase
        .from("invoice_line_items")
        .select("*")
        .eq("invoice_id", invoice_id);

      const clientName = (invoice.clients as any)?.name ?? "Unknown Client";
      const qbCustomerId = await findOrCreateQBCustomer(
        supabase, orgId, invoice.client_id, clientName,
        tokens.access_token, tokens.company_id
      );

      if (!qbCustomerId) {
        await supabase.from("invoices").update({ qb_sync_status: "error" }).eq("id", invoice_id);
        return new Response(JSON.stringify({ error: "Could not find or create QB customer" }), { status: 400, headers: corsHeaders });
      }

      const result = await syncInvoiceToQB(
        supabase, invoice, lineItems ?? [],
        tokens.access_token, tokens.company_id, qbCustomerId
      );

      if (!result) {
        await supabase.from("invoices").update({ qb_sync_status: "error" }).eq("id", invoice_id);
        return new Response(JSON.stringify({ error: "Failed to create invoice in QuickBooks" }), { status: 400, headers: corsHeaders });
      }

      await supabase.from("invoices").update({
        qb_invoice_id: result.qb_invoice_id,
        qb_invoice_number: result.qb_invoice_number,
        qb_synced_at: new Date().toISOString(),
        qb_sync_status: "synced",
      }).eq("id", invoice_id);

      return new Response(JSON.stringify({ success: true, qb_invoice_id: result.qb_invoice_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BULK SYNC ALL PENDING ──────────────────────────────────────
    if (action === "sync_all_pending") {
      const { data: pendingInvoices } = await supabase
        .from("invoices")
        .select("*, clients(name)")
        .eq("organization_id", orgId)
        .in("qb_sync_status", ["pending", "error"])
        .limit(50);

      if (!pendingInvoices || pendingInvoices.length === 0) {
        return new Response(JSON.stringify({ success: true, synced: 0, message: "No pending invoices" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let synced = 0;
      let failed = 0;

      for (const invoice of pendingInvoices) {
        try {
          const { data: lineItems } = await supabase
            .from("invoice_line_items")
            .select("*")
            .eq("invoice_id", invoice.id);

          const clientName = (invoice.clients as any)?.name ?? "Unknown Client";
          const qbCustomerId = await findOrCreateQBCustomer(
            supabase, orgId, invoice.client_id, clientName,
            tokens.access_token, tokens.company_id
          );

          if (!qbCustomerId) { failed++; continue; }

          const result = await syncInvoiceToQB(
            supabase, invoice, lineItems ?? [],
            tokens.access_token, tokens.company_id, qbCustomerId
          );

          if (result) {
            await supabase.from("invoices").update({
              qb_invoice_id: result.qb_invoice_id,
              qb_invoice_number: result.qb_invoice_number,
              qb_synced_at: new Date().toISOString(),
              qb_sync_status: "synced",
            }).eq("id", invoice.id);
            synced++;
          } else {
            await supabase.from("invoices").update({ qb_sync_status: "error" }).eq("id", invoice.id);
            failed++;
          }
        } catch {
          failed++;
        }
      }

      return new Response(JSON.stringify({ success: true, synced, failed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET CUSTOMER MAPPINGS ──────────────────────────────────────
    if (action === "get_customer_mappings") {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", orgId);

      const { data: mappings } = await supabase
        .from("quickbooks_customer_map")
        .select("client_id, qb_customer_id, qb_customer_name")
        .eq("organization_id", orgId);

      const mappingMap: Record<string, any> = {};
      (mappings ?? []).forEach((m: any) => { mappingMap[m.client_id] = m; });

      const result = (clients ?? []).map((c: any) => ({
        client_id: c.id,
        client_name: c.name,
        qb_customer_id: mappingMap[c.id]?.qb_customer_id ?? null,
        qb_customer_name: mappingMap[c.id]?.qb_customer_name ?? null,
        mapped: !!mappingMap[c.id],
      }));

      return new Response(JSON.stringify({ mappings: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MANUAL CUSTOMER MAP ────────────────────────────────────────
    if (action === "map_customer") {
      const { client_id, qb_customer_id, qb_customer_name } = body;
      if (!client_id || !qb_customer_id) {
        return new Response(JSON.stringify({ error: "Missing client_id or qb_customer_id" }), { status: 400, headers: corsHeaders });
      }

      await supabase.from("quickbooks_customer_map").upsert({
        organization_id: orgId,
        client_id,
        qb_customer_id,
        qb_customer_name: qb_customer_name ?? "",
        mapped_at: new Date().toISOString(),
      }, { onConflict: "organization_id,client_id" });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
