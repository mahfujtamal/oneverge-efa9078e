import { supabase } from "@/integrations/supabase/client";

const SESSION_MAX_AGE_DAYS = 7;

/**
 * Verify the customer session is still valid server-side.
 * Calls the `verify_customer_session` Supabase RPC (see migration
 * supabase/migrations/20260430000001_verify_customer_session_rpc.sql).
 *
 * Fails OPEN (returns true) if the RPC is unavailable — prevents
 * locking out users during DB maintenance or before the migration is applied.
 */
export async function verifySession(customerId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("verify_customer_session", {
      customer_id: customerId,
    });
    if (error) {
      // RPC not yet deployed — allow through rather than block all sessions
      console.warn("[OneVerge] verifySession RPC unavailable:", error.message);
      return true;
    }
    return Boolean(data);
  } catch {
    return true;
  }
}

/**
 * Returns true if the session's created_at timestamp is older than
 * SESSION_MAX_AGE_DAYS. Sessions without a timestamp are not rejected.
 */
export function isSessionExpired(createdAt?: string | null): boolean {
  if (!createdAt) return false;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs > SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}
