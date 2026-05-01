// Service-role finaliser for non-relocation payments.
// The browser cannot perform these writes directly because:
//   - customers/payments RLS requires an auth.uid() match, but onboarding
//     customers are not yet in supabase.auth (custom password flow).
//   - billing_history has no public INSERT policy.
//
// This function applies the wallet-first business rules and returns the
// post-state so the client can refresh its session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FinalisePayload {
  context: "activation" | "renewal" | "topup";
  customerId: string;
  connectionId?: string | null; // If provided, operates on customer_connections row
  transactionId: string;
  amountPaid: number;
  basePrice: number;
  scheduledServices: string[];
  isRenewalDue: boolean;
  // ISO date string for the billing period when context === "renewal"
  nextRenewalDate: string;
  // Per-addon rates so the function does not need to import constants.
  addonRates: Record<string, number>;
  // Plan selections the customer made at checkout — written to active/scheduled columns on activation.
  scheduledAddonPlans?: Record<string, string> | null;
  scheduledBroadbandPlanId?: string | null;
}

const billingPeriodFor = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const computeCycleCost = (
  services: string[],
  basePrice: number,
  rates: Record<string, number>,
) => {
  const addons = services.filter((s) => s !== "broadband");
  const addonsTotal = addons.reduce(
    (sum, id) => sum + (Number(rates[id]) || 0),
    0,
  );
  return basePrice + addonsTotal;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as FinalisePayload;
    if (
      !body?.customerId ||
      !body?.transactionId ||
      typeof body?.amountPaid !== "number" ||
      typeof body?.basePrice !== "number" ||
      !Array.isArray(body?.scheduledServices) ||
      !body?.context
    ) {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Prefer operating on customer_connections when a connectionId is provided.
    // Fall back to customers for backward compat (no connectionId supplied).
    const useConnection = !!body.connectionId;

    let record: Record<string, any> | null = null;
    let recordErr: any = null;

    if (useConnection) {
      const { data, error } = await supabase
        .from("customer_connections")
        .select("id, balance, account_status, active_services, scheduled_services, active_addon_plans, scheduled_addon_plans, broadband_plan_id, scheduled_broadband_plan_id, created_at")
        .eq("id", body.connectionId!)
        .eq("customer_id", body.customerId)
        .maybeSingle();
      record = data;
      recordErr = error;
    } else {
      const { data, error } = await supabase
        .from("customers")
        .select("id, balance, account_status, active_services, scheduled_services, active_addon_plans, scheduled_addon_plans, broadband_plan_id, scheduled_broadband_plan_id, created_at")
        .eq("id", body.customerId)
        .maybeSingle();
      record = data;
      recordErr = error;
    }

    if (recordErr || !record) {
      return new Response(
        JSON.stringify({ ok: false, error: "customer_not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const startBalance = Number(record.balance || 0);
    const creditedBalance = startBalance + Number(body.amountPaid);

    const cycleServices =
      body.scheduledServices.length > 0 ? body.scheduledServices : ["broadband"];
    const cycleCost = computeCycleCost(cycleServices, body.basePrice, body.addonRates || {});

    const shouldConsumeCycle =
      body.context === "activation" ||
      (body.context === "renewal" && body.isRenewalDue && creditedBalance >= cycleCost);

    const updates: Record<string, unknown> = { balance: creditedBalance };
    let postBalance = creditedBalance;
    let cycleConsumed = false;

    if (shouldConsumeCycle) {
      postBalance = creditedBalance - cycleCost;
      updates.balance = postBalance;
      updates.active_services = cycleServices;
      updates.scheduled_services = cycleServices;
      updates.account_status = "active";
      cycleConsumed = true;

      // Re-anchor the billing cycle to today when an expired connection is
      // reactivated, so the next renewal lands one full month from this payment.
      if (body.context === "renewal" && record.account_status === "expired") {
        updates.created_at = new Date().toISOString();
      }

      // For activation: write the plan selections the customer made at the payment step.
      // This overrides whatever register-customer seeded, capturing any last-minute changes.
      if (body.context === "activation") {
        if (body.scheduledAddonPlans && Object.keys(body.scheduledAddonPlans).length > 0) {
          updates.active_addon_plans = body.scheduledAddonPlans;
          updates.scheduled_addon_plans = body.scheduledAddonPlans;
        }
        if (body.scheduledBroadbandPlanId) {
          updates.broadband_plan_id = body.scheduledBroadbandPlanId;
          updates.scheduled_broadband_plan_id = body.scheduledBroadbandPlanId;
        }
      }

      // For renewals: promote scheduled addon plan selections and broadband plan
      // to active so the customer's next-cycle configuration actually takes effect.
      if (body.context === "renewal") {
        updates.active_addon_plans = record.scheduled_addon_plans ?? record.active_addon_plans ?? {};
        updates.scheduled_addon_plans = record.scheduled_addon_plans ?? record.active_addon_plans ?? {};
        if (record.scheduled_broadband_plan_id) {
          updates.broadband_plan_id = record.scheduled_broadband_plan_id;
          updates.scheduled_broadband_plan_id = record.scheduled_broadband_plan_id;
        }
      }
    }

    const table = useConnection ? "customer_connections" : "customers";
    const idCol = useConnection ? body.connectionId! : body.customerId;

    const { error: updErr } = await supabase
      .from(table)
      .update(updates)
      .eq("id", idCol);
    if (updErr) {
      return new Response(
        JSON.stringify({ ok: false, error: "customer_update_failed", detail: updErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // When the payment targets a connection row, sync the parent customers
    // record too — the login edge function reads from customers.account_status,
    // so without this the user would be routed back to the payment step on next login.
    // We sync on ANY activation payment (not just when the cycle is consumed),
    // because the activation transaction itself completes the onboarding step
    // even if the credited balance does not yet cover one full billing cycle.
    if (useConnection && body.customerId && (cycleConsumed || body.context === "activation")) {
      const { error: custSyncErr } = await supabase
        .from("customers")
        .update({ account_status: "active" })
        .eq("id", body.customerId);
      if (custSyncErr) {
        console.error("customers.account_status sync failed:", custSyncErr.message);
      }
    }

    // Flip payment to success.
    const { error: payErr } = await supabase
      .from("payments")
      .update({ status: "success" })
      .eq("transaction_id", body.transactionId);
    if (payErr) {
      console.warn("payments status update failed:", payErr.message);
    }

    // billing_history only when a cycle was actually consumed (activation or successful renewal).
    if (cycleConsumed) {
      const periodAnchor =
        body.context === "activation" ? new Date() : new Date(body.nextRenewalDate);
      const { error: histErr } = await supabase.from("billing_history").insert({
        customer_id: body.customerId,
        connection_id: body.connectionId ?? null,
        billing_period: billingPeriodFor(periodAnchor),
        total_billed: cycleCost,
        services_snapshot: cycleServices,
        status: "paid",
      });
      if (histErr) console.error("billing_history insert failed:", histErr.message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        cycleConsumed,
        cycleAmount: cycleConsumed ? cycleCost : 0,
        cycleServices: cycleConsumed ? cycleServices : [],
        newBalance: postBalance,
        updates,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("finalize-payment failed:", msg);
    return new Response(
      JSON.stringify({ ok: false, error: "internal_error", detail: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
