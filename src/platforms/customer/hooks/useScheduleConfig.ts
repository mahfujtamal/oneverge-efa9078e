import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ONEVERGE_SUITE_RATES } from "@/shared/lib/constants";
import type { AddonPlan } from "@/shared/hooks/useAddonPlans";

export type BroadbandPlan = {
  id: string;
  name: string;
  speed: string;
  price: number;
};

export function useScheduleConfig(
  sessionData: any,
  setSessionData: (s: any) => void,
  addonPlansByService: Record<string, AddonPlan[]>,
) {
  const [availablePlans, setAvailablePlans] = useState<BroadbandPlan[]>([]);
  const [scheduledPlanId, setScheduledPlanId] = useState<string | null>(
    sessionData?.scheduled_broadband_plan_id || null,
  );

  const [nextCycleAddons, setNextCycleAddons] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { broadband: true };
    const services: string[] = Array.isArray(sessionData?.scheduled_services)
      ? sessionData.scheduled_services
      : [];
    services.forEach((id: string) => { initial[id] = true; });
    return initial;
  });

  // Maps addon_id → plan_id for next-cycle add-on plan selections
  const [scheduledAddonPlans, setScheduledAddonPlans] = useState<Record<string, string>>(() => {
    const saved = sessionData?.scheduled_addon_plans;
    return saved && typeof saved === "object" ? saved : {};
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Keep addons in sync after a DB refresh updates scheduled_services.
  useEffect(() => {
    if (!Array.isArray(sessionData?.scheduled_services)) return;
    const next: Record<string, boolean> = { broadband: true };
    sessionData.scheduled_services.forEach((id: string) => { next[id] = true; });
    setNextCycleAddons(next);
  }, [sessionData?.scheduled_services]);

  // Keep scheduled plan in sync when the DB-refreshed session carries a value.
  useEffect(() => {
    if (sessionData?.scheduled_broadband_plan_id) {
      setScheduledPlanId(sessionData.scheduled_broadband_plan_id);
    }
  }, [sessionData?.scheduled_broadband_plan_id]);

  // Sync scheduled addon plans from DB refresh.
  useEffect(() => {
    const saved = sessionData?.scheduled_addon_plans;
    if (saved && typeof saved === "object") {
      setScheduledAddonPlans(saved);
    }
  }, [sessionData?.scheduled_addon_plans]);

  // When an addon is toggled ON and has no plan selected yet, auto-select the first available plan.
  useEffect(() => {
    const updates: Record<string, string> = {};
    Object.entries(nextCycleAddons).forEach(([id, active]) => {
      if (active && id !== "broadband" && !scheduledAddonPlans[id]) {
        const firstPlan = addonPlansByService[id]?.[0];
        if (firstPlan) updates[id] = firstPlan.id;
      }
    });
    if (Object.keys(updates).length > 0) {
      setScheduledAddonPlans((prev) => ({ ...prev, ...updates }));
    }
  }, [nextCycleAddons, addonPlansByService]);

  // Fetch ALL active broadband plans for this customer's ISP.
  // Queries broadband_plans directly by isp_id — no isp_area_plans join needed.
  // Falls back to fetching the customer's specific plan by broadband_plan_id when
  // the ISP-level query returns empty (e.g. isp_id not yet backfilled on older rows).
  useEffect(() => {
    const ispId = sessionData?.isp_id || sessionData?.selectedISP?.id;
    const speed = sessionData?.speed;
    const broadbandPlanId = sessionData?.broadband_plan_id;
    if (!ispId && !broadbandPlanId) return;

    (async () => {
      try {
        let plans: BroadbandPlan[] = [];

        if (ispId) {
          const { data, error } = await (supabase as any)
            .from("broadband_plans")
            .select("id, name, speed, price, base_price, is_active")
            .eq("isp_id", ispId)
            .eq("is_active", true);

          if (error) throw error;

          plans = (data || []).map((p: any) => ({
            id: p.id,
            name: p.name || p.speed,
            speed: p.speed,
            price: Number(p.price ?? p.base_price ?? 0),
          }));
        }

        // If ISP-level query returned nothing but the customer has a plan assigned,
        // fetch that plan by ID so the schedule config always has at least one entry.
        if (plans.length === 0 && broadbandPlanId) {
          const { data: singlePlan } = await (supabase as any)
            .from("broadband_plans")
            .select("id, name, speed, price, base_price, is_active")
            .eq("id", broadbandPlanId)
            .maybeSingle();
          if (singlePlan && singlePlan.is_active !== false) {
            plans = [{
              id: singlePlan.id,
              name: singlePlan.name || singlePlan.speed,
              speed: singlePlan.speed,
              price: Number(singlePlan.price ?? singlePlan.base_price ?? 0),
            }];
          }
        }

        setAvailablePlans(plans);

        if (!scheduledPlanId) {
          // Prefer the already-scheduled plan, then match by speed, then first in list.
          const preferred =
            plans.find((p) => p.id === sessionData?.scheduled_broadband_plan_id) ||
            (speed ? plans.find((p) => String(p.speed).toLowerCase() === String(speed).toLowerCase()) : null) ||
            plans[0] ||
            null;
          if (preferred) setScheduledPlanId(preferred.id);
        }
      } catch (e) {
        console.error("Broadband plans fetch failed:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.isp_id, sessionData?.selectedISP?.id, sessionData?.broadband_plan_id]);

  const scheduledPlan = useMemo(
    () => availablePlans.find((p) => p.id === scheduledPlanId) ?? null,
    [availablePlans, scheduledPlanId],
  );

  const broadbandPrice = useMemo(() => {
    if (scheduledPlan) return scheduledPlan.price;
    // Fall back through available plan list (match by speed), then session speed-derived price.
    if (availablePlans.length > 0) {
      const bySpeed = sessionData?.speed
        ? availablePlans.find((p) => String(p.speed).toLowerCase() === String(sessionData.speed).toLowerCase())
        : null;
      return bySpeed?.price ?? availablePlans[0]?.price ?? 800;
    }
    return 800;
  }, [scheduledPlan, availablePlans, sessionData?.speed]);

  const nextCycleTotal = useMemo(
    () =>
      Object.entries(nextCycleAddons)
        .filter(([, active]) => active)
        .reduce((sum, [id]) => {
          if (id === "broadband") return sum + broadbandPrice;
          const planId = scheduledAddonPlans[id];
          const plan = planId
            ? addonPlansByService[id]?.find((p) => p.id === planId)
            : addonPlansByService[id]?.[0];
          return sum + (plan?.price ?? ONEVERGE_SUITE_RATES[id] ?? 0);
        }, 0),
    [nextCycleAddons, broadbandPrice, scheduledAddonPlans, addonPlansByService],
  );

  const currentBalance = Number(sessionData?.balance || 0);
  const netPayable = Math.max(0, nextCycleTotal - currentBalance);
  const surplusCarryover = Math.max(0, currentBalance - nextCycleTotal);

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    setShowSuccess(false);

    try {
      // Security fix: broadband must always remain in the schedule
      const scheduledServices = Object.keys(nextCycleAddons).filter((id) => nextCycleAddons[id]);
      if (!scheduledServices.includes("broadband")) scheduledServices.push("broadband");

      // Only persist plan selections for services that are actually scheduled
      const addonPlansToSave: Record<string, string> = {};
      scheduledServices
        .filter((id) => id !== "broadband")
        .forEach((id) => {
          if (scheduledAddonPlans[id]) addonPlansToSave[id] = scheduledAddonPlans[id];
        });

      // These columns only exist on customer_connections — guard against missing ID.
      if (!sessionData.connection_id) {
        throw new Error("No connection_id in session — cannot save schedule.");
      }
      if (!sessionData.id) {
        throw new Error("No customer id in session — cannot save schedule.");
      }

      // Direct browser updates are blocked by RLS (no UPDATE policy on customer_connections),
      // because the customer auth flow does not produce an auth.uid. Delegate to the
      // service-role edge function which verifies ownership server-side.
      const { data: fnRes, error } = await supabase.functions.invoke(
        "update-connection-schedule",
        {
          body: {
            customer_id: sessionData.id,
            connection_id: sessionData.connection_id,
            scheduled_services: scheduledServices,
            scheduled_broadband_plan_id: scheduledPlanId || null,
            scheduled_addon_plans: addonPlansToSave,
          },
        },
      );

      if (error) throw error;
      if (!fnRes?.ok) {
        throw new Error(fnRes?.error || "Schedule update failed.");
      }

      const persistentSession = {
        ...sessionData,
        scheduled_services: scheduledServices,
        scheduled_broadband_plan_id: scheduledPlanId || null,
        scheduled_addon_plans: addonPlansToSave,
      };
      localStorage.setItem("oneverge_session", JSON.stringify(persistentSession));
      setSessionData(persistentSession);

      setShowSuccess(true);
    } catch (err: any) {
      console.error("Database Update Error:", err);
      alert(`Failed to save changes: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    availablePlans,
    scheduledPlanId,
    setScheduledPlanId,
    broadbandPrice,
    nextCycleAddons,
    setNextCycleAddons,
    scheduledAddonPlans,
    setScheduledAddonPlans,
    nextCycleTotal,
    netPayable,
    surplusCarryover,
    isSaving,
    showSuccess,
    handleSaveSchedule,
  };
}
