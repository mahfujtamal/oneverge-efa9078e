import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Projects the selected connection's fields onto the flat session object so
// existing code (Dashboard, BillingVault, etc.) can still read sessionData.balance,
// sessionData.speed, sessionData.account_status, etc. without any changes.
function mergeConnection(customer: any, connection: any): any {
  if (!connection) return customer;
  return {
    ...customer,
    // Connection-specific fields projected flat
    connection_id: connection.id,
    connection_label: connection.connection_label,
    isp_id: connection.isp_id,
    area_id: connection.area_id,
    broadband_plan_id: connection.broadband_plan_id,
    scheduled_broadband_plan_id: connection.scheduled_broadband_plan_id,
    speed: connection.speed,
    address: connection.address,
    account_status: connection.account_status,
    balance: connection.balance,
    active_services: connection.active_services,
    scheduled_services: connection.scheduled_services,
    active_addon_plans: connection.active_addon_plans,
    scheduled_addon_plans: connection.scheduled_addon_plans,
    // Use connection's created_at for billing cycle calculation
    created_at: connection.created_at,
    // Keep full list for multi-connection UI
    connections: customer.connections,
  };
}

export function useCustomerSession(routerState: unknown) {
  const [sessionData, setSessionData] = useState<any>(() => {
    const state = routerState as any;
    if (state?.userData?.id) return state.userData;
    if (state?.id) return state;
    const saved = localStorage.getItem("oneverge_session") || localStorage.getItem("oneverge_user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    let cancelled = false;

    const refreshFromDb = async () => {
      if (!sessionData?.id) return;

      // Fetch customer identity row (identity-only — no service/billing columns)
      const { data: customer, error: custErr } = await (supabase as any)
        .from("customers")
        .select("id, user_id, display_name, email, phone_number, nid, dob, created_at")
        .eq("id", sessionData.id)
        .maybeSingle();
      if (cancelled || custErr || !customer) return;

      // Fetch all connections for this customer
      const { data: connections, error: connErr } = await (supabase as any)
        .from("customer_connections")
        .select("*")
        .eq("customer_id", sessionData.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
      if (cancelled || connErr) return;

      const allConnections: any[] = connections || [];

      // Determine which connection to project: prefer the one already selected,
      // otherwise fall back to the primary, otherwise the first.
      const activeConnId = sessionData.connection_id;
      const activeConn =
        (activeConnId && allConnections.find((c) => c.id === activeConnId)) ||
        allConnections.find((c) => c.is_primary) ||
        allConnections[0] ||
        null;

      const merged = mergeConnection({ ...customer, connections: allConnections }, activeConn);

      setSessionData((prev: any) => {
        const hasChanged =
          merged.connection_id !== prev?.connection_id ||
          merged.balance !== prev?.balance ||
          merged.account_status !== prev?.account_status ||
          merged.created_at !== prev?.created_at ||
          JSON.stringify(merged.active_services) !== JSON.stringify(prev?.active_services) ||
          JSON.stringify(merged.connections) !== JSON.stringify(prev?.connections);
        if (!hasChanged) return prev;
        try {
          localStorage.setItem("oneverge_session", JSON.stringify(merged));
        } catch {
          /* ignore quota errors */
        }
        return merged;
      });
    };

    refreshFromDb();

    const onFocus = () => refreshFromDb();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshFromDb();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.id]);

  // Switch the active connection context without a DB round-trip.
  const switchConnection = (connectionId: string) => {
    setSessionData((prev: any) => {
      if (!prev?.connections) return prev;
      const conn = prev.connections.find((c: any) => c.id === connectionId);
      if (!conn) return prev;
      const updated = mergeConnection(prev, conn);
      try {
        localStorage.setItem("oneverge_session", JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  };

  return [sessionData, setSessionData, switchConnection] as const;
}
