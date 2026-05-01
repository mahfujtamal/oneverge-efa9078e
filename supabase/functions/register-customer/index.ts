import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function validatePassword(pw: string): boolean {
  if (typeof pw !== "string") return false;
  if (pw.length < 13) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      user_id,
      display_name,
      phone_number,
      email,
      address,
      area_id,
      isp_id,
      broadband_plan_id,
      nid,
      dob,
      password,
      active_services,
      active_addon_plans,
      speed,
    } = body || {};

    // Basic validation
    if (!email || !password || !display_name || !phone_number) {
      return new Response(
        JSON.stringify({ error: "missing_required_fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!validatePassword(password)) {
      return new Response(
        JSON.stringify({ error: "policy_violation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Insert identity-only customer record. All service/billing/location
    // data is owned by customer_connections (created below).
    const { data: inserted, error: insertErr } = await supabase
      .from("customers")
      .insert([{
        user_id,
        display_name,
        phone_number,
        email,
        nid: nid != null ? Number(nid) : null,
        dob: dob || null,
      }])
      .select()
      .single();

    if (insertErr || !inserted) {
      console.error("Customer insert failed:", insertErr);
      return new Response(
        JSON.stringify({ error: "insert_failed", detail: insertErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Hash + store password via SECURITY DEFINER RPC (bcrypt)
    const { error: pwErr } = await supabase.rpc("set_customer_password", {
      _customer_id: inserted.id,
      _new_password: password,
    });

    if (pwErr) {
      console.error("set_customer_password failed:", pwErr);
      // Roll back the inserted row to avoid orphaned passwordless accounts
      await supabase.from("customers").delete().eq("id", inserted.id);
      return new Response(
        JSON.stringify({ error: "password_hash_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create the first connection row for this customer.
    const { data: connection, error: connErr } = await supabase
      .from("customer_connections")
      .insert([{
        customer_id: inserted.id,
        connection_label: "Primary",
        isp_id: isp_id || null,
        area_id: area_id || null,
        broadband_plan_id: broadband_plan_id || null,
        scheduled_broadband_plan_id: broadband_plan_id || null,
        speed: speed || "50 Mbps",
        address: address || null,
        account_status: "account created",
        balance: 0,
        active_services: active_services || [],
        scheduled_services: active_services || [],
        active_addon_plans: active_addon_plans || {},
        scheduled_addon_plans: active_addon_plans || {},
        is_primary: true,
      }])
      .select("id")
      .single();

    if (connErr || !connection) {
      console.error("customer_connections insert failed:", connErr);
      // Non-fatal: customer row exists; connection can be created by retry.
      // Still return the customer so onboarding can proceed.
    }

    // Strip any sensitive fields before returning
    const { password: _p, password_hash: _h, ...safe } = inserted as any;

    return new Response(
      JSON.stringify({ ok: true, customer: safe, connection_id: connection?.id ?? null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("register-customer error:", e);
    return new Response(
      JSON.stringify({ error: "unexpected" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
