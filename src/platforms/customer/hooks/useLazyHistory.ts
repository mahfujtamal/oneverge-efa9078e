import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useLazyHistory(sessionData: any) {
  const [payments, setPayments] = useState<any[] | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showPayments, setShowPayments] = useState(false);

  const [billingRows, setBillingRows] = useState<any[] | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [showBilling, setShowBilling] = useState(false);

  const loadPayments = async () => {
    if (!sessionData?.id || payments !== null) return;
    setPaymentsLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc(
        "get_customer_payment_history",
        { _customer_id: sessionData.id },
      );
      if (error) throw error;
      setPayments(data || []);
    } catch (e) {
      console.error("Payment history load failed:", e);
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const loadBilling = async () => {
    if (!sessionData?.id || billingRows !== null) return;
    setBillingLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc(
        "get_customer_billing_history",
        { _customer_id: sessionData.id },
      );
      if (error) throw error;
      setBillingRows(data || []);
    } catch (e) {
      console.error("Billing history load failed:", e);
      setBillingRows([]);
    } finally {
      setBillingLoading(false);
    }
  };

  const togglePayments = () => {
    const next = !showPayments;
    setShowPayments(next);
    if (next) loadPayments();
  };

  const toggleBilling = () => {
    const next = !showBilling;
    setShowBilling(next);
    if (next) loadBilling();
  };

  return {
    payments, paymentsLoading, showPayments, togglePayments,
    billingRows, billingLoading, showBilling, toggleBilling,
  };
}
