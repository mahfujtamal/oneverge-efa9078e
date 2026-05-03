import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import { shouldOpenDashboardForStatus, useOnboardingState } from "@/platforms/customer/hooks/useOnboardingState";
import { usePricingBreakdown } from "@/platforms/customer/hooks/usePricingBreakdown";
import { useOnboardingHandlers } from "@/platforms/customer/hooks/useOnboardingHandlers";
import { useAddonPlans } from "@/shared/hooks/useAddonPlans";
import { supabase } from "@/integrations/supabase/client";
import type { BroadbandPlan } from "@/platforms/customer/hooks/useScheduleConfig";

import StepHero from "@/platforms/customer/components/onboarding/StepHero";
import StepBundleBuilder from "@/platforms/customer/components/onboarding/StepBundleBuilder";
import StepInfraHub from "@/platforms/customer/components/onboarding/StepInfraHub";
import StepIdentity from "@/platforms/customer/components/onboarding/StepIdentity";
import StepFeasibility from "@/platforms/customer/components/onboarding/StepFeasibility";
import StepSuccess from "@/platforms/customer/components/onboarding/StepSuccess";
import PaymentGateway from "@/components/PaymentGateway";

const Landing = () => {
  const navigate = useNavigate();
  const { state: routerState } = useLocation();

  // "Add Connection" mode: existing customer adding a second broadband connection.
  // Skip identity steps (step 1 hero, step 4 KYC form).
  // "Resume" mode: existing customer continuing a specific pending connection
  // (account_status = "account created" or "feasibility done"). useOnboardingState
  // takes over and routes to step 5 / step 7 — we must NOT pre-fill identity
  // or force step 2 here.
  const isAddConnection = !!(routerState as any)?.addConnection;
  const isResumeConnection = !!(routerState as any)?.resumeConnectionId;

  React.useEffect(() => {
    if (isAddConnection) return;
    const saved = localStorage.getItem("oneverge_session") || localStorage.getItem("oneverge_user");
    if (!saved) return;
    try {
      const session = JSON.parse(saved);
      if (session?.id && shouldOpenDashboardForStatus(session.account_status)) {
        localStorage.removeItem("oneverge_onboarding_state");
        localStorage.removeItem("oneverge_last_step");
        navigate("/dashboard", { replace: true });
      }
    } catch {
      localStorage.removeItem("oneverge_session");
      localStorage.removeItem("oneverge_user");
    }
  }, [isAddConnection, navigate]);

  const state = useOnboardingState(routerState);
  const {
    step, setStep,
    location,
    areaId,
    selectedISP, setSelectedISP,
    selectedOffer, setSelectedOffer,
    userData, setUserData,
    active, setActive,
    selectedAddonPlans, setSelectedAddonPlans,
    transactionId,
    connectionId,
    mobileView, setMobileView,
    showPassword, setShowPassword,
    isVerifying,
    pwChecks, pwValid,
  } = state;

  // For "Add Connection" mode: pre-populate identity from existing session and start at step 2.
  // Identity (name/phone/email/NID/DOB) is locked in StepIdentity. The address defaults
  // to the primary connection's address but the customer can edit it.
  React.useEffect(() => {
    if (!isAddConnection) return;
    const saved = localStorage.getItem("oneverge_session") || localStorage.getItem("oneverge_user");
    if (!saved) return;
    let parsed: any = null;
    try {
      parsed = JSON.parse(saved);
    } catch {
      return;
    }
    if (!parsed?.id) return;

    setStep(2);
    (async () => {
      // Fetch the most recent customer + primary connection so identity fields are
      // accurate and the address pre-fills from the existing primary connection.
      const { data: customer } = await (supabase as any)
        .from("customers")
        .select("id, user_id, display_name, phone_number, email, nid, dob")
        .eq("id", parsed.id)
        .maybeSingle();

      const { data: primaryConn } = await (supabase as any)
        .from("customer_connections")
        .select("address")
        .eq("customer_id", parsed.id)
        .eq("is_primary", true)
        .maybeSingle();

      const merged = {
        ...parsed,
        ...(customer || {}),
        name: customer?.display_name || parsed.display_name || parsed.name || "",
        phone: customer?.phone_number || parsed.phone_number || parsed.phone || "",
        email: customer?.email || parsed.email || "",
        nid: customer?.nid != null ? String(customer.nid) : (parsed.nid ?? ""),
        dob: customer?.dob || parsed.dob || "",
        address: primaryConn?.address || parsed.address || "",
      };
      setUserData((prev: any) => ({ ...prev, ...merged }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddConnection]);

  const { addonPlansByService } = useAddonPlans();

  // Auto-select the first available plan for any active add-on missing a selection.
  // Runs whenever the user toggles add-ons (step 2) or when add-on plans finish loading,
  // so KYC submission and the activation payment carry real plan ids — not empty objects.
  React.useEffect(() => {
    if (Object.keys(addonPlansByService).length === 0) return;
    const updates: Record<string, string> = {};
    Object.entries(active).forEach(([id, isActive]) => {
      if (isActive && id !== "broadband" && !selectedAddonPlans[id]) {
        const first = addonPlansByService[id]?.[0];
        if (first) updates[id] = first.id;
      }
    });
    if (Object.keys(updates).length > 0) {
      setSelectedAddonPlans((prev: Record<string, string>) => ({ ...prev, ...updates }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, addonPlansByService]);

  // Fetch broadband plans for the selected ISP so the checkout can offer plan switching.
  // Queries broadband_plans directly by isp_id — no isp_area_plans join, no areaId needed.
  const [ispBroadbandPlans, setIspBroadbandPlans] = React.useState<BroadbandPlan[]>([]);
  React.useEffect(() => {
    const ispId = selectedISP?.id;
    if (!ispId) { setIspBroadbandPlans([]); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("broadband_plans")
        .select("id, name, speed, price, base_price")
        .eq("isp_id", ispId)
        .eq("is_active", true);
      const plans: BroadbandPlan[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name || p.speed,
        speed: p.speed,
        price: Number(p.price ?? p.base_price ?? 0),
      }));
      // Fallback: ISP query empty → use selectedOffer so picker always shows at least one plan.
      if (plans.length === 0 && selectedOffer?.id) {
        setIspBroadbandPlans([{
          id: selectedOffer.id,
          name: selectedOffer.name || selectedOffer.speed || "Current Plan",
          speed: selectedOffer.speed || "",
          price: selectedOffer.price ?? 0,
        }]);
      } else {
        setIspBroadbandPlans(plans);
      }
    })();
  }, [selectedISP?.id]);

  // Pre-compute addon total so ISPComparison can show a live cost summary per offer.
  const addonTotal = React.useMemo(() => {
    return Object.entries(active)
      .filter(([id, on]) => on && id !== "broadband")
      .reduce((sum, [id]) => {
        const planId = selectedAddonPlans[id];
        const plans = addonPlansByService[id] || [];
        const plan = planId ? plans.find((p) => p.id === planId) : plans[0];
        return sum + (plan?.price ?? 0);
      }, 0);
  }, [active, selectedAddonPlans, addonPlansByService]);

  const pricingBreakdown = usePricingBreakdown({ step, selectedOffer, selectedISP, active, selectedAddonPlans });

  const handlers = useOnboardingHandlers(
    { ...state, addonPlansByService, isAddConnection },
    navigate,
  );

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3 && mobileView === "isp") setMobileView("location");
    else if (step === 5.5) setStep(5);
    else if (step === 7) setStep(4);
    else setStep((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="ov-page-container flex-col">
      <header className="h-16 flex items-center justify-between border-b border-white/5 backdrop-blur-md px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          {step > 1 && step < 8 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="rounded-full h-8 w-8 hover:bg-white/10"
            >
              <ArrowLeft size={18} className="text-gray-400" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {userData?.id ? (
            <Button
              variant="outline"
              onClick={() => navigate("/logout")}
              className="border-red-500/50 text-red-400 bg-red-950/20 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              Log Out
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="border-white/10 text-white bg-transparent hover:bg-white/10 hover:text-white transition-colors"
            >
              Log In
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 relative overflow-y-auto overflow-x-hidden text-left z-10 custom-scrollbar pb-20">
        <AnimatePresence mode="wait">
          {step === 1 && <StepHero key="s1" onNext={() => setStep(2)} />}

          {step === 2 && (
            <StepBundleBuilder
              key="s2"
              active={active}
              setActive={setActive}
              addonPlansByService={addonPlansByService}
              selectedAddonPlans={selectedAddonPlans}
              onSelectAddonPlan={(serviceId, planId) =>
                setSelectedAddonPlans({ ...selectedAddonPlans, [serviceId]: planId })
              }
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <StepInfraHub
              key="s3"
              mobileView={mobileView}
              location={location}
              areaId={areaId}
              addonTotal={addonTotal}
              onLocationConfirm={handlers.handleLocationConfirm}
              onBack={handleBack}
              onSelectISP={(isp, offer) => {
                setSelectedISP(isp);
                setSelectedOffer(offer);
                setStep(4);
              }}
            />
          )}

          {step === 4 && (
            <StepIdentity
              key="s4"
              userData={userData}
              setUserData={setUserData}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              isVerifying={isVerifying}
              pwChecks={pwChecks}
              pwValid={pwValid}
              onKYCSubmit={handlers.handleKYCSubmit}
              isAddConnection={isAddConnection}
            />
          )}

          {(step === 5 || step === 5.5) && (
            <StepFeasibility
              key="s5"
              step={step}
              userData={userData}
              selectedISP={selectedISP}
              onVerified={() => setStep(5.5)}
              onResult={handlers.handleFeasibilityComplete}
            />
          )}

          {step === 7 && (
            <PaymentGateway
              key="s7"
              activeAddons={active}
              setActiveAddons={setActive}
              basePrice={selectedOffer?.price || 800}
              selectedOffer={selectedOffer}
              userId={userData.id}
              paymentType="activation"
              installationFee={pricingBreakdown.installation.total}
              pricingBreakdown={pricingBreakdown}
              onBack={() => setStep(4)}
              onPaymentSuccess={handlers.handlePaymentComplete}
              addonPlansByService={addonPlansByService}
              selectedAddonPlans={selectedAddonPlans}
              onSelectAddonPlan={(serviceId, planId) =>
                setSelectedAddonPlans({ ...selectedAddonPlans, [serviceId]: planId })
              }
              broadbandPlans={ispBroadbandPlans}
              selectedBroadbandPlanId={selectedOffer?.id ?? null}
              onSelectBroadbandPlan={(planId, price, speed) =>
                setSelectedOffer((prev: any) => ({ ...prev, id: planId, price, speed }))
              }
            />
          )}

          {step === 8 && (
            <StepSuccess
              key="s8"
              transactionId={transactionId}
              userData={userData}
              active={active}
              onFinalize={handlers.handleFinalize}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Landing;
