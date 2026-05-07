# Auth & Session

## Model

Custom password auth via Supabase Edge Functions — **no Supabase JWT**.  
Passwords are bcrypt-hashed server-side by `register-customer`.  
`ProtectedRoute` validates the session via `verify_customer_session` RPC.

## localStorage Keys

| Key | Contents |
|-----|----------|
| `oneverge_session` | Primary session object (JSON) |
| `oneverge_user` | Fallback session key |
| `oneverge_onboarding_state` | Wizard step/state; restored when `oneverge_session` is present |

## Session Object (post-merge, flat structure)

| Field | Source table |
|-------|-------------|
| `id` | `customers.id` |
| `user_id`, `display_name`, `email`, `phone_number`, `nid`, `dob` | `customers` |
| `connection_id` | `customer_connections.id` |
| `isp_id`, `area_id`, `broadband_plan_id`, `account_status`, `balance`, `speed` | `customer_connections` |
| `ispName` | resolved from `isps` (batch-fetched in `useCustomerSession`) |
| `location` | resolved as `"Area, District"` from `areas` + `districts` |
| `connections[]` | full enriched list of all connections for the customer |

Navigation between pages passes `sessionData` via React Router `state`.

## Account Status Lifecycle

```
"account created" → "feasibility done" → "active" → "expired" / "terminated"
```

**ACTIVATED set** (have full portal access):
```typescript
const ACTIVATED = new Set(["active", "expired", "terminated"]);
```

- **Not activated** (`account created`, `feasibility done`): Dashboard only; Billing redirects to onboarding payment; Support hidden.
- **Activated**: Full access — billing, support, renewal.
