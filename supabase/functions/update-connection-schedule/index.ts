// Updates a customer connection's next-cycle schedule (services + plan choices).
// Uses the service role because customer auth is a custom password flow (no auth.uid),
// so RLS policies that depend on auth.uid() cannot match. The function still
// verifies the customer owns the connection before mutating.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      customer_id,
      connection_id,
      scheduled_services,
      scheduled_broadband_plan_id,
      scheduled_addon_plans,
    } = body || {};

    if (!customer_id || !UUID_RE.test(customer_id)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_customer_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!connection_id || !UUID_RE.test(connection_id)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_connection_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(scheduled_services)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_services" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Verify ownership
    const { data: existing, error: lookupErr } = await supabase
      .from("customer_connections")
      .select("id, customer_id")
      .eq("id", connection_id)
      .eq("customer_id", customer_id)
      .maybeSingle();

    if (lookupErr || !existing) {
      return new Response(JSON.stringify({ ok: false, error: "connection_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Always keep broadband in scheduled services
    const services: string[] = scheduled_services.includes("broadband")
      ? scheduled_services
      : [...scheduled_services, "broadband"];

    // Only retain addon-plan entries for addons that are scheduled (and not broadband)
    const addonPlansFiltered: Record<string, string> = {};
    if (scheduled_addon_plans && typeof scheduled_addon_plans === "object") {
      for (const id of services) {
        if (id === "broadband") continue;
        const planId = (scheduled_addon_plans as Record<string, string>)[id];
        if (planId) addonPlansFiltered[id] = planId;
      }
    }

    const { data: updated, error: updErr } = await supabase
      .from("customer_connections")
      .update({
        scheduled_services: services,
        scheduled_broadband_plan_id: scheduled_broadband_plan_id || null,
        scheduled_addon_plans: addonPlansFiltered,
      })
      .eq("id", connection_id)
      .select("id, scheduled_services, scheduled_broadband_plan_id, scheduled_addon_plans")
      .single();

    if (updErr || !updated) {
      console.error("update-connection-schedule failed:", updErr);
      return new Response(
        JSON.stringify({ ok: false, error: "update_failed", detail: updErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true, connection: updated }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-connection-schedule error:", e);
    return new Response(JSON.stringify({ ok: false, error: "unexpected" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
