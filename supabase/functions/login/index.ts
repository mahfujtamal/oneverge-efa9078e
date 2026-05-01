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

    // Lookup customer by email / user_id / phone (identity fields only)
    const id = identifier.trim();
    const { data: customer, error: lookupErr } = await supabase
      .from("customers")
      .select("id, user_id, auth_user_id, display_name, phone_number, email, nid, dob, created_at, updated_at")
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

    // Verify password using bcrypt DB function
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

    // Fetch the primary connection — drives account_status, balance, services, etc.
    const { data: primaryConn } = await supabase
      .from("customer_connections")
      .select("*")
      .eq("customer_id", customer.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    // Resolve ISP from primary connection
    let resolvedIspName = "OneVerge Global";
    let resolvedIspId: string | null = (primaryConn as any)?.isp_id || null;

    if (resolvedIspId) {
      const { data: ispRow } = await supabase
        .from("isps")
        .select("name")
        .eq("id", resolvedIspId)
        .maybeSingle();
      if (ispRow?.name) resolvedIspName = ispRow.name;
    } else if ((primaryConn as any)?.area_id) {
      const { data: ispData } = await supabase
        .from("isp_coverage")
        .select("isp_id, isps(name)")
        .eq("area_id", (primaryConn as any).area_id)
        .limit(1)
        .maybeSingle();

      if (ispData) {
        // @ts-ignore
        resolvedIspName = ispData.isps?.name || "OneVerge Global";
        resolvedIspId = ispData.isp_id || null;
      }
    }

    // Resolve location string from primary connection's area
    let locationStr = (primaryConn as any)?.address || "";
    if ((primaryConn as any)?.area_id) {
      const { data: areaRow } = await supabase
        .from("areas")
        .select("name, districts(name)")
        .eq("id", (primaryConn as any).area_id)
        .maybeSingle();
      if (areaRow) {
        // @ts-ignore
        const districtName = areaRow.districts?.name || "";
        const areaName = areaRow.name || "";
        if (districtName && areaName) locationStr = `${districtName} - ${areaName}`;
        else locationStr = districtName || areaName || locationStr;
      }
    }

    // Merge identity + primary connection fields into a single flat user object.
    // The frontend reads account_status, balance, isp_id, area_id, active_services,
    // scheduled_services, active_addon_plans, scheduled_addon_plans, broadband_plan_id,
    // scheduled_broadband_plan_id, speed, address all from this merged object.
    const mergedUser = {
      ...customer,
      // primary connection fields (override identity where names clash)
      ...(primaryConn ? {
        connection_id: (primaryConn as any).id,
        area_id: (primaryConn as any).area_id,
        address: (primaryConn as any).address,
        isp_id: (primaryConn as any).isp_id,
        broadband_plan_id: (primaryConn as any).broadband_plan_id,
        scheduled_broadband_plan_id: (primaryConn as any).scheduled_broadband_plan_id,
        speed: (primaryConn as any).speed,
        account_status: (primaryConn as any).account_status,
        balance: (primaryConn as any).balance,
        active_services: (primaryConn as any).active_services,
        scheduled_services: (primaryConn as any).scheduled_services,
        active_addon_plans: (primaryConn as any).active_addon_plans,
        scheduled_addon_plans: (primaryConn as any).scheduled_addon_plans,
        is_primary: (primaryConn as any).is_primary,
        connection_label: (primaryConn as any).connection_label,
      } : {}),
      location: locationStr,
      ispName: resolvedIspName,
      isp_id: resolvedIspId,
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
