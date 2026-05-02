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
    // ISP and location names pre-baked per connection (see refreshFromDb enrichment)
    ispName: connection.ispName || customer.ispName || "",
    location: connection.location || customer.location || "",
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

      // Batch-fetch ISP names and area+district names for all connections.
      const ispIds = [...new Set(allConnections.map((c: any) => c.isp_id).filter(Boolean))];
      const areaIds = [...new Set(allConnections.map((c: any) => c.area_id).filter(Boolean))];

      const [{ data: ispRows }, { data: areaRows }] = await Promise.all([
        ispIds.length
          ? (supabase as any).from("isps").select("id, name").in("id", ispIds)
          : Promise.resolve({ data: [] }),
        areaIds.length
          ? (supabase as any).from("areas").select("id, name, districts(name)").in("id", areaIds)
          : Promise.resolve({ data: [] }),
      ]);

      const ispMap: Record<string, string> = Object.fromEntries(
        (ispRows || []).map((r: any) => [r.id, r.name]),
      );
      const areaMap: Record<string, { name: string; district: string }> = Object.fromEntries(
        (areaRows || []).map((r: any) => [r.id, { name: r.name, district: r.districts?.name || "" }]),
      );

      if (cancelled) return;

      // Enrich each connection with resolved display names.
      const enrichedConnections = allConnections.map((c: any) => ({
        ...c,
        ispName: c.isp_id ? ispMap[c.isp_id] || "" : "",
        location: c.area_id
          ? [areaMap[c.area_id]?.name, areaMap[c.area_id]?.district].filter(Boolean).join(", ")
          : "",
      }));

      // Determine which connection to project: prefer the one already selected,
      // otherwise fall back to the primary, otherwise the first.
      const activeConnId = sessionData.connection_id;
      const activeConn =
        (activeConnId && enrichedConnections.find((c) => c.id === activeConnId)) ||
        enrichedConnections.find((c) => c.is_primary) ||
        enrichedConnections[0] ||
        null;

      const merged = mergeConnection({ ...customer, connections: enrichedConnections }, activeConn);

      setSessionData((prev: any) => {
        const hasChanged =
          merged.connection_id !== prev?.connection_id ||
          merged.balance !== prev?.balance ||
          merged.account_status !== prev?.account_status ||
          merged.created_at !== prev?.created_at ||
          merged.ispName !== prev?.ispName ||
          merged.location !== prev?.location ||
          JSON.stringify(merged.active_services) !== JSON.stringify(prev?.active_services) ||
          JSON.stringify(merged.scheduled_services) !== JSON.stringify(prev?.scheduled_services) ||
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
