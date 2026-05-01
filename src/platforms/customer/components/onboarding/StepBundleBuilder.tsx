import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import ServiceCard from "@/components/ServiceCard";
import { ALL_SERVICES, BUTTON_LABELS } from "@/shared/lib/constants";
import AddonPlanPicker from "@/platforms/customer/components/billing/AddonPlanPicker";
import type { AddonPlan } from "@/shared/hooks/useAddonPlans";

interface StepBundleBuilderProps {
  active: Record<string, boolean>;
  setActive: (active: Record<string, boolean>) => void;
  addonPlansByService: Record<string, AddonPlan[]>;
  selectedAddonPlans: Record<string, string>;
  onSelectAddonPlan: (serviceId: string, planId: string) => void;
  onNext: () => void;
}

const StepBundleBuilder = ({
  active,
  setActive,
  addonPlansByService,
  selectedAddonPlans,
  onSelectAddonPlan,
  onNext,
}: StepBundleBuilderProps) => {
  const activeAddons = ALL_SERVICES.filter((s) => s.id !== "broadband" && active[s.id]);

  return (
    <motion.div
      key="s2"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-full ov-flex-center p-4"
    >
      <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 content-center">
        {ALL_SERVICES.map((s) => (
          <ServiceCard
            key={s.id}
            {...s}
            active={!!active[s.id]}
            onToggle={(id) => id !== "broadband" && setActive({ ...active, [id]: !active[id] })}
            isMandatory={s.id === "broadband"}
          />
        ))}
      </div>

      {activeAddons.length > 0 && (
        <div className="w-full max-w-6xl mt-8 space-y-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
            Choose a plan for each selected add-on
          </p>
          {activeAddons.map((s) => (
            <AddonPlanPicker
              key={s.id}
              serviceId={s.id}
              serviceName={s.name}
              serviceColor={s.color}
              plans={addonPlansByService[s.id] || []}
              selectedPlanId={selectedAddonPlans[s.id] ?? null}
              onSelect={(planId) => onSelectAddonPlan(s.id, planId)}
            />
          ))}
        </div>
      )}

      <Button onClick={onNext} className="mt-10 ov-btn-primary w-full max-w-md !h-14 font-black">
        {BUTTON_LABELS.FINALIZE_LAYERS}
      </Button>
    </motion.div>
  );
};

export default StepBundleBuilder;
