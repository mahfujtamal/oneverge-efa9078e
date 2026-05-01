import { useState, useEffect } from "react";

const EMPTY_USER_DATA = { name: "", phone: "", email: "", address: "", nid: "", dob: "", password: "" };
const VALID_ONBOARDING_STEPS = new Set([1, 2, 3, 4, 5, 5.5, 7, 8]);
const DASHBOARD_ACCOUNT_STATUSES = new Set(["active", "expired", "terminated"]);

export function normalizeOnboardingStep(value: unknown): number {
  const next = typeof value === "string" ? Number(value) : Number(value);
  return VALID_ONBOARDING_STEPS.has(next) ? next : 1;
}

export function shouldOpenDashboardForStatus(status: unknown): boolean {
  return DASHBOARD_ACCOUNT_STATUSES.has(String(status || "").toLowerCase());
}

function readStoredSession(): any | null {
  const raw = localStorage.getItem("oneverge_session") || localStorage.getItem("oneverge_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("oneverge_session");
    localStorage.removeItem("oneverge_user");
    return null;
  }
}

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

  const setSafeStep = (value: number | ((prev: number) => number)) => {
    setStep((prev) => normalizeOnboardingStep(typeof value === "function" ? value(prev) : value));
  };

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
      setSafeStep(1);
      setLocation("");
      setUserData(EMPTY_USER_DATA);
      setActive({ broadband: true });
      setSelectedAddonPlans({});
      setTransactionId("");
      setSelectedISP(null);
      setSelectedOffer(null);
      localStorage.clear();
      window.history.replaceState({}, document.title);
      return;
    }

    const storedSession = readStoredSession();
    if (shouldOpenDashboardForStatus(storedSession?.account_status) && !state?.addConnection) {
      localStorage.removeItem("oneverge_onboarding_state");
      setSafeStep(1);
      return;
    }

    const hasActiveSession = !!storedSession;
    const saved = localStorage.getItem("oneverge_onboarding_state");
    if (saved && hasActiveSession && !state?.isMigration) {
      try {
        const parsed = JSON.parse(saved);
        setSafeStep(parsed.step);
        setLocation(parsed.location || "");
        setUserData(parsed.userData || EMPTY_USER_DATA);
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
    const storedSession = readStoredSession();
    const hasActiveSession = !!storedSession;
    const state = routerState as any;
    if (!state?.forceReset && hasActiveSession && !shouldOpenDashboardForStatus(storedSession?.account_status)) {
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
    step, setStep: setSafeStep,
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
