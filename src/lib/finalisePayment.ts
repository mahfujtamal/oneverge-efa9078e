// Shared post-payment finaliser used by:
//  - Index.tsx (first-time activation)
//  - RenewPayment.tsx (top-up + renewal/expired-recovery)
//
// Business rules (per product spec):
//  1. Any payment that is NOT a relocation_fee adds to the wallet balance first.
//  2. On activation: account becomes "active", services are provisioned,
//     wallet is debited by the cycle cost, billing_history row inserted.
//  3. On renewal/topup: if wallet balance after credit >= cycle cost, the
//     cycle is consumed (debit + service promotion + history row + status
//     remains/becomes active). If not, balance is just credited; no history,
//     no status change. Expired accounts auto-resume on full coverage.
//  4. payments.status is set to "success" by the gateway itself.
//  5. After commit, a PDF invoice is generated, uploaded, and a receipt
//     email + simulated WhatsApp notification are dispatched.

import { supabase } from "@/integrations/supabase/client";
import { ONEVERGE_SUITE_RATES, PRICING_CONFIG } from "@/lib/constants";
import { generateAndUploadInvoice } from "@/lib/invoice";
import { toast } from "sonner";

export type PaymentContext =
  | "activation" // first-time provisioning (Index step 7)
  | "renewal" // explicit renewal / top-up via RenewPayment / Dashboard
  | "topup"; // wallet top-up only (advance payment, no due cycle)

export interface FinaliseInput {
  context: PaymentContext;
  customer: any; // current sessionData (must include id, balance, etc.)
  connectionId?: string | null; // customer_connections.id for the connection being paid
  transactionId: string;
  paymentMethod: string;
  amountPaid: number; // gross paid in this transaction
  basePrice: number; // broadband base for cycle cost calculation
  scheduledServices: string[]; // final service list customer chose at checkout
  isRenewalDue: boolean; // true if renewal is due OR account is expired
  nextRenewalDate: Date; // for billing_period
  scheduledAddonPlans?: Record<string, string>; // addon_id → plan_id selections at checkout
  scheduledBroadbandPlanId?: string | null; // broadband plan the customer chose at checkout
  speed?: string | null; // speed of the broadband plan chosen at checkout (e.g. "25 Mbps")
}

export interface FinaliseResult {
  updatedCustomer: Record<string, any>;
  cycleConsumed: boolean;
  cycleAmount: number;
  cycleServices: string[];
  newBalance: number;
  invoiceUrl: string | null;
}

// (cycle cost + billing period are now computed by the finalize-payment edge function)

/**
 * Apply the wallet-first business rules and return the updated state.
 * Throws on hard DB failures; soft-fails (invoice/email) only log.
 */
export async function finalisePayment(input: FinaliseInput): Promise<FinaliseResult> {
  const {
    context,
    customer,
    connectionId,
    transactionId,
    paymentMethod,
    amountPaid,
    basePrice,
    scheduledServices,
    isRenewalDue,
    nextRenewalDate,
    scheduledAddonPlans,
    scheduledBroadbandPlanId,
    speed,
  } = input;

  // 1. Delegate the wallet/cycle/billing-history mutations to the
  //    service-role edge function. Browser RLS blocks these writes for
  //    onboarding customers (no auth.uid yet) and for the billing_history
  //    table (no public INSERT policy).
  const { data: fnRes, error: fnErr } = await supabase.functions.invoke(
    "finalize-payment",
    {
      body: {
        context,
        customerId: customer.id,
        connectionId: connectionId ?? customer.connection_id ?? null,
        transactionId,
        amountPaid,
        basePrice,
        scheduledServices,
        isRenewalDue,
        nextRenewalDate: nextRenewalDate.toISOString(),
        addonRates: ONEVERGE_SUITE_RATES,
        scheduledAddonPlans: scheduledAddonPlans ?? null,
        scheduledBroadbandPlanId: scheduledBroadbandPlanId ?? null,
        speed: speed ?? null,
      },
    },
  );

  if (fnErr || !fnRes?.ok) {
    const msg = fnRes?.error || (fnErr as any)?.message || "finalize_failed";
    console.error("finalize-payment edge call failed:", msg, fnRes, fnErr);
    throw new Error(msg);
  }

  const cycleConsumed: boolean = !!fnRes.cycleConsumed;
  const cycleAmount: number = Number(fnRes.cycleAmount || 0);
  const finalCycleServices: string[] = Array.isArray(fnRes.cycleServices)
    ? fnRes.cycleServices
    : [];
  const postBalance: number = Number(fnRes.newBalance ?? 0);
  const updates: Record<string, any> = (fnRes.updates as Record<string, any>) || {
    balance: postBalance,
  };

  // 5. Generate + upload invoice; dispatch receipt email and simulated WhatsApp.
  let invoiceUrl: string | null = null;
  try {
    invoiceUrl = await generateAndUploadInvoice({
      customerId: customer.id,
      customerName: customer.display_name || "Customer",
      customerEmail: customer.email,
      customerPhone: customer.phone_number,
      customerAddress: customer.address,
      oneVergeId: customer.user_id,
      transactionId,
      paymentMethod,
      paymentType: context,
      amountPaid,
      walletBalanceAfter: postBalance,
      cycleConsumed,
      cycleAmount: cycleConsumed ? cycleAmount : undefined,
      cycleServices: cycleConsumed ? finalCycleServices : undefined,
      issuedAt: new Date(),
    });
  } catch (e) {
    console.error("Invoice generation failed:", e);
  }

  // Dispatch transactional email (queued via Lovable Email infra).
  if (customer.email) {
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "invoice-receipt",
          recipientEmail: customer.email,
          idempotencyKey: `invoice-${transactionId}`,
          templateData: {
            name: customer.display_name || "there",
            transactionId,
            amount: `${PRICING_CONFIG.CURRENCY} ${amountPaid.toLocaleString()}`,
            paymentMethod,
            paymentType:
              context === "activation"
                ? "Service Activation"
                : context === "renewal"
                ? "Subscription Renewal"
                : "Wallet Top-up",
            walletBalance: `${PRICING_CONFIG.CURRENCY} ${postBalance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            invoiceUrl: invoiceUrl || "",
          },
        },
      });
    } catch (e) {
      console.error("Receipt email dispatch failed:", e);
    }
  }

  // Simulated WhatsApp delivery (per product decision: log + toast).
  if (customer.phone_number) {
    console.info(
      `[WhatsApp simulation] Would send invoice to ${customer.phone_number}` +
        (invoiceUrl ? `: ${invoiceUrl}` : " (no invoice URL)"),
    );
    toast.success("Invoice sent on WhatsApp", {
      description: `Delivered to ${customer.phone_number}`,
    });
  }

  if (customer.email) {
    toast.success("Invoice emailed", {
      description: `A PDF receipt is on its way to ${customer.email}`,
    });
  }

  return {
    updatedCustomer: { ...customer, ...updates },
    cycleConsumed,
    cycleAmount,
    cycleServices: finalCycleServices,
    newBalance: postBalance,
    invoiceUrl,
  };
}
