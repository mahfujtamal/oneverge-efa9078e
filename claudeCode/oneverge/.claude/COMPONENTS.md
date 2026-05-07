# Key Components & Hooks

## Key Files

| Role | Path |
|------|------|
| Onboarding wizard controller | `src/platforms/customer/pages/Landing.tsx` |
| Dashboard | `src/pages/Dashboard.tsx` |
| Sidebar nav | `src/components/Sidebar.tsx` |
| BillingVault page | `src/platforms/customer/pages/BillingVault.tsx` |
| SupportCenter page | `src/platforms/customer/pages/SupportCenter.tsx` |
| RenewPayment page | `src/pages/RenewPayment.tsx` |
| Payment gateway component | `src/components/PaymentGateway.tsx` |
| Post-payment finaliser | `src/lib/finalisePayment.ts` |
| PDF invoice generator | `src/lib/invoice.ts` |
| Supabase client | `src/integrations/supabase/client.ts` |
| Auto-generated DB types | `src/integrations/supabase/types.ts` — never edit manually |
| Shared constants | `src/shared/lib/constants.ts` |
| Auth guard | `src/shared/components/ProtectedRoute.tsx` |

## platforms/customer/ Hooks

| Hook | Purpose |
|------|---------|
| `useCustomerSession` | Session hydration, DB refresh, `switchConnection`, focus listener |
| `useOnboardingState` | All wizard state + localStorage sync |
| `useOnboardingHandlers` | Step transition handlers |
| `usePricingBreakdown` | Fetches pricing breakdown at payment step |
| `useScheduleConfig` | Billing cycle / scheduled-plan changes |
| `useGeographicFiltering` | Area/district filtering for location step |
| `useRelocationFlow` | Relocation request submission |
| `useTicketData` | Ticket list fetching |
| `useTicketMessaging` | Ticket thread messaging |
| `useLazyHistory` | Lazy-loaded billing/payment history |
| `useRenewalDateCalc` | Renewal date calculation |

## platforms/customer/ Component Tree

```
src/platforms/customer/
├── pages/
│   ├── Landing.tsx          # Step controller
│   ├── BillingVault.tsx
│   └── SupportCenter.tsx
├── components/
│   ├── onboarding/
│   │   ├── StepHero.tsx
│   │   ├── StepBundleBuilder.tsx
│   │   ├── StepInfraHub.tsx
│   │   ├── StepIdentity.tsx
│   │   ├── StepFeasibility.tsx
│   │   └── StepSuccess.tsx
│   ├── billing/
│   │   ├── BalanceWidget.tsx
│   │   ├── BillingHistoryPanel.tsx
│   │   ├── PaymentHistoryPanel.tsx
│   │   ├── AddonPlanPicker.tsx
│   │   ├── BroadbandPlanPicker.tsx
│   │   ├── NextCycleConfig.tsx
│   │   └── SettlementEstimate.tsx
│   └── support/
│       ├── TicketFormSection.tsx
│       ├── TicketListSection.tsx
│       ├── RelocationFormSection.tsx
│       └── TerminationSection.tsx
├── hooks/            # see table above
└── styles/
    └── onboarding.css   # wizard step transitions + animation keyframes
```

## Shared Components

```
src/shared/
├── components/
│   ├── ProtectedRoute.tsx   # hardened auth guard
│   └── ErrorBoundary.tsx
├── hooks/
│   ├── useSession.ts
│   ├── useAddonPlans.ts
│   └── useDebounce.ts
└── lib/
    ├── constants.ts
    ├── passwordValidation.ts
    ├── sessionValidator.ts
    ├── supabase.ts          # re-exports supabase client
    └── utils.ts             # cn(), formatCurrency(), formatDate()
```
