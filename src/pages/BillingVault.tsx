import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Zap,
  CreditCard,
  RefreshCcw,
  Trash2,
  Plus,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Receipt,
  ScrollText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BILLING_LABELS, ALL_SERVICES, PRICING_CONFIG, ONEVERGE_SUITE_RATES, TELEMETRY_CONFIG } from "@/shared/lib/constants";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/Sidebar";

const BillingVault = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  // 1. BULLETPROOF SESSION RECOVERY ENGINE
  const [sessionData, setSessionData] = useState<any>(() => {
    // Safely extract the inner user data payload if it exists
    if (state?.userData?.id) return state.userData;
    if (state?.id) return state;

    // Fallback: strictly read the exact keys established by Login.tsx
    const saved = localStorage.getItem("oneverge_session") || localStorage.getItem("oneverge_user");
    return saved ? JSON.parse(saved) : null;
  });

  // 2. STRICT ROUTE GUARD
  useEffect(() => {
    if (!sessionData) {
      navigate("/login", { replace: true });
    }
  }, [sessionData, navigate]);

  // 2b. BACKEND-DRIVEN STATUS REFRESH
  // The DB is the single source of truth for account_status, balance, and
  // active/scheduled services. Cached session state (location.state /
  // localStorage) can lag behind the cron-driven renewal job, so we re-pull
  // the customer row on:
  //   - mount
  //   - window focus (user comes back to the tab)
  //   - visibility change (tab becomes visible again)
  useEffect(() => {
    let cancelled = false;

    const refreshFromDb = async () => {
      if (!sessionData?.id) return;
      // All service/billing data lives in customer_connections, not customers.
      const connId = sessionData.connection_id;
      let query = (supabase as any)
        .from("customer_connections")
        .select("*")
        .eq("customer_id", sessionData.id);
      if (connId) query = query.eq("id", connId);
      else query = query.eq("is_primary", true);
      const { data, error } = await query.maybeSingle();
      if (cancelled || error || !data) return;

      setSessionData((prev: any) => {
        const base = prev || {};
        const merged = { ...base, ...data, connection_id: data.id };
        const changed =
          merged.created_at !== base.created_at ||
          merged.balance !== base.balance ||
          merged.account_status !== base.account_status ||
          JSON.stringify(merged.active_services) !== JSON.stringify(base.active_services) ||
          JSON.stringify(merged.scheduled_services) !== JSON.stringify(base.scheduled_services);
        if (!changed) return prev;
        try {
          localStorage.setItem("oneverge_session", JSON.stringify(merged));
        } catch {
          /* ignore quota errors */
        }
        return merged;
      });
    };

    refreshFromDb();

    const onFocus = () => refreshFromDb();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshFromDb();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // Intentionally run once: handlers internally read the latest customer row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.id]);

  // 2c. PAYMENT + BILLING HISTORY (loaded on demand from collapsible panels)
  const [payments, setPayments] = useState<any[] | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [billingRows, setBillingRows] = useState<any[] | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showBilling, setShowBilling] = useState(false);

  // 2d. CYCLE ANCHOR — the date the last successful renewal was billed.
  // Use the backend RPC instead of a direct billing_history query so we don't
  // miss the latest paid row behind client-side table access / stale reads.
  // This keeps the displayed renewal date aligned with the backend cron.
  const [lastPaidAt, setLastPaidAt] = useState<string | null>(null);
  useEffect(() => {
    const fetchLastPaid = async () => {
      if (!sessionData?.id) return;
      const { data, error } = await (supabase as any).rpc(
        "get_customer_billing_history",
        { _customer_id: sessionData.id },
      );
      if (error) {
        console.error("Latest paid billing lookup failed:", error);
        return;
      }

      const latestPaid = (Array.isArray(data) ? data : []).find(
        (row: any) => String(row?.status || "").toLowerCase() === "paid",
      );

      setLastPaidAt(latestPaid?.created_at ?? null);
    };
    fetchLastPaid();
  }, [sessionData?.id, sessionData?.account_status, sessionData?.balance]);

  const loadPayments = async () => {
    if (!sessionData?.id || payments !== null) return;
    setPaymentsLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc(
        "get_customer_payment_history",
        { _customer_id: sessionData.id },
      );
      if (error) throw error;
      setPayments(data || []);
    } catch (e) {
      console.error("Payment history load failed:", e);
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const loadBilling = async () => {
    if (!sessionData?.id || billingRows !== null) return;
    setBillingLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc(
        "get_customer_billing_history",
        { _customer_id: sessionData.id },
      );
      if (error) throw error;
      setBillingRows(data || []);
    } catch (e) {
      console.error("Billing history load failed:", e);
      setBillingRows([]);
    } finally {
      setBillingLoading(false);
    }
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // Calculate next renewal date.
  // Cycle anchor priority (mirrors process-renewals edge fn):
  //   1. Last paid billing_history.created_at  (post-renewal)
  //   2. customers.created_at                  (initial activation)
  // The first renewal is one calendar month AFTER the anchor, so an account
  // that was just renewed/activated today is NOT due today.
  // EXPIRED accounts: renewal date = today (paying today restarts the cycle).
  const nextRenewalDate = useMemo(() => {
    const todayDateOnly = new Date();
    todayDateOnly.setHours(0, 0, 0, 0);

    // If the DB explicitly marks the account as expired, the renewal is due
    // immediately (today). Paying today will start a fresh cycle from today.
    if (sessionData?.account_status === "expired") {
      return todayDateOnly;
    }

    const anchorISO =
      lastPaidAt ||
      sessionData?.created_at ||
      sessionData?.activation_date;
    const anchor = anchorISO ? new Date(anchorISO) : new Date();
    anchor.setHours(0, 0, 0, 0);

    const originalDay = anchor.getDate();

    // Start at anchor + 1 month (first eligible renewal).
    const next = new Date(anchor);
    let targetMonth = next.getMonth() + 1;
    next.setDate(1);
    next.setMonth(targetMonth);
    let lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDay, lastDayOfMonth));

    // Roll forward in case the customer is many cycles past the anchor.
    while (next < todayDateOnly) {
      targetMonth = next.getMonth() + 1;
      next.setDate(1);
      next.setMonth(targetMonth);
      lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(originalDay, lastDayOfMonth));
    }

    return next;
  }, [sessionData, lastPaidAt]);

  const formattedRenewalDate = useMemo(() => {
    return nextRenewalDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [nextRenewalDate]);

  // Account status — DB is the single source of truth.
  // If the DB says "active", trust it. The cron has already debited the wallet
  // and rolled the cycle forward; date math must NOT override that.
  // Only mark as expired when the DB explicitly says so.
  const accountStatus = useMemo(() => {
    return sessionData?.account_status === "expired" ? "expired" : "active";
  }, [sessionData]);

  // 3. LIVE DATABASE BALANCE FIX
  // Since sessionData is now strictly flat, we pull .balance directly instead of relying on .userData.balance
  const currentCreditBalance = Number(sessionData?.balance || 0);

  // 4. BASE CONNECTIVITY PRICE — fetched live from broadband_plans using
  // the customer's ISP + area + speed. Falls back to selectedOffer/basePrice
  // from session, and finally 800 if nothing matches.
  const [dbBroadbandPrice, setDbBroadbandPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchPlanPrice = async () => {
      const ispId = sessionData?.isp_id || sessionData?.selectedISP?.id;
      const areaId = sessionData?.area_id;
      const speed = sessionData?.speed;
      if (!ispId || !areaId || !speed) return;

      try {
        // Join isp_area_plans → broadband_plans for this customer's exact
        // ISP + area, then pick the row matching their speed.
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
        console.error("Broadband plan price lookup failed:", e);
      }
    };
    fetchPlanPrice();
  }, [sessionData?.isp_id, sessionData?.selectedISP?.id, sessionData?.area_id, sessionData?.speed]);

  const broadbandPrice = useMemo(() => {
    if (dbBroadbandPrice && dbBroadbandPrice > 0) return dbBroadbandPrice;
    return sessionData?.selectedOffer?.price || sessionData?.basePrice || 800;
  }, [dbBroadbandPrice, sessionData]);

  // 5. NEXT CYCLE CONFIGURATION STATE
  // Settlement estimate must reflect what the user has SCHEDULED for the next
  // cycle (not what is currently active). If no schedule exists yet, default
  // to broadband-only so the estimate doesn't silently inherit active addons.
  const [nextCycleAddons, setNextCycleAddons] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { broadband: true };
    const services: string[] = Array.isArray(sessionData?.scheduled_services)
      ? sessionData.scheduled_services
      : [];

    services.forEach((service: string) => {
      initial[service] = true;
    });
    return initial;
  });

  // Keep toggles in sync if scheduled_services changes after a DB refresh.
  useEffect(() => {
    if (!Array.isArray(sessionData?.scheduled_services)) return;
    const next: Record<string, boolean> = { broadband: true };
    sessionData.scheduled_services.forEach((id: string) => {
      next[id] = true;
    });
    setNextCycleAddons(next);
  }, [sessionData?.scheduled_services]);

  // 5. FINANCIAL SETTLEMENT ENGINE
  // Automatically calculates the upcoming bill based on active toggles
  const nextCycleTotal = useMemo(() => {
    return Object.entries(nextCycleAddons)
      .filter(([, active]) => active)
      .reduce((sum, [id]) => {
        const cost = id === "broadband" ? broadbandPrice : ONEVERGE_SUITE_RATES[id] || 0;
        return sum + cost;
      }, 0);
  }, [nextCycleAddons, broadbandPrice]);

  // Calculates what the user actually owes after applying their current balance
  const netPayable = Math.max(0, nextCycleTotal - currentCreditBalance);

  // If they overpaid, calculates how much rolls over to the following month
  const surplusCarryover = Math.max(0, currentCreditBalance - nextCycleTotal);

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // <-- NEW: Temporary success flag

  // --- SAVE SCHEDULE TO DATABASE ---
  const handleSaveSchedule = async () => {
    setIsSaving(true);
    setShowSuccess(false); // Reset flag on new attempt

    try {
      const scheduledServices = Object.keys(nextCycleAddons).filter((id) => nextCycleAddons[id]);

      const { error } = await (supabase as any)
        .from("customers")
        .update({ scheduled_services: scheduledServices })
        .eq("id", sessionData.id);

      if (error) throw error;

      // 1. Persist the newly scheduled services
      const persistentSession = { ...sessionData, scheduled_services: scheduledServices };
      localStorage.setItem("oneverge_session", JSON.stringify(persistentSession));
      setSessionData(persistentSession); // Keep local state perfectly in sync

      // 2. Trigger the temporary success flag
      setShowSuccess(true);

      // 3. Auto-hide the success box after 15 seconds
      setTimeout(() => setShowSuccess(false), 15000);
    } catch (err: any) {
      console.error("Database Update Error:", err);
      alert(`Failed to save changes: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /*if (!sessionData)
    return (
      <div className="ov-page-container ov-flex-center">
        <Zap size={48} className="text-ov-primary animate-pulse" />
      </div>
    );*/

  return (
    <div className="ov-page-container flex">
      <Sidebar sessionData={sessionData} />

      <main className="ov-main-content flex-1">
        <header className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-6 text-left">
          <div>
            <span className="ov-section-label tracking-[0.3em]">
              <span className="text-white font-semibold">{sessionData.display_name}</span>

              <span className="text-gray-500"> - </span>

              {/* User ID - OneVerge Primary Color (Blue) */}
              <span className="text-ov-primary font-mono">{sessionData.user_id}</span>

              <span className="text-gray-500"> [</span>

              {/* ISP Name - Green */}
              <span className="text-green-400">{sessionData.ispName}</span>

              <span className="text-gray-500">, </span>

              {/* Location - Purple */}
              <span className="text-purple-400">{sessionData.location}</span>
              <span className="text-gray-500">]</span>
            </span>
            <h1 className="ov-h1 !text-4xl lg:!text-4xl italic">{BILLING_LABELS.SUBTITLE}</h1>
          </div>
          <div className="ov-badge text-emerald-400 bg-emerald-500/5 py-2 px-4 border-emerald-500/10">
            <ShieldCheck size={14} />
            <span className="uppercase font-black text-[9px] tracking-widest">Secure Management</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            {/* CURRENT BALANCE WIDGET */}
            <div className="ov-balance-widget !h-[200px] !bg-[#e2136e] group">
              <div className="flex justify-between items-start relative z-10 text-left">
                <p className="ov-balance-label">Current Balance</p>
                <div
                  className={`ov-badge border-white/20 !bg-white/10 ${accountStatus === "active" ? "text-emerald-400" : "text-yellow-400"}`}
                >
                  {accountStatus}
                </div>
              </div>
              <div className="relative z-10 text-left">
                <p className="ov-balance-value !text-5xl lg:!text-7xl">
                  {PRICING_CONFIG.CURRENCY} {currentCreditBalance.toFixed(2)}
                </p>
              </div>
              <Button
                onClick={() => navigate("/renew", { state: sessionData })}
                className="ov-btn-primary w-full md:w-auto mt-8 relative z-10 !bg-white !text-black hover:!bg-ov-primary"
              >
                {accountStatus === "active" ? BILLING_LABELS.ADVANCE_PAY : BILLING_LABELS.RENEW_NOW}
              </Button>
            </div>

            {/* SETTLEMENT CARD */}
            <div className="ov-glass-card p-8 space-y-8 text-left border-white/10">
              <div className="flex flex-col sm:flex-row justify-between items-start border-b border-white/5 pb-8 gap-4">
                <div>
                  <p className="ov-section-label opacity-60">Settlement Estimate</p>
                  <p className="ov-h1 !text-4xl text-ov-primary mt-2">
                    {PRICING_CONFIG.CURRENCY} {netPayable.toLocaleString()}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="ov-section-label opacity-60">Renewal Date</p>
                  <p className="font-mono font-black text-white mt-1 uppercase tracking-wider">
                    {formattedRenewalDate}
                  </p>
                </div>
              </div>

              {/* DYNAMIC SURPLUS ALERT */}
              {surplusCarryover > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex items-center gap-4 animate-in fade-in zoom-in duration-300">
                  <AlertCircle size={18} className="text-emerald-400 shrink-0" />
                  <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest leading-relaxed">
                    {PRICING_CONFIG.CURRENCY} {surplusCarryover.toLocaleString()} carryover surplus will be applied to
                    the following cycle.
                  </p>
                </div>
              )}
            </div>

            {/* HISTORY PANELS — Payments + Billing (placed right under Settlement Estimate) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* PAYMENT HISTORY */}
              <div className="ov-glass-card border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    const next = !showPayments;
                    setShowPayments(next);
                    if (next) loadPayments();
                  }}
                  className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-ov-primary/10 text-ov-primary flex items-center justify-center">
                      <Receipt size={18} />
                    </div>
                    <div className="text-left">
                      <p className="ov-section-label opacity-60">Payment History</p>
                      <p className="text-[11px] font-black uppercase text-white tracking-widest mt-1">
                        All wallet credits & transactions
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform ${showPayments ? "rotate-180" : ""}`}
                  />
                </button>

                {showPayments && (
                  <div className="px-6 pb-6 border-t border-white/5">
                    {paymentsLoading ? (
                      <div className="py-8 flex items-center gap-3 text-gray-400">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Loading…</span>
                      </div>
                    ) : !payments || payments.length === 0 ? (
                      <p className="py-8 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                        No payments recorded yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-white/5">
                        {payments.map((p) => (
                          <li key={p.transaction_id} className="py-4 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-mono text-[10px] text-white truncate">{p.transaction_id}</p>
                              <p className="text-[9px] font-bold uppercase text-gray-500 tracking-widest mt-1">
                                {formatDateTime(p.created_at)} · {p.payment_method} · {p.payment_type}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-mono font-black text-ov-primary">
                                {PRICING_CONFIG.CURRENCY} {Number(p.amount || 0).toLocaleString()}
                              </p>
                              <p
                                className={`text-[9px] font-black uppercase tracking-widest mt-1 ${
                                  p.status === "success"
                                    ? "text-emerald-400"
                                    : p.status === "pending"
                                    ? "text-yellow-400"
                                    : "text-gray-500"
                                }`}
                              >
                                {p.status || "—"}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* BILLING HISTORY */}
              <div className="ov-glass-card border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    const next = !showBilling;
                    setShowBilling(next);
                    if (next) loadBilling();
                  }}
                  className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <ScrollText size={18} />
                    </div>
                    <div className="text-left">
                      <p className="ov-section-label opacity-60">Billing History</p>
                      <p className="text-[11px] font-black uppercase text-white tracking-widest mt-1">
                        Activations & renewals only
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform ${showBilling ? "rotate-180" : ""}`}
                  />
                </button>

                {showBilling && (
                  <div className="px-6 pb-6 border-t border-white/5">
                    {billingLoading ? (
                      <div className="py-8 flex items-center gap-3 text-gray-400">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Loading…</span>
                      </div>
                    ) : !billingRows || billingRows.length === 0 ? (
                      <p className="py-8 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                        No billing cycles recorded yet. Top-ups will not appear here.
                      </p>
                    ) : (
                      <ul className="divide-y divide-white/5">
                        {billingRows.map((b, idx) => (
                          <li key={`${b.billing_period}-${idx}`} className="py-4 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-[11px] font-black uppercase text-white tracking-widest">
                                {b.billing_period}
                              </p>
                              <p className="text-[9px] font-bold uppercase text-gray-500 tracking-widest mt-1">
                                {formatDateTime(b.created_at)} ·{" "}
                                {(b.services_snapshot || []).length} service
                                {(b.services_snapshot || []).length === 1 ? "" : "s"}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-mono font-black text-emerald-400">
                                {PRICING_CONFIG.CURRENCY} {Number(b.total_billed || 0).toLocaleString()}
                              </p>
                              <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-emerald-400/70">
                                {b.status || "paid"}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* NEXT CYCLE CONFIGURATION */}
          <div className="lg:col-span-2 space-y-6 text-left">
            <h3 className="ov-section-label px-2 opacity-50">Next Cycle Config</h3>
            {/* NEW: IN-LINE SUCCESS NOTIFICATION */}
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

            <div className="space-y-3">
              {ALL_SERVICES.map((s) => (
                <div
                  key={s.id}
                  className={`p-5 rounded-[24px] border transition-all duration-300 flex justify-between items-center ${
                    nextCycleAddons[s.id]
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
                        {PRICING_CONFIG.CURRENCY}{" "}
                        {s.id === "broadband" ? broadbandPrice : ONEVERGE_SUITE_RATES[s.id] || 0}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button for Add-ons */}
                  {s.id !== "broadband" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setNextCycleAddons((p) => ({ ...p, [s.id]: !p[s.id] }))}
                      className={`h-10 w-10 rounded-full transition-colors border ${
                        nextCycleAddons[s.id]
                          ? "border-red-500/30 hover:bg-red-500/20 text-red-400"
                          : "border-cyan-400/30 hover:bg-ov-primary/20 text-ov-primary"
                      }`}
                    >
                      {nextCycleAddons[s.id] ? <Trash2 size={16} /> : <Plus size={16} />}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleSaveSchedule}
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
        </div>
      </main>
    </div>
  );
};

export default BillingVault;
