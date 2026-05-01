import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRenewalDateCalc(sessionData: any) {
  const [lastPaidAt, setLastPaidAt] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionData?.id) return;

    const fetchLastPaid = async () => {
      const { data, error } = await (supabase as any).rpc(
        "get_customer_billing_history",
        { _customer_id: sessionData.id },
      );
      if (error) {
        console.error("Latest paid billing lookup failed:", error);
        return;
      }
      const latestPaid = (Array.isArray(data) ? data : []).find(
        (row: any) => String(row?.status || "").toLowerCase() === "paid",
      );
      setLastPaidAt(latestPaid?.created_at ?? null);
    };

    fetchLastPaid();
  }, [sessionData?.id, sessionData?.account_status, sessionData?.balance]);

  // Cycle anchor mirrors the process-renewals edge function priority:
  //   1. Last paid billing_history.created_at  (post-renewal)
  //   2. customers.created_at                  (initial activation)
  // EXPIRED accounts: renewal is due today (paying restarts the cycle).
  const nextRenewalDate = useMemo(() => {
    const todayDateOnly = new Date();
    todayDateOnly.setHours(0, 0, 0, 0);

    if (sessionData?.account_status === "expired") return todayDateOnly;

    const anchorISO = lastPaidAt || sessionData?.created_at || sessionData?.activation_date;
    const anchor = anchorISO ? new Date(anchorISO) : new Date();
    anchor.setHours(0, 0, 0, 0);

    const originalDay = anchor.getDate();
    const next = new Date(anchor);
    let targetMonth = next.getMonth() + 1;
    next.setDate(1);
    next.setMonth(targetMonth);
    let lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDay, lastDayOfMonth));

    while (next < todayDateOnly) {
      targetMonth = next.getMonth() + 1;
      next.setDate(1);
      next.setMonth(targetMonth);
      lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(originalDay, lastDayOfMonth));
    }

    return next;
  }, [sessionData, lastPaidAt]);

  const formattedRenewalDate = useMemo(
    () => nextRenewalDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    [nextRenewalDate],
  );

  // Only trust the DB status — never override "active" with date math.
  const accountStatus = useMemo(
    () => (sessionData?.account_status === "expired" ? "expired" : "active"),
    [sessionData],
  );

  return { nextRenewalDate, formattedRenewalDate, accountStatus };
}
