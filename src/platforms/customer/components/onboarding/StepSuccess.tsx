import React from "react";
import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_SERVICES, BRANDING_CONFIG, PAGE_TITLES } from "@/shared/lib/constants";

interface StepSuccessProps {
  transactionId: string;
  userData: any;
  active: Record<string, boolean>;
  onFinalize: () => void;
}

const StepSuccess = ({ transactionId, userData, active, onFinalize }: StepSuccessProps) => (
  <motion.div
    key="s8"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-start min-h-full px-4 py-10 text-center"
  >
    <header className="mb-6">
      <h2 className="ov-h1 !text-4xl lg:!text-7xl mb-2 italic uppercase font-black">{PAGE_TITLES.SUCCESS}</h2>
      <div className="ov-badge py-1.5 px-4 mx-auto text-ov-primary bg-ov-primary/5 border-ov-primary/10 uppercase font-black tracking-widest text-[9px]">
        WELCOME TO {BRANDING_CONFIG.PLATFORM_NAME}
      </div>
    </header>

    <div className="ov-glass-card w-full max-w-2xl p-8 relative overflow-hidden text-left border-ov-primary/20 bg-black/40 shadow-2xl">
      <div className="flex justify-between items-center mb-6 text-ov-primary">
        <div className="flex items-center gap-3">
          <Zap size={20} fill="currentColor" />
          <h3 className="ov-h1 !text-lg italic uppercase">NODE ACTIVE</h3>
        </div>
        <span className="ov-h1 !text-xl font-black">100%</span>
      </div>

      <div className="w-full h-1.5 bg-white/5 rounded-full mb-8 overflow-hidden border border-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 2 }}
          className="h-full bg-ov-primary shadow-[0_0_15px_#22d3ee]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 pb-8 border-b border-white/5">
        <div>
          <p className="ov-section-label !text-gray-500 text-[7px]">TRANSACTION ID</p>
          <p className="font-mono text-[10px] text-white uppercase font-bold break-all">
            {transactionId || "AUTH-VERIFIED"}
          </p>
        </div>
        <div>
          <p className="ov-section-label !text-gray-500 text-[7px]">ONEVERGE ID</p>
          <p className="font-mono text-[10px] text-white uppercase font-bold">{userData.user_id}</p>
        </div>
      </div>

      <div>
        <p className="ov-section-label !text-gray-500 mb-4 text-[7px]">PROVISIONED SERVICES</p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_SERVICES.filter((s) => active[s.id] === true).map((service) => (
            <div
              key={service.id}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-ov-primary/5 border border-ov-primary/10"
            >
              <service.icon size={14} className="text-ov-primary" />
              <span className="text-[8px] font-black uppercase text-white truncate">{service.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="mt-10 w-full max-w-sm pb-10">
      <Button onClick={onFinalize} className="ov-btn-primary w-full !h-14">
        GO TO DASHBOARD <ArrowRight size={18} className="ml-2" />
      </Button>
    </div>
  </motion.div>
);

export default StepSuccess;
