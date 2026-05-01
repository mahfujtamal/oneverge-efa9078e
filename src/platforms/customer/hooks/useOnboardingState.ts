import { useState, useEffect } from "react";

type UserData = {
  name: string;
  phone: string;
  email: string;
  address: string;
  nid: string;
  dob: string;
  password: string;
  id?: string;
  user_id?: string;
  account_status?: string;
  [key: string]: any;
};

export function useOnboardingState(routerState: unknown) {
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [selectedISP, setSelectedISP] = useState<any>(null);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [userData, setUserData] = useState<UserData>({
    name: "", phone: "", email: "", address: "", nid: "", dob: "", password: "",
  });
  const [active, setActive] = useState<Record<string, boolean>>({ broadband: true });
  // Maps addon_id -> plan_id for chosen add-on plans
  const [selectedAddonPlans, setSelectedAddonPlans] = useState<Record<string, string>>({});
  const [transactionId, setTransactionId] = useState("");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"location" | "isp">("location");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Derived password policy checks
  const pw = userData.password || "";
  const pwChecks = {
    length: pw.length >= 13,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  const pwValid = Object.values(pwChecks).every(Boolean);

  // Termination & state recovery
  useEffect(() => {
    const state = routerState as any;
    if (state?.forceReset) {
      setStep(1);
      setLocation("");
      setUserData({ name: "", phone: "", email: "", address: "", nid: "", dob: "", password: "" });
      setActive({ broadband: true });
      setSelectedAddonPlans({});
      setTransactionId("");
      setSelectedISP(null);
      setSelectedOffer(null);
      localStorage.clear();
      window.history.replaceState({}, document.title);
      return;
    }

    const hasActiveSession = !!localStorage.getItem("oneverge_session");
    const saved = localStorage.getItem("oneverge_onboarding_state");
    if (saved && hasActiveSession && !state?.isMigration) {
      try {
        const parsed = JSON.parse(saved);
        setStep(parsed.step || 1);
        setLocation(parsed.location || "");
        setUserData(parsed.userData || { name: "", phone: "", email: "", address: "", nid: "", dob: "", password: "" });
        setActive(parsed.active || { broadband: true });
        setSelectedAddonPlans(parsed.selectedAddonPlans || {});
        if (parsed.selectedISP) setSelectedISP(parsed.selectedISP);
        if (parsed.selectedOffer) setSelectedOffer(parsed.selectedOffer);
        if (parsed.transactionId) setTransactionId(parsed.transactionId);
        if (parsed.location) setMobileView("isp");
      } catch (e) {
        console.error("Recovery failed", e);
      }
    }
  }, [routerState]);

  // Persistence — password field is stripped before saving (security fix)
  useEffect(() => {
    const hasActiveSession = !!localStorage.getItem("oneverge_session");
    const state = routerState as any;
    if (!state?.forceReset && hasActiveSession) {
      const { password: _pw, ...safeUserData } = userData;
      localStorage.setItem(
        "oneverge_onboarding_state",
        JSON.stringify({
          step, location, userData: safeUserData, active,
          selectedAddonPlans, selectedISP, selectedOffer, transactionId,
        }),
      );
    }
  }, [step, location, userData, active, selectedAddonPlans, selectedISP, selectedOffer, transactionId, routerState]);

  return {
    step, setStep,
    location, setLocation,
    areaId, setAreaId,
    selectedISP, setSelectedISP,
    selectedOffer, setSelectedOffer,
    userData, setUserData,
    active, setActive,
    selectedAddonPlans, setSelectedAddonPlans,
    transactionId, setTransactionId,
    connectionId, setConnectionId,
    mobileView, setMobileView,
    showPassword, setShowPassword,
    isVerifying, setIsVerifying,
    pwChecks, pwValid,
  };
}
