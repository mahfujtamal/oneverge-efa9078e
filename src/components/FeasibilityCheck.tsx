import React, { useState, useEffect } from "react";
import { Activity, ShieldCheck, CheckCircle2, Loader2, Globe } from "lucide-react";
// ADD THIS IMPORT
import { motion } from "framer-motion";
// IMPORT THE DICTIONARY
import { PAGE_TITLES, AUDIT_LABELS, BRANDING_CONFIG } from "@/lib/constants";

interface FeasibilityProps {
  userData: { address: string };
  ispName: string;
  onResult: (success: boolean) => void;
}

const FeasibilityCheck = ({ userData, ispName, onResult }: FeasibilityProps) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    const stageTimer = setTimeout(() => setStage(1), 2500);
    const resultTimer = setTimeout(() => onResult(true), 6000);

    return () => {
      clearInterval(timer);
      clearTimeout(stageTimer);
      clearTimeout(resultTimer);
    };
  }, [onResult]);

  return (
    <div className="bg-[#0d111c] border border-cyan-500/30 rounded-[2.5rem] p-10 text-center space-y-8 shadow-[0_0_30px_rgba(34,211,238,0.1)] h-full flex flex-col justify-center animate-in fade-in zoom-in duration-500">
      {/* ICON & CONFIGURABLE TITLE */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center relative">
          <Activity size={32} className="text-cyan-400 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 border-t-transparent animate-spin" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">{PAGE_TITLES.SITE_AUDIT}</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-60">
            {AUDIT_LABELS.SUBTITLE}
          </p>
        </div>
      </div>

      {/* DYNAMIC TESTS BOX */}
      <div className="bg-black/40 border border-white/5 rounded-3xl p-6 space-y-4 text-left">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={14} className="text-cyan-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Live Node Audit</span>
        </div>

        <div className="flex gap-3 items-start">
          <Globe size={14} className="text-gray-600 shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed break-words">
            {userData.address || "Verifying Geo-Coordinates..."}
          </p>
        </div>
      </div>

      {/* PROGRESS TRACKER */}
      <div className="space-y-3">
        <div className="flex justify-between items-end px-1">
          <p className="text-[9px] font-black uppercase text-cyan-400 tracking-widest animate-pulse">
            {stage === 0 ? AUDIT_LABELS.SCANNING_INFRA : AUDIT_LABELS.LATENCY_CHECK}
          </p>
          <span className="text-xs font-black italic text-cyan-400">{progress}%</span>
        </div>

        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
          />
        </div>
      </div>

      {/* FOOTER LABEL */}
      <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/5 opacity-50">
        <Loader2 size={12} className="text-cyan-400 animate-spin" />
        <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">
          Node: {ispName || "Backbone"} // {BRANDING_CONFIG.PLATFORM_NAME}
        </span>
      </div>
    </div>
  );
};

export default FeasibilityCheck;
