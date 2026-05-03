import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

    const resumeConnectionId: string | undefined = state?.resumeConnectionId;
    const storedSession = readStoredSession();

    // Only auto-route to dashboard when there's no explicit add/resume intent.
    if (
      shouldOpenDashboardForStatus(storedSession?.account_status) &&
      !state?.addConnection &&
      !resumeConnectionId
    ) {
      localStorage.removeItem("oneverge_onboarding_state");
      setSafeStep(1);
      return;
    }

    // Restore landing step from a target connection. When resumeConnectionId is
    // supplied (e.g. clicking the balance card for a non-primary pending
    // connection), look up that exact connection. Otherwise fall back to the
    // customer's primary connection.
    const userId = storedSession?.id;
    if (!userId) return;

    (async () => {
      try {
        let query = (supabase as any)
          .from("customer_connections")
          .select("id, account_status, isp_id, broadband_plan_id, scheduled_services, scheduled_addon_plans, area_id, address")
          .eq("customer_id", userId);

        if (resumeConnectionId) {
          query = query.eq("id", resumeConnectionId);
        } else {
          query = query.eq("is_primary", true).order("is_primary", { ascending: false });
        }

        const { data: conn } = await query.limit(1).maybeSingle();

        if (!conn) return;

        if (conn.account_status === "account created") {
          setUserData({ ...storedSession, connection_id: conn.id, password: undefined });
          setConnectionId(conn.id);
          setSafeStep(5);
        } else if (conn.account_status === "feasibility done") {
          setUserData({
            ...storedSession,
            connection_id: conn.id,
            address: conn.address || storedSession.address || "",
            password: undefined,
          });
          setConnectionId(conn.id);
          setLocation(storedSession.location || conn.address || storedSession.address || "");

          if (conn.area_id) setAreaId(conn.area_id);
          if (conn.isp_id) setSelectedISP({ id: conn.isp_id, name: storedSession.ispName || "" });

          if (conn.broadband_plan_id) {
            const { data: plan } = await (supabase as any)
              .from("broadband_plans")
              .select("id, name, speed, price, base_price")
              .eq("id", conn.broadband_plan_id)
              .maybeSingle();
            if (plan) {
              setSelectedOffer({
                id: plan.id,
                name: plan.name || plan.speed,
                speed: plan.speed,
                price: Number(plan.price ?? plan.base_price ?? 0),
              });
            }
          }

          const services: string[] = conn.scheduled_services || [];
          setActive(
            services.reduce(
              (acc: Record<string, boolean>, id: string) => ({ ...acc, [id]: true }),
              { broadband: true },
            ),
          );

          if (conn.scheduled_addon_plans && typeof conn.scheduled_addon_plans === "object") {
            setSelectedAddonPlans(conn.scheduled_addon_plans as Record<string, string>);
          }

          setSafeStep(7);
        }
        // "active", "expired", "terminated" → Landing.tsx routes these to /dashboard
      } catch (err) {
        console.error("Session restoration failed:", err);
      }
    })();
  }, [routerState]);

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
