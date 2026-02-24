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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Get user org
    const { data: profile, error: profErr } = await userClient
      .from("user_profiles")
      .select("organization_id")
      .single();
    if (profErr || !profile?.organization_id) throw new Error("No org found");
    const orgId = profile.organization_id;

    const { period_start, period_end } = await req.json();
    if (!period_start || !period_end) throw new Error("period_start and period_end required");

    // Create billing run
    const { data: run, error: runErr } = await adminClient
      .from("billing_runs")
      .insert({
        organization_id: orgId,
        period_start,
        period_end,
        status: "processing",
      })
      .select()
      .single();
    if (runErr) throw runErr;

    // Get clients with active rate tables
    const { data: rateTables } = await adminClient
      .from("client_rate_tables")
      .select("*")
      .eq("organization_id", orgId)
      .lte("effective_from", period_end);

    // Group rates by client (use latest)
    const ratesByClient: Record<string, any> = {};
    for (const rt of rateTables || []) {
      const existing = ratesByClient[rt.client_id];
      if (!existing || new Date(rt.effective_from) > new Date(existing.effective_from)) {
        ratesByClient[rt.client_id] = rt;
      }
    }

    const clientIds = Object.keys(ratesByClient);
    if (clientIds.length === 0) {
      await adminClient.from("billing_runs").update({ status: "completed", total_expected_revenue: 0, total_missing_revenue: 0 }).eq("id", run.id);
      return new Response(JSON.stringify({ runId: run.id, totalExpected: 0, totalMissing: 0, charges: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const charges: any[] = [];

    // --- STORAGE CHARGES ---
    const { data: inventory } = await adminClient
      .from("inventory_snapshots")
      .select("*")
      .eq("organization_id", orgId)
      .in("client_id", clientIds)
      .lte("storage_start_date", period_end)
      .or(`storage_end_date.gte.${period_start},storage_end_date.is.null`);

    for (const inv of inventory || []) {
      const rate = ratesByClient[inv.client_id];
      if (!rate) continue;
      const start = new Date(Math.max(new Date(inv.storage_start_date).getTime(), new Date(period_start).getTime()));
      const endDate = inv.storage_end_date ? new Date(Math.min(new Date(inv.storage_end_date).getTime(), new Date(period_end).getTime())) : new Date(period_end);
      const days = Math.max(1, Math.ceil((endDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const pallets = inv.pallet_count || 0;
      const palletRate = rate.storage_rate_per_pallet_per_day || 0;
      const expected = days * pallets * palletRate;
      if (expected > 0) {
        charges.push({
          organization_id: orgId,
          billing_run_id: run.id,
          client_id: inv.client_id,
          charge_type: "storage",
          description: `Storage: ${pallets} pallets × ${days} days @ $${palletRate}/day`,
          quantity: pallets * days,
          unit_rate: palletRate,
          expected_charge: expected,
          billed_charge: 0,
          reference_id: inv.id,
        });
      }
    }

    // --- RECEIVING CHARGES ---
    const { data: receiving } = await adminClient
      .from("receiving_logs")
      .select("*")
      .eq("organization_id", orgId)
      .in("client_id", clientIds)
      .gte("receiving_date", period_start)
      .lte("receiving_date", period_end);

    for (const rec of receiving || []) {
      const rate = ratesByClient[rec.client_id];
      if (!rate) continue;
      const pallets = rec.pallet_count || 0;
      const palletRate = rate.receiving_rate_per_pallet || 0;
      const unitRate = rate.receiving_rate_per_unit || 0;
      const units = rec.units_received || 0;
      const expected = (pallets * palletRate) + (units * unitRate);
      if (expected > 0) {
        charges.push({
          organization_id: orgId,
          billing_run_id: run.id,
          client_id: rec.client_id,
          charge_type: "receiving",
          description: `Receiving: ${pallets} pallets + ${units} units`,
          quantity: pallets + units,
          unit_rate: palletRate || unitRate,
          expected_charge: expected,
          billed_charge: 0,
          reference_id: rec.id,
        });
      }
    }

    // --- HANDLING CHARGES (pick, pack, kitting) ---
    const { data: orders } = await adminClient
      .from("order_activities")
      .select("*")
      .eq("organization_id", orgId)
      .in("client_id", clientIds)
      .gte("order_date", period_start)
      .lte("order_date", period_end);

    for (const ord of orders || []) {
      const rate = ratesByClient[ord.client_id];
      if (!rate) continue;
      const handlingType = (ord.handling_type || "pick").toLowerCase();
      let expected = 0;
      let desc = "";
      const units = ord.units_processed || ord.quantity || 0;

      if (handlingType === "pick" || handlingType === "picking") {
        const r = rate.pick_fee_per_unit || 0;
        expected = units * r;
        desc = `Pick: ${units} units @ $${r}/unit`;
      } else if (handlingType === "pack" || handlingType === "packing") {
        const r = rate.pack_fee_per_order || 0;
        expected = r;
        desc = `Pack: 1 order @ $${r}`;
      } else if (handlingType === "kitting") {
        const r = rate.kitting_fee || 0;
        expected = r;
        desc = `Kitting: 1 @ $${r}`;
      } else if (handlingType === "special" || handlingType === "special_handling") {
        const r = rate.special_handling_fee || 0;
        expected = r;
        desc = `Special handling: 1 @ $${r}`;
      } else {
        const r = rate.pick_fee_per_unit || 0;
        expected = units * r;
        desc = `Handling (${handlingType}): ${units} units @ $${r}/unit`;
      }

      if (expected > 0) {
        charges.push({
          organization_id: orgId,
          billing_run_id: run.id,
          client_id: ord.client_id,
          charge_type: handlingType,
          description: desc,
          quantity: units || 1,
          unit_rate: expected / (units || 1),
          expected_charge: expected,
          billed_charge: 0,
          reference_id: ord.id,
        });
      }
    }

    // --- RETURNS CHARGES ---
    // Returns are stored in order_activities with is_return = true
    const { data: returns } = await adminClient
      .from("order_activities")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_return", true)
      .in("client_id", clientIds)
      .gte("order_date", period_start)
      .lte("order_date", period_end);

    for (const ret of returns || []) {
      const rate = ratesByClient[ret.client_id];
      if (!rate) continue;
      // Support units_returned column OR fall back to units_processed / quantity
      const units = ret.units_returned || ret.units_processed || ret.quantity || 0;
      const feePerUnit = rate.returns_processing_fee_per_unit || rate.return_fee_per_unit || 0;
      const feePerOrder = rate.return_fee_per_order || 0;
      const expected = feePerUnit > 0 ? units * feePerUnit : feePerOrder;
      if (expected > 0) {
        charges.push({
          organization_id: orgId,
          billing_run_id: run.id,
          client_id: ret.client_id,
          charge_type: "returns",
          description: feePerUnit > 0
            ? `Returns: ${units} units @ $${feePerUnit}/unit${ret.order_id ? ` (Order ${ret.order_id})` : ""}`
            : `Returns: 1 order @ $${feePerOrder}${ret.order_id ? ` (Order ${ret.order_id})` : ""}`,
          quantity: feePerUnit > 0 ? units : 1,
          unit_rate: feePerUnit > 0 ? feePerUnit : feePerOrder,
          expected_charge: expected,
          billed_charge: 0,
          reference_id: ret.id,
        });
      }
    }

    // --- ADJUSTMENTS (credits / debits) ---
    const { data: adjustments } = await adminClient
      .from("billing_adjustments")
      .select("*")
      .eq("organization_id", orgId)
      .in("client_id", clientIds)
      .gte("adjustment_date", period_start)
      .lte("adjustment_date", period_end);

    for (const adj of adjustments || []) {
      const amount = parseFloat(adj.adjustment_amount) || 0;
      if (amount === 0) continue;
      charges.push({
        organization_id: orgId,
        billing_run_id: run.id,
        client_id: adj.client_id,
        charge_type: "adjustment",
        description: adj.adjustment_notes || (amount < 0 ? "Credit adjustment" : "Debit adjustment"),
        quantity: 1,
        unit_rate: amount,
        expected_charge: amount,
        billed_charge: 0,
        reference_id: adj.id,
      });
    }

    // --- MONTHLY MINIMUM CHARGES ---
    // Group charges by client and check against minimum
    const chargesByClient: Record<string, number> = {};
    for (const c of charges) {
      chargesByClient[c.client_id] = (chargesByClient[c.client_id] || 0) + (c.expected_charge || 0);
    }

    for (const clientId of clientIds) {
      const rate = ratesByClient[clientId];
      if (!rate?.monthly_minimum_fee) continue;
      const minimum = Number(rate.monthly_minimum_fee);
      const clientTotal = chargesByClient[clientId] || 0;
      if (clientTotal < minimum) {
        const shortfall = minimum - clientTotal;
        charges.push({
          organization_id: orgId,
          billing_run_id: run.id,
          client_id: clientId,
          charge_type: "monthly_minimum",
          description: `Monthly Service Minimum: $${minimum.toFixed(2)} guaranteed (actual $${clientTotal.toFixed(2)})`,
          quantity: 1,
          unit_rate: shortfall,
          expected_charge: shortfall,
          billed_charge: 0,
          reference_id: null,
        });
      }
    }

    // Insert charges in batches
    if (charges.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < charges.length; i += batchSize) {
        const batch = charges.slice(i, i + batchSize);
        const { error: chErr } = await adminClient.from("calculated_charges").insert(batch);
        if (chErr) console.error("Charge insert error:", chErr);
      }
    }

    const totalExpected = charges.reduce((s, c) => s + (c.expected_charge || 0), 0);
    const totalMissing = totalExpected;

    await adminClient
      .from("billing_runs")
      .update({ status: "completed", total_expected_revenue: totalExpected, total_missing_revenue: totalMissing })
      .eq("id", run.id);

    // --- UPDATE CLIENT HEALTH SCORES ---
    for (const clientId of clientIds) {
      const clientCharges = charges.filter(c => c.client_id === clientId);
      const totalRecovered = clientCharges.reduce((s, c) => s + (c.expected_charge || 0), 0);
      const recoveryRate = totalExpected > 0 ? Math.min(100, (totalRecovered / totalExpected) * 100) : 100;
      const leakRisk = Math.max(0, 100 - recoveryRate);

      await adminClient.from("client_health_scores").upsert({
        organization_id: orgId,
        client_id: clientId,
        recovery_rate: recoveryRate,
        leak_risk_score: leakRisk,
        last_billed_at: new Date().toISOString(),
        total_recovered: totalRecovered,
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id,client_id" });
    }

    // --- GENERATE REVENUE ALERTS ---
    // Clear old unresolved alerts for this org
    await adminClient.from("revenue_alerts")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("is_resolved", false);

    // Create new alerts for clients with significant leakage or minimums triggered
    const alerts: any[] = [];
    for (const clientId of clientIds) {
      const rate = ratesByClient[clientId];
      const clientChargeList = charges.filter(c => c.client_id === clientId);

      // Monthly minimum alert
      const minCharge = clientChargeList.find(c => c.charge_type === "monthly_minimum");
      if (minCharge) {
        alerts.push({
          organization_id: orgId,
          client_id: clientId,
          alert_type: "monthly_minimum",
          leak_amount: minCharge.expected_charge,
          description: minCharge.description,
        });
      }

      // Returns unbilled alert (if returns exist but no return rate set)
      const hasReturns = (returns || []).some(r => r.client_id === clientId);
      const hasReturnRate = (rate?.return_fee_per_unit || 0) > 0 || (rate?.return_fee_per_order || 0) > 0;
      if (hasReturns && !hasReturnRate) {
        const returnCount = (returns || []).filter(r => r.client_id === clientId).reduce((s, r) => s + (r.units_returned || 0), 0);
        alerts.push({
          organization_id: orgId,
          client_id: clientId,
          alert_type: "returns_unbilled",
          leak_amount: 0,
          description: `${returnCount} returned units with no return fee configured`,
        });
      }
    }

    if (alerts.length > 0) {
      await adminClient.from("revenue_alerts").insert(alerts);
    }

    // Get client names for response
    const { data: clients } = await adminClient
      .from("clients")
      .select("id, name")
      .eq("organization_id", orgId)
      .in("id", clientIds);
    const clientMap: Record<string, string> = {};
    for (const c of clients || []) clientMap[c.id] = c.name;

    const enrichedCharges = charges.map(c => ({ ...c, client_name: clientMap[c.client_id] || "Unknown" }));

    // Breakdown by charge type
    const breakdown: Record<string, number> = {};
    for (const c of charges) {
      breakdown[c.charge_type] = (breakdown[c.charge_type] || 0) + (c.expected_charge || 0);
    }

    return new Response(
      JSON.stringify({
        runId: run.id,
        totalExpected,
        totalMissing,
        chargeCount: charges.length,
        breakdown,
        charges: enrichedCharges,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Billing error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
