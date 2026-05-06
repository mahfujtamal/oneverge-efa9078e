import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Zap, Ticket, MapPin, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { SUPPORT_LABELS } from "@/shared/lib/constants";

import { useTicketData } from "@/platforms/customer/hooks/useTicketData";
import { useTicketMessaging } from "@/platforms/customer/hooks/useTicketMessaging";
import { useRelocationFlow } from "@/platforms/customer/hooks/useRelocationFlow";
import { useGeographicFiltering } from "@/platforms/customer/hooks/useGeographicFiltering";

import TicketFormSection from "@/platforms/customer/components/support/TicketFormSection";
import TicketListSection from "@/platforms/customer/components/support/TicketListSection";
import RelocationFormSection from "@/platforms/customer/components/support/RelocationFormSection";
import TerminationSection from "@/platforms/customer/components/support/TerminationSection";

type Tab = "DIAGNOSTIC" | "TICKETS" | "MIGRATION" | "TERMINATE";

const SupportCenter = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const sessionData = (() => {
    if (state?.userData?.id) return state.userData;
    if (state?.id) return state;
    const saved = localStorage.getItem("oneverge_session") || localStorage.getItem("oneverge_user");
    return saved ? JSON.parse(saved) : null;
  })();

  const [activeTab, setActiveTab] = useState<Tab>("DIAGNOSTIC");

  const ticketData = useTicketData(sessionData);
  const messaging = useTicketMessaging();
  const relocation = useRelocationFlow(sessionData);
  const { districts, areas } = useGeographicFiltering(sessionData, relocation.targetDistrictId);

  if (!sessionData) {
    navigate("/login", { replace: true });
    return null;
  }
  const _status = String(sessionData?.account_status || "").toLowerCase();
  if (!["active", "expired", "terminated"].includes(_status)) {
    navigate("/dashboard", { replace: true, state: sessionData });
    return null;
  }

  if (ticketData.isLoading) {
    return (
      <div className="ov-page-container ov-flex-center h-screen bg-black flex items-center justify-center">
        <Zap className="animate-pulse text-ov-primary" size={48} />
      </div>
    );
  }

  const tabClass = (tab: Tab, color: "blue" | "red" = "blue") =>
    `px-6 py-4 flex items-center gap-2 whitespace-nowrap transition-colors ${
      activeTab === tab
        ? `border-b-2 border-${color}-500 text-${color}-400`
        : "text-gray-400 hover:text-gray-200"
    }`;

  return (
    <div className="ov-page-container flex h-screen bg-black text-white overflow-hidden">
      <Sidebar sessionData={sessionData} />

      <main className="ov-main-content flex-1">
        <header className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-6 text-left">
          <div>
            <span className="ov-section-label tracking-[0.3em]">
              <span className="text-white font-semibold">{sessionData.display_name}</span>
              <span className="text-gray-500"> - </span>
              <span className="text-ov-primary font-mono">{sessionData.user_id}</span>
              <span className="text-gray-500"> [</span>
              <span className="text-green-400">{sessionData.ispName}</span>
              <span className="text-gray-500">, </span>
              <span className="text-purple-400">{sessionData.location}</span>
              <span className="text-gray-500">]</span>
            </span>
            <h1 className="ov-h1 !text-4xl italic">{SUPPORT_LABELS.SUBTITLE}</h1>
          </div>
          <div className="ov-badge text-emerald-400 bg-emerald-500/5 py-2 px-4 border-emerald-500/10">
            <ShieldCheck size={14} />
            <span className="uppercase font-black text-[9px] tracking-widest">Support Center</span>
          </div>
        </header>

        <div className="flex border-b border-gray-800 mb-8 overflow-x-auto">
          <button onClick={() => setActiveTab("DIAGNOSTIC")} className={tabClass("DIAGNOSTIC")}>
            <Zap size={18} /> Diagnostic
          </button>
          <button onClick={() => setActiveTab("TICKETS")} className={tabClass("TICKETS")}>
            <Ticket size={18} /> Tickets
          </button>
          <button onClick={() => setActiveTab("MIGRATION")} className={tabClass("MIGRATION")}>
            <MapPin size={18} /> Relocation
          </button>
          <button onClick={() => setActiveTab("TERMINATE")} className={tabClass("TERMINATE", "red")}>
            <ShieldCheck size={18} /> Terminate Service
          </button>
        </div>

        <div className="max-w-4xl">
          <AnimatePresence mode="wait">
            {activeTab === "DIAGNOSTIC" && (
              <motion.div key="diag" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="p-10 border border-white/10 rounded-xl bg-white/5 flex flex-col items-center justify-center text-center">
                  <Zap size={48} className="text-yellow-400 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                  <h2 className="text-2xl font-bold text-white mb-2">Network Telemetry Active</h2>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Your connection to the {sessionData.ispName || "OneVerge"} BTS is stable. Historical telemetry
                    logging is currently parked for future updates.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "TICKETS" && (
              <motion.div
                key="tickets"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <TicketFormSection
                  categories={ticketData.categories}
                  selectedCategoryId={ticketData.selectedCategoryId}
                  setSelectedCategoryId={ticketData.setSelectedCategoryId}
                  description={ticketData.description}
                  setDescription={ticketData.setDescription}
                  onSubmit={ticketData.handleSubmitTicket}
                />
                <TicketListSection
                  tickets={ticketData.tickets}
                  expandedTicketId={messaging.expandedTicketId}
                  ticketMessages={messaging.ticketMessages}
                  isLoadingMessages={messaging.isLoadingMessages}
                  replyText={messaging.replyText}
                  setReplyText={messaging.setReplyText}
                  onToggleTicket={messaging.handleToggleTicket}
                  onSendReply={messaging.handleSendReply}
                />
              </motion.div>
            )}

            {activeTab === "MIGRATION" && (
              <motion.div
                key="migr"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <RelocationFormSection
                  districts={districts}
                  areas={areas}
                  targetDistrictId={relocation.targetDistrictId}
                  setTargetDistrictId={relocation.setTargetDistrictId}
                  targetAreaName={relocation.targetAreaName}
                  setTargetAreaName={relocation.setTargetAreaName}
                  detailAddress={relocation.detailAddress}
                  setDetailAddress={relocation.setDetailAddress}
                  relocationDate={relocation.relocationDate}
                  setRelocationDate={relocation.setRelocationDate}
                  calculatedFee={relocation.calculatedFee}
                  relocationSuccessMsg={relocation.relocationSuccessMsg}
                  relocationRequests={relocation.relocationRequests}
                  onCalculateFee={relocation.handleCalculateFee}
                  onSubmit={relocation.handleRelocationSubmit}
                  onCancelRelocation={relocation.handleCancelRelocation}
                />
              </motion.div>
            )}

            {activeTab === "TERMINATE" && (
              <TerminationSection
                hasPendingTermination={ticketData.hasPendingTermination}
                sessionData={sessionData}
                onTerminate={ticketData.handleTerminateService}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default SupportCenter;
