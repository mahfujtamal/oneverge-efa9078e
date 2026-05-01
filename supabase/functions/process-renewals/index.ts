// Daily renewal processor.
// For each active customer whose monthly cycle is due (today >= nextRenewalDate):
//   - If balance >= cycleCost: debit balance, promote scheduled_services -> active_services,
//     insert a paid billing_history row, keep account_status active.
//   - If balance < cycleCost: set account_status = 'expired', clear active_services. No history row.
// Also reactivates 'expired' customers whose balance now covers the cycle.
//
// Schedule: daily at 18:05 UTC (00:05 BDT) via pg_cron.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mirror of src/lib/constants.ts ONEVERGE_SUITE_RATES — keep in sync.
const SUITE_RATES: Record<string, number> = {
  cloud: 500,
  "ai-chatbot": 800,
  security: 150,
  streaming: 600,
  "smart-home": 1200,
  mobility: 900,
  gaming: 450,
  broadband: 0,
};

// Default broadband base price when the customer has no stored plan price.
// Mirrors the frontend fallback (RenewPayment / Index).
const DEFAULT_BASE_PRICE = 800;

/** Resolve the broadband base price for a customer.
 *  Priority:
 *    1. broadband_plans.price via customer.broadband_plan_id (matches UI).
 *    2. isp_area_plans -> broadband_plans relational lookup via isp_id + area_id + speed.
 *    3. DEFAULT_BASE_PRICE fallback.
 */
async function resolveBasePrice(
  supabase: ReturnType<typeof createClient>,
  customer: {
    broadband_plan_id?: string | null;
    isp_id?: string | null;
    area_id?: string | null;
    speed?: string | number | null;
  },
): Promise<number> {
  if (customer.broadband_plan_id) {
    const { data } = await supabase
      .from("broadband_plans")
      .select("price, base_price, is_active")
      .eq("id", customer.broadband_plan_id)
      .maybeSingle();
    if (data) {
      const price = Number((data as any).price ?? (data as any).base_price ?? 0);
      if (price > 0) return price;
    }
  }

  if (customer.isp_id && customer.area_id && customer.speed != null) {
    const { data: links } = await supabase
      .from("isp_area_plans")
      .select("plan_id")
      .eq("isp_id", customer.isp_id)
      .eq("area_id", customer.area_id);

    const planIds = (links || []).map((l: any) => l.plan_id).filter(Boolean);
    if (planIds.length > 0) {
      const { data: plans } = await supabase
        .from("broadband_plans")
        .select("id, price, base_price, speed, is_active")
        .in("id", planIds);
      const speedStr = String(customer.speed);
      const match = (plans || []).find(
        (p: any) => String(p.speed) === speedStr && p.is_active !== false,
      );
      if (match) {
        const price = Number(match.price ?? match.base_price ?? 0);
        if (price > 0) return price;
      }
    }
  }

  return DEFAULT_BASE_PRICE;
}

/** Compute the next renewal date (calendar-day) given an activation date.
 *  The first renewal is one calendar month AFTER activation, so an account
 *  activated today is NOT due today. Mirrors Dashboard.tsx logic. */
function nextRenewalDate(activationISO: string, today: Date): Date {
  const activation = new Date(activationISO);
  activation.setHours(0, 0, 0, 0);
  const todayDateOnly = new Date(today);
  todayDateOnly.setHours(0, 0, 0, 0);
  const originalDay = activation.getDate();

  // Start at activation + 1 month (the first eligible renewal).
  const next = new Date(activation);
  let targetMonth = next.getMonth() + 1;
  next.setDate(1);
  next.setMonth(targetMonth);
  let lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDay));

  while (next < todayDateOnly) {
    targetMonth = next.getMonth() + 1;
    next.setDate(1);
    next.setMonth(targetMonth);
    lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDay, lastDay));
  }
  return next;
}

function computeCycleCost(scheduledServices: string[] | null, basePrice: number): number {
  const addons = (scheduledServices || []).filter((id) => id !== "broadband");
  const addonsTotal = addons.reduce((sum, id) => sum + (SUITE_RATES[id] || 0), 0);
  return basePrice + addonsTotal;
}

