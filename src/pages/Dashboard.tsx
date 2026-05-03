import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Wifi, Zap, Activity, CreditCard, ShieldCheck, ArrowRight, Plus, CheckCircle2 } from "lucide-react";
import { DASHBOARD_LABELS, ALL_SERVICES, PRICING_CONFIG, TELEMETRY_CONFIG } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { useCustomerSession } from "@/platforms/customer/hooks/useCustomerSession";

const Dashboard = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [sessionData, setSessionData, switchConnection] = useCustomerSession(state);
  const [lastPaidAt, setLastPaidAt] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionData) navigate("/login", { replace: true });
  }, [sessionData, navigate]);

  useEffect(() => {
    const fetchLastPaid = async () => {
      if (!sessionData?.id) return;
      const { data: history } = await (supabase as any).rpc(
        "get_customer_billing_history",
        { _customer_id: sessionData.id },
      );
      const latestPaid = (Array.isArray(history) ? history : []).find(
        (row: any) => String(row?.status || "").toLowerCase() === "paid",
      );
      if (latestPaid?.created_at) setLastPaidAt(latestPaid.created_at);
    };
    fetchLastPaid();
  }, [sessionData?.id, sessionData?.connection_id]);

  const renewalDue = useMemo(() => {
    if (!sessionData) return false;
    if (sessionData.account_status === "expired") return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const anchorISO = lastPaidAt || sessionData.created_at;
    if (!anchorISO) return false;
    const anchor = new Date(anchorISO);
    anchor.setHours(0, 0, 0, 0);
    const originalDay = anchor.getDate();
    const next = new Date(anchor);
    let targetMonth = next.getMonth() + 1;
    next.setDate(1);
    next.setMonth(targetMonth);
    let lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDay, lastDay));
    while (next < today) {
      targetMonth = next.getMonth() + 1;
      next.setDate(1);
      next.setMonth(targetMonth);
      lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(originalDay, lastDay));
    }
    return today.getTime() >= next.getTime();
  }, [sessionData, lastPaidAt]);

  if (!sessionData) {
    return (
      <div className="ov-page-container ov-flex-center h-screen bg-black flex items-center justify-center">
        <Zap className="animate-pulse text-ov-primary text-blue-500" size={48} />
      </div>
    );
  }

  const ACTIVATED = new Set(["active", "expired", "terminated"]);
  const isActivated = ACTIVATED.has(String(sessionData?.account_status || "").toLowerCase());
  const connections: any[] = sessionData.connections || [];

  return (
    <div className="ov-page-container flex">
      <Sidebar sessionData={sessionData} />

      <main className="ov-main-content flex-1">
        <header className="mb-10 text-left">
          <span className="ov-section-label tracking-[0.3em]">{DASHBOARD_LABELS.GREETING}</span>
          <h1 className="ov-h1 !text-4xl lg:!text-4xl italic mb-4">{sessionData.display_name || "Customer"}</h1>
          <div className="flex flex-col gap-1.5 border-l-2 border-cyan-400/30 pl-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">USER ID:</span>
              <span className="text-[11px] font-mono font-black text-cyan-400 tracking-widest">
                {sessionData.user_id || sessionData.id}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mt-0.5">ADDRESS:</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-wider max-w-sm leading-snug">
                {sessionData.address || "Location Pending"}
              </span>
            </div>
          </div>
        </header>

        {/* MULTI-CONNECTION SWITCHER */}
        {connections.length > 1 && (
          <div className="mb-8">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3 px-1">
              My Connections
            </p>
            <div className="flex flex-wrap gap-3">
              {connections.map((conn: any) => {
                const isActive = conn.id === sessionData.connection_id;
                return (
                  <button
                    key={conn.id}
                    type="button"
                    onClick={() => switchConnection(conn.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-left transition-all duration-200 ${
                      isActive
                        ? "bg-ov-primary/10 border-ov-primary/30 text-ov-primary"
                        : "bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {isActive && <CheckCircle2 size={12} />}
                    <Wifi size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {conn.connection_label}
                    </span>
                    <span className="text-[9px] font-mono opacity-60">{conn.speed}</span>
                    <span
                      className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                        conn.account_status === "active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : conn.account_status === "expired"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {conn.account_status}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => navigate("/", { state: { addConnection: true } })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-dashed border-white/15 text-gray-500 hover:border-ov-primary/40 hover:text-ov-primary transition-all duration-200"
              >
                <Plus size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">Add Connection</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* ACTIVE NODE TELEMETRY */}
            <div className="ov-telemetry-card">
              <div className="flex items-center gap-6 text-left">
                <div className="w-16 h-16 rounded-full bg-ov-primary flex items-center justify-center text-black shadow-lg shadow-ov-primary/20">
                  <Wifi size={32} strokeWidth={3} />
                </div>
                <div>
                  <p className="ov-h1 !text-4xl italic leading-none">{sessionData.speed || "50 Mbps"}</p>
                  <div className="mt-3 space-y-1">
                    <p className="ov-section-label !text-cyan-400">{sessionData.ispName}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                      {sessionData.location}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-10 text-left">
                <div>
                  <p className="text-xl font-black font-mono text-emerald-400">{TELEMETRY_CONFIG.DEFAULT_LATENCY}</p>
                  <p className="ov-section-label opacity-40">Latency</p>
                </div>
                <div>
                  <p className="text-xl font-black font-mono text-white">{TELEMETRY_CONFIG.DEFAULT_UPTIME}</p>
                  <p className="ov-section-label opacity-40">Uptime</p>
                </div>
              </div>
            </div>

            {/* PROVISIONED SERVICES GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {ALL_SERVICES.filter((s) => sessionData.active_services?.includes(s.id)).map((service) => (
                <div key={service.id} className="ov-glass-card p-6 text-left group">
                  <div className={`${service.color} mb-4 group-hover:scale-110 transition-transform`}>
                    <service.icon size={24} />
                  </div>
                  <h4 className="text-[9px] font-black uppercase text-white tracking-widest">{service.name}</h4>
                  <p className="text-[7px] font-black text-emerald-400 mt-4 uppercase animate-pulse">● Status: Live</p>
                </div>
              ))}
            </div>

            {/* ADD FIRST EXTRA CONNECTION (single-connection customers) */}
            {connections.length <= 1 && (
              <button
                type="button"
                onClick={() => navigate("/", { state: { addConnection: true } })}
                className="w-full p-4 rounded-[24px] border border-dashed border-white/10 hover:border-ov-primary/30 hover:bg-ov-primary/5 transition-all duration-200 flex items-center justify-center gap-3 text-gray-500 hover:text-ov-primary"
              >
                <Plus size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Add Another Connection</span>
              </button>
            )}
          </div>

          {/* FINANCIAL BRIDGE */}
          <div className="flex flex-col gap-4">
            <div
              className="ov-balance-widget"
              onClick={() =>
                isActivated
                  ? navigate("/billing", { state: sessionData })
                  : navigate("/", {
                      state: {
                        addConnection: true,
                        resumeConnectionId: sessionData.connection_id,
                      },
                    })
              }
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12" />
              <p className="ov-balance-label">Balance</p>
              <div className="text-left">
                <p className="ov-balance-value">
                  {PRICING_CONFIG.CURRENCY}
                  {Number(sessionData.balance !== undefined ? sessionData.balance : "0.00").toFixed(2)}
                </p>
              </div>
              {!isActivated ? (
                <p className="text-[8px] font-black uppercase tracking-widest text-yellow-400 mt-1">
                  Pending Activation
                </p>
              ) : connections.length > 1 && (
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mt-1">
                  {sessionData.connection_label}
                </p>
              )}
            </div>

            <Button
              onClick={() => navigate("/renew", { state: sessionData })}
              className="ov-btn-primary w-full !h-12 text-[10px] font-black tracking-widest"
            >
              {renewalDue ? "RENEW NOW" : "ADD FUNDS (ADVANCE)"} <ArrowRight size={14} className="ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
