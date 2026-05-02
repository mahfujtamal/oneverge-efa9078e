import React, { useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ArrowRight, Lock, ChevronLeft, CreditCard, Zap, Trash2, PlusCircle } from "lucide-react";
import { PRICING_CONFIG, ONEVERGE_SUITE_RATES, PAYMENT_CONFIG, REVIEW_LABELS, ALL_SERVICES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AddonPlanPicker from "@/platforms/customer/components/billing/AddonPlanPicker";
import type { AddonPlan } from "@/shared/hooks/useAddonPlans";
import type { BroadbandPlan } from "@/platforms/customer/hooks/useScheduleConfig";

interface PaymentGatewayProps {
  activeAddons: Record<string, boolean>;
  setActiveAddons: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  basePrice: number;
  selectedOffer?: any;
  userId?: string;
  paymentType?: string;
  metadata?: any;
  onBack: () => void;
  /**
   * Called after the payment row(s) have been written.
   *  - `txnId` is the SERVICE / activation transaction ID (the one finalisePayment uses)
   *  - `installationTxnId` is set ONLY when an installation fee was charged in
   *    the same checkout. It identifies the separate, pass-through payment
   *    row written for the installation portion.
   */
  onPaymentSuccess: (
    txnId: string,
    paymentMethod?: string,
    installationTxnId?: string,
    serviceAmount?: number,
  ) => void;
  hideSummary?: boolean;
  /**
   * One-time installation fee (already includes base + vat + tax + surcharge).
   * Shown as a separate summary line and charged as a SEPARATE payments row
   * (own transaction_id, payment_type = "installation"). It does NOT flow
   * through the wallet, and is excluded from billing_history.
   * Pass 0 (or omit) for non-activation flows.
   */
  installationFee?: number;
  /**
   * Optional per-component split (Base / VAT / Tax / Surcharge) for each
   * activation line item plus the installation fee. When provided, a
   * consolidated breakdown table is rendered above "Total Payable" so the
   * customer can audit exactly what makes up each charge.
   */
  pricingBreakdown?: {
    items: Array<{
      id: string;
      label: string;
      base: number;
      vat: number;
      tax: number;
      surcharge: number;
      total: number;
    }>;
    installation: { base: number; vat: number; tax: number; surcharge: number; total: number };
  };
  /**
   * Existing wallet credit (advance payment already on the customer's
   * balance). When > 0, it is subtracted from the cycle total so the
   * customer pays only the delta. Shown as a separate "Wallet Credit"
   * line in the summary panel. Defaults to 0.
   */
  existingCredit?: number;
  /**
   * When true, renders a freeform numeric input on the right (payment
   * methods) panel that lets the customer override the auto-calculated
   * `totalAmount` and pay any amount they want (top-up, partial, etc.).
   * The entered value is what gets charged and recorded in `payments.amount`.
   * Used on the renewal screen so customers can prepay any amount into
   * their wallet — the cron auto-renews when balance ≥ cycle cost.
   */
  allowAmountEdit?: boolean;
  /** Addon plans grouped by service ID for inline plan selection in the order summary. */
  addonPlansByService?: Record<string, AddonPlan[]>;
  selectedAddonPlans?: Record<string, string>;
  onSelectAddonPlan?: (serviceId: string, planId: string) => void;
  /** Broadband plans available for this ISP/area so the customer can switch at checkout. */
  broadbandPlans?: BroadbandPlan[];
  selectedBroadbandPlanId?: string | null;
  onSelectBroadbandPlan?: (planId: string, price: number, speed: string) => void;
}

const PaymentGateway = ({
  activeAddons,
  setActiveAddons,
  basePrice,
  selectedOffer,
  userId,
  paymentType = "subscription",
  metadata,
  onBack,
  onPaymentSuccess,
  hideSummary = false,
  installationFee = 0,
  pricingBreakdown,
  existingCredit = 0,
  allowAmountEdit = false,
  addonPlansByService,
  selectedAddonPlans,
  onSelectAddonPlan,
  broadbandPlans,
  selectedBroadbandPlanId,
  onSelectBroadbandPlan,
}: PaymentGatewayProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeMethod, setActiveMethod] = useState<string | null>(null);
  // Custom amount entered by the user when `allowAmountEdit` is on.
  // Empty string = use the auto-calculated total; any non-empty value
  // (parsed as a number) overrides it. Stored as a string so the input
  // can be cleared / edited naturally without snapping to 0.
  const [customAmountInput, setCustomAmountInput] = useState<string>("");
  // Synchronous lock — `setState` is async, so back-to-back clicks within
  // the same tick can both pass `if (isProcessing) return`. A ref blocks
  // duplicates immediately and survives re-renders.
  const lockRef = useRef(false);

  // Gross cycle cost (broadband + selected addons + installation), before
  // applying any existing wallet credit.
  const grossAmount = useMemo(() => {
    const addonsTotal = Object.entries(activeAddons)
      .filter(([id, active]) => active && id !== "broadband")
      .reduce((sum, [id]) => {
        const planPrice = pricingBreakdown?.items.find((item) => item.id === id)?.total;
        return sum + (planPrice ?? ONEVERGE_SUITE_RATES[id] ?? 0);
      }, 0);

    return basePrice + addonsTotal + (Number(installationFee) || 0);
  }, [activeAddons, basePrice, installationFee, pricingBreakdown]);

  // Net amount actually charged to the customer after applying advance
  // payments already held in the wallet. Installation is excluded from
  // the credit offset (pass-through fee, never wallet-funded).
  const creditApplied = useMemo(() => {
    const credit = Math.max(0, Number(existingCredit) || 0);
    const offsettable = grossAmount - (Number(installationFee) || 0);
    return Math.min(credit, Math.max(0, offsettable));
  }, [existingCredit, grossAmount, installationFee]);

  const totalAmount = useMemo(
    () => Math.max(0, grossAmount - creditApplied),
    [grossAmount, creditApplied],
  );

  // Effective amount actually charged. When `allowAmountEdit` is on and the
  // user has typed a positive number, that overrides `totalAmount`. Anything
  // <= 0 (or non-numeric / empty) falls back to the auto-calculated total.
  const effectiveAmount = useMemo(() => {
    if (!allowAmountEdit) return totalAmount;
    const parsed = Number(customAmountInput);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return totalAmount;
  }, [allowAmountEdit, customAmountInput, totalAmount]);

  const toggleAddon = (id: string) => {
    // Service list is frozen once a payment is in flight.
    if (lockRef.current || isProcessing) return;
    setActiveAddons((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleProcessPayment = async (methodLabel: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setActiveMethod(methodLabel);
    setIsProcessing(true);

    // Service / activation transaction (drives wallet + billing_history).
    const serviceTxn = `OV-TXN-SUBSC-${crypto.randomUUID()}`;
    const serviceAmount = effectiveAmount - (Number(installationFee) || 0);

    // Optional installation transaction (pass-through; never touches wallet
    // or billing_history). Only created when installationFee > 0.
    const hasInstallation = (Number(installationFee) || 0) > 0;
    const installationTxn = hasInstallation
      ? `OV-TXN-INSTALL-${crypto.randomUUID()}`
      : undefined;

    if (userId) {
      try {
        // Insert SERVICE row (status pending → flipped to success by finalisePayment).
        // Resolve the plan the customer actually confirmed (may differ from selectedOffer
        // if they changed the plan at checkout).
        const activePlan =
          broadbandPlans?.find((p) => p.id === selectedBroadbandPlanId) ?? selectedOffer;
        const activeServices = Object.keys(activeAddons).filter((id) => activeAddons[id]);
        const { error: svcErr } = await (supabase as any).from("payments").insert({
          customer_id: userId,
          transaction_id: serviceTxn,
          amount: serviceAmount,
          payment_method: methodLabel,
          payment_type: paymentType,
          status: "pending",
          metadata: metadata || {
            plan_name: activePlan?.name || "Custom",
            speed: activePlan?.speed || "N/A",
            services: activeServices,
            addon_plans: selectedAddonPlans || {},
          },
        });
        if (svcErr) throw svcErr;

        // Insert INSTALLATION row (immediately success — pass-through fee).
        if (hasInstallation && installationTxn) {
          const { error: instErr } = await (supabase as any).from("payments").insert({
            customer_id: userId,
            transaction_id: installationTxn,
            amount: Number(installationFee),
            payment_method: methodLabel,
            payment_type: "installation",
            status: "success",
            metadata: {
              ...(metadata || {}),
              linked_service_txn: serviceTxn,
              note: "One-time installation fee (pass-through, excluded from wallet & billing history)",
            },
          });
          if (instErr) throw instErr;
        }
      } catch (err: any) {
        console.error("Payment Ledger Error:", err);
        alert(`Transaction Logging Failed: ${err.message || "Check console"}`);
        setIsProcessing(false);
        setActiveMethod(null);
        lockRef.current = false;
        return;
      }
    }

    // NOTE: keep `lockRef` engaged after success so the parent unmount /
    // navigation handles the next render — releasing it here would let a
    // stray tap fire `onPaymentSuccess` twice before transition completes.
    onPaymentSuccess(serviceTxn, methodLabel, installationTxn, serviceAmount);
    setIsProcessing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-full w-full flex flex-col lg:flex-row gap-6 p-4 lg:p-8 lg:overflow-hidden text-left"
    >
      {/* LEFT: SUMMARY PANEL (CONDITIONAL) */}
      {!hideSummary && (
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col">
          <div className="ov-glass-card p-6 md:p-8 flex flex-col lg:h-full !bg-black/20 border-white/10">
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                disabled={isProcessing}
                className="rounded-full hover:bg-white/5 h-10 w-10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </Button>
              <div>
                <span className="ov-section-label tracking-[0.2em]">{REVIEW_LABELS.SUBTITLE_CONFIG}</span>
                <h2 className="ov-h1 !text-2xl mt-1 uppercase italic">{REVIEW_LABELS.SUMMARY_HEADER}</h2>
              </div>
            </div>

            <div className="flex-1 space-y-3 lg:overflow-y-auto no-scrollbar pr-1">
              {/* Broadband plan — show picker when at least one plan is available */}
              <div className={`rounded-2xl bg-white/[0.04] border border-white/5 ${broadbandPlans && broadbandPlans.length > 0 ? "p-3 space-y-2" : "p-4 flex justify-between items-center"}`}>
                {broadbandPlans && broadbandPlans.length > 0 ? (
                  <>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 px-1">Broadband Plan</p>
                    {broadbandPlans.map((plan) => {
                      const selected = plan.id === selectedBroadbandPlanId || (!selectedBroadbandPlanId && plan.price === basePrice);
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          disabled={isProcessing}
                          onClick={() => onSelectBroadbandPlan?.(plan.id, plan.price, plan.speed)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-all duration-200 disabled:opacity-30 ${
                            selected ? "bg-white/5 border-white/20" : "bg-black/30 border-white/5 hover:border-white/15 hover:bg-white/[0.03]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Zap size={10} className={selected ? "text-ov-primary" : "text-gray-500"} />
                            <span className={`text-[9px] font-black uppercase tracking-tight ${selected ? "text-white" : "text-gray-400"}`}>
                              {selected && "✓ "}{plan.speed}
                            </span>
                          </div>
                          <span className={`font-mono text-[9px] font-black ${selected ? "text-ov-primary" : "text-gray-500"}`}>
                            {PRICING_CONFIG.CURRENCY}{plan.price.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Zap size={14} className="text-ov-primary" />
                      <span className="text-[10px] font-black uppercase text-white">Base Provision</span>
                    </div>
                    <span className="font-mono font-bold text-ov-primary italic">
                      {PRICING_CONFIG.CURRENCY} {basePrice.toLocaleString()}
                    </span>
                  </>
                )}
              </div>

              <AnimatePresence>
                {ALL_SERVICES.filter((s) => s.id !== "broadband").map((service) => {
                  const isActive = !!activeAddons[service.id];
                  const servicePlans = addonPlansByService?.[service.id] ?? [];

                  return (
                    <motion.div
                      key={service.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`rounded-2xl transition-all ${
                        isActive
                          ? "bg-white/[0.04] border border-white/10"
                          : "bg-white/[0.01] border border-dashed border-white/5 opacity-50 hover:opacity-100"
                      }`}
                    >
                      <div className="flex justify-between items-center p-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleAddon(service.id)}
                            disabled={isProcessing}
                            className={`transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                              isActive ? "text-gray-500 hover:text-red-500" : "text-gray-500 hover:text-cyan-400"
                            }`}
                          >
                            {isActive ? <Trash2 size={14} /> : <PlusCircle size={14} />}
                          </button>
                          <span className="text-[10px] font-black uppercase text-gray-400">{service.name}</span>
                        </div>
                        <span className={`font-mono font-bold ${isActive ? "text-white/80" : "text-gray-600"}`}>
                          +{PRICING_CONFIG.CURRENCY} {(pricingBreakdown?.items.find((item) => item.id === service.id)?.total ?? ONEVERGE_SUITE_RATES[service.id] ?? 0).toLocaleString()}
                        </span>
                      </div>
                      {isActive && servicePlans.length > 0 && onSelectAddonPlan && (
                        <div className="px-4 pb-3 border-t border-white/5 pt-2">
                          <AddonPlanPicker
                            serviceId={service.id}
                            serviceName={service.name}
                            serviceColor="text-cyan-400"
                            plans={servicePlans}
                            selectedPlanId={selectedAddonPlans?.[service.id] ?? null}
                            onSelect={(planId) => onSelectAddonPlan(service.id, planId)}
                            compact
                          />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {installationFee > 0 && (
                <div className="flex justify-between items-center p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <Zap size={14} className="text-amber-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-amber-300">Installation Fee</span>
                      <span className="text-[8px] font-bold uppercase text-amber-400/60 tracking-widest mt-0.5">
                        One-time
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-amber-300 italic">
                    +{PRICING_CONFIG.CURRENCY} {installationFee.toLocaleString()}
                  </span>
                </div>
              )}

              {creditApplied > 0 && (
                <div className="flex justify-between items-center p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <Zap size={14} className="text-emerald-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-emerald-300">
                        Wallet Credit Applied
                      </span>
                      <span className="text-[8px] font-bold uppercase text-emerald-400/60 tracking-widest mt-0.5">
                        Advance balance
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-300 italic">
                    −{PRICING_CONFIG.CURRENCY} {creditApplied.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* CONSOLIDATED SPLIT TABLE — Activation vs Installation,
                each row showing Base / VAT / Tax / Surcharge / Total.
                Only rendered when the parent supplied a breakdown. */}
            {pricingBreakdown && (() => {
              // Filter activation items to only those currently active in the cart
              // (broadband is always on; addons are toggleable).
              const activeItems = pricingBreakdown.items.filter(
                (i) => i.id === "broadband" || activeAddons[i.id],
              );
              const activationSum = activeItems.reduce(
                (acc, i) => ({
                  base: acc.base + i.base,
                  vat: acc.vat + i.vat,
                  tax: acc.tax + i.tax,
                  surcharge: acc.surcharge + i.surcharge,
                  total: acc.total + i.total,
                }),
                { base: 0, vat: 0, tax: 0, surcharge: 0, total: 0 },
              );
              const inst = pricingBreakdown.installation;
              const hasInst = (Number(installationFee) || 0) > 0 && inst.total > 0;

              return (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="ov-section-label !text-gray-500 uppercase tracking-[0.2em]">
                      Charge Breakdown
                    </span>
                  </div>

                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-6 gap-2 px-4 py-2.5 bg-white/[0.04] border-b border-white/5 text-[8px] font-black uppercase tracking-widest text-gray-500">
                      <div className="col-span-2">Charge</div>
                      <div className="text-right">Base</div>
                      <div className="text-right">VAT</div>
                      <div className="text-right">Tax</div>
                      <div className="text-right">Surch.</div>
                    </div>

                    {/* Activation row (sum across broadband + active addons) */}
                    <div className="grid grid-cols-6 gap-2 px-4 py-3 text-[10px] font-mono items-center border-b border-white/5">
                      <div className="col-span-2 flex flex-col">
                        <span className="font-black uppercase text-white tracking-wider">Activation</span>
                        <span className="text-[8px] text-gray-500 mt-0.5">
                          {PRICING_CONFIG.CURRENCY}
                          {activationSum.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right text-gray-300">{activationSum.base.toLocaleString()}</div>
                      <div className="text-right text-gray-300">{activationSum.vat.toLocaleString()}</div>
                      <div className="text-right text-gray-300">{activationSum.tax.toLocaleString()}</div>
                      <div className="text-right text-gray-300">{activationSum.surcharge.toLocaleString()}</div>
                    </div>

                    {/* Installation row */}
                    {hasInst && (
                      <div className="grid grid-cols-6 gap-2 px-4 py-3 text-[10px] font-mono items-center bg-amber-500/[0.04]">
                        <div className="col-span-2 flex flex-col">
                          <span className="font-black uppercase text-amber-300 tracking-wider">Installation</span>
                          <span className="text-[8px] text-amber-400/60 mt-0.5">
                            {PRICING_CONFIG.CURRENCY}
                            {inst.total.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right text-amber-200/80">{inst.base.toLocaleString()}</div>
                        <div className="text-right text-amber-200/80">{inst.vat.toLocaleString()}</div>
                        <div className="text-right text-amber-200/80">{inst.tax.toLocaleString()}</div>
                        <div className="text-right text-amber-200/80">{inst.surcharge.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="pt-8 border-t border-white/10 mt-6">
              <div className="flex justify-between items-end">
                <span className="ov-section-label !text-gray-500 uppercase">Total Payable</span>
                <span className="ov-h1 !text-4xl text-ov-primary tracking-tighter">
                  {PRICING_CONFIG.CURRENCY} {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT: PAYMENT METHODS */}
      <div className="flex-1">
        <div className="ov-glass-card h-full flex flex-col justify-center items-center p-8 lg:p-12 relative overflow-hidden text-center border-white/10">
          {hideSummary && (
            <button
              onClick={onBack}
              className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
              <span className="text-[9px] font-black uppercase tracking-widest">Back</span>
            </button>
          )}

          <div className="max-w-sm w-full space-y-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-ov-primary/10 flex items-center justify-center text-ov-primary mb-6 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                <Lock size={32} />
              </div>
              <h3 className="ov-h1 !text-2xl italic uppercase tracking-tight">{PAYMENT_CONFIG.SECURE_CHECKOUT}</h3>
              <div className="flex flex-col items-center gap-1 mt-2 w-full">
                <p className="ov-section-label !text-gray-500 tracking-widest">{REVIEW_LABELS.SECURE_NOTICE}</p>

                {/* Always show payable amount on the payment-methods panel
                    so the customer sees what's about to be charged regardless
                    of whether the left summary card is rendered. When
                    `allowAmountEdit` is on, render an editable input instead
                    of a static figure (used on the renewal screen). */}
                {allowAmountEdit ? (
                  <div className="mt-5 w-full">
                    <label className="block ov-section-label !text-gray-500 tracking-widest mb-2">
                      Amount to Pay ({PRICING_CONFIG.CURRENCY})
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      step="any"
                      value={customAmountInput}
                      onChange={(e) => setCustomAmountInput(e.target.value)}
                      disabled={isProcessing}
                      placeholder={totalAmount.toLocaleString()}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-center text-ov-primary font-mono text-2xl font-black italic tracking-tighter focus:outline-none focus:border-ov-primary/40 disabled:opacity-50"
                    />
                    <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-gray-500 mt-2 text-center">
                      Suggested cycle cost: {PRICING_CONFIG.CURRENCY} {totalAmount.toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-ov-primary font-mono text-2xl mt-4 font-black italic tracking-tighter">
                    {PRICING_CONFIG.CURRENCY} {effectiveAmount.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {PAYMENT_CONFIG.METHODS.map((method) => {
                const isActive = activeMethod === method.label;
                return (
                  <button
                    key={method.id}
                    disabled={isProcessing}
                    onClick={() => handleProcessPayment(method.label)}
                    className={`w-full h-14 rounded-2xl flex items-center justify-between px-6 font-black uppercase text-[11px] tracking-widest ${method.textColor} ${method.color} ${method.hover} shadow-xl active:scale-[0.97] transition-all group border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        {isActive ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                      </div>
                      <span>{isActive ? "PROCESSING..." : method.label}</span>
                    </div>
                    {isActive ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[7px] font-bold text-gray-700 uppercase tracking-[0.4em] leading-loose">
              {PAYMENT_CONFIG.SECURITY_BADGE}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PaymentGateway;
