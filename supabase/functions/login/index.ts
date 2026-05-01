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

    // Lookup customer by email / user_id / phone (with location join)
    const id = identifier.trim();
    const { data: customer, error: lookupErr } = await supabase
      .from("customers")
      .select("*")
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

    // Resolve ISP — prefer the customer's stored isp_id; fall back to area coverage
    let resolvedIspName = "OneVerge Global";
    let resolvedIspId: string | null = (customer as any).isp_id || null;

    if (resolvedIspId) {
      const { data: ispRow } = await supabase
        .from("isps")
        .select("name")
        .eq("id", resolvedIspId)
        .maybeSingle();
      if (ispRow?.name) resolvedIspName = ispRow.name;
    } else if (customer.area_id) {
      const { data: ispData } = await supabase
        .from("isp_coverage")
        .select("isp_id, isps(name)")
        .eq("area_id", customer.area_id)
        .limit(1)
        .maybeSingle();

      if (ispData) {
        // @ts-ignore
        resolvedIspName = ispData.isps?.name || "OneVerge Global";
        resolvedIspId = ispData.isp_id || null;

        // Backfill the customer record so next login is deterministic
        if (resolvedIspId) {
          await supabase
            .from("customers")
            .update({ isp_id: resolvedIspId })
            .eq("id", customer.id);
          (customer as any).isp_id = resolvedIspId;
        }
      }
    }

    // Strip sensitive fields from response
    const { password: _pw, password_hash: _ph, ...safeCustomer } = customer as any;

    return new Response(
      JSON.stringify({
        ok: true,
        user: safeCustomer,
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
