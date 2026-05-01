import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTicketData(sessionData: any) {
  const [categories, setCategories] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [hasPendingTermination, setHasPendingTermination] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sessionData?.id) return;

    const init = async () => {
      try {
        const { data: catData } = await (supabase as any)
          .from("ticket_categories")
          .select("id, name, display_label, default_queue, sla_hours")
          .eq("is_active", true);
        if (catData) setCategories(catData);

        const { data: tickData } = await (supabase as any)
          .from("tickets")
          .select("*")
          .eq("customer_id", sessionData.id)
          .order("created_at", { ascending: false });
        if (tickData) setTickets(tickData);

        const { data: termData } = await (supabase as any)
          .from("termination_requests")
          .select("id")
          .eq("customer_id", sessionData.id)
          .eq("status", "pending")
          .limit(1);
        if (termData && termData.length > 0) setHasPendingTermination(true);
      } catch (err) {
        console.error("Failed to load support data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [sessionData?.id]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionData?.id || !selectedCategoryId) return;

    const activeCategory = categories.find((cat) => cat.id === selectedCategoryId);
    const resolvedQueue = activeCategory ? activeCategory.default_queue : "ONEVERGE_SUPPORT";
    const resolvedType = activeCategory ? activeCategory.name : "general";
    const slaHours = activeCategory?.sla_hours || 24;
    const targetDeadline = new Date();
    targetDeadline.setHours(targetDeadline.getHours() + slaHours);

    try {
      const { data: newTicket, error: ticketError } = await (supabase as any)
        .from("tickets")
        .insert({
          customer_id: sessionData.id,
          isp_id: sessionData.isp_id || null,
          ticket_type: resolvedType,
          status: "Open",
          queue: resolvedQueue,
          priority: "Medium",
          source_channel: "Web Portal",
          sla_deadline: targetDeadline.toISOString(),
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      if (description && newTicket?.id) {
        const { data: insertedMessage, error: messageError } = await (supabase as any)
          .from("ticket_messages")
          .insert({
            ticket_id: newTicket.id,
            sender_type: "customer",
            message_body: description,
          })
          .select();

        if (messageError) {
          throw new Error(`Message Insert Failed: ${messageError.message || messageError.details}`);
        }
        if (!insertedMessage || insertedMessage.length === 0) {
          throw new Error("Message silently blocked. Please check RLS policies on ticket_messages.");
        }
      }

      setTickets((prev) => [newTicket, ...prev]);
      setSelectedCategoryId("");
      setDescription("");
      alert(`Ticket submitted successfully! Routed to ${resolvedQueue}. SLA Target: ${slaHours} Hours`);
    } catch (error: any) {
      const msg = error?.message || error?.details || error?.hint || JSON.stringify(error) || "Unknown error";
      alert(`Ticket Submission Failed!\n\nExact Error: ${msg}\n\nCheck browser console for full payload.`);
    }
  };

  const handleTerminateService = async () => {
    try {
      const { error } = await (supabase as any)
        .from("termination_requests")
        .insert([{
          customer_id: sessionData.id,
          status: "pending",
          requested_date: new Date().toISOString(),
        }]);

      if (error) throw error;
      setHasPendingTermination(true);
    } catch (error: any) {
      alert(`Failed to submit termination request: ${error.message || error.details}`);
    }
  };

  return {
    categories,
    tickets,
    selectedCategoryId,
    setSelectedCategoryId,
    description,
    setDescription,
    hasPendingTermination,
    isLoading,
    handleSubmitTicket,
    handleTerminateService,
  };
}
