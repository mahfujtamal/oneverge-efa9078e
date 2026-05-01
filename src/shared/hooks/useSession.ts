import { z } from "zod";

// Zod schema for the customer session stored in localStorage / router state.
// Replaces raw JSON.parse() calls in Dashboard, BillingVault, SupportCenter.
export const CustomerSessionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  account_status: z.string().min(1),
  balance: z.number(),
  active_services: z.array(z.string()).default([]),
  scheduled_services: z.array(z.string()).nullable().default(null),
  address: z.string().nullable().optional(),
  nid: z.string().nullable().optional(),
  dob: z.string().nullable().optional(),
  isp_id: z.string().nullable().optional(),
  area_id: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

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
