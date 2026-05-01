import React from "react";
import { Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TicketListSectionProps {
  tickets: any[];
  expandedTicketId: string | null;
  ticketMessages: any[];
  isLoadingMessages: boolean;
  replyText: string;
  setReplyText: (t: string) => void;
  onToggleTicket: (ticketId: string) => void;
  onSendReply: (ticketId: string) => void;
}

const TicketListSection = ({
  tickets,
  expandedTicketId,
  ticketMessages,
  isLoadingMessages,
  replyText,
  setReplyText,
  onToggleTicket,
  onSendReply,
}: TicketListSectionProps) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-300 border-b border-white/10 pb-2">Active Requests</h3>

    {tickets.length === 0 ? (
      <div className="p-8 border border-white/10 rounded-xl text-center bg-white/5 text-gray-400">
        <p>No active support tickets found.</p>
      </div>
    ) : (
      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="border border-white/10 rounded-lg bg-black/50 hover:bg-white/5 transition-colors overflow-hidden"
          >
            <div
              className="p-4 flex justify-between items-center cursor-pointer"
              onClick={() => onToggleTicket(ticket.id)}
            >
              <div>
                <p className="font-medium text-white">
                  {ticket.ticket_type.replace(/_/g, " ").toUpperCase()}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Status:{" "}
                  <span className="text-amber-400 px-2 py-0.5 bg-amber-400/10 rounded-full text-xs ml-1">
                    {ticket.status}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">ID: {ticket.id.split("-")}</p>
              </div>
            </div>

            <AnimatePresence>
              {expandedTicketId === ticket.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/10 bg-black/80"
                >
                  <div className="p-4 space-y-4 max-h-64 overflow-y-auto hide-scrollbar">
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={24} className="text-ov-primary animate-spin" />
                      </div>
                    ) : ticketMessages.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No messages found for this ticket.
                      </p>
                    ) : (
                      ticketMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            msg.sender_type.toLowerCase() === "customer" ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`px-4 py-2 rounded-xl max-w-[85%] ${
                              msg.sender_type.toLowerCase() === "customer"
                                ? "bg-ov-primary/20 text-white border border-ov-primary/30 rounded-tr-none"
                                : "bg-white/10 text-gray-200 border border-white/10 rounded-tl-none"
                            }`}
                          >
                            <p className="text-sm">{msg.message_body}</p>
                          </div>
                          <span className="text-[10px] text-gray-500 mt-1 px-1">
                            {msg.sender_type.toUpperCase()} •{" "}
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {ticket.status !== "closed" && (
                    <div className="p-3 border-t border-white/10 bg-white/5 flex gap-2">
                      <input
                        type="text"
                        placeholder="Reply to this thread..."
                        maxLength={2000}
                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-ov-primary"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            onSendReply(ticket.id);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="bg-ov-primary hover:bg-ov-primary/90 text-white"
                        onClick={() => onSendReply(ticket.id)}
                        disabled={!replyText.trim()}
                      >
                        <Send size={14} />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default TicketListSection;
