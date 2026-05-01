import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { parseCustomerSession, clearCustomerSession } from "@/shared/hooks/useSession";
import { verifySession, isSessionExpired } from "@/shared/lib/sessionValidator";
import { SUPPORT_CONFIG } from "@/shared/lib/constants";

interface ProtectedRouteProps {
  // Pass "admin" to gate a route to the admin email only.
  // Replace with a proper role column in Phase 1 (Platform Admin).
  requiredRole?: "admin";
}

type CheckStatus = "checking" | "allowed" | "denied";

export const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
  const [status, setStatus] = useState<CheckStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // 1. Parse + Zod-validate session from localStorage (no router state at layout level)
      const session = parseCustomerSession(null);

      if (!session) {
        if (!cancelled) setStatus("denied");
        return;
      }

      // 2. TTL check — reject sessions older than 7 days
      if (isSessionExpired(session.created_at)) {
        clearCustomerSession();
        if (!cancelled) setStatus("denied");
        return;
      }

      // 3. RBAC — admin routes are restricted to the configured admin email.
      //    This is a temporary guard; replace with a `role` column in Phase 1.
      if (requiredRole === "admin" && session.email !== SUPPORT_CONFIG.EMAIL) {
        if (!cancelled) setStatus("denied");
        return;
      }

      // 4. Server-side session verification (RPC: verify_customer_session)
      //    Fails open if the RPC is unavailable — see sessionValidator.ts
      const valid = await verifySession(session.id);
      if (!cancelled) setStatus(valid ? "allowed" : "denied");
    }

    check();
    return () => { cancelled = true; };
  }, [requiredRole]);

  if (status === "checking") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-ov-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
