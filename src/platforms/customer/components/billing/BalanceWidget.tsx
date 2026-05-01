import React from "react";
import { Button } from "@/components/ui/button";
import { BILLING_LABELS, PRICING_CONFIG } from "@/shared/lib/constants";

interface BalanceWidgetProps {
  balance: number;
  accountStatus: string;
  onRenew: () => void;
}

const BalanceWidget = ({ balance, accountStatus, onRenew }: BalanceWidgetProps) => (
  <div className="ov-balance-widget !h-[200px] !bg-[#e2136e] group">
    <div className="flex justify-between items-start relative z-10 text-left">
      <p className="ov-balance-label">Current Balance</p>
      <div
        className={`ov-badge border-white/20 !bg-white/10 ${
          accountStatus === "active" ? "text-emerald-400" : "text-yellow-400"
        }`}
      >
        {accountStatus}
      </div>
    </div>
    <div className="relative z-10 text-left">
      <p className="ov-balance-value !text-5xl lg:!text-7xl">
        {PRICING_CONFIG.CURRENCY} {balance.toFixed(2)}
      </p>
    </div>
    <Button
      onClick={onRenew}
      className="ov-btn-primary w-full md:w-auto mt-8 relative z-10 !bg-white !text-black hover:!bg-ov-primary"
    >
      {accountStatus === "active" ? BILLING_LABELS.ADVANCE_PAY : BILLING_LABELS.RENEW_NOW}
    </Button>
  </div>
);

export default BalanceWidget;
