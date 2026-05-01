import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRelocationFlow(sessionData: any) {
  const [targetDistrictId, setTargetDistrictId] = useState("");
  const [targetAreaName, setTargetAreaName] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [relocationDate, setRelocationDate] = useState<Date | undefined>(undefined);
  const [calculatedFee, setCalculatedFee] = useState<{
    base: number; vat: number; tax: number; surcharge: number; total: number;
  } | null>(null);
  const [relocationSuccessMsg, setRelocationSuccessMsg] = useState<string | null>(null);
  const [relocationRequests, setRelocationRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!sessionData?.id) return;

    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("relocation_requests")
          .select("*")
          .eq("customer_id", sessionData.id)
          .order("created_at", { ascending: false });
        if (data) setRelocationRequests(data);
      } catch (err) {
        console.error("Failed to load relocation requests:", err);
      }
    })();
  }, [sessionData?.id]);

  const handleCalculateFee = async () => {
    if (!sessionData?.isp_id || !targetAreaName) return;

    try {
      const { data: ispFee, error: ispError } = await (supabase as any)
        .from("isp_relocation_fees")
        .select("base_fee, vat_amount, tax_amount, surcharge_amount")
        .eq("isp_id", sessionData.isp_id)
        .eq("target_area", targetAreaName)
        .limit(1)
        .maybeSingle();

      if (ispError) throw ispError;

      if (ispFee) {
        const base = Number(ispFee.base_fee) || 0;
        const vat = Number(ispFee.vat_amount) || 0;
        const tax = Number(ispFee.tax_amount) || 0;
        const surcharge = Number(ispFee.surcharge_amount) || 0;
        setCalculatedFee({ base, vat, tax, surcharge, total: base + vat + tax + surcharge });
        return;
      }

      const { data: defaultFee, error: defaultError } = await (supabase as any)
        .from("default_relocation_fees")
        .select("base_fee, vat_amount, tax_amount, surcharge_amount")
        .limit(1)
        .maybeSingle();

      if (defaultError) throw defaultError;

      if (defaultFee) {
        const base = Number(defaultFee.base_fee) || 0;
        const vat = Number(defaultFee.vat_amount) || 0;
        const tax = Number(defaultFee.tax_amount) || 0;
        const surcharge = Number(defaultFee.surcharge_amount) || 0;
        setCalculatedFee({ base, vat, tax, surcharge, total: base + vat + tax + surcharge });
      } else {
        setCalculatedFee({ base: 1000, vat: 150, tax: 0, surcharge: 0, total: 1150 });
      }
    } catch (error) {
      console.error("Fee calculation error:", error);
      alert("Failed to calculate routing fees. Please try again.");
    }
  };

  const handleRelocationSubmit = async () => {
    if (!calculatedFee || !targetDistrictId || !targetAreaName || !detailAddress || !relocationDate) {
      alert("Please complete all fields and calculate the fee first.");
      return;
    }

    // Security: reject past dates client-side
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (relocationDate < today) {
      alert("Please select a future relocation date.");
      return;
    }

    const masterTransactionId = `OV-TXN-RELOC-${crypto.randomUUID()}`;

    try {
      const { error: paymentError } = await (supabase as any).from("payments").insert({
        customer_id: sessionData.id,
        transaction_id: masterTransactionId,
        amount: calculatedFee.total,
        payment_method: "request_placed",
        payment_type: "relocation_fee",
        status: "pending",
      });

      if (paymentError) throw new Error(`Payment Ledger Failed: ${paymentError.message || paymentError.details}`);

      const { data: newRelocation, error: relocationError } = await (supabase as any)
        .from("relocation_requests")
        .insert({
          customer_id: sessionData.id,
          target_district_id: targetDistrictId,
          target_area: targetAreaName,
          detail_address: detailAddress,
          relocation_date: relocationDate.toISOString(),
          base_fee: calculatedFee.base,
          vat_amount: calculatedFee.vat,
          tax_amount: calculatedFee.tax,
          surcharge_amount: calculatedFee.surcharge,
          total_fee: calculatedFee.total,
          transaction_id: masterTransactionId,
          status: "pending",
        })
        .select()
        .single();

      if (relocationError) {
        throw new Error(`Relocation Request Failed: ${relocationError.message || relocationError.details}`);
      }

      if (newRelocation) setRelocationRequests((prev) => [newRelocation, ...prev]);

      setRelocationSuccessMsg(
        `Request Placed Successfully! \nTransaction ID: ${masterTransactionId}\nOur deployment team will verify feasibility at the new address before processing payment.`,
      );
      setTargetDistrictId("");
      setTargetAreaName("");
      setDetailAddress("");
      setRelocationDate(undefined);
      setCalculatedFee(null);
      setTimeout(() => setRelocationSuccessMsg(null), 15000);
    } catch (error: any) {
      console.error("Relocation submission failed:", error);
      alert(`Failed to submit request: ${error.message || error.details}`);
    }
  };

  const handleCancelRelocation = async (requestId: string, transactionId: string) => {
    try {
      const { error: reqError } = await (supabase as any)
        .from("relocation_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId);

      if (reqError) throw reqError;

      if (!transactionId) {
        alert(`Cancellation Warning: No transaction ID found. Payment ledger update skipped for request: ${requestId}`);
      } else {
        const { data: payData, error: payError } = await (supabase as any)
          .from("payments")
          .update({ status: "cancelled" })
          .eq("transaction_id", transactionId)
          .select();

        if (payError) {
          alert(`Payment ledger update failed: ${JSON.stringify(payError)}`);
        } else if (!payData || payData.length === 0) {
          alert(`Payment update returned 0 rows for ${transactionId}! RLS may have blocked it, or status wasn't 'pending'.`);
        }
      }

      setRelocationRequests((prev) =>
        prev.map((req) => (req.id === requestId ? { ...req, status: "cancelled" } : req)),
      );
    } catch (error: any) {
      alert(`Failed to cancel request: ${error.message || error.details}`);
    }
  };

  return {
    targetDistrictId, setTargetDistrictId,
    targetAreaName, setTargetAreaName,
    detailAddress, setDetailAddress,
    relocationDate, setRelocationDate,
    calculatedFee,
    relocationSuccessMsg,
    relocationRequests,
    handleCalculateFee,
    handleRelocationSubmit,
    handleCancelRelocation,
  };
}
