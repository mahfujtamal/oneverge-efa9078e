import React from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Check, X, Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/shared/lib/utils";
import { validatePassword } from "@/shared/lib/passwordValidation";
import { PAGE_TITLES } from "@/shared/lib/constants";

interface StepIdentityProps {
  userData: any;
  setUserData: (data: any) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  isVerifying: boolean;
  pwChecks: { length: boolean; upper: boolean; lower: boolean; digit: boolean; special: boolean };
  pwValid: boolean;
  onKYCSubmit: () => void;
  isAddConnection?: boolean;
}

const StepIdentity = ({
  userData,
  setUserData,
  showPassword,
  setShowPassword,
  isVerifying,
  pwChecks,
  pwValid,
  onKYCSubmit,
  isAddConnection = false,
}: StepIdentityProps) => {
  const pw = userData.password || "";

  const handleSubmit = () => {
    if (
      !userData.name ||
      !userData.phone ||
      !userData.dob ||
      !userData.nid ||
      !userData.email ||
      !userData.address
    ) {
      toast.error("Please complete all required fields to verify your identity.");
      return;
    }
    // Password only required for new account registration, not for add-connection KYC confirmation.
    if (!isAddConnection) {
      if (!userData.password) {
        toast.error("Please set a password.");
        return;
      }
      const pwResult = validatePassword(userData.password);
      if (!pwResult.isValid) {
        toast.error("Password does not meet security policy", {
          description: pwResult.errors[0],
        });
        return;
      }
    }
    onKYCSubmit();
  };

  // Identity fields are immutable for add-connection (already verified on file).
  // Only the installation address may be edited (defaults to primary connection address).
  const lockedClass =
    "bg-black/40 p-4 w-full rounded-xl border border-white/10 text-gray-400 uppercase text-[11px] font-bold outline-none cursor-not-allowed opacity-70";
  const editableClass =
    "bg-black/40 p-4 w-full rounded-xl border border-white/10 text-white uppercase text-[11px] font-bold outline-none focus:border-ov-primary transition-all";

  return (
    <motion.div
      key="s4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="ov-flex-center min-h-full p-4"
    >
      <div className="ov-glass-card w-full max-w-2xl p-8 lg:p-12 space-y-8">
        <div>
          <span className="ov-section-label uppercase tracking-[0.2em]">
            {isAddConnection ? "KYC Confirmation" : "Step 03. Identity"}
          </span>
          <h2 className="ov-h1 !text-3xl mt-2 font-black italic uppercase">
            {isAddConnection ? "Confirm Your Identity" : PAGE_TITLES.REGISTRY}
          </h2>
          {isAddConnection && (
            <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider">
              Regulatory requirement — please confirm your identity for this connection.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Name */}
          <div className="space-y-2">
            <input
              className="bg-black/40 p-4 w-full rounded-xl border border-white/10 text-white uppercase text-[11px] font-bold outline-none focus:border-ov-primary transition-all"
              placeholder="Full Name"
              maxLength={100}
              value={userData.name}
              onChange={(e) => setUserData({ ...userData, name: e.target.value })}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <input
              className="bg-black/40 p-4 w-full rounded-xl border border-white/10 text-white uppercase text-[11px] font-bold outline-none focus:border-ov-primary transition-all"
              placeholder="Mobile Number"
              maxLength={15}
              value={userData.phone}
              onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
            />
          </div>

          {/* Email */}
          <div className="space-y-2 sm:col-span-1">
            <input
              className="bg-black/40 p-4 w-full rounded-xl border border-white/10 text-white lowercase text-[11px] font-bold outline-none focus:border-ov-primary transition-all"
              placeholder="node@oneverge.com"
              type="email"
              value={userData.email}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
            />
          </div>

          {/* Password — hidden for add-connection flow (account already exists) */}
          {!isAddConnection && (
            <div className="space-y-2 sm:col-span-1 relative">
              <div className="relative">
                <input
                  className="bg-black/40 p-4 pr-12 w-full rounded-xl border border-white/10 text-white text-[11px] font-bold outline-none focus:border-ov-primary transition-all"
                  placeholder="Create Password"
                  type={showPassword ? "text" : "password"}
                  value={userData.password}
                  onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Inline policy checklist — visible while typing, hides once valid */}
              {pw.length > 0 && !pwValid && (
                <div className="bg-black/60 border border-white/10 p-3 rounded-lg space-y-1">
                  <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">
                    Password Policy
                  </p>
                  {[
                    { ok: pwChecks.length, label: "Minimum 13 characters" },
                    { ok: pwChecks.upper, label: "One uppercase letter (A-Z)" },
                    { ok: pwChecks.lower, label: "One lowercase letter (a-z)" },
                    { ok: pwChecks.digit, label: "One digit (0-9)" },
                    { ok: pwChecks.special, label: "One special character" },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-2 text-[10px]">
                      {c.ok ? (
                        <Check size={12} className="text-green-400 shrink-0" />
                      ) : (
                        <X size={12} className="text-red-400 shrink-0" />
                      )}
                      <span className={c.ok ? "text-green-300" : "text-gray-400"}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NID */}
          <div className="space-y-2">
            <input
              className="bg-black/40 p-4 w-full rounded-xl border border-white/10 text-white uppercase text-[11px] font-bold outline-none focus:border-ov-primary transition-all"
              placeholder="NID"
              maxLength={17}
              value={userData.nid}
              onChange={(e) => setUserData({ ...userData, nid: e.target.value })}
            />
          </div>

          {/* DOB */}
          <div className="space-y-2">
            <div className="relative group">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "bg-black/40 p-4 w-full h-[54px] rounded-xl border border-white/10 text-white outline-none focus:border-ov-primary hover:bg-black/60 hover:text-white transition-all font-bold text-[11px] uppercase justify-start text-left font-normal",
                      !userData.dob && "text-gray-500",
                    )}
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 shrink-0" />
                    {userData.dob ? format(new Date(userData.dob), "PPP") : <span>DATE OF BIRTH</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-950 border-gray-800 text-black" align="start">
                  <Calendar
                    mode="single"
                    selected={userData.dob ? new Date(userData.dob) : undefined}
                    onSelect={(date) => setUserData({ ...userData, dob: date ? date.toISOString() : "" })}
                    captionLayout="dropdown-buttons"
                    fromYear={1940}
                    toYear={new Date().getFullYear()}
                    className="bg-white text-black"
                    classNames={{
                      caption_dropdowns: "flex flex-row gap-2 font-medium",
                      caption_label: "hidden",
                      vhidden: "hidden",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2 sm:col-span-2">
          <textarea
            rows={2}
            className="bg-black/40 p-4 w-full rounded-xl border border-white/10 text-white uppercase text-[11px] font-bold outline-none focus:border-ov-primary transition-all resize-none"
            placeholder="Installation Address"
            maxLength={255}
            value={userData.address}
            onChange={(e) => setUserData({ ...userData, address: e.target.value })}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isVerifying || (!isAddConnection && !!userData.password && !pwValid)}
          className="ov-btn-primary w-full !h-14 shadow-ov-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              {isAddConnection ? "CREATING CONNECTION..." : "VERIFYING..."}
            </>
          ) : isAddConnection ? (
            "CONFIRM IDENTITY & PROCEED"
          ) : (
            "VERIFY IDENTITY"
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default StepIdentity;
