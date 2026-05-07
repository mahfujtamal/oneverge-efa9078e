# Billing & Payments

## Wallet-First Business Rule

Every payment (except relocation fees) **credits the wallet first**.  
The billing cycle is consumed only if the balance covers the full cycle cost.

## finalisePayment() Orchestration

File: `src/lib/finalisePayment.ts`  
Called from: `Index.tsx` (activation) and `RenewPayment.tsx` (renewal/top-up).

Sequence:
1. Calls `finalize-payment` edge function → wallet mutation + `billing_history` insert (bypasses RLS)
2. Generates PDF invoice (`src/lib/invoice.ts`)
3. Calls `send-transactional-email` edge function with invoice attachment
4. Logs simulated WhatsApp notification

## Installation Fee Exception

The installation fee is written **directly** by `PaymentGateway` as its own `payments` row.  
It must **never** be passed into `finalisePayment()`.

## Payment Methods

Configured in `src/shared/lib/constants.ts` → `PAYMENT_CONFIG.METHODS`:  
bKash · Nagad · Upay · Debit/Credit Card

## Relocation Fee

`PRICING_CONFIG.RELOCATION_FEE = 500 BDT`  
Calculated via `calculate_detailed_relocation_fee` RPC.  
Relocation fee payments bypass the wallet-credit rule.
