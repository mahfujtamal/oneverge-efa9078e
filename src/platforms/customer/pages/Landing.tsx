import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import { shouldOpenDashboardForStatus, useOnboardingState } from "@/platforms/customer/hooks/useOnboardingState";
import { usePricingBreakdown } from "@/platforms/customer/hooks/usePricingBreakdown";
import { useOnboardingHandlers } from "@/platforms/customer/hooks/useOnboardingHandlers";
import { useAddonPlans } from "@/shared/hooks/useAddonPlans";

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
  const isAddConnection = !!(routerState as any)?.addConnection;

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
  React.useEffect(() => {
    if (!isAddConnection) return;
    const saved = localStorage.getItem("oneverge_session") || localStorage.getItem("oneverge_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id) {
          setUserData((prev: any) => ({ ...prev, ...parsed }));
          setStep(2);
        }
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddConnection]);

  const { addonPlansByService } = useAddonPlans();

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
