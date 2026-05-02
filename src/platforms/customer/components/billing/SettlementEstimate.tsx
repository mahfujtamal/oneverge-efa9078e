import React from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRICING_CONFIG, BILLING_LABELS } from "@/shared/lib/constants";

interface SettlementEstimateProps {
  netPayable: number;
  formattedRenewalDate: string;
  surplusCarryover: number;
  onSave?: () => void;
  isSaving?: boolean;
  showSuccess?: boolean;
}

const SettlementEstimate = ({
  netPayable,
  formattedRenewalDate,
  surplusCarryover,
  onSave,
  isSaving,
  showSuccess,
}: SettlementEstimateProps) => (
  <div className="ov-glass-card p-8 space-y-8 text-left border-white/10">
    {showSuccess && (
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
        <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
        <div>
          <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Schedule Locked</p>
          <p className="text-[8px] font-bold text-emerald-400/70 uppercase tracking-wider mt-0.5">
            Configuration successfully saved for your next billing cycle.
          </p>
        </div>
      </div>
    )}

    <div className="flex flex-col sm:flex-row justify-between items-start border-b border-white/5 pb-8 gap-4">
      <div>
        <p className="ov-section-label opacity-60">Settlement Estimate</p>
        <p className="ov-h1 !text-4xl text-ov-primary mt-2">
          {PRICING_CONFIG.CURRENCY} {netPayable.toLocaleString()}
        </p>
      </div>
      <div className="text-left sm:text-right">
        <p className="ov-section-label opacity-60">Renewal Date</p>
        <p className="font-mono font-black text-white mt-1 uppercase tracking-wider">
          {formattedRenewalDate}
        </p>
      </div>
    </div>

    {surplusCarryover > 0 && (
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex items-center gap-4 animate-in fade-in zoom-in duration-300">
        <AlertCircle size={18} className="text-emerald-400 shrink-0" />
        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest leading-relaxed">
          {PRICING_CONFIG.CURRENCY} {surplusCarryover.toLocaleString()} carryover surplus will be applied to
          the following cycle.
        </p>
      </div>
    )}

    {onSave && (
      <Button
        onClick={onSave}
        disabled={isSaving}
        className="ov-btn-primary w-full h-16 !rounded-[24px] shadow-ov-primary/20"
      >
        {isSaving ? (
          <span className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" /> SAVING...
          </span>
        ) : (
          BILLING_LABELS.SAVE_SCHEDULE
        )}
      </Button>
    )}
  </div>
);

export default SettlementEstimate;
