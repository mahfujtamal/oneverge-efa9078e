import React from "react";
import { Loader2, CheckCircle2, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_SERVICES, BILLING_LABELS, PRICING_CONFIG } from "@/shared/lib/constants";
import BroadbandPlanPicker from "@/platforms/customer/components/billing/BroadbandPlanPicker";
import AddonPlanPicker from "@/platforms/customer/components/billing/AddonPlanPicker";
import type { BroadbandPlan } from "@/platforms/customer/hooks/useScheduleConfig";
import type { AddonPlan } from "@/shared/hooks/useAddonPlans";

interface NextCycleConfigProps {
  nextCycleAddons: Record<string, boolean>;
  setNextCycleAddons: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  broadbandPrice: number;
  isSaving: boolean;
  showSuccess: boolean;
  onSave: () => void;
  availablePlans: BroadbandPlan[];
  scheduledPlanId: string | null;
  currentSpeed: string;
  onSelectPlan: (planId: string) => void;
  addonPlansByService: Record<string, AddonPlan[]>;
  scheduledAddonPlans: Record<string, string>;
  onSelectAddonPlan: (serviceId: string, planId: string) => void;
}

const NextCycleConfig = ({
  nextCycleAddons,
  setNextCycleAddons,
  broadbandPrice,
  isSaving,
  showSuccess,
  onSave,
  availablePlans,
  scheduledPlanId,
  currentSpeed,
  onSelectPlan,
  addonPlansByService,
  scheduledAddonPlans,
  onSelectAddonPlan,
}: NextCycleConfigProps) => (
  <div className="lg:col-span-2 space-y-6 text-left">
    <h3 className="ov-section-label px-2 opacity-50">Next Cycle Config</h3>

    {showSuccess && (
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
        <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
        <div>
          <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Schedule Locked</p>
          <p className="text-[8px] font-bold text-emerald-400/70 uppercase tracking-wider mt-0.5">
            Configuration successfully saved for your next billing cycle.
          </p>
        </div>
      </div>
    )}

    <BroadbandPlanPicker
      availablePlans={availablePlans}
      scheduledPlanId={scheduledPlanId}
      currentSpeed={currentSpeed}
      onSelect={onSelectPlan}
    />

    <div className="space-y-3">
      {ALL_SERVICES.map((s) => {
        const isActive = !!nextCycleAddons[s.id];
        const plans = addonPlansByService[s.id] || [];
        const selectedPlan = plans.find((p) => p.id === scheduledAddonPlans[s.id]) ?? plans[0] ?? null;
        const displayPrice = s.id === "broadband" ? broadbandPrice : (selectedPlan?.price ?? 0);

        return (
          <div key={s.id}>
            <div
              className={`p-5 rounded-[24px] border transition-all duration-300 flex justify-between items-center ${
                isActive
                  ? "bg-white/[0.03] border-white/10"
                  : "opacity-40 border-dashed border-white/10 hover:opacity-100"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`${s.color} p-2 rounded-lg bg-white/5`}>
                  <s.icon size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase text-white tracking-widest">{s.name}</p>
                  <p className="text-[9px] font-mono text-gray-500 mt-1 uppercase tracking-tighter">
                    {PRICING_CONFIG.CURRENCY} {displayPrice}
                  </p>
                </div>
              </div>

              {s.id !== "broadband" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNextCycleAddons((p) => ({ ...p, [s.id]: !p[s.id] }))}
                  className={`h-10 w-10 rounded-full transition-colors border ${
                    isActive
                      ? "border-red-500/30 hover:bg-red-500/20 text-red-400"
                      : "border-cyan-400/30 hover:bg-ov-primary/20 text-ov-primary"
                  }`}
                >
                  {isActive ? <Trash2 size={16} /> : <Plus size={16} />}
                </Button>
              )}
            </div>

            {isActive && s.id !== "broadband" && plans.length > 0 && (
              <div className="mt-2 px-1">
                <AddonPlanPicker
                  serviceId={s.id}
                  serviceName={s.name}
                  serviceColor={s.color}
                  plans={plans}
                  selectedPlanId={scheduledAddonPlans[s.id] ?? null}
                  onSelect={(planId) => onSelectAddonPlan(s.id, planId)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>

    <Button
      onClick={onSave}
      disabled={isSaving}
      className="ov-btn-primary w-full h-16 !rounded-[24px] mt-4 shadow-ov-primary/20"
    >
      {isSaving ? (
        <span className="flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" /> SAVING...
        </span>
      ) : (
        BILLING_LABELS.SAVE_SCHEDULE
      )}
    </Button>
  </div>
);

export default NextCycleConfig;
