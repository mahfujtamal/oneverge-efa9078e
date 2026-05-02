import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { BILLING_LABELS } from "@/lib/constants";

import { useCustomerSession } from "@/platforms/customer/hooks/useCustomerSession";
import { useRenewalDateCalc } from "@/platforms/customer/hooks/useRenewalDateCalc";
import { useLazyHistory } from "@/platforms/customer/hooks/useLazyHistory";
import { useScheduleConfig } from "@/platforms/customer/hooks/useScheduleConfig";
import { useAddonPlans } from "@/shared/hooks/useAddonPlans";

import BalanceWidget from "@/platforms/customer/components/billing/BalanceWidget";
import SettlementEstimate from "@/platforms/customer/components/billing/SettlementEstimate";
import PaymentHistoryPanel from "@/platforms/customer/components/billing/PaymentHistoryPanel";
import BillingHistoryPanel from "@/platforms/customer/components/billing/BillingHistoryPanel";
import NextCycleConfig from "@/platforms/customer/components/billing/NextCycleConfig";

const BillingVault = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  // All hooks called unconditionally (Rules of Hooks)
  const [sessionData, setSessionData] = useCustomerSession(state);
  const { formattedRenewalDate, accountStatus } = useRenewalDateCalc(sessionData);
  const history = useLazyHistory(sessionData);
  const { addonPlansByService } = useAddonPlans();
  const schedule = useScheduleConfig(sessionData, setSessionData, addonPlansByService);

  const ACTIVATED = new Set(["active", "expired", "terminated"]);

  useEffect(() => {
    if (!sessionData) { navigate("/login", { replace: true }); return; }
    const status = String(sessionData?.account_status || "").toLowerCase();
    if (!ACTIVATED.has(status)) {
      navigate("/", { replace: true, state: { addConnection: true } });
    }
  }, [sessionData, navigate]);

  if (!sessionData) return null;

  return (
    <div className="ov-page-container flex">
      <Sidebar sessionData={sessionData} />

      <main className="ov-main-content flex-1">
        <header className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-6 text-left">
          <div>
            <span className="ov-section-label tracking-[0.3em]">
              <span className="text-white font-semibold">{sessionData.display_name}</span>
              <span className="text-gray-500"> - </span>
              <span className="text-ov-primary font-mono">{sessionData.user_id}</span>
              <span className="text-gray-500"> [</span>
              <span className="text-green-400">{sessionData.ispName}</span>
              <span className="text-gray-500">, </span>
              <span className="text-purple-400">{sessionData.location}</span>
              <span className="text-gray-500">]</span>
            </span>
            <h1 className="ov-h1 !text-4xl italic">{BILLING_LABELS.SUBTITLE}</h1>
          </div>
          <div className="ov-badge text-emerald-400 bg-emerald-500/5 py-2 px-4 border-emerald-500/10">
            <ShieldCheck size={14} />
            <span className="uppercase font-black text-[9px] tracking-widest">Secure Management</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <BalanceWidget
              balance={Number(sessionData?.balance || 0)}
              accountStatus={accountStatus}
              onRenew={() => navigate("/renew", { state: sessionData })}
            />

            <SettlementEstimate
              netPayable={schedule.netPayable}
              formattedRenewalDate={formattedRenewalDate}
              surplusCarryover={schedule.surplusCarryover}
              onSave={schedule.handleSaveSchedule}
              isSaving={schedule.isSaving}
              showSuccess={schedule.showSuccess}
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PaymentHistoryPanel
                showPayments={history.showPayments}
                onToggle={history.togglePayments}
                paymentsLoading={history.paymentsLoading}
                payments={history.payments}
              />
              <BillingHistoryPanel
                showBilling={history.showBilling}
                onToggle={history.toggleBilling}
                billingLoading={history.billingLoading}
                billingRows={history.billingRows}
              />
            </div>
          </div>

          <NextCycleConfig
            nextCycleAddons={schedule.nextCycleAddons}
            setNextCycleAddons={schedule.setNextCycleAddons}
            broadbandPrice={schedule.broadbandPrice}
            availablePlans={schedule.availablePlans}
            scheduledPlanId={schedule.scheduledPlanId}
            currentSpeed={sessionData?.speed || ""}
            onSelectPlan={schedule.setScheduledPlanId}
            addonPlansByService={addonPlansByService}
            scheduledAddonPlans={schedule.scheduledAddonPlans}
            onSelectAddonPlan={(serviceId, planId) =>
              schedule.setScheduledAddonPlans((prev) => ({ ...prev, [serviceId]: planId }))
            }
          />
        </div>
      </main>
    </div>
  );
};

export default BillingVault;
