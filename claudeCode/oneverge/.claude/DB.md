# Database & RLS

## Key Tables

| Table | Key Columns |
|-------|-------------|
| `customers` | `id`, `user_id`, `display_name`, `email`, `phone_number`, `nid`, `dob`, `created_at` |
| `customer_connections` | `id`, `account_status`, `balance`, `speed`, `isp_id`, `area_id`, `broadband_plan_id`, `scheduled_broadband_plan_id`, `active_services`, `scheduled_services`, `active_addon_plans`, `scheduled_addon_plans`, `is_primary`, `connection_label`, `address` |
| `isps` | `id`, `name` |
| `areas` | `id`, `name`, `district_id` → FK `districts(name)` |
| `broadband_plans` | `id`, `speed`, `price`, … |
| `addon_plans` | `id`, `addon_id`, `price`, `is_active`, `effective_from`, … |
| `billing_history` | written only via `finalize-payment` edge function |

## ⚠️ RLS Warning

Direct `customer_connections` updates from the anon client can be **silently blocked** — 0 rows updated, no error thrown.

**Workaround:** Always chain `.select("id")` after any update to detect silent failures:
```typescript
const { data, error } = await supabase
  .from("customer_connections")
  .update({ ... })
  .eq("id", connectionId)
  .select("id");
// if data is empty and error is null → RLS blocked the write
```

Service-role operations (billing_history inserts, wallet debits, account status updates) must go through edge functions.

## Key RPCs

| RPC | Purpose |
|-----|---------|
| `verify_customer_session` | Validates session token; used by `ProtectedRoute` |
| `get_customer_id` | Resolves customer ID from session |
| `get_customer_billing_history` | Paginated billing history |
| `get_customer_payment_history` | Paginated payment history |
| `calculate_detailed_installation_fee` | Returns fee breakdown for onboarding payment |
| `calculate_detailed_relocation_fee` | Returns fee breakdown for relocation |
