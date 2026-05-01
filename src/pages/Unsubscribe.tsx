import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"verifying" | "valid" | "invalid" | "already" | "done" | "error">(
    "verifying",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("invalid");
        return;
      }
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: supabaseAnonKey } },
        );
        const data = await res.json();
        if (data.valid) {
          setStatus("valid");
        } else if (data.reason === "already_unsubscribed") {
          setStatus("already");
        } else {
          setStatus("invalid");
        }
      } catch (e: any) {
        setError(e?.message || "Could not verify unsubscribe link");
        setStatus("error");
      }
    };
    verify();
  }, [token]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (fnErr) throw fnErr;
      if (data?.success) {
        setStatus("done");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        throw new Error(data?.error || "Could not complete unsubscribe");
      }
    } catch (e: any) {
      setError(e?.message || "Could not complete unsubscribe");
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black text-white">
      <div className="w-full max-w-md p-8 space-y-6 rounded-xl border border-white/10 bg-white/5">
        <h2 className="text-2xl font-bold">Email preferences</h2>

        {status === "verifying" && (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="animate-spin" size={18} /> Verifying link...
          </div>
        )}

        {status === "valid" && (
          <>
            <p className="text-sm text-gray-300">
              Click below to unsubscribe from non-essential OneVerge emails. You will continue to receive
              critical account and security messages.
            </p>
            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? "Processing..." : "Confirm unsubscribe"}
            </Button>
          </>
        )}

        {status === "done" && (
          <div className="bg-emerald-950/40 border border-emerald-500/50 p-4 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-emerald-200/90">You've been unsubscribed successfully.</p>
          </div>
        )}

        {status === "already" && (
          <div className="bg-blue-950/40 border border-blue-500/50 p-4 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="text-blue-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-blue-200/90">You're already unsubscribed.</p>
          </div>
        )}

        {(status === "invalid" || status === "error") && (
          <div className="bg-red-950/40 border border-red-500/50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-200/90">
              {error || "This unsubscribe link is invalid or expired."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
