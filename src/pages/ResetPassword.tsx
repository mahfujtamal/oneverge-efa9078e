import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { validatePassword } from "@/lib/passwordValidation";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const liveValidation = password ? validatePassword(password) : { isValid: false, errors: [] };

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setTokenError("Missing reset token. Please request a new password reset.");
        setVerifying(false);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("reset-password", {
          body: { token, mode: "verify" },
        });
        if (error || data?.error) {
          setTokenError(data?.error || "Invalid or expired reset link.");
        } else {
          setTokenValid(true);
        }
      } catch (e: any) {
        setTokenError(e?.message || "Could not verify reset link.");
      } finally {
        setVerifying(false);
      }
    };
    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveValidation.isValid) {
      toast.error("Password does not meet policy");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { token, newPassword: password, mode: "reset" },
      });
      if (error || data?.error) {
        throw new Error(data?.error || "Could not reset password");
      }
      setSuccess(true);
      toast.success("Password reset successfully");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      toast.error("Reset failed", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black text-white">
      <div className="w-full max-w-md p-8 space-y-6 rounded-xl border border-white/10 bg-white/5">
        <h2 className="text-2xl font-bold">Reset Password</h2>

        {verifying && (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="animate-spin" size={18} /> Verifying reset link...
          </div>
        )}

        {!verifying && tokenError && (
          <>
            <div className="bg-red-950/40 border border-red-500/50 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-200/90 leading-tight">{tokenError}</p>
            </div>
            <Link to="/forgot-password" className="block text-center text-blue-400 hover:underline text-sm">
              Request a new reset link
            </Link>
          </>
        )}

        {!verifying && tokenValid && !success && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm text-gray-300 mb-1 block">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1 block">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full p-3 pr-12 rounded-lg bg-black/50 border border-white/20 text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirm && confirm !== password && <p className="text-xs text-red-400 mt-1">Passwords do not match</p>}
            </div>

            <div className="bg-black/40 border border-white/10 p-3 rounded-lg">
              <p className="text-xs font-bold mb-2 text-gray-200">Password requirements</p>
              <ul className="text-[11px] space-y-1">
                <PolicyItem ok={password.length >= 13} text="At least 13 characters" />
                <PolicyItem ok={/[A-Z]/.test(password)} text="One uppercase letter" />
                <PolicyItem ok={/[a-z]/.test(password)} text="One lowercase letter" />
                <PolicyItem ok={/[0-9]/.test(password)} text="One digit" />
                <PolicyItem ok={/[^A-Za-z0-9]/.test(password)} text="One special character" />
              </ul>
            </div>

            <Button
              type="submit"
              disabled={submitting || !liveValidation.isValid || password !== confirm}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-500/50 p-4 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-emerald-200/90 leading-tight">
              Password reset successfully. Redirecting to login...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const PolicyItem = ({ ok, text }: { ok: boolean; text: string }) => (
  <li className={`flex items-center gap-2 ${ok ? "text-emerald-400" : "text-gray-500"}`}>
    <span className="inline-block w-3">{ok ? "✓" : "•"}</span> {text}
  </li>
);

export default ResetPassword;
