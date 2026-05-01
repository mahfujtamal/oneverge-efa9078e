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
  return (
    <motion.div
      key="s2"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-full ov-flex-center p-4"
    >
      <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 items-start">
        {ALL_SERVICES.map((s) => (
          <div key={s.id} className="flex flex-col gap-2">
            <ServiceCard
              {...s}
              active={!!active[s.id]}
              onToggle={(id) => id !== "broadband" && setActive({ ...active, [id]: !active[id] })}
              isMandatory={s.id === "broadband"}
            />
            {s.id !== "broadband" && active[s.id] && (addonPlansByService[s.id] || []).length > 0 && (
              <AddonPlanPicker
                serviceId={s.id}
                serviceName={s.name}
                serviceColor={s.color}
                plans={addonPlansByService[s.id] || []}
                selectedPlanId={selectedAddonPlans[s.id] ?? null}
                onSelect={(planId) => onSelectAddonPlan(s.id, planId)}
                compact
              />
            )}
          </div>
        ))}
      </div>

      <Button onClick={onNext} className="mt-10 ov-btn-primary w-full max-w-md !h-14 font-black">
        {BUTTON_LABELS.FINALIZE_LAYERS}
      </Button>
    </motion.div>
  );
};

export default StepBundleBuilder;
