// Updates customer_connections.account_status for browser clients that cannot
// perform this write themselves (RLS grants SELECT only to the anon role).
// Only pre-payment status transitions are allowed here.
// Payment-gated transitions ("active") are handled exclusively by finalize-payment.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_STATUSES = new Set(["feasibility done"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { customerId, connectionId, status } = body || {};

    if (!customerId || !status || !ALLOWED_STATUSES.has(status)) {
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

    let query = supabase
      .from("customer_connections")
      .update({ account_status: status });

    if (connectionId) {
      // @ts-ignore - chaining eq on the update builder
      query = (query as any).eq("id", connectionId).eq("customer_id", customerId);
    } else {
      // @ts-ignore
      query = (query as any).eq("customer_id", customerId).eq("is_primary", true);
    }

    const { error } = await query;
    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: "update_failed", detail: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("update-connection-status failed:", msg);
    return new Response(
      JSON.stringify({ ok: false, error: "internal_error", detail: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
