import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("forgot-password", {
        body: { email, appOrigin: window.location.origin },
      });

      if (fnError) {
        throw fnError;
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      setSubmitted(true);
      toast.success("Check your email", {
        description: "If an account exists for that email, a reset link has been sent.",
      });
    } catch (err: any) {
      console.error("Forgot password error:", err);
      const msg = err?.message || "Could not send reset email. Please try again.";
      setError(msg);
      toast.error("Request failed", { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-8 space-y-6 rounded-xl border border-white/10 bg-white/5"
      >
        <div>
          <h2 className="text-2xl font-bold">Forgot Password</h2>
          <p className="text-sm text-gray-400 mt-1">
            Enter your account email and we'll send you a link to reset your password.
          </p>
        </div>

        {submitted && (
          <div className="bg-emerald-950/40 border border-emerald-500/50 p-4 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-emerald-200/90 leading-tight">
              If an account exists for that email, a reset link has been sent. The link expires in 30 minutes.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-500/50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-200/90 leading-tight">{error}</p>
          </div>
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full p-3 rounded-lg bg-black/50 border border-white/20 text-white"
          required
          disabled={isLoading || submitted}
        />

        <Button
          type="submit"
          disabled={isLoading || submitted}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? "Sending..." : submitted ? "Email sent" : "Send reset link"}
        </Button>

        <div className="text-center text-sm text-gray-400">
          <Link to="/login" className="text-blue-400 hover:underline">
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;
