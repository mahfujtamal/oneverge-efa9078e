import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PricingItem = {
  id: string;
  label: string;
  base: number;
  vat: number;
  tax: number;
  surcharge: number;
  total: number;
};

export type PricingBreakdown = {
  items: PricingItem[];
  installation: { base: number; vat: number; tax: number; surcharge: number; total: number };
};

const EMPTY_BREAKDOWN: PricingBreakdown = {
  items: [],
  installation: { base: 0, vat: 0, tax: 0, surcharge: 0, total: 0 },
};

interface UsePricingBreakdownParams {
  step: number;
  selectedOffer: any;
  selectedISP: any;
  active: Record<string, boolean>;
  selectedAddonPlans: Record<string, string>;
}

export function usePricingBreakdown({ step, selectedOffer, selectedISP, active, selectedAddonPlans }: UsePricingBreakdownParams): PricingBreakdown {
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown>(EMPTY_BREAKDOWN);

  useEffect(() => {
    if (step !== 7) return;

    const activeServiceIds = Object.keys(active).filter((id) => active[id] && id !== "broadband");

    (async () => {
      try {
        const items: PricingItem[] = [];

        // 1) Broadband plan split
        if (selectedOffer?.id) {
          const { data: plan } = await (supabase as any)
            .from("broadband_plans")
            .select("id, name, base_price, vat, tax, surplus_charge, price")
            .eq("id", selectedOffer.id)
            .maybeSingle();
          if (plan) {
            const base = Number(plan.base_price) || 0;
            const vat = Number(plan.vat) || 0;
            const tax = Number(plan.tax) || 0;
            const surcharge = Number(plan.surplus_charge) || 0;
            items.push({
              id: "broadband",
              label: plan.name || "Broadband",
              base, vat, tax, surcharge,
              total: Number(plan.price) || base + vat + tax + surcharge,
            });
          }
        }

        // 2) Add-on splits — look up each selected plan from addon_plans by UUID.
        if (activeServiceIds.length > 0) {
          const selectedPlanIds = activeServiceIds
            .map((id) => selectedAddonPlans[id])
            .filter(Boolean);

          if (selectedPlanIds.length > 0) {
            const { data: plans } = await (supabase as any)
              .from("addon_plans")
              .select("id, addon_id, name, base_price, vat, tax, surplus_charge, price")
              .in("id", selectedPlanIds);
            const planByAddon: Record<string, any> = {};
            (plans || []).forEach((p: any) => { planByAddon[p.addon_id] = p; });

            activeServiceIds.forEach((serviceId) => {
              const p = planByAddon[serviceId];
              if (p) {
                items.push({
                  id: serviceId,
                  label: p.name,
                  base: Number(p.base_price) || 0,
                  vat: Number(p.vat) || 0,
                  tax: Number(p.tax) || 0,
                  surcharge: Number(p.surplus_charge) || 0,
                  total: Number(p.price) || 0,
                });
              }
            });
          }
        }

        // 3) Installation fee split (ISP-specific or global default)
        let installation = { base: 0, vat: 0, tax: 0, surcharge: 0, total: 0 };
        if (selectedISP?.id) {
          const { data: feeData } = await (supabase as any).rpc("calculate_detailed_installation_fee", {
            p_isp_id: selectedISP.id,
          });
          if (feeData) {
            installation = {
              base: Number(feeData.base_fee) || 0,
              vat: Number(feeData.vat_amount) || 0,
              tax: Number(feeData.tax_amount) || 0,
              surcharge: Number(feeData.surcharge_amount) || 0,
              total: Number(feeData.total_fee) || 0,
            };
          }
        }

        setPricingBreakdown({ items, installation });
      } catch (err) {
        console.error("Failed to load pricing breakdown:", err);
      }
    })();
  }, [step, selectedOffer?.id, selectedISP?.id, active]);

  return pricingBreakdown;
}
