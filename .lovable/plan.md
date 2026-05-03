## Background

You asked whether onboarding syncs both `active_*`/`scheduled_*` and `broadband_plan_id`/`scheduled_broadband_plan_id`.

**Confirmed YES.** In `supabase/functions/finalize-payment/index.ts`, the activation branch writes all three pairs in lockstep:

- `active_services` ← → `scheduled_services` (lines 139–140)
- `active_addon_plans` ← → `scheduled_addon_plans` (lines 161–162)
- `broadband_plan_id` ← → `scheduled_broadband_plan_id` (lines 165–166)

Plus the speed string is resolved from the chosen plan and written too. So a freshly activated connection always lands with `active_* === scheduled_*`, and they only diverge later when the customer edits Next Cycle config.

## What I found while verifying

While checking the DB to confirm, I noticed two things that explain the "Save Schedule failed: 0 rows" you keep hitting:

1. **`customer_connections` is currently empty in the database** (0 rows). Same for `customers`. So if your browser still has an `oneverge_session` in localStorage from a prior test, its `connection_id` points at a row that no longer exists — every update will match 0 rows.
2. **`update-connection-schedule` has zero invocation logs**, which means either it has never been called from the client, or it isn't deployed in the environment you're testing against. The client code in `useScheduleConfig.ts` does invoke it correctly — so the most likely cause is that the function isn't deployed.

## Plan

1. **Re-deploy `update-connection-schedule`** so the Save Schedule call has somewhere to land.
2. **Improve the client error message** in `useScheduleConfig.ts` so when the edge function returns `connection_not_found`, the alert says "This connection no longer exists — please log out and log back in" instead of a generic "0 rows" message. This makes stale-localStorage situations debuggable for end users.
3. **Add a stale-session guard**: when `update-connection-schedule` returns `connection_not_found`, automatically clear `localStorage.oneverge_session` and redirect to `/login` so the user recovers cleanly without manual intervention.
4. **Verify after deploy**: I'll fetch the function logs once you trigger Save Schedule again so we can see the actual payload and confirm the path is reaching the edge function.

No DB schema changes. No changes to onboarding sync logic (it's already correct).

## Files touched

- `supabase/functions/update-connection-schedule/index.ts` — redeploy (no code change required, but I'll re-verify the file is current).
- `src/platforms/customer/hooks/useScheduleConfig.ts` — better error handling and stale-session recovery in the catch branch of `handleSaveSchedule`.
