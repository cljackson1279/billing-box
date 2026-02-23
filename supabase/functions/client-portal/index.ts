import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || (await req.json().catch(() => ({}))).action;

  try {
    // ── GENERATE PORTAL LINK ──────────────────────────────────────
    if (action === "generate_link") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const body = await req.json().catch(() => ({}));
      const { client_id } = body;
      if (!client_id) return new Response(JSON.stringify({ error: "client_id required" }), { status: 400, headers: corsHeaders });

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return new Response(JSON.stringify({ error: "No organization" }), { status: 400, headers: corsHeaders });

      const { data: link, error: linkErr } = await supabase
        .from("client_portal_links")
        .upsert({
          organization_id: profile.organization_id,
          client_id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: "organization_id,client_id" })
        .select("token")
        .single();

      if (linkErr) return new Response(JSON.stringify({ error: linkErr.message }), { status: 500, headers: corsHeaders });

      const portalUrl = `${Deno.env.get("SITE_URL") ?? "https://dispatchboxai.com"}/portal?token=${link.token}`;
      return new Response(JSON.stringify({ url: portalUrl, token: link.token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET PORTAL DATA (public, token-based) ────────────────────
    if (action === "get_portal_data") {
      const body = await req.json().catch(() => ({}));
      const { token } = body;
      if (!token) return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: corsHeaders });

      const { data: link } = await supabase
        .from("client_portal_links")
        .select("*, clients(name, contact_email), organizations(name)")
        .eq("token", token)
        .maybeSingle();

      if (!link) return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 404, headers: corsHeaders });
      if (new Date(link.expires_at) < new Date()) return new Response(JSON.stringify({ error: "Portal link has expired" }), { status: 410, headers: corsHeaders });

      const orgId = link.organization_id;
      const clientId = link.client_id;

      // Fetch invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", orgId)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch inventory
      const { data: inventory } = await supabase
        .from("inventory_snapshots")
        .select("*")
        .eq("organization_id", orgId)
        .eq("client_id", clientId)
        .is("storage_end_date", null)
        .order("storage_start_date", { ascending: false })
        .limit(50);

      // Fetch recent orders
      const { data: orders } = await supabase
        .from("order_activities")
        .select("*")
        .eq("organization_id", orgId)
        .eq("client_id", clientId)
        .order("order_date", { ascending: false })
        .limit(20);

      // Aggregate stats
      const totalBilled = (invoices || []).reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);
      const totalPallets = (inventory || []).reduce((s: number, inv: any) => s + (inv.pallet_count || 0), 0);
      const totalSkus = (inventory || []).length;

      return new Response(JSON.stringify({
        client: link.clients,
        organization: link.organizations,
        stats: { total_billed: totalBilled, total_pallets: totalPallets, total_skus: totalSkus, invoice_count: (invoices || []).length },
        invoices: invoices || [],
        inventory: inventory || [],
        orders: orders || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── LIST PORTAL LINKS (authenticated) ────────────────────────
    if (action === "list_links") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return new Response(JSON.stringify({ links: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: links } = await supabase
        .from("client_portal_links")
        .select("*, clients(name)")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({ links: links || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
