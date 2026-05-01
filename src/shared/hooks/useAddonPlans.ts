import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AddonPlan = {
  id: string;
  addon_id: string;
  name: string;
  base_price: number;
  vat: number;
  tax: number;
  surplus_charge: number;
  price: number;
  effective_from: string;
};

export function useAddonPlans() {
  const [addonPlansByService, setAddonPlansByService] = useState<Record<string, AddonPlan[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("addon_plans")
          .select("id, addon_id, name, base_price, vat, tax, surplus_charge, price, effective_from")
          .eq("is_active", true)
          .order("effective_from", { ascending: false });

        if (error) throw error;

        const grouped: Record<string, AddonPlan[]> = {};
        (data || []).forEach((plan: AddonPlan) => {
          if (!grouped[plan.addon_id]) grouped[plan.addon_id] = [];
          grouped[plan.addon_id].push(plan);
        });

        setAddonPlansByService(grouped);
      } catch (err) {
        console.error("Failed to fetch addon plans:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { addonPlansByService, isLoading };
}
