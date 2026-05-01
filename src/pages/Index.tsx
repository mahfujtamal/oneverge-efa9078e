import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronRight, ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import { validatePassword } from "@/lib/passwordValidation";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// --- MASTER CONFIGURATION IMPORTS ---
import { ALL_SERVICES, BRANDING_CONFIG, PAGE_TITLES, BUTTON_LABELS, REGISTRY_LABELS } from "@/lib/constants";

// --- COMPONENT IMPORTS ---
import ServiceCard from "@/components/ServiceCard";
import LocationSearch from "@/components/LocationSearch";
import ISPComparison from "@/components/ISPComparison";
import KYCVerification from "@/components/KYCVerification";
import FeasibilityCheck from "@/components/FeasibilityCheck";
import PaymentGateway from "@/components/PaymentGateway";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { state: routerState } = useLocation();

  // --- STATE MANAGEMENT ---
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null); // <-- NEW: Add this line
  const [selectedISP, setSelectedISP] = useState<any>(null);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);

  const [userData, setUserData] = useState<any>({
    name: "",
    phone: "",
    email: "",
    address: "",
    nid: "",
    dob: "",
    password: "",
  });

  const [active, setActive] = useState<Record<string, boolean>>({ broadband: true });
  const [transactionId, setTransactionId] = useState("");

  // Checkout-time broadband plan override (user may switch plan in order summary)
  const [checkoutBroadbandPlanId, setCheckoutBroadbandPlanId] = useState<string | null>(null);
  const [checkoutBasePrice, setCheckoutBasePrice] = useState<number | null>(null);
  const [checkoutSpeed, setCheckoutSpeed] = useState<string | null>(null);
  const [broadbandPlans, setBroadbandPlans] = useState<
    Array<{ id: string; name: string; speed: string; price: number }>
  >([]);
  // Per-component pricing split (Base / VAT / Tax / Surcharge) for Step 7 summary
  const [pricingBreakdown, setPricingBreakdown] = useState<{
    items: Array<{
      id: string;
      label: string;
      base: number;
      vat: number;
      tax: number;
      surcharge: number;
      total: number;
    }>;
    installation: { base: number; vat: number; tax: number; surcharge: number; total: number };
  }>({
    items: [],
    installation: { base: 0, vat: 0, tax: 0, surcharge: 0, total: 0 },
  });
  const [mobileView, setMobileView] = useState<"location" | "isp">("location");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Live password policy checks (for inline feedback in Step 3)
  const pw = userData.password || "";
  const pwChecks = {
    length: pw.length >= 13,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  const pwValid = Object.values(pwChecks).every(Boolean);

  // --- TERMINATION & RESET PROTOCOL ---
  useEffect(() => {
    if (routerState?.forceReset) {
      setStep(1);
      setLocation("");
      setUserData({ name: "", phone: "", email: "", address: "", nid: "", dob: "" });
      setActive({ broadband: true });
      setTransactionId("");
      setSelectedISP(null);
      setSelectedOffer(null);
      localStorage.clear();
      window.history.replaceState({}, document.title);
      return;
    }

    // Restore landing step from the primary customer_connections row.
    // account_status drives which step to resume; all data comes from the DB
    // and the session object — no localStorage snapshot dependency.
    let session: Record<string, any> = {};
    try { session = JSON.parse(localStorage.getItem("oneverge_session") || "{}"); } catch {}
    const userId = session?.id;
    if (!userId) return;

    (async () => {
      try {
        const { data: conn } = await (supabase as any)
          .from("customer_connections")
          .select("id, account_status, isp_id, broadband_plan_id, scheduled_services")
          .eq("customer_id", userId)
          .order("is_primary", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!conn) return;

        if (conn.account_status === "account created") {
          setUserData({ ...session, connection_id: conn.id, password: undefined });
          setStep(5);
        } else if (conn.account_status === "feasibility done") {
          setUserData({ ...session, connection_id: conn.id, password: undefined });
          setLocation(session.location || session.address || "");

          if (conn.isp_id) setSelectedISP({ id: conn.isp_id, name: session.ispName || "" });

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

          setStep(7);
        }
        // "active", "expired", etc. are routed to /dashboard by Login.tsx
      } catch (err) {
        console.error("Session restoration failed:", err);
      }
    })();
  }, [routerState]);

  // --- PRICING BREAKDOWN FETCH (Step 7 summary) ---
  // Pulls per-component split (base / VAT / tax / surcharge) for:
  //   • the selected broadband plan
  //   • each active add-on
  //   • the installation fee (via RPC)
  // Re-runs whenever the selection or active addons change so the summary
  // table stays in sync with what the customer is about to be charged.
  useEffect(() => {
    if (step !== 7) return;

    const activeAddonIds = Object.keys(active).filter((id) => active[id] && id !== "broadband");

    (async () => {
      try {
        const items: typeof pricingBreakdown.items = [];

        // 1) Broadband plan split — use checkout override if customer changed plan in order summary
        const broadbandPlanId = checkoutBroadbandPlanId || selectedOffer?.id;
        if (broadbandPlanId) {
          const { data: plan } = await (supabase as any)
            .from("broadband_plans")
            .select("id, name, base_price, vat, tax, surplus_charge, price")
            .eq("id", broadbandPlanId)
            .maybeSingle();
          if (plan) {
            const base = Number(plan.base_price) || 0;
            const vat = Number(plan.vat) || 0;
            const tax = Number(plan.tax) || 0;
            const surcharge = Number(plan.surplus_charge) || 0;
            items.push({
              id: "broadband",
              label: plan.name || "Broadband",
              base,
              vat,
              tax,
              surcharge,
              total: Number(plan.price) || base + vat + tax + surcharge,
            });
          }
        }

        // 2) Add-on splits
        if (activeAddonIds.length > 0) {
          const { data: addons } = await (supabase as any)
            .from("addons")
            .select("id, name, base_price, vat, tax, surplus_charge, price")
            .in("id", activeAddonIds);
          (addons || []).forEach((a: any) => {
            const base = Number(a.base_price) || 0;
            const vat = Number(a.vat) || 0;
            const tax = Number(a.tax) || 0;
            const surcharge = Number(a.surplus_charge) || 0;
            items.push({
              id: a.id,
              label: a.name,
              base,
              vat,
              tax,
              surcharge,
              total: Number(a.price) || base + vat + tax + surcharge,
            });
          });
        }

        // 3) Installation fee split (ISP-specific or global default)
        let installation = { base: 0, vat: 0, tax: 0, surcharge: 0, total: 0 };
        if (selectedISP?.id) {
          const { data: feeData } = await (supabase as any).rpc("calculate_detailed_installation_fee", {
            p_isp_id: selectedISP.id,
          });
          if (feeData) {
            installation = {
              base: Number(feeData.base_fee) || 0,
              vat: Number(feeData.vat_amount) || 0,
              tax: Number(feeData.tax_amount) || 0,
              surcharge: Number(feeData.surcharge_amount) || 0,
              total: Number(feeData.total_fee) || 0,
            };
          }
        }

        setPricingBreakdown({ items, installation });
      } catch (err) {
        console.error("Failed to load pricing breakdown:", err);
      }
    })();
  }, [step, checkoutBroadbandPlanId, selectedOffer?.id, selectedISP?.id, active]);

  // Fetch all active broadband plans for this ISP when entering step 7.
  // Queries broadband_plans directly by isp_id — no isp_area_plans join needed.
  // Falls back to customer_connections if isp_id is not yet in state (e.g. re-login).
  useEffect(() => {
    if (step !== 7) return;

    (async () => {
      try {
        let ispId = selectedISP?.id || userData?.isp_id;
        let dbBroadbandPlanId: string | null = null;

        // If isp_id not in state, fetch it directly from the connection row.
        if (!ispId) {
          const connId = userData?.connection_id;
          const custId = userData?.id;
          if (!connId && !custId) return;

          const { data: conn } = await (supabase as any)
            .from("customer_connections")
            .select("isp_id, broadband_plan_id")
            .eq(connId ? "id" : "customer_id", connId || custId)
            .order("is_primary", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!conn?.isp_id) return;
          ispId = conn.isp_id;
          dbBroadbandPlanId = conn.broadband_plan_id || null;
        }

        // Query broadband_plans directly — avoids dependency on isp_area_plans pivot data.
        const { data, error } = await (supabase as any)
          .from("broadband_plans")
          .select("id, name, speed, price, base_price, is_active")
          .eq("isp_id", ispId)
          .eq("is_active", true);

        if (error) throw error;

        let plans = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name || p.speed,
          speed: p.speed,
          price: Number(p.price ?? p.base_price ?? 0),
        }));

        // If the ISP-level query returned nothing (broadband_plans.isp_id not yet backfilled),
        // fetch the customer's assigned plan by ID so the checkout always has a value.
        if (plans.length === 0) {
          const fallbackId = selectedOffer?.id || dbBroadbandPlanId || userData?.broadband_plan_id;
          if (fallbackId) {
            const { data: fp } = await (supabase as any)
              .from("broadband_plans")
              .select("id, name, speed, price, base_price, is_active")
              .eq("id", fallbackId)
              .maybeSingle();
            if (fp) {
              plans = [{ id: fp.id, name: fp.name || fp.speed, speed: fp.speed, price: Number(fp.price ?? fp.base_price ?? 0) }];
            }
          }
        }

        setBroadbandPlans(plans);

        // Pre-select the plan: prefer what the customer chose at step 3,
        // fall back to their active plan from the DB.
        if (!checkoutBroadbandPlanId) {
          const preferredId = selectedOffer?.id || dbBroadbandPlanId || userData?.broadband_plan_id;
          const match = plans.find((p: any) => p.id === preferredId);
          if (match) {
            setCheckoutBroadbandPlanId(match.id);
            setCheckoutBasePrice(match.price);
            setCheckoutSpeed(match.speed);
          }
        }
      } catch (err) {
        console.error("Failed to load broadband plans:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedISP?.id, userData?.isp_id, userData?.connection_id, userData?.id]);

  // --- HANDLERS ---
  const handleLocationConfirm = (locData: { displayName: string; areaId: string }) => {
    setLocation(locData.displayName); // Keeps ISPComparison working!
    setAreaId(locData.areaId); // Captures the strict UUID for the database!
    setMobileView("isp");
  };

  // --- CUSTOMER REGISTRATION (Runs after KYC entry) ---
  // --- KYC VERIFICATION (Step 4) ---
  const handleKYCSubmit = async () => {
    // Generate subscriber ID on the frontend
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    const generatedUserId = `${datePrefix}${randomSuffix}`;

    setIsVerifying(true);
    try {
      // Route through secure edge function: inserts customer + bcrypt-hashes password server-side
      const { data, error } = await supabase.functions.invoke("register-customer", {
        body: {
          user_id: generatedUserId,
          display_name: userData.name,
          phone_number: userData.phone,
          email: userData.email,
          address: userData.address,
          area_id: areaId,
          isp_id: selectedISP?.id || null,
          broadband_plan_id: selectedOffer?.id || null,
          nid: userData.nid,
          dob: userData.dob || null,
          password: userData.password,
          active_services: Object.keys(active).filter((id) => active[id]),
          scheduled_services: Object.keys(active).filter((id) => active[id]),
          speed: selectedOffer?.speed || "50 Mbps",
        },
      });

      if (error || !data?.ok) {
        const code = data?.error || (error as any)?.context?.error || "unknown";
        console.error("Registration failed:", code, error);

        if (code === "policy_violation") {
          toast.error("Password does not meet security policy", {
            description: "Min 13 chars, uppercase, lowercase, digit & special character.",
          });
        } else if (code === "missing_required_fields") {
          toast.error("Missing required information", {
            description: "Please complete all required fields.",
          });
        } else {
          toast.error("Account creation failed", {
            description: "Please try again in a moment.",
          });
        }
        return;
      }

      // Hydrate state with the created customer record (no password fields returned)
      setUserData({ ...data.customer, connection_id: data.connection_id ?? null, password: undefined });

      // Proceed to Feasibility Check
      setStep(5);
    } catch (err) {
      console.error("KYC submission failed:", err);
      toast.error("Account creation failed", {
        description: "Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };
  // --- account status = feasibility done (Runs after Feasibility Check) ---
  const handleRegisterCustomer = async (success: boolean) => {
    if (!success) return;

    if (userData?.id) {
      try {
        const { error } = await (supabase as any)
          .from("customer_connections")
          .update({ account_status: "feasibility done" })
          .eq("id", userData.connection_id);

        if (error) throw error;

        // Update local React state to match the database
        setUserData((prev: any) => ({ ...prev, account_status: "feasibility done" }));
      } catch (err) {
        console.error("Failed to update status to feasibility done:", err);
      }
    }

    // Move to Checkout
    setStep(7);
  };

  // Updates checkout state when the user picks a different broadband plan in the order summary.
  const handleSelectBroadbandPlan = (planId: string, price: number, speed: string) => {
    setCheckoutBroadbandPlanId(planId);
    setCheckoutBasePrice(price);
    setCheckoutSpeed(speed);
  };

  // --- PAYMENT GATEWAY (Step 7) ---
  const handlePaymentComplete = async (
    txn: string,
    paymentMethod?: string,
    _installationTxn?: string,
    serviceAmountFromGateway?: number,
  ) => {
    // NOTE: installation txn (`_installationTxn`) is intentionally NOT passed to
    // finalisePayment — it must NEVER appear in billing_history or wallet flow.
    // It already exists as its own row in the `payments` table (written by
    // PaymentGateway), so Payments History will surface it on its own.
    if (userData?.id) {
      try {
        const scheduledServices = Object.keys(active).filter((id) => active[id]);
        // Use the plan the customer selected at checkout, falling back to the original offer.
        const basePrice = checkoutBasePrice ?? selectedOffer?.price ?? 800;
        const effectiveSpeed = checkoutSpeed ?? selectedOffer?.speed ?? null;
        const effectivePlanId = checkoutBroadbandPlanId ?? selectedOffer?.id ?? null;

        const { ONEVERGE_SUITE_RATES } = await import("@/lib/constants");
        // Prefer the actual service amount reported by PaymentGateway (which uses
        // the real DB-priced totals). Fall back to a constants-based estimate only
        // when the gateway didn't supply the amount (legacy callers).
        const paidAmount =
          serviceAmountFromGateway ??
          basePrice +
            scheduledServices
              .filter((s) => s !== "broadband")
              .reduce((sum, id) => sum + (ONEVERGE_SUITE_RATES[id] || 0), 0);

        const { finalisePayment } = await import("@/lib/finalisePayment");
        await finalisePayment({
          context: "activation",
          customer: userData,
          transactionId: txn,
          paymentMethod: paymentMethod || "Unknown",
          amountPaid: paidAmount,
          basePrice,
          scheduledServices,
          isRenewalDue: true, // activation always consumes a cycle
          nextRenewalDate: new Date(),
          scheduledBroadbandPlanId: effectivePlanId,
          speed: effectiveSpeed,
        });

        // Refresh local userData with the post-activation state from the connection row
        const { data } = await (supabase as any)
          .from("customer_connections")
          .select("*")
          .eq("id", userData.connection_id)
          .maybeSingle();
        if (data) setUserData((prev: any) => ({ ...prev, ...data, connection_id: data.id }));
      } catch (err) {
        console.error("Failed to finalise activation payment:", err);
      }
    }

    setTransactionId(txn);
    setStep(8);
  };

  const finalizeFlow = useCallback(() => {
    // 1. Clear the temporary onboarding state
    localStorage.removeItem("oneverge_onboarding_state");

    // 2. Hard-redirect the user to thedashboard
    navigate("/dashboard");
  }, [navigate]); // Ensure navigate is in the dependency array
  return (
    <div className="ov-page-container flex-col">
      <header className="h-16 flex items-center justify-between border-b border-white/5 backdrop-blur-md px-6 shrink-0 z-50">
        {/* LEFT SIDE: EXISTING BACK BUTTON */}
        <div className="flex items-center gap-4">
          {step > 1 && step < 8 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (step === 2) setStep(1);
                else if (step === 3 && mobileView === "isp") setMobileView("location");
                else if (step === 5.5) setStep(5);
                else if (step === 7) setStep(4);
                else setStep((prev) => Math.max(1, prev - 1));
              }}
              className="rounded-full h-8 w-8 hover:bg-white/10"
            >
              <ArrowLeft size={18} className="text-gray-400" />
            </Button>
          )}
        </div>

        {/* RIGHT SIDE: DYNAMIC LOGIN / LOGOUT NAVIGATION */}
        <div className="flex items-center gap-4">
          {userData?.id ? ( // check the DB entry
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
          {/* STEP 1: HERO */}
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ov-flex-center min-h-[calc(100vh-64px)] px-6 py-12"
            >
              <div className="text-center mb-12 max-w-4xl">
                <h2 className="ov-h1 !text-4xl md:!text-6xl leading-[1.1] mb-6 tracking-tightest uppercase font-black">
                  {BRANDING_CONFIG.HERO_TITLE}
                </h2>
                <p className="ov-section-label !text-gray-400 normal-case tracking-widest opacity-60 italic">
                  {BRANDING_CONFIG.HERO_SUBTITLE}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 w-full max-w-6xl mb-16 px-4">
                {ALL_SERVICES.map((s) => (
                  <div
                    key={s.id}
                    className="ov-glass-card p-4 flex flex-col items-center justify-center text-center group border-white/5"
                  >
                    <div className={`${s.color} mb-3 group-hover:scale-110 transition-transform`}>
                      <s.icon size={22} />
                    </div>
                    <h3 className="text-[8px] font-black uppercase tracking-widest text-white/70 leading-none">
                      {s.name}
                    </h3>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setStep(2)}
                className="ov-btn-primary !h-16 !px-14 !rounded-2xl shadow-ov-primary/20"
              >
                {PAGE_TITLES.ORCHESTRATE} <ChevronRight size={20} className="ml-2" />
              </Button>
            </motion.div>
          )}

          {/* STEP 2: ORCHESTRATE */}
          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="min-h-full ov-flex-center p-4"
            >
              <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 content-center">
                {ALL_SERVICES.map((s) => (
                  <ServiceCard
                    key={s.id}
                    {...s}
                    active={!!active[s.id]}
                    onToggle={(id) => id !== "broadband" && setActive((prev) => ({ ...prev, [id]: !prev[id] }))}
                    isMandatory={s.id === "broadband"}
                  />
                ))}
              </div>
              <Button onClick={() => setStep(3)} className="mt-10 ov-btn-primary w-full max-w-md !h-14 font-black">
                {BUTTON_LABELS.FINALIZE_LAYERS}
              </Button>
            </motion.div>
          )}

          {/* STEP 3: INFRASTRUCTURE (With Mobile Switch) */}
          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row p-4 lg:p-8 gap-6"
            >
              <div
                className={`${mobileView === "isp" ? "hidden lg:flex" : "flex"} flex-1 min-h-[70vh] lg:min-h-0 ov-glass-card overflow-hidden flex-col`}
              >
                <LocationSearch
                  onConfirm={handleLocationConfirm}
                  onBack={() => setStep(2)}
                  // Inject the active areaId state so the child component can evaluate it
                  selectedAreaId={areaId}
                />
              </div>

              {location && (
                <div
                  className={`${mobileView === "location" ? "hidden lg:flex" : "flex"} flex-1 min-h-[70vh] lg:min-h-0 ov-glass-card overflow-hidden flex-col`}
                >
                  <ISPComparison
                    location={location}
                    onSelect={(isp, offer) => {
                      setSelectedISP(isp);
                      setSelectedOffer(offer);
                      setStep(4);
                    }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: IDENTITY REGISTRY */}
          {step === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ov-flex-center min-h-full p-4"
            >
              <div className="ov-glass-card w-full max-w-2xl p-8 lg:p-12 space-y-8">
                <div>
                  <span className="ov-section-label uppercase tracking-[0.2em]">Step 03. Identity</span>
                  <h2 className="ov-h1 !text-3xl mt-2 font-black italic uppercase">{PAGE_TITLES.REGISTRY}</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <input
                      className="bg-black/40 p-4 w-full rounded-xl border border-white/10 text-white uppercase text-[11px] font-bold outline-none focus:border-ov-primary transition-all"
                      placeholder="Full Name"
                      value={userData.name}
                      onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <input
                      className="bg-black/40 p-4 w-full rounded-xl border border-white/10 text-white uppercase text-[11px] font-bold outline-none focus:border-ov-primary transition-all"
                      placeholder="Mobile Number"
                      value={userData.phone}
                      onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2 sm:col-span-1">
                    <input
                      className="bg-black/40 p-4 w-full rounded-xl border border-white/10 text-white lowercase text-[11px] font-bold outline-none focus:border-ov-primary transition-all"
                      placeholder="node@oneverge.com"
                      type="email"
                      value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                    />
                  </div>

                  {/* PASSWORD */}
                  <div className="space-y-2 sm:col-span-1 relative">
                    <div className="relative">
                      <input
                        className="bg-black/40 p-4 pr-12 w-full rounded-xl border border-white/10 text-white text-[11px] font-bold outline-none focus:border-ov-primary transition-all"
                        placeholder="Create Password"
                        type={showPassword ? "text" : "password"}
                        value={userData.password}
                        onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* INLINE POLICY CHECKLIST — visible while typing, hides once valid */}
                    {pw.length > 0 && !pwValid && (
                      <div className="bg-black/60 border border-white/10 p-3 rounded-lg space-y-1">
                        <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">
                          Password Policy
                        </p>
                        {[
                          { ok: pwChecks.length, label: "Minimum 13 characters" },
                          { ok: pwChecks.upper, label: "One uppercase letter (A-Z)" },
                          { ok: pwChecks.lower, label: "One lowercase letter (a-z)" },
                          { ok: pwChecks.digit, label: "One digit (0-9)" },
                          { ok: pwChecks.special, label: "One special character" },
                        ].map((c) => (
                          <div key={c.label} className="flex items-center gap-2 text-[10px]">
                            {c.ok ? (
                              <Check size={12} className="text-green-400 shrink-0" />
                            ) : (
                              <X size={12} className="text-red-400 shrink-0" />
                            )}
                            <span className={c.ok ? "text-green-300" : "text-gray-400"}>{c.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* NID */}
                  <div className="space-y-2">
                    <input
                      className="bg-black/40 p-4 w-full rounded-xl border border-white/10 text-white uppercase text-[11px] font-bold outline-none focus:border-ov-primary transition-all"
                      placeholder="NID"
                      value={userData.nid}
                      onChange={(e) => setUserData({ ...userData, nid: e.target.value })}
                    />
                  </div>

                  {/* DOB: SHADCN POPOVER DATEPICKER */}
                  <div className="space-y-2">
                    <div className="relative group">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "bg-black/40 p-4 w-full h-[54px] rounded-xl border border-white/10 text-white outline-none focus:border-ov-primary hover:bg-black/60 hover:text-white transition-all font-bold text-[11px] uppercase justify-start text-left font-normal",
                              !userData.dob && "text-gray-500",
                            )}
                          >
                            <CalendarIcon className="mr-3 h-4 w-4 shrink-0" />
                            {userData.dob ? format(new Date(userData.dob), "PPP") : <span>DATE OF BIRTH</span>}
                          </Button>
                        </PopoverTrigger>

                        <PopoverContent className="w-auto p-0 bg-gray-950 border-gray-800 text-black" align="start">
                          <Calendar
                            mode="single"
                            // Parse the existing string state into a Date object for the Calendar
                            selected={userData.dob ? new Date(userData.dob) : undefined}
                            // Convert the selected Date object back to a database-friendly ISO string
                            onSelect={(date) => setUserData({ ...userData, dob: date ? date.toISOString() : "" })}
                            captionLayout="dropdown-buttons"
                            fromYear={1940}
                            toYear={new Date().getFullYear()}
                            // Force inner calendar elements to adopt the light theme
                            className="bg-white text-black"
                            classNames={{
                              caption_dropdowns: "flex flex-row gap-2 font-medium",

                              // ADD THESE TWO LINES
                              caption_label: "hidden", // Completely removes the fixed "Month Year" text span
                              vhidden: "hidden", // Removes native screen-reader labels that can disrupt flex layouts
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                {/* Address */}
                <div className="space-y-2 sm:col-span-2">
                  <textarea
                    rows={2}
                    className="bg-black/40 p-4 w-full rounded-xl border border-white/10 text-white uppercase text-[11px] font-bold outline-none focus:border-ov-primary transition-all resize-none"
                    placeholder="Installation Address"
                    value={userData.address}
                    onChange={(e) => setUserData({ ...userData, address: e.target.value })}
                  />
                </div>
                <Button
                  onClick={() => {
                    // 1. Validate that the mandatory KYC fields are not empty
                    if (
                      !userData.name ||
                      !userData.phone ||
                      !userData.dob ||
                      !userData.nid ||
                      !userData.password ||
                      !userData.email ||
                      !userData.address
                    ) {
                      toast.error("Please complete all required fields to verify your identity.");
                      return;
                    }

                    // 2. Enforce password policy before any DB write
                    const pwResult = validatePassword(userData.password);
                    if (!pwResult.isValid) {
                      toast.error("Password does not meet security policy", {
                        description: pwResult.errors[0],
                      });
                      return;
                    }

                    // 3. Execute the database insertion, update the account_status, and advance to Step 5
                    handleKYCSubmit();
                  }}
                  disabled={isVerifying || (!!userData.password && !pwValid)}
                  className="ov-btn-primary w-full !h-14 shadow-ov-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      VERIFYING...
                    </>
                  ) : (
                    "VERIFY IDENTITY"
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: AUDIT / FEASIBILITY */}
          {(step === 5 || step === 5.5) && (
            <motion.div key="s5" className="min-h-full ov-flex-center flex-col lg:flex-row gap-8 p-6">
              <KYCVerification userData={userData} onVerified={() => setStep(5.5)} />
              {step === 5.5 && (
                <FeasibilityCheck
                  userData={userData}
                  ispName={selectedISP?.name}
                  onResult={handleRegisterCustomer} // <-- UPDATED: Points to DB insert function
                />
              )}
            </motion.div>
          )}

          {/* STEP 7: PAYMENT */}
          {step === 7 && (
            <PaymentGateway
              activeAddons={active}
              setActiveAddons={setActive}
              basePrice={checkoutBasePrice ?? selectedOffer?.price ?? 800}
              selectedOffer={selectedOffer}
              userId={userData.id}
              paymentType="activation"
              installationFee={pricingBreakdown.installation.total}
              pricingBreakdown={pricingBreakdown}
              broadbandPlans={broadbandPlans}
              selectedBroadbandPlanId={checkoutBroadbandPlanId ?? selectedOffer?.id ?? null}
              onSelectBroadbandPlan={handleSelectBroadbandPlan}
              onBack={() => setStep(4)}
              onPaymentSuccess={handlePaymentComplete}
            />
          )}

          {/* STEP 8: SUCCESS */}
          {step === 8 && (
            <motion.div
              key="s8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-start min-h-full px-4 py-10 text-center"
            >
              <header className="mb-6">
                <h2 className="ov-h1 !text-4xl lg:!text-7xl mb-2 italic uppercase font-black">{PAGE_TITLES.SUCCESS}</h2>
                <div className="ov-badge py-1.5 px-4 mx-auto text-ov-primary bg-ov-primary/5 border-ov-primary/10 uppercase font-black tracking-widest text-[9px]">
                  WELCOME TO {BRANDING_CONFIG.PLATFORM_NAME}
                </div>
              </header>

              <div className="ov-glass-card w-full max-w-2xl p-8 relative overflow-hidden text-left border-ov-primary/20 bg-black/40 shadow-2xl">
                <div className="flex justify-between items-center mb-6 text-ov-primary">
                  <div className="flex items-center gap-3">
                    <Zap size={20} fill="currentColor" />
                    <h3 className="ov-h1 !text-lg italic uppercase">NODE ACTIVE</h3>
                  </div>
                  <span className="ov-h1 !text-xl font-black">100%</span>
                </div>

                <div className="w-full h-1.5 bg-white/5 rounded-full mb-8 overflow-hidden border border-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2 }}
                    className="h-full bg-ov-primary shadow-[0_0_15px_#22d3ee]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 pb-8 border-b border-white/5">
                  <div>
                    <p className="ov-section-label !text-gray-500 text-[7px]">TRANSACTION ID</p>
                    <p className="font-mono text-[10px] text-white uppercase font-bold break-all">
                      {transactionId || "AUTH-VERIFIED"}
                    </p>
                  </div>
                  <div>
                    <p className="ov-section-label !text-gray-500 text-[7px]">ONEVERGE ID</p>
                    <p className="font-mono text-[10px] text-white uppercase font-bold">{userData.user_id}</p>
                  </div>
                </div>

                <div>
                  <p className="ov-section-label !text-gray-500 mb-4 text-[7px]">PROVISIONED SERVICES</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_SERVICES.filter((s) => active[s.id] === true).map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-ov-primary/5 border border-ov-primary/10"
                      >
                        <service.icon size={14} className="text-ov-primary" />
                        <span className="text-[8px] font-black uppercase text-white truncate">{service.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10 w-full max-w-sm pb-10">
                <Button onClick={finalizeFlow} className="ov-btn-primary w-full !h-14">
                  GO TO DASHBOARD <ArrowRight size={18} className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
