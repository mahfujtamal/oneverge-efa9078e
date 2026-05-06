import React, { useState, useEffect } from "react";
import { ShieldCheck, ScanFace, Loader2, CheckCircle2, User } from "lucide-react";
import { motion } from "framer-motion";
import { PAGE_TITLES, REGISTRY_LABELS, BRANDING_CONFIG } from "@/shared/lib/constants";

interface KYCProps {
  userData: { name: string; nid: string };
  onVerified: () => void;
}

const KYCVerification = ({ userData, onVerified }: KYCProps) => {
  const [status, setStatus] = useState<"scanning" | "complete">("scanning");

  // AUTO-RUN ENGINE: Starts immediately on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus("complete");
      // Triggers the next step (Connectivity Check) automatically after success
      setTimeout(onVerified, 1500);
    }, 3500); // 3.5 seconds of simulated scanning

    return () => clearTimeout(timer);
  }, [onVerified]);

  return (
    <div className="w-full max-w-lg bg-[#0d111c] border border-white/10 rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl animate-in zoom-in duration-500 relative overflow-hidden">
      {/* SCANNING LASER EFFECT */}
      {status === "scanning" && (
        <motion.div
          initial={{ top: "0%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-x-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_#22d3ee] z-20 opacity-50"
        />
      )}

      <div className="space-y-2">
        <h2 className="text-xl lg:text-2xl font-black uppercase italic text-white tracking-tighter">
          {PAGE_TITLES.REGISTRY}
        </h2>
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{REGISTRY_LABELS.SUBTITLE}</p>
      </div>

      {/* VISUAL SCANNER BOX */}
      <div className="relative h-64 w-full bg-black/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col items-center justify-center gap-4">
        <div className="relative">
          {status === "scanning" ? (
            <>
              <ScanFace size={64} className="text-cyan-400 animate-pulse" />
              <motion.div
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -inset-4 border border-cyan-400/20 rounded-full"
              />
            </>
          ) : (
            <CheckCircle2 size={64} className="text-emerald-400 animate-in zoom-in" />
          )}
        </div>

        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1">
            {status === "scanning" ? "Authenticating Identity" : "Identity Confirmed"}
          </p>
          <div className="flex items-center justify-center gap-2">
            <User size={10} className="text-gray-500" />
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{userData.nid}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-white/5">
        <div className="flex items-center justify-center gap-2 text-emerald-400/50">
          <ShieldCheck size={14} />
          <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">
            {BRANDING_CONFIG.PLATFORM_NAME} SECURE AUTH_NODE
          </span>
        </div>
      </div>
    </div>
  );
};

export default KYCVerification;
