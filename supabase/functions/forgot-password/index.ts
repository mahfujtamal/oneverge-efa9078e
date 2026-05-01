import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOKEN_TTL_MINUTES = 30;

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, appOrigin } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Always return success (do not leak whether the email exists)
    const genericResponse = {
      ok: true,
      message: "If an account exists for that email, a reset link has been sent.",
    };

    const { data: customer } = await supabase
      .from("customers")
      .select("id, email, display_name")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (!customer) {
      return new Response(JSON.stringify(genericResponse), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate token + hash
    const token = generateToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    // Invalidate existing unused tokens for this customer
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("customer_id", customer.id)
      .is("used_at", null);

    const { error: insertErr } = await supabase.from("password_reset_tokens").insert({
      customer_id: customer.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

    if (insertErr) {
      console.error("Token insert failed:", insertErr);
      return new Response(JSON.stringify({ error: "Could not create reset token" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = (appOrigin && typeof appOrigin === "string")
      ? appOrigin.replace(/\/$/, "")
      : "https://oneverge.lovable.app";
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // Invoke send-transactional-email (handles render + enqueue + suppression checks)
    try {
      const { error: sendErr } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: "password-reset",
            recipientEmail: customer.email,
            idempotencyKey: `pwreset-${customer.id}-${Date.now()}`,
            templateData: {
              name: customer.display_name || "there",
              resetUrl,
              ttlMinutes: TOKEN_TTL_MINUTES,
            },
          },
        },
      );
      if (sendErr) {
        console.error("send-transactional-email failed:", sendErr);
      }
    } catch (e) {
      console.error("send-transactional-email threw:", e);
    }

    return new Response(JSON.stringify(genericResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("forgot-password error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
