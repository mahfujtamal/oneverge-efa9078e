import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTicketMessaging() {
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleToggleTicket = async (ticketId: string) => {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
      setTicketMessages([]);
      return;
    }

    setExpandedTicketId(ticketId);
    setIsLoadingMessages(true);

    try {
      const { data: messagesData, error } = await (supabase as any)
        .from("ticket_messages")
        .select("id, sender_type, message_body, created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTicketMessages(messagesData || []);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendReply = async (ticketId: string) => {
    const trimmed = replyText.trim();
    // Security fix: enforce min 1, max 2000 chars before DB insert
    if (!trimmed || trimmed.length > 2000) return;

    try {
      const { data: insertedMessage, error } = await (supabase as any)
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId,
          sender_type: "customer",
          message_body: trimmed,
        })
        .select()
        .single();

      if (error) throw error;

      if (insertedMessage) {
        setTicketMessages((prev) => [...prev, insertedMessage]);
      }
      setReplyText("");
    } catch (error: any) {
      console.error("Failed to send reply:", error);
      alert(`Failed to send reply: ${error.message || error.details || JSON.stringify(error)}`);
    }
  };

  return {
    expandedTicketId,
    ticketMessages,
    isLoadingMessages,
    replyText,
    setReplyText,
    handleToggleTicket,
    handleSendReply,
  };
}
