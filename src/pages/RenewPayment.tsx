import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PaymentGateway from "@/components/PaymentGateway";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { PRICING_CONFIG, ONEVERGE_SUITE_RATES } from "@/shared/lib/constants";

const RenewPayment = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Session recovery (same pattern as BillingVault/Dashboard)
  const [sessionData, setSessionData] = useState<any>(() => {
    if (state?.userData?.id) return state.userData;
    if (state?.id) return state;
    const saved = localStorage.getItem("oneverge_session") || localStorage.getItem("oneverge_user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (!sessionData) navigate("/login", { replace: true });
  }, [sessionData, navigate]);

  useEffect(() => {
    const refreshFromDb = async () => {
      if (!sessionData?.id) return;
      const connId = sessionData?.connection_id;
      let query = (supabase as any)
        .from("customer_connections")
        .select("*")
        .eq("customer_id", sessionData.id);
      if (connId) query = query.eq("id", connId);
      else query = query.eq("is_primary", true);
      const { data, error } = await query.maybeSingle();
      if (error || !data) return;

      const merged = { ...sessionData, ...data, connection_id: data.id };
      if (
        JSON.stringify(merged.scheduled_services) !== JSON.stringify(sessionData.scheduled_services) ||
        JSON.stringify(merged.active_services) !== JSON.stringify(sessionData.active_services) ||
        merged.balance !== sessionData.balance
      ) {
        setSessionData(merged);
        localStorage.setItem("oneverge_session", JSON.stringify(merged));
        localStorage.setItem("oneverge_user", JSON.stringify(merged));
      }
    };

    refreshFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build the active addons map from the user's SCHEDULED services
  // (what they've configured for the next cycle in the Subscription page).
  const [activeAddons, setActiveAddons] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { broadband: true };
    const services: string[] = sessionData?.scheduled_services || [];
    services.forEach((id) => (init[id] = true));
    return init;
  });

  // Keep the addons in sync if scheduled_services updates after a DB refresh
  useEffect(() => {
    if (!sessionData?.scheduled_services) return;
    const next: Record<string, boolean> = { broadband: true };
    sessionData.scheduled_services.forEach((id: string) => (next[id] = true));
    setActiveAddons(next);
  }, [sessionData?.scheduled_services]);

  // Fetch the authoritative broadband plan price from the DB so we don't
  // rely on stale session values like selectedOffer.price (which can drift
  // from what the customer is actually subscribed to).
  const [dbBroadbandPrice, setDbBroadbandPrice] = useState<number | null>(null);
  const [dbAddonRates, setDbAddonRates] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchPlanPrice = async () => {
      const planId = sessionData?.broadband_plan_id;
      const ispId = sessionData?.isp_id || sessionData?.selectedISP?.id;
      const areaId = sessionData?.area_id;
      const speed = sessionData?.speed;

      try {
        // 1. Preferred: direct lookup by broadband_plan_id on the customer.
        if (planId) {
          const { data, error } = await (supabase as any)
            .from("broadband_plans")
            .select("price, base_price, is_active")
            .eq("id", planId)
            .maybeSingle();
          if (!error && data && data.is_active !== false) {
            setDbBroadbandPrice(Number(data.price ?? data.base_price ?? 0));
            return;
          }
        }

        // 2. Fallback: resolve via isp_area_plans + speed.
        if (!ispId || !areaId || !speed) return;
        const { data, error } = await (supabase as any)
          .from("isp_area_plans")
          .select("broadband_plans!inner(id, name, speed, price, base_price, is_active)")
          .eq("isp_id", ispId)
          .eq("area_id", areaId);
        if (error) throw error;

        const match = (data || [])
          .map((r: any) => r.broadband_plans)
          .find(
            (p: any) =>
              p?.is_active !== false &&
              String(p?.speed).toLowerCase() === String(speed).toLowerCase(),
          );
        if (match) {
          setDbBroadbandPrice(Number(match.price ?? match.base_price ?? 0));
        }
      } catch (e) {
        console.error("Broadband plan price lookup failed (RenewPayment):", e);
      }
    };
    fetchPlanPrice();
  }, [
    sessionData?.broadband_plan_id,
    sessionData?.isp_id,
    sessionData?.selectedISP?.id,
    sessionData?.area_id,
    sessionData?.speed,
  ]);

  useEffect(() => {
    const addonIds = Object.keys(activeAddons).filter((id) => activeAddons[id] && id !== "broadband");
    if (addonIds.length === 0) {
      setDbAddonRates({});
      return;
    }
    // addons table is now a pure catalog — fetch prices from addon_plans instead.
    (async () => {
      const { data } = await (supabase as any)
        .from("addon_plans")
        .select("addon_id, price, base_price")
        .in("addon_id", addonIds)
        .eq("is_active", true)
        .order("effective_from", { ascending: false });
      if (data) {
        const rates: Record<string, number> = {};
        (data as any[]).forEach((plan) => {
          if (!(plan.addon_id in rates)) {
            rates[plan.addon_id] = Number(plan.price ?? plan.base_price ?? 0);
          }
        });
        setDbAddonRates(rates);
      }
    })();
  }, [activeAddons]);

  const basePrice = useMemo(() => {
    if (dbBroadbandPrice && dbBroadbandPrice > 0) return dbBroadbandPrice;
    return sessionData?.selectedOffer?.price || sessionData?.basePrice || 800;
  }, [dbBroadbandPrice, sessionData]);

  const [confirmed, setConfirmed] = useState<string | null>(null);

  // Compute next renewal date (mirrors Dashboard/BillingVault).
  const nextRenewalDate = useMemo(() => {
    const activationISO = sessionData?.created_at || sessionData?.activation_date;
    const activation = activationISO ? new Date(activationISO) : new Date();
    const todayDateOnly = new Date();
    todayDateOnly.setHours(0, 0, 0, 0);
    const originalDay = activation.getDate();
    const next = new Date(activation);
    next.setHours(0, 0, 0, 0);
    // Renewal date is always strictly after activation: advance until
    // it's in the future (use <= so the activation day itself does not
    // count as "due" — that day is the start of the first cycle).
    while (next <= todayDateOnly) {
      const targetMonth = next.getMonth() + 1;
      next.setDate(1);
      next.setMonth(targetMonth);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(originalDay, lastDay));
    }
    return next;
  }, [sessionData]);

  // Cycle cost = base + scheduled addons using actual DB prices (mirrors edge function).
  const cycleCost = useMemo(() => {
    const addonsTotal = Object.entries(activeAddons)
      .filter(([id, active]) => active && id !== "broadband")
      .reduce((sum, [id]) => sum + (dbAddonRates[id] ?? ONEVERGE_SUITE_RATES[id] ?? 0), 0);
    return basePrice + addonsTotal;
  }, [activeAddons, basePrice, dbAddonRates]);

  // Renewal is "due" if today >= renewal date OR account is already expired.
  const isRenewalDue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (
      sessionData?.account_status === "expired" || today.getTime() >= nextRenewalDate.getTime()
    );
  }, [nextRenewalDate, sessionData?.account_status]);

  const handlePaymentSuccess = async (txnId: string, paymentMethod?: string) => {
    let updatedSession = sessionData;
    try {
      // The payment row was just inserted by PaymentGateway with whatever
      // amount the customer actually paid (which, on the renewal screen,
      // they can freely override via the editable amount input). Read it
      // back so we credit the wallet for exactly that amount instead of
      // re-deriving it from the cycle cost.
      const { data: paymentRow } = await (supabase as any)
        .from("payments")
        .select("amount")
        .eq("transaction_id", txnId)
        .maybeSingle();
      const paidAmount = Math.max(0, Number(paymentRow?.amount || 0));

      const scheduledServices = Object.keys(activeAddons).filter((k) => activeAddons[k]);

      const { finalisePayment } = await import("@/lib/finalisePayment");
      const result = await finalisePayment({
        context: "renewal",
        customer: sessionData,
        transactionId: txnId,
        paymentMethod: paymentMethod || "Unknown",
        amountPaid: paidAmount,
        basePrice,
        scheduledServices,
        isRenewalDue,
        nextRenewalDate,
        addonRates: dbAddonRates,
      });

      updatedSession = result.updatedCustomer;
      localStorage.setItem("oneverge_session", JSON.stringify(updatedSession));
      localStorage.setItem("oneverge_user", JSON.stringify(updatedSession));
      setSessionData(updatedSession);
    } catch (e) {
      console.error("Top-up / renewal post-payment update failed:", e);
    }
    setConfirmed(txnId);
    // Redirect to Subscription (billing) page so the user sees the
    // updated status, next renewal date, and new active services.
    setTimeout(() => {
      navigate("/billing", { state: updatedSession, replace: true });
    }, 1500);
  };

  if (!sessionData) {
    return (
      <div className="ov-page-container ov-flex-center h-screen flex items-center justify-center">
        <Zap className="animate-pulse text-ov-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="ov-page-container flex">
      <Sidebar sessionData={sessionData} />
      <main className="ov-main-content flex-1">
        {confirmed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-[70vh] text-center"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h2 className="ov-h1 !text-4xl italic uppercase mb-3">Renewal Confirmed</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Transaction ID
            </p>
            <p className="font-mono text-ov-primary text-sm mb-8">{confirmed}</p>
            <p className="text-[11px] font-bold text-gray-400 max-w-md mb-8">
              Your subscription has been renewed and your balance has been credited. The next billing
              cycle will deduct from your updated balance.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate("/dashboard", { state: sessionData })}
                className="ov-btn-primary"
              >
                Back to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/billing", { state: sessionData })}
              >
                View Billing
              </Button>
            </div>
          </motion.div>
        ) : (
          <PaymentGateway
            activeAddons={activeAddons}
            setActiveAddons={setActiveAddons}
            basePrice={basePrice}
            selectedOffer={sessionData?.selectedOffer}
            userId={sessionData.id}
            paymentType="renewal"
            hideSummary
            allowAmountEdit
            existingCredit={Number(sessionData?.balance || 0)}
            metadata={{
              renewal_for_user: sessionData.user_id,
              services: Object.keys(activeAddons).filter((k) => activeAddons[k]),
            }}
            onBack={() => navigate(-1)}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}
      </main>
    </div>
  );
};

export default RenewPayment;
