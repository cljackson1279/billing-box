import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QB_CLIENT_ID     = Deno.env.get("QB_CLIENT_ID") ?? "";
const QB_CLIENT_SECRET = Deno.env.get("QB_CLIENT_SECRET") ?? "";
const QB_SCOPE         = "com.intuit.quickbooks.accounting";
const QB_AUTH_URL      = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL     = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

// The redirect URI must be your FRONTEND app URL.
// Intuit sends the user's browser back here with ?code=&realmId=&state=
// so the React Settings page can detect those params and call the callback action.
// SITE_URL secret should be set to: https://dispatchboxai.com
// This code normalises the value even if the secret is stored without "https://"
let _siteUrl = (Deno.env.get("SITE_URL") ?? "dispatchboxai.com").replace(/\/$/, "");
if (!_siteUrl.startsWith("http://") && !_siteUrl.startsWith("https://")) {
  _siteUrl = "https://" + _siteUrl;
}
const SITE_URL = _siteUrl;
const REDIRECT_URI = `${SITE_URL}/settings?tab=integrations`;

console.log("[QB-DEBUG] SITE_URL env raw:", Deno.env.get("SITE_URL") ?? "(not set)");
console.log("[QB-DEBUG] SITE_URL normalized:", SITE_URL);
console.log("[QB-DEBUG] REDIRECT_URI:", REDIRECT_URI);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Parse action from query string OR JSON body
  const url = new URL(req.url);
  let action: string | null = url.searchParams.get("action");
  let body: Record<string, any> = {};
  if (!action) {
    try { body = await req.json(); action = body.action ?? null; } catch { /* no body */ }
  }

  try {
    // ── GET OAUTH URL ──────────────────────────────────────────────
    if (action === "get_auth_url") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const state = btoa(JSON.stringify({ user_id: user.id, ts: Date.now() }));
      const params = new URLSearchParams({
        client_id: QB_CLIENT_ID,
        scope: QB_SCOPE,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        state,
      });
      const authUrl = `${QB_AUTH_URL}?${params.toString()}`;
      // Return both the URL and the redirect_uri so the frontend knows what was sent
      return new Response(JSON.stringify({ url: authUrl, redirect_uri: REDIRECT_URI }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── OAUTH CALLBACK ─────────────────────────────────────────────
    // Called by the frontend after detecting code+realmId+state in the URL params.
    if (action === "callback") {
      const { code, state, realmId } = body;

      if (!code || !realmId) {
        return new Response(JSON.stringify({ error: "Missing code or realmId" }), { status: 400, headers: corsHeaders });
      }

      // Decode state to get user_id
      let userId: string;
      try {
        const decoded = JSON.parse(atob(state));
        userId = decoded.user_id;
      } catch {
        return new Response(JSON.stringify({ error: "Invalid state parameter" }), { status: 400, headers: corsHeaders });
      }

      // Exchange authorization code for tokens
      const tokenRes = await fetch(QB_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,   // must match exactly what was sent in get_auth_url
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        return new Response(JSON.stringify({ error: "Token exchange failed", detail: err }), {
          status: 400, headers: corsHeaders,
        });
      }

      const tokens = await tokenRes.json();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Fetch QB company info (non-fatal)
      let companyName = "";
      try {
        const companyRes = await fetch(
          `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`,
          { headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" } }
        );
        if (companyRes.ok) {
          const companyData = await companyRes.json();
          companyName = companyData?.CompanyInfo?.CompanyName ?? "";
        }
      } catch { /* non-fatal */ }

      // Get org_id for this user
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", userId)
        .single();

      if (!profile?.organization_id) {
        return new Response(JSON.stringify({ error: "No organization found for user" }), {
          status: 400, headers: corsHeaders,
        });
      }

      // Upsert QB connection record
      const { error: upsertErr } = await supabase
        .from("quickbooks_connections")
        .upsert({
          organization_id: profile.organization_id,
          company_id: realmId,
          company_name: companyName,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          status: "connected",
          updated_at: new Date().toISOString(),
        }, { onConflict: "organization_id" });

      if (upsertErr) {
        return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, company_name: companyName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DISCONNECT ─────────────────────────────────────────────────
    if (action === "disconnect") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        await supabase
          .from("quickbooks_connections")
          .delete()
          .eq("organization_id", profile.organization_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET STATUS ─────────────────────────────────────────────────
    if (action === "status") {
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
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: conn } = await supabase
        .from("quickbooks_connections")
        .select("company_id, company_name, status, expires_at, updated_at")
        .eq("organization_id", profile.organization_id)
        .maybeSingle();

      const { count: totalInvoices } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id);

      const { count: syncedInvoices } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)
        .eq("qb_sync_status", "synced");

      return new Response(JSON.stringify({
        connected: !!conn,
        company_name: conn?.company_name ?? null,
        company_id: conn?.company_id ?? null,
        status: conn?.status ?? null,
        expires_at: conn?.expires_at ?? null,
        sync_stats: { total: totalInvoices ?? 0, synced: syncedInvoices ?? 0 },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
