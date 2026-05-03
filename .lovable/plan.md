## Problem

When a customer with multiple connections logs out after a secondary connection reaches "feasibility done" and then logs back in, clicking the **Balance** card on Dashboard for that pending connection takes them to **step 1** instead of resuming at **step 7**.

## Root Cause

Three pieces conspire to break the resume:

1. **`Dashboard.tsx`** balance card calls `navigate("/")` with **no state**, so Landing has no signal about which connection to resume.
2. **`Landing.tsx`** has a guard that, when the saved session's `account_status` is "active" (the primary connection's status), force-redirects to `/dashboard`. The secondary "feasibility done" connection is never considered.
3. **`useOnboardingState.ts`** restoration query only looks at the **primary** connection (`.eq("is_primary", true)`). Even if Landing rendered, it would still find the active primary and not the pending secondary.

## Fix

### 1. `src/pages/Dashboard.tsx`
When the balance card is clicked for a non-activated connection, pass `addConnection: true` and the target `connectionId` in router state, so Landing knows to resume that specific connection's onboarding instead of the primary's:

```ts
onClick={() =>
  isActivated
    ? navigate("/billing", { state: sessionData })
    : navigate("/", { state: { addConnection: true, resumeConnectionId: sessionData.connection_id } })
}
```

This reuses the existing `addConnection` channel, which already disables the dashboard-redirect guard in Landing.

### 2. `src/platforms/customer/pages/Landing.tsx`
Currently the `isAddConnection` branch always pre-fills identity and starts at step 2. Extend the effect: if `routerState.resumeConnectionId` is present, fetch **that specific connection** (by id, not `is_primary`) and:
- If `account_status === "feasibility done"` → hydrate `selectedISP`, `selectedOffer`, `active`, `selectedAddonPlans`, `connectionId`, then `setStep(7)`.
- If `account_status === "account created"` → `setStep(5)`.
- Otherwise fall back to current step-2 behaviour.

The existing `isAddConnection` guard already short-circuits the dashboard auto-redirect, so no extra change is needed for guard behaviour.

### 3. `src/platforms/customer/hooks/useOnboardingState.ts`
Accept an optional `resumeConnectionId` from `routerState`. When present, query `customer_connections` by `id` instead of `is_primary=true`. This keeps the existing single-connection flow intact while supporting non-primary resume.

## Files Changed
- `src/pages/Dashboard.tsx` — balance card navigates with `{ addConnection, resumeConnectionId }` for pending connections.
- `src/platforms/customer/pages/Landing.tsx` — add-connection effect honours `resumeConnectionId` and routes to step 5 / step 7 based on the targeted connection's status.
- `src/platforms/customer/hooks/useOnboardingState.ts` — restoration query targets the resume connection id when supplied; otherwise primary as today.

## Out of Scope
- No DB or edge-function changes.
- No changes to `finalize-payment`, `update-connection-schedule`, or auth.
