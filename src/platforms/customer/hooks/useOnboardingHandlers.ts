import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ONEVERGE_SUITE_RATES } from "@/shared/lib/constants";
import { finalisePayment } from "@/lib/finalisePayment";
import type { AddonPlan } from "@/shared/hooks/useAddonPlans";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OnboardingState {
  userData: any;
  setUserData: (data: any) => void;
  areaId: string | null;
  selectedISP: any;
  selectedOffer: any;
  active: Record<string, boolean>;
  selectedAddonPlans: Record<string, string>;
  addonPlansByService: Record<string, AddonPlan[]>;
  connectionId: string | null;
  setConnectionId: (id: string | null) => void;
  isAddConnection: boolean;
  setIsVerifying: (v: boolean) => void;
  setStep: (step: number | ((prev: number) => number)) => void;
  setTransactionId: (id: string) => void;
  setLocation: (loc: string) => void;
  setAreaId: (id: string | null) => void;
  setMobileView: (view: "location" | "isp") => void;
}

export function useOnboardingHandlers(state: OnboardingState, navigate: (path: string) => void) {
  const {
    userData, setUserData,
    areaId,
    selectedISP, selectedOffer,
    active, selectedAddonPlans, addonPlansByService,
    connectionId, setConnectionId,
    isAddConnection,
    setIsVerifying, setStep,
    setTransactionId,
    setLocation, setAreaId, setMobileView,
  } = state;

  const handleLocationConfirm = (locData: { displayName: string; areaId: string }) => {
    setLocation(locData.displayName);
    setAreaId(locData.areaId);
    setMobileView("isp");
  };

  const handleKYCSubmit = async () => {
    if (!areaId || !UUID_REGEX.test(areaId)) {
      toast.error("Invalid area selection. Please re-select your location.");
      return;
    }

    // Add Connection flow: customer already exists — identity is being confirmed
    // for regulatory purposes only. Create the connection row now and proceed to feasibility.
    if (isAddConnection) {
      const customerId = userData?.id;
      if (!customerId) {
        toast.error("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      setIsVerifying(true);
      try {
        const { data, error } = await supabase.functions.invoke("add-connection", {
          body: {
            customer_id: customerId,
            connection_label: "New Connection",
            isp_id: selectedISP?.id || null,
            area_id: areaId,
            broadband_plan_id: selectedOffer?.id || null,
            speed: selectedOffer?.speed || "50 Mbps",
            address: userData.address || null,
            active_services: Object.keys(active).filter((id) => active[id]),
            scheduled_services: Object.keys(active).filter((id) => active[id]),
            active_addon_plans: selectedAddonPlans,
            scheduled_addon_plans: selectedAddonPlans,
          },
        });
        if (error || !data?.ok) {
          toast.error("Failed to create connection. Please try again.");
          return;
        }
        setConnectionId(data.connection.id);
        setStep(5);
      } catch (err) {
        console.error("Add connection (KYC) failed:", err);
        toast.error("Failed to create connection.", { description: "Please try again." });
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    // New customer registration flow
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    const generatedUserId = `${datePrefix}${randomSuffix}`;

    setIsVerifying(true);
    try {
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
          active_addon_plans: selectedAddonPlans,
          scheduled_addon_plans: selectedAddonPlans,
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

      // Hydrate state with the created customer record (password not returned)
      setUserData({ ...data.customer, password: undefined });
      if (data.connection_id) setConnectionId(data.connection_id);
      setStep(5);
    } catch (err) {
      console.error("KYC submission failed:", err);
      toast.error("Account creation failed", { description: "Please try again." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFeasibilityComplete = async (success: boolean) => {
    if (!success) return;

    try {
      if (isAddConnection && connectionId) {
        // Update the new connection's status after feasibility passes
        const { error } = await (supabase as any)
          .from("customer_connections")
          .update({ account_status: "feasibility done" })
          .eq("id", connectionId);
        if (error) throw error;
      } else if (userData?.id) {
        // New customer — update customers table
        const { error } = await (supabase as any)
          .from("customers")
          .update({ account_status: "feasibility done" })
          .eq("id", userData.id);
        if (error) throw error;
        setUserData((prev: any) => ({ ...prev, account_status: "feasibility done" }));
      }
    } catch (err) {
      console.error("Failed to update status to feasibility done:", err);
    }
    setStep(7);
  };

  const handlePaymentComplete = async (txn: string, paymentMethod?: string, _installationTxn?: string) => {
    if (userData?.id) {
      try {
        const scheduledServices = Object.keys(active).filter((id) => active[id]);
        const basePrice = selectedOffer?.price || 800;
        const paidAmount =
          basePrice +
          scheduledServices
            .filter((s) => s !== "broadband")
            .reduce((sum, id) => {
              const planId = selectedAddonPlans[id];
              const plan = planId
                ? addonPlansByService[id]?.find((p) => p.id === planId)
                : addonPlansByService[id]?.[0];
              return sum + (plan?.price ?? ONEVERGE_SUITE_RATES[id] ?? 0);
            }, 0);

        await finalisePayment({
          context: "activation",
          customer: userData,
          connectionId,
          transactionId: txn,
          paymentMethod: paymentMethod || "Unknown",
          amountPaid: paidAmount,
          basePrice,
          scheduledServices,
          isRenewalDue: true,
          nextRenewalDate: new Date(),
        });

        const { data } = await (supabase as any)
          .from("customers")
          .select("*")
          .eq("id", userData.id)
          .maybeSingle();
        if (data) setUserData((prev: any) => ({ ...prev, ...data }));
      } catch (err) {
        console.error("Failed to finalise activation payment:", err);
      }
    }
    setTransactionId(txn);
    setStep(8);
  };

  const handleFinalize = () => {
    localStorage.removeItem("oneverge_onboarding_state");
    navigate("/dashboard");
  };

  return {
    handleLocationConfirm,
    handleKYCSubmit,
    handleFeasibilityComplete,
    handlePaymentComplete,
    handleFinalize,
  };
}
