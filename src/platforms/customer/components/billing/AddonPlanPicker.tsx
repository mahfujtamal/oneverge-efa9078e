import React from "react";
import { PRICING_CONFIG } from "@/shared/lib/constants";
import type { AddonPlan } from "@/shared/hooks/useAddonPlans";

interface AddonPlanPickerProps {
  serviceId: string;
  serviceName: string;
  serviceColor: string;
  plans: AddonPlan[];
  selectedPlanId: string | null;
  onSelect: (planId: string) => void;
}

const AddonPlanPicker = ({
  serviceName,
  serviceColor,
  plans,
  selectedPlanId,
  onSelect,
}: AddonPlanPickerProps) => {
  if (plans.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">
        {serviceName} — Select Plan
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {plans.map((plan) => {
          const selected = plan.id === selectedPlanId;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect(plan.id)}
              className={`relative p-3 rounded-xl border text-left transition-all duration-200 group ${
                selected
                  ? "bg-white/5 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                  : "bg-black/30 border-white/5 hover:border-white/15 hover:bg-white/[0.03]"
              }`}
            >
              {selected && (
                <span className={`absolute top-2 right-2 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${serviceColor} bg-current/10`}
                  style={{ color: "inherit" }}>
                  ✓
                </span>
              )}

              <p className={`text-[11px] font-black uppercase tracking-tight mb-1 ${selected ? "text-white" : "text-gray-300"}`}>
                {plan.name}
              </p>

              <p className={`font-mono text-[13px] font-black ${selected ? "text-white" : "text-gray-400"}`}>
                {PRICING_CONFIG.CURRENCY} {(plan.price ?? 0).toLocaleString()}
              </p>

              {/* Price breakdown — visible on hover */}
              <div className="mt-2 space-y-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {plan.base_price > 0 && (
                  <p className="text-[8px] text-gray-500 font-mono">
                    Base: {PRICING_CONFIG.CURRENCY} {plan.base_price}
                  </p>
                )}
                {plan.vat > 0 && (
                  <p className="text-[8px] text-gray-500 font-mono">
                    VAT: {PRICING_CONFIG.CURRENCY} {plan.vat}
                  </p>
                )}
                {plan.tax > 0 && (
                  <p className="text-[8px] text-gray-500 font-mono">
                    Tax: {PRICING_CONFIG.CURRENCY} {plan.tax}
                  </p>
                )}
                {plan.surplus_charge > 0 && (
                  <p className="text-[8px] text-gray-500 font-mono">
                    Surplus: {PRICING_CONFIG.CURRENCY} {plan.surplus_charge}
                  </p>
                )}
                <p className="text-[8px] text-gray-500 font-mono">
                  From: {new Date(plan.effective_from).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AddonPlanPicker;
