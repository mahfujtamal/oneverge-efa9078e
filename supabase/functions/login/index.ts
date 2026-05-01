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
    const { identifier, password } = await req.json();

    if (!identifier || typeof identifier !== "string" || !password || typeof password !== "string") {
      return new Response(JSON.stringify({ error: "Identifier and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Lookup customer identity only (no location or service columns —
    //    those live in customer_connections after the identity migration).
    const id = identifier.trim();
    const { data: customer, error: lookupErr } = await supabase
      .from("customers")
      .select("id, user_id, auth_user_id, display_name, phone_number, email, nid, dob, created_at")
      .or(`email.eq.${id},user_id.eq.${id},phone_number.eq.${id}`)
      .maybeSingle();

    if (lookupErr) {
      console.error("Customer lookup failed:", lookupErr);
      return new Response(JSON.stringify({ error: "lookup_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!customer) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verify password using bcrypt DB function
    const { data: verified, error: verifyErr } = await supabase.rpc("verify_customer_password", {
      _customer_id: customer.id,
      _password: password,
    });

    if (verifyErr) {
      console.error("verify_customer_password failed:", verifyErr);
      return new Response(JSON.stringify({ error: "verify_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!verified) {
      return new Response(JSON.stringify({ error: "invalid_password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Force reset if password no longer meets policy
    if (!validatePassword(password)) {
      return new Response(JSON.stringify({ error: "policy_violation" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch the primary connection (is_primary first, then earliest created).
    //    This drives routing — even if a secondary connection is active,
    //    the customer always sees the primary connection's context first.
    const { data: connection } = await supabase
      .from("customer_connections")
      .select("*, areas ( name, districts ( name ) )")
      .eq("customer_id", customer.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    // 4. Resolve ISP name from the primary connection's isp_id
    let resolvedIspName = "OneVerge Global";
    let resolvedIspId: string | null = connection?.isp_id || null;

    if (resolvedIspId) {
      const { data: ispRow } = await supabase
        .from("isps")
        .select("name")
        .eq("id", resolvedIspId)
        .maybeSingle();
      if (ispRow?.name) resolvedIspName = ispRow.name;
    } else if (connection?.area_id) {
      const { data: ispData } = await supabase
        .from("isp_coverage")
        .select("isp_id, isps(name)")
        .eq("area_id", connection.area_id)
        .limit(1)
        .maybeSingle();
      if (ispData) {
        // @ts-ignore
        resolvedIspName = ispData.isps?.name || "OneVerge Global";
        resolvedIspId = ispData.isp_id || null;
      }
    }

    // 5. Derive location string from the connection's area join
    const areaName = (connection?.areas as any)?.name || "";
    const districtName = (connection?.areas as any)?.districts?.name || "";
    const locationStr =
      districtName && areaName
        ? `${districtName} - ${areaName}`
        : areaName || districtName || "";

    // 6. Build a flat merged user object that preserves the shape the frontend
    //    expects: user.account_status, user.balance, user.isp_id, etc.
    const { areas: _areas, ...safeConn } = (connection || {}) as any;
    const mergedUser = {
      ...customer,
      // Connection fields projected flat so frontend needs no changes
      connection_id: connection?.id || null,
      connection_label: connection?.connection_label || null,
      isp_id: resolvedIspId,
      area_id: connection?.area_id || null,
      address: connection?.address || null,
      broadband_plan_id: connection?.broadband_plan_id || null,
      scheduled_broadband_plan_id: connection?.scheduled_broadband_plan_id || null,
      speed: connection?.speed || null,
      account_status: connection?.account_status || "account created",
      balance: connection?.balance ?? 0,
      active_services: connection?.active_services || [],
      scheduled_services: connection?.scheduled_services || [],
      active_addon_plans: connection?.active_addon_plans || {},
      scheduled_addon_plans: connection?.scheduled_addon_plans || {},
      is_primary: connection?.is_primary ?? true,
      // Use connection created_at for billing cycle anchor
      created_at: connection?.created_at || customer.created_at,
      // Derived
      ispName: resolvedIspName,
      ispId: resolvedIspId,
      location: locationStr,
    };

    return new Response(
      JSON.stringify({
        ok: true,
        user: mergedUser,
        ispName: resolvedIspName,
        ispId: resolvedIspId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("login error:", e);
    return new Response(JSON.stringify({ error: "unexpected" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
