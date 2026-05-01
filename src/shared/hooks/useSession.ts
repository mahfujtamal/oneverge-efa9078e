import { z } from "zod";

// Zod schema for the customer session stored in localStorage / router state.
// Replaces raw JSON.parse() calls in Dashboard, BillingVault, SupportCenter.
// IMPORTANT: This schema must mirror the shape returned by the `login` edge
// function (see supabase/functions/login/index.ts). Required fields are kept
// to the minimum a protected route needs to identify a customer; everything
// else is optional/passthrough so the schema does not reject valid sessions
// when the server returns extra columns or slightly different field names.
export const CustomerSessionSchema = z
  .object({
    id: z.string().uuid(),
    account_status: z.string().min(1),
    // Identity — at least one display field; both server names accepted.
    display_name: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    // Contact — server returns phone_number; legacy `phone` also accepted.
    phone_number: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().nullable().optional(),
    // Wallet — coerce so numeric strings from older payloads still parse.
    balance: z.coerce.number().default(0),
    active_services: z.array(z.string()).nullable().default([]),
    scheduled_services: z.array(z.string()).nullable().default(null),
    address: z.string().nullable().optional(),
    // NID arrives as number from the PG numeric column.
    nid: z.union([z.string(), z.number()]).nullable().optional(),
    dob: z.string().nullable().optional(),
    isp_id: z.string().nullable().optional(),
    area_id: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
  })
  .passthrough();

export type CustomerSession = z.infer<typeof CustomerSessionSchema>;

// Keys used across the app for storing customer session data
export const SESSION_KEYS = ["oneverge_session", "oneverge_user"] as const;

/**
 * Safely parse a customer session from router state or localStorage.
 * Returns null if no valid session is found — never throws.
 */
export function parseCustomerSession(routerState: unknown): CustomerSession | null {
  // Try router state (passed via navigate('/dashboard', { state: user }))
  const stateCandidates = [
    (routerState as any)?.userData,
    routerState,
  ];
  for (const candidate of stateCandidates) {
    const result = CustomerSessionSchema.safeParse(candidate);
    if (result.success) return result.data;
  }

  // Fallback: localStorage (both keys used across the app)
  for (const key of SESSION_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const result = CustomerSessionSchema.safeParse(JSON.parse(raw));
      if (result.success) return result.data;
    } catch {
      // Corrupted JSON — skip this key
    }
  }

  return null;
}

/**
 * Remove all customer session data from localStorage.
 */
export function clearCustomerSession(): void {
  for (const key of SESSION_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem("oneverge_onboarding_state");
}
