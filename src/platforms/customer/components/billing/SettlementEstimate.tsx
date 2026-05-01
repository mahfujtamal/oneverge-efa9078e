import React from "react";
import { AlertCircle } from "lucide-react";
import { PRICING_CONFIG } from "@/shared/lib/constants";

interface SettlementEstimateProps {
  netPayable: number;
  formattedRenewalDate: string;
  surplusCarryover: number;
}

const SettlementEstimate = ({ netPayable, formattedRenewalDate, surplusCarryover }: SettlementEstimateProps) => (
  <div className="ov-glass-card p-8 space-y-8 text-left border-white/10">
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
  </div>
);

export default SettlementEstimate;
