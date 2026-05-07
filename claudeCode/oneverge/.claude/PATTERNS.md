# Patterns

## Multi-Connection Support

`useCustomerSession` fetches all connections and merges the selected one flat onto the session object.  
`switchConnection(connectionId)` switches without a DB round-trip — ISP/location/service fields come from the pre-enriched `connections[]` array.  
`ispName` and `location` are baked into each connection object by `mergeConnection`. Never re-fetch them in page components.

## Onboarding Wizard Steps

Step controller: `src/platforms/customer/pages/Landing.tsx`  
State persisted to `localStorage` under `oneverge_onboarding_state`.

| Step | Component | Description |
|------|-----------|-------------|
| 1 | `StepHero` | Hero / service showcase |
| 2 | `StepBundleBuilder` | Toggle ALL_SERVICES cards |
| 3 | `StepInfraHub` | Location search + ISP comparison |
| 4 | `StepIdentity` | KYC form (name, phone, email, NID, DOB, password) |
| 5 / 5.5 | `StepFeasibility` | KYC verification display + feasibility animation |
| 6 | _(plan confirm, inline)_ | Review bundle |
| 7 | `PaymentGateway` | Payment checkout |
| 8 | `StepSuccess` | Success / provisioning |

Note: step 6 is skipped in the state variable; step 5.5 is an intermediate state.

### addConnection Mode

Triggered when `routerState?.addConnection` is truthy (step 4):
- Identity fields (Name, Phone, Email, NID, DOB) are pre-filled from session and set `readOnly`.
- Password field is hidden entirely.
- Only Address is editable.

## Scheduled Plans (Billing Cycle Changes)

When `useScheduleConfig` saves billing cycle changes, always write to **`customer_connections`** — never `customers`.  
Fields that only exist on `customer_connections`:
- `scheduled_services`
- `scheduled_broadband_plan_id`
- `scheduled_addon_plans`

## ISP & Location Resolution

Resolved in `useCustomerSession.refreshFromDb` via batch queries to `isps` and `areas` tables.  
Results are baked into each connection in `connections[]` and projected by `mergeConnection`.  
Never issue a separate ISP/location fetch inside page or component files.

## Password Policy

Client-side: `src/shared/lib/passwordValidation.ts` (Zod schema).  
Server-side: enforced in `register-customer` edge function.  
Requirements: min 13 chars, uppercase, lowercase, digit, special character.
