import React from "react";
import { Receipt, ChevronDown, Loader2 } from "lucide-react";
import { PRICING_CONFIG } from "@/shared/lib/constants";

interface PaymentHistoryPanelProps {
  showPayments: boolean;
  onToggle: () => void;
  paymentsLoading: boolean;
  payments: any[] | null;
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

const PaymentHistoryPanel = ({ showPayments, onToggle, paymentsLoading, payments }: PaymentHistoryPanelProps) => (
  <div className="ov-glass-card border-white/10 overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-ov-primary/10 text-ov-primary flex items-center justify-center">
          <Receipt size={18} />
        </div>
        <div className="text-left">
          <p className="ov-section-label opacity-60">Payment History</p>
          <p className="text-[11px] font-black uppercase text-white tracking-widest mt-1">
            All wallet credits & transactions
          </p>
        </div>
      </div>
      <ChevronDown size={18} className={`text-gray-400 transition-transform ${showPayments ? "rotate-180" : ""}`} />
    </button>

    {showPayments && (
      <div className="px-6 pb-6 border-t border-white/5">
        {paymentsLoading ? (
          <div className="py-8 flex items-center gap-3 text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Loading…</span>
          </div>
        ) : !payments || payments.length === 0 ? (
          <p className="py-8 text-[10px] font-black uppercase text-gray-500 tracking-widest">
            No payments recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {payments.map((p) => (
              <li key={p.transaction_id} className="py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-white truncate">{p.transaction_id}</p>
                  <p className="text-[9px] font-bold uppercase text-gray-500 tracking-widest mt-1">
                    {formatDateTime(p.created_at)} · {p.payment_method} · {p.payment_type}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-black text-ov-primary">
                    {PRICING_CONFIG.CURRENCY} {Number(p.amount || 0).toLocaleString()}
                  </p>
                  <p
                    className={`text-[9px] font-black uppercase tracking-widest mt-1 ${
                      p.status === "success"
                        ? "text-emerald-400"
                        : p.status === "pending"
                        ? "text-yellow-400"
                        : "text-gray-500"
                    }`}
                  >
                    {p.status || "—"}
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

export default PaymentHistoryPanel;
