import React from "react";
import { ScrollText, ChevronDown, Loader2 } from "lucide-react";
import { PRICING_CONFIG } from "@/shared/lib/constants";

interface BillingHistoryPanelProps {
  showBilling: boolean;
  onToggle: () => void;
  billingLoading: boolean;
  billingRows: any[] | null;
}

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const BillingHistoryPanel = ({ showBilling, onToggle, billingLoading, billingRows }: BillingHistoryPanelProps) => (
  <div className="ov-glass-card border-white/10 overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <ScrollText size={18} />
        </div>
        <div className="text-left">
          <p className="ov-section-label opacity-60">Billing History</p>
          <p className="text-[11px] font-black uppercase text-white tracking-widest mt-1">
            Activations & renewals only
          </p>
        </div>
      </div>
      <ChevronDown size={18} className={`text-gray-400 transition-transform ${showBilling ? "rotate-180" : ""}`} />
    </button>

    {showBilling && (
      <div className="px-6 pb-6 border-t border-white/5">
        {billingLoading ? (
          <div className="py-8 flex items-center gap-3 text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Loading…</span>
          </div>
        ) : !billingRows || billingRows.length === 0 ? (
          <p className="py-8 text-[10px] font-black uppercase text-gray-500 tracking-widest">
            No billing cycles recorded yet. Top-ups will not appear here.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {billingRows.map((b, idx) => (
              <li key={`${b.billing_period}-${idx}`} className="py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase text-white tracking-widest">{b.billing_period}</p>
                  <p className="text-[9px] font-bold uppercase text-gray-500 tracking-widest mt-1">
                    {formatDateTime(b.created_at)} ·{" "}
                    {(b.services_snapshot || []).length} service
                    {(b.services_snapshot || []).length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-black text-emerald-400">
                    {PRICING_CONFIG.CURRENCY} {Number(b.total_billed || 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-emerald-400/70">
                    {b.status || "paid"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )}
  </div>
);

export default BillingHistoryPanel;
