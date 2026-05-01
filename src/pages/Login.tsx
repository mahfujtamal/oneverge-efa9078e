import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { normalizeOnboardingStep, shouldOpenDashboardForStatus } from "@/platforms/customer/hooks/useOnboardingState";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null); // To read login error
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      // Call the secure login edge function (verifies bcrypt-hashed password server-side)
      const { data, error } = await supabase.functions.invoke("login", {
        body: { identifier: identifier.trim(), password },
      });

      if (error || !data?.ok) {
        const code = data?.error || (error as any)?.context?.error || "unknown";

        if (code === "not_found") {
          setLoginError("No account found with that email, phone number, or subscriber ID.");
          toast.error("Account not found", {
            description: "Check your login details and try again.",
          });
        } else if (code === "invalid_password") {
          setLoginError("Invalid password. Please try again.");
          toast.error("Invalid password", {
            description: "Please check your password and try again.",
          });
        } else if (code === "policy_violation") {
          setLoginError(
            "Your password no longer meets our security policy (min. 13 characters, uppercase, lowercase, digit, special). Please reset your password to continue.",
          );
          toast.warning("Password reset required", {
            description: "Your current password does not meet the new security policy.",
          });
          navigate("/forgot-password");
        } else {
          setLoginError("We could not verify your account right now. Please try again.");
          toast.error("Login failed", {
            description: "We could not verify your account right now. Please try again.",
          });
        }
        return;
      }

      const user = data.user;
      const resolvedIspName = data.ispName || "OneVerge Global";
      const resolvedIspId = data.ispId || null;

      // Build the enriched session payload expected by Dashboard / onboarding.
      // user.location is already a derived string from the login edge function.
      const enrichedSession = {
        ...user,
        ispName: resolvedIspName,
        isp_id: resolvedIspId,
      };

      let existingState: Record<string, any> = {};
      try {
        existingState = JSON.parse(localStorage.getItem("oneverge_onboarding_state") || "{}");
      } catch {
        localStorage.removeItem("oneverge_onboarding_state");
      }

      const restoredISP = resolvedIspId ? { id: resolvedIspId, name: resolvedIspName } : existingState.selectedISP;
      const restoredLocation = user.location || user.address || existingState.location || "";

      // Reconstruct active addon map from scheduled_services (what the customer selected).
      const services: string[] =
        (Array.isArray(user.scheduled_services) && user.scheduled_services.length > 0
          ? user.scheduled_services
          : Array.isArray(user.active_services) && user.active_services.length > 0
            ? user.active_services
            : null) || [];
      const restoredActive: Record<string, boolean> =
        services.length > 0
          ? services.reduce(
              (acc: Record<string, boolean>, id: string) => {
                acc[id] = true;
                return acc;
              },
              { broadband: true },
            )
          : existingState.active || { broadband: true };

      // Restore addon plan selections from the connection's active_addon_plans.
      const restoredAddonPlans: Record<string, string> =
        (user.active_addon_plans && typeof user.active_addon_plans === "object"
          ? user.active_addon_plans
          : existingState.selectedAddonPlans) || {};

      // Reconstruct selectedOffer with the broadband plan ID so usePricingBreakdown
      // can fetch the actual price from DB instead of using a hardcoded fallback.
      const restoredOffer =
        existingState.selectedOffer ||
        (user.broadband_plan_id
          ? { id: user.broadband_plan_id, name: `${user.speed || ""} Plan`, speed: user.speed, price: 0 }
          : user.speed
            ? { name: `${user.speed} Plan`, speed: user.speed, price: 0 }
            : null);

      // Routing: for known statuses, always use the status-driven step so the customer
      // resumes at the correct point regardless of any stale savedStep in localStorage.
      const shouldOpenDashboard = shouldOpenDashboardForStatus(user.account_status);
      let targetStep = 1;
      if (user.account_status === "account created") targetStep = 5;
      else if (user.account_status === "feasibility done") targetStep = 7;

      localStorage.setItem("oneverge_session", JSON.stringify(enrichedSession));
      localStorage.setItem("oneverge_user", JSON.stringify(enrichedSession));

      if (shouldOpenDashboard) {
        localStorage.removeItem("oneverge_onboarding_state");
      } else {
        localStorage.setItem(
          "oneverge_onboarding_state",
          JSON.stringify({
            ...existingState,
            areaId: existingState.areaId || user.area_id || null,
            userData: enrichedSession,
            selectedISP: restoredISP,
            selectedOffer: restoredOffer,
            selectedAddonPlans: restoredAddonPlans,
            location: restoredLocation,
            active: restoredActive,
            step: normalizeOnboardingStep(targetStep),
          }),
        );
      }
      localStorage.removeItem("oneverge_last_step");

      if (shouldOpenDashboard) {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      setLoginError("An unexpected error occurred. Please try again.");
      toast.error("Unexpected login error", {
        description: "Please try again in a moment.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black text-white">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md p-8 space-y-6 rounded-xl border border-white/10 bg-white/5"
      >
        {/* DYNAMIC ERROR BANNER */}
        {loginError && (
          <div className="bg-red-950/40 border border-red-500/50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-200/90 leading-tight">{loginError}</p>
          </div>
        )}

        <h2 className="text-2xl font-bold text-center"> Login</h2>

        <div className="space-y-2">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email, Phone, or Name"
            className="w-full p-3 rounded-lg bg-black/50 border border-white/20 text-white"
            required
          />
        </div>

        <div className="space-y-2 relative group">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 pr-12 rounded-lg bg-black/50 border border-white/20 text-white"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* HOVER TOOLTIP */}
          <div className="absolute left-0 bottom-full mb-2 w-full sm:w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out z-50 pointer-events-none">
            <div className="bg-black/95 border border-white/20 p-3 rounded-lg shadow-2xl backdrop-blur-md">
              <p className="text-white text-xs font-bold mb-1.5">Password Policy</p>
              <ul className="text-[10px] text-gray-400 list-disc pl-3 space-y-1">
                <li>Minimum 13 characters in length</li>
                <li>Must contain uppercase & lowercase letters</li>
                <li>Must include numbers & special symbols</li>
              </ul>
              {/* Tooltip pointer arrow */}
              <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-black/95 border-b border-r border-white/20 transform rotate-45"></div>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          {isLoading ? "Authenticating..." : "Sign In"}
        </Button>

        <div className="text-center text-sm">
          <Link to="/forgot-password" className="text-blue-400 hover:underline">
            Forgot password?
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
