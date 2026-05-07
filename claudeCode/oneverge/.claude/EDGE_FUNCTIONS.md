# Edge Functions

Located at `supabase/functions/<name>/index.ts`. Deploy via Lovable — never run `supabase functions deploy` locally.

## Function Reference

| Function | Purpose |
|----------|---------|
| `login` | Custom password auth; returns session token |
| `register-customer` | Creates `customers` row + first `customer_connections` row; bcrypt-hashes password |
| `add-connection` | Creates a new `customer_connections` for an existing customer |
| `finalize-payment` | Post-payment finaliser — wallet credit, `billing_history` insert, account activation, addon/plan fields; bypasses RLS |
| `update-connection-status` | Admin/ISP status changes on `customer_connections` |
| `process-renewals` | Scheduled renewal processing |
| `forgot-password` | Sends password reset email |
| `reset-password` | Applies new password after token validation |
| `send-transactional-email` | Sends a single transactional email (invoice receipt, password reset, etc.) |
| `process-email-queue` | Drains queued email jobs |
| `handle-email-suppression` | Handles bounce/suppression webhooks |
| `handle-email-unsubscribe` | Handles unsubscribe webhooks |
| `preview-transactional-email` | Dev preview of email templates |

## finalize-payment Payload Notes

- Accepts `scheduledAddonPlans: Record<string, string>` — pass from `handlePaymentComplete` via `checkoutAddonPlanIds` state.
- Called from both `Index.tsx` (activation) and `RenewPayment.tsx` (renewal/top-up).
- **Never** pass the installation fee payment into `finalisePayment` — it is written directly by `PaymentGateway` as its own `payments` row.

## Shared Email Templates

`supabase/functions/_shared/transactional-email-templates/`
- `invoice-receipt.tsx`
- `password-reset.tsx`
- `registry.ts` (template registry)
