import React from "react";
import { Zap } from "lucide-react";
import { PRICING_CONFIG } from "@/shared/lib/constants";
import type { BroadbandPlan } from "@/platforms/customer/hooks/useScheduleConfig";

interface BroadbandPlanPickerProps {
  availablePlans: BroadbandPlan[];
  scheduledPlanId: string | null;
  currentSpeed: string;
  onSelect: (planId: string) => void;
}

const BroadbandPlanPicker = ({
  availablePlans,
  scheduledPlanId,
  currentSpeed,
  onSelect,
}: BroadbandPlanPickerProps) => {
  if (availablePlans.length <= 1) return null;

  const isCurrentPlan = (plan: BroadbandPlan) =>
    String(plan.speed).toLowerCase() === String(currentSpeed).toLowerCase();

  const isScheduled = (plan: BroadbandPlan) => plan.id === scheduledPlanId;

  return (
    <div className="space-y-3">
      <p className="ov-section-label px-2 opacity-50">Broadband Plan</p>
      <div className="grid grid-cols-2 gap-2">
        {availablePlans.map((plan) => {
          const active = isScheduled(plan);
          const current = isCurrentPlan(plan);

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect(plan.id)}
              className={`relative p-4 rounded-[20px] border text-left transition-all duration-200 ${
                active
                  ? "bg-ov-primary/10 border-ov-primary/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                  : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              {/* Status badges */}
              <div className="flex gap-1 mb-2 flex-wrap">
                {current && (
                  <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400">
                    ACTIVE
                  </span>
                )}
                {active && !current && (
                  <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-ov-primary/20 text-ov-primary">
                    NEXT CYCLE
                  </span>
                )}
                {active && current && (
                  <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-ov-primary/20 text-ov-primary">
                    SCHEDULED
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mb-1">
                <Zap size={12} className={active ? "text-ov-primary" : "text-gray-500"} />
                <p className={`text-[13px] font-black uppercase tracking-tight ${active ? "text-white" : "text-gray-300"}`}>
                  {plan.speed}
                </p>
              </div>
              <p className={`font-mono text-[10px] font-bold ${active ? "text-ov-primary" : "text-gray-500"}`}>
                {PRICING_CONFIG.CURRENCY} {plan.price.toLocaleString()}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BroadbandPlanPicker;
