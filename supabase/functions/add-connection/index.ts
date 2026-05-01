// Adds a new broadband connection to an existing customer account.
// Called when a logged-in customer goes through the "Add Connection" flow.
// Identity (password, NID, etc.) is already on file — only connection fields needed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      customer_id,
      connection_label,
      isp_id,
      area_id,
      broadband_plan_id,
      speed,
      address,
      active_services,
      scheduled_services,
      active_addon_plans,
      scheduled_addon_plans,
    } = body || {};

    if (!customer_id || !UUID_REGEX.test(customer_id)) {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_customer_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!area_id || !UUID_REGEX.test(area_id)) {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_area_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Verify the customer exists
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customer_id)
      .maybeSingle();

    if (custErr || !customer) {
      return new Response(
        JSON.stringify({ ok: false, error: "customer_not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: connection, error: connErr } = await supabase
      .from("customer_connections")
      .insert([{
        customer_id,
        connection_label: connection_label || "New Connection",
        isp_id: isp_id || null,
        area_id,
        broadband_plan_id: broadband_plan_id || null,
        speed: speed || "50 Mbps",
        address: address || null,
        account_status: "account created",
        balance: 0,
        active_services: active_services || [],
        scheduled_services: scheduled_services || [],
        active_addon_plans: active_addon_plans || {},
        scheduled_addon_plans: scheduled_addon_plans || {},
        is_primary: false,
      }])
      .select()
      .single();

    if (connErr || !connection) {
      console.error("add-connection insert failed:", connErr);
      return new Response(
        JSON.stringify({ ok: false, error: "insert_failed", detail: connErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, connection }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("add-connection error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "unexpected" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