function billingPeriodFor(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    const todayDateOnly = new Date(today);
    todayDateOnly.setHours(0, 0, 0, 0);

    // Pull all provisioned connections (post-activation) and any already-expired ones.
    // Exclude un-provisioned states like "account created".
    const { data: connections, error } = await supabase
      .from("customer_connections")
      .select(
        "id, customer_id, balance, scheduled_services, active_services, scheduled_addon_plans, active_addon_plans, broadband_plan_id, scheduled_broadband_plan_id, created_at, account_status, isp_id, area_id, speed",
      )
      .neq("account_status", "account created");

    if (error) throw error;

    // Resolve cycle anchor for a connection:
    //   - latest paid billing_history.created_at (last successful renewal), OR
    //   - customer_connections.created_at (initial activation, before any renewal).
    async function resolveCycleAnchor(connectionId: string, fallbackISO: string): Promise<string> {
      const { data } = await supabase
        .from("billing_history")
        .select("created_at")
        .eq("connection_id", connectionId)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastPaid = (data as any)?.created_at as string | undefined;
      return lastPaid || fallbackISO;
    }

    const summary = {
      total: connections?.length ?? 0,
      renewed: 0,
      expired: 0,
      reactivated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const c of connections || []) {
      try {
        if (!c.created_at) {
          summary.skipped++;
          continue;
        }

        const cycleAnchor = await resolveCycleAnchor(c.id, c.created_at);
        const renewal = nextRenewalDate(cycleAnchor, today);
        // For active connections: only act if today >= renewal date.
        // For expired connections: always re-evaluate (recovery flow).
        const isExpired = c.account_status === "expired";
        if (!isExpired && todayDateOnly < renewal) {
          summary.skipped++;
          continue;
        }

        const basePrice = await resolveBasePrice(supabase, {
          broadband_plan_id: (c as any).broadband_plan_id,
          isp_id: (c as any).isp_id,
          area_id: (c as any).area_id,
          speed: (c as any).speed,
        });
        const cycleCost = computeCycleCost(c.scheduled_services, basePrice);
        const balance = Number(c.balance || 0);

        if (balance >= cycleCost) {
          // Renew: debit, promote services, write paid history row, mark active.
          const newBalance = balance - cycleCost;
          const promoted = c.scheduled_services || [];
          const snapshot = ["broadband", ...promoted.filter((s: string) => s !== "broadband")];

          const { error: updErr } = await supabase
            .from("customer_connections")
            .update({
              balance: newBalance,
              active_services: promoted,
              scheduled_services: promoted,
              // Promote next-cycle addon plan selections and broadband plan to active.
              // Both scheduled columns are reset to the promoted value so the customer
              // starts the new cycle with a clean default (same as what just activated).
              active_addon_plans: (c as any).scheduled_addon_plans ?? (c as any).active_addon_plans ?? {},
              scheduled_addon_plans: (c as any).scheduled_addon_plans ?? (c as any).active_addon_plans ?? {},
              broadband_plan_id: (c as any).scheduled_broadband_plan_id || c.broadband_plan_id,
              scheduled_broadband_plan_id: (c as any).scheduled_broadband_plan_id || c.broadband_plan_id,
              account_status: "active",
            })
            .eq("id", c.id);
          if (updErr) throw updErr;

          const { error: histErr } = await supabase.from("billing_history").insert({
            customer_id: c.customer_id,
            connection_id: c.id,
            billing_period: billingPeriodFor(renewal),
            total_billed: cycleCost,
            services_snapshot: snapshot,
            status: "paid",
          });
          if (histErr) throw histErr;

          if (isExpired) summary.reactivated++;
          else summary.renewed++;
        } else if (!isExpired) {
          // Insufficient balance on renewal date — expire the connection.
          const { error: updErr } = await supabase
            .from("customer_connections")
            .update({
              account_status: "expired",
              active_services: [],
            })
            .eq("id", c.id);
          if (updErr) throw updErr;
          summary.expired++;
        } else {
          // Already expired and still no funds — leave as-is.
          summary.skipped++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        summary.errors.push(`Connection ${c.id}: ${msg}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, summary, processed_at: today.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("process-renewals error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
