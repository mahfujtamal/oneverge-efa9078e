// src/pages/SupportCenter.tsx

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Zap, Ticket, Send, ShieldCheck, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import {
  DASHBOARD_LABELS,
  SUPPORT_LABELS,
  ALL_SERVICES,
  PRICING_CONFIG,
  ONEVERGE_SUITE_RATES,
  TELEMETRY_CONFIG,
} from "@/shared/lib/constants";

const SupportCenter = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  // 1. BULLETPROOF SESSION RECOVERY ENGINE

  const [sessionData] = useState<any>(() => {
    // Safely extract the inner user data payload if it exists
    if (state?.userData?.id) return state.userData;
    if (state?.id) return state;

    // Fallback: strictly read the exact keys established by Login.tsx
    const saved = localStorage.getItem("oneverge_session") || localStorage.getItem("oneverge_user");
    return saved ? JSON.parse(saved) : null;
  });

  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState<"DIAGNOSTIC" | "TICKETS" | "MIGRATION" | "TERMINATE">("DIAGNOSTIC");
  const [isLoading, setIsLoading] = useState(true);

  /// Ticketing

  // --- TICKETING DATA STATES ---
  const [categories, setCategories] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [description, setDescription] = useState("");

  // --- TICKET MESSAGES STATES ---
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");

  // --- RELOCATION / MIGRATION STATES ---
  const [districts, setDistricts] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  const [targetDistrictId, setTargetDistrictId] = useState("");
  const [targetAreaName, setTargetAreaName] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  //const [relocationDate, setRelocationDate] = useState("");
  const [relocationDate, setRelocationDate] = useState<Date>();
  // Temporary state for the fee calculation engine we will build next
  const [calculatedFee, setCalculatedFee] = useState<{
    base: number;
    vat: number;
    tax: number;
    surcharge: number;
    total: number;
  } | null>(null);

  // Need to allow customer to cancel relocation request.
  const [relocationRequests, setRelocationRequests] = useState<any[]>([]);

  // Render relocation request submission success
  const [relocationSuccessMsg, setRelocationSuccessMsg] = useState<string | null>(null);

  // Add this to your UI states for termination request query
  const [hasPendingTermination, setHasPendingTermination] = useState(false);

  // Check for pending termination requests on load
  useEffect(() => {
    const checkTerminationStatus = async () => {
      if (!sessionData?.id) return;

      try {
        const { data, error } = await (supabase as any)
          .from("termination_requests")
          .select("id")
          .eq("customer_id", sessionData.id)
          .eq("status", "pending")
          .limit(1);

        // If a row is returned, the user has an active request
        if (data && data.length > 0) {
          setHasPendingTermination(true);
        }
      } catch (err) {
        console.error("Failed to check termination status:", err);
      }
    };

    checkTerminationStatus();
  }, [sessionData]);

  // 2. STRICT ROUTE GUARD & INITIALIZATION
  useEffect(() => {
    if (!sessionData) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchSupportData = async () => {
      try {
        // Fetch Dynamic Ticket Categories
        const { data: catData } = await (supabase as any)
          .from("ticket_categories")
          .select("id, name, display_label, default_queue, sla_hours")
          .eq("is_active", true);
        if (catData) setCategories(catData);

        // Fetch Active Tickets for the User
        const { data: tickData } = await (supabase as any)
          .from("tickets")
          .select("*")
          .eq("customer_id", sessionData.id)
          .order("created_at", { ascending: false });
        if (tickData) setTickets(tickData);

        // Fetch Relocation Requests history
        if (sessionData.phone_number) {
          const { data: relocData } = await (supabase as any)
            .from("relocation_requests")
            .select("*")
            .eq("customer_id", sessionData.id)
            .order("created_at", { ascending: false });
          if (relocData) setRelocationRequests(relocData);
        }

        // --- THE FIX: GEOGRAPHICALLY FILTERED DISTRICT FETCH ---

        // --- THE FIX: 3-STEP GEOGRAPHICALLY FILTERED DISTRICT FETCH ---
        if (sessionData?.isp_id) {
          // STEP 1: Fetch all area IDs covered by this specific ISP
          const { data: coverageData } = await (supabase as any)
            .from("isp_coverage")
            .select("area_id")
            .eq("isp_id", sessionData.isp_id);

          const coveredAreaIds = coverageData?.map((c: any) => c.area_id) || [];

          if (coveredAreaIds.length > 0) {
            // STEP 2: Look up those specific areas to extract their parent district IDs
            const { data: areaData } = await (supabase as any)
              .from("areas")
              .select("district_id")
              .in("id", coveredAreaIds);

            // Deduplicate the district IDs (ISPs usually cover multiple areas per district)
            const uniqueDistrictIds = [...new Set(areaData?.map((a: any) => a.district_id))];

            if (uniqueDistrictIds.length > 0) {
              // STEP 3: Fetch only the active districts that matched the coverage intersection
              const { data: districtData } = await (supabase as any)
                .from("districts")
                .select("id, name")
                .eq("is_active", true)
                .in("id", uniqueDistrictIds)
                .order("name", { ascending: true });

              if (districtData) setDistricts(districtData);
            } else {
              setDistricts([]);
            }
          } else {
            setDistricts([]);
          }
        }
      } catch (err) {
        console.error("Data fetching error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupportData();
  }, [sessionData, navigate]);

  // 3. CASCADING AREA FETCH (ISP COVERAGE FILTERED)

  useEffect(() => {
    if (!targetDistrictId || !sessionData?.isp_id) {
      setAreas([]);
      return;
    }

    const fetchCoveredAreas = async () => {
      try {
        const { data: coverageData, error: coverageError } = await (supabase as any)
          .from("isp_coverage")
          .select("area_id")
          .eq("isp_id", sessionData.isp_id);

        if (coverageError) throw coverageError;

        const coveredAreaIds = coverageData?.map((c: any) => c.area_id) || [];

        if (coveredAreaIds.length === 0) {
          setAreas([]);
          return;
        }

        const { data: areaData, error: areaError } = await (supabase as any)
          .from("areas")
          .select("id, name")
          .eq("district_id", targetDistrictId)
          .eq("is_active", true)
          .in("id", coveredAreaIds)
          .order("name", { ascending: true });

        if (areaError) throw areaError;

        setAreas(areaData || []);
      } catch (error) {
        console.error("Failed to fetch covered areas:", error);
        setAreas([]);
      }
    };

    fetchCoveredAreas();
  }, [targetDistrictId, sessionData]);

  // --- FETCH TICKET MESSAGES ON EXPAND ---
  const handleToggleTicket = async (ticketId: string) => {
    // If clicking the currently open ticket, close it
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
      setTicketMessages([]);
      return;
    }

    setExpandedTicketId(ticketId);
    setIsLoadingMessages(true);

    try {
      const { data: messagesData, error: messagesError } = await (supabase as any)
        .from("ticket_messages")
        .select("id, sender_type, message_body, created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      setTicketMessages(messagesData || []);
    } catch (error: any) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // --- SUBMIT REPLY TO EXISTING TICKET ---
  const handleSendReply = async (ticketId: string) => {
    if (!replyText.trim()) return;

    try {
      // Insert the new message into the database [1]
      const { data: insertedMessage, error: messageError } = await (supabase as any)
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId,
          sender_type: "customer", // Must match your DB constraint exactly
          message_body: replyText.trim(),
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Update the local message array instantly for a seamless UX
      if (insertedMessage) {
        setTicketMessages((prev) => [...prev, insertedMessage]);
      }

      // Clear the input box
      setReplyText("");
    } catch (error: any) {
      console.error("Failed to send reply:", error);
      alert(`Failed to send reply: ${error.message || error.details || JSON.stringify(error)}`);
    }
  };

  // --- TICKET CREATION & AUTOMATED ROUTING ---
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
      // 1. Insert into 'tickets' table including the newly requested isp_id
      const { data: newTicket, error: ticketError } = await (supabase as any)
        .from("tickets")
        .insert({
          customer_id: sessionData.id,
          isp_id: sessionData.isp_id || null, // Successfully passes the ISP ID if present in session
          ticket_type: resolvedType,
          status: "Open", // DB Constraint - Open,ISP Support,OneVerge Support,Resolved
          queue: resolvedQueue,
          priority: "Medium", // DB Constraint - Medium, Low, High
          source_channel: "Web Portal", // DB Constraint - Web Portal, WhatsApp, Email, Phone, Walk-in
          sla_deadline: targetDeadline.toISOString(),
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      //  DB Constraint - customer, agent, system

      // 2. Insert into 'ticket_messages' table using the newly created ticket's ID
      if (description && newTicket?.id) {
        const { data: insertedMessage, error: messageError } = await (supabase as any)
          .from("ticket_messages")
          .insert({
            ticket_id: newTicket.id,

            // Note: If you have a Check Constraint here (like we did with priority),
            // ensure this exactly matches the allowed capitalization (e.g., "Customer")
            sender_type: "customer", // DB Constraint - customer, agent, system

            message_body: description,
          })
          .select(); // Force the database to read back the inserted row

        // If a constraint is violated, force it to the alert screen
        if (messageError) {
          throw new Error(`Message Insert Failed: ${messageError.message || messageError.details}`);
        }

        // If the array is completely empty, it means RLS silently blocked the action
        if (!insertedMessage || insertedMessage.length === 0) {
          throw new Error(
            "Message silently blocked. Please disable RLS on the 'ticket_messages' table or add an INSERT policy.",
          );
        }
      }

      // 3. Update UI state
      setTickets([newTicket, ...tickets]);
      setSelectedCategoryId("");
      setDescription("");
      alert(`Ticket submitted successfully! Routed to ${resolvedQueue}. SLA Target: ${slaHours} Hours`);
    } catch (error: any) {
      console.error("Detailed Submission Error:", error);

      const exactErrorMessage =
        error?.message || error?.details || error?.hint || JSON.stringify(error) || "Unknown network error occurred";

      // Alert the exact database failure to the screen for debugging
      alert(
        `Ticket Submission Failed!\n\nExact Error: ${exactErrorMessage}\n\nCheck the browser console for the full object payload.`,
      );
    }
  };

  // --- RELOCATION HANDLERS ---

  // --- RELOCATION FEE CALCULATION ---

  const handleCalculateFee = async () => {
    if (!sessionData?.isp_id || !targetAreaName) return;

    try {
      const { data: ispFee, error: ispError } = await (supabase as any)
        .from("isp_relocation_fees")
        .select("base_fee, vat_amount, tax_amount, surcharge_amount")
        .eq("isp_id", sessionData.isp_id)
        .eq("target_area", targetAreaName)
        .limit(1)
        .maybeSingle();

      if (ispError) throw ispError;

      if (ispFee) {
        const base = Number(ispFee.base_fee) || 0;
        const vat = Number(ispFee.vat_amount) || 0;
        const tax = Number(ispFee.tax_amount) || 0;
        const surcharge = Number(ispFee.surcharge_amount) || 0;
        setCalculatedFee({ base, vat, tax, surcharge, total: base + vat + tax + surcharge });
        return;
      }

      const { data: defaultFee, error: defaultError } = await (supabase as any)
        .from("default_relocation_fees")
        .select("base_fee, vat_amount, tax_amount, surcharge_amount")
        .limit(1)
        .maybeSingle();

      if (defaultError) throw defaultError;

      if (defaultFee) {
        const base = Number(defaultFee.base_fee) || 0;
        const vat = Number(defaultFee.vat_amount) || 0;
        const tax = Number(defaultFee.tax_amount) || 0;
        const surcharge = Number(defaultFee.surcharge_amount) || 0;
        setCalculatedFee({ base, vat, tax, surcharge, total: base + vat + tax + surcharge });
      } else {
        setCalculatedFee({ base: 1000, vat: 150, tax: 0, surcharge: 0, total: 1150 });
      }
    } catch (error) {
      console.error("Fee calculation error:", error);
      alert("Failed to calculate routing fees. Please try again.");
    }
  };

  // --- RELOCATION REQUEST SUBMISSION (AGREEMENT TO PAY) ---
  const handleRelocationSubmit = async () => {
    if (!calculatedFee || !targetDistrictId || !targetAreaName || !detailAddress || !relocationDate) {
      alert("Please complete all fields and calculate the fee first."); // Uncomment to debug
      return;
    }

    // Generate a master transaction ID to interlock the pending payment and the request
    //const masterTransactionId = `OV-TXN-RELOC-${Date.now()}`;
    const masterTransactionId = `OV-TXN-RELOC-${crypto.randomUUID()}`;
    try {
      // 1. Insert the pending financial ledger agreement into the 'payments' table
      const { error: paymentError } = await (supabase as any).from("payments").insert({
        customer_id: sessionData.id,
        transaction_id: masterTransactionId,
        amount: calculatedFee.total,
        payment_method: "request_placed",
        payment_type: "relocation_fee",
        status: "pending",
      });

      if (paymentError) throw new Error(`Payment Ledger Failed: ${paymentError.message || paymentError.details}`);

      // 2. Execute the insert into the 'relocation_requests' table
      const { data: newRelocation, error: relocationError } = await (supabase as any)
        .from("relocation_requests")
        .insert({
          //user_phone: sessionData.phone_number || "Unknown",
          customer_id: sessionData.id,
          target_district_id: targetDistrictId,
          target_area: targetAreaName,
          detail_address: detailAddress,
          //relocation_date: relocationDate,
          relocation_date: relocationDate?.toISOString(),
          base_fee: calculatedFee.base,
          vat_amount: calculatedFee.vat,
          tax_amount: calculatedFee.tax,
          surcharge_amount: calculatedFee.surcharge,
          total_fee: calculatedFee.total,
          transaction_id: masterTransactionId,
          status: "pending",
        })
        .select()
        .single();

      if (relocationError) {
        throw new Error(`Relocation Request Failed: ${relocationError.message || relocationError.details}`);
      }

      // 3. Update the local UI state with the new request
      if (newRelocation) {
        setRelocationRequests([newRelocation, ...relocationRequests]);
      }

      // 4. Render the inline UI success message
      setRelocationSuccessMsg(
        `Request Placed Successfully! \nTransaction ID: ${masterTransactionId}\nOur deployment team will verify feasibility at the new address before processing payment.`,
      );

      // 5. Reset the form state
      setTargetDistrictId("");
      setTargetAreaName("");
      setDetailAddress("");
      setRelocationDate(undefined);
      setCalculatedFee(null);

      // 6. Auto-clear the success message after 15 seconds
      setTimeout(() => {
        setRelocationSuccessMsg(null);
      }, 15000);

      // This catch block is now perfectly aligned with the opening try { block above
    } catch (error: any) {
      console.error("Relocation submission failed:", error);
      alert(`Failed to submit request: ${error.message || error.details}`);
    }
  };

  // --- CANCEL RELOCATION REQUEST ---
  const handleCancelRelocation = async (requestId: string, transactionId: string) => {
    //if (!window.confirm("Are you sure you want to cancel this relocation request?")) return;

    // Diagnostic logging converted to UI alerts
    //alert(`CANCEL INITIATED -> Request ID: ${requestId}, Transaction ID: ${transactionId}`);

    try {
      // 1. Update the relocation request status to 'cancelled'
      const { error: reqError } = await (supabase as any)
        .from("relocation_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId);

      if (reqError) throw reqError;

      // 2. Update the corresponding payment ledger safely
      if (!transactionId) {
        alert(`Cancellation Warning: No transaction ID found. Payment ledger update skipped for request: ${requestId}`);
      } else {
        const { data: payData, error: payError } = await (supabase as any)
          .from("payments")
          .update({ status: "cancelled" })
          .eq("transaction_id", transactionId)
          .select(); // Forces Supabase to return the modified rows

        if (payError) {
          alert(`Payment ledger update failed due to constraint or schema error: ${JSON.stringify(payError)}`);
        } else if (!payData || payData.length === 0) {
          alert(
            `Payment update returned 0 rows for ${transactionId}! This means an RLS Policy blocked it, or the status wasn't 'pending'.`,
          );
        } else {
          //alert(`Payment ledger successfully cancelled: ${JSON.stringify(payData)}`);
        }
      }

      // 3. Update the local UI state dynamically
      setRelocationRequests((prev) =>
        prev.map((req) => (req.id === requestId ? { ...req, status: "cancelled" } : req)),
      );

      //alert("Final Step: Relocation request UI state has been successfully updated.");
    } catch (error: any) {
      alert(`Failed to cancel request: ${error.message || error.details}`);
    }
  };

  // 1. PASTE THE TERMINATION HANDLER HERE (Inside the component scope)
  const handleTerminateService = async () => {
    // Replaced the strict typing prompt with a simple click confirmation
    //if (!window.confirm("Are you sure you want to submit a request to terminate your services?")) return;

    try {
      // Create a new record in the termination_requests table
      const { error } = await (supabase as any)
        .from("termination_requests") // Ensure this matches your exact table name
        .insert([
          {
            customer_id: sessionData.id,
            status: "pending", // Optional: Initialize the request status
            requested_date: new Date().toISOString(),
          },
        ]);

      if (error) throw error;
      setHasPendingTermination(true);

      /*alert(
        "Your termination request has been successfully submitted and is pending review. Your services will remain active until the request is processed.",
      );*/
    } catch (error: any) {
      //console.error("Termination request failed:", error);
      alert(`Failed to submit termination request: ${error.message || error.details}`);
    }
  };
  // Ensure uniform loading UX matching the Dashboard components
  if (!sessionData || isLoading) {
    return (
      <div className="ov-page-container ov-flex-center h-screen bg-black flex items-center justify-center">
        <Zap className="animate-pulse text-ov-primary text-blue-500" size={48} />
      </div>
    );
  }

  return (
    // Outer wrap inherits Dashboard/BillingVault UX structure
    <div className="ov-page-container flex h-screen bg-black text-white overflow-hidden">
      <Sidebar sessionData={sessionData} />

      <main className="ov-main-content flex-1">
        <header className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-6 text-left">
          <div>
            <span className="ov-section-label tracking-[0.3em]">
              <span className="text-white font-semibold">{sessionData.display_name}</span>

              <span className="text-gray-500"> - </span>

              {/* User ID - OneVerge Primary Color (Blue) */}
              <span className="text-ov-primary font-mono">{sessionData.user_id}</span>

              <span className="text-gray-500"> [</span>

              {/* ISP Name - Green */}
              <span className="text-green-400">{sessionData.ispName}</span>

              <span className="text-gray-500">, </span>

              {/* Location - Purple */}
              <span className="text-purple-400">{sessionData.location}</span>
              <span className="text-gray-500">]</span>
            </span>
            <h1 className="ov-h1 !text-4xl lg:!text-4xl italic">{SUPPORT_LABELS.SUBTITLE}</h1>
          </div>
          <div className="ov-badge text-emerald-400 bg-emerald-500/5 py-2 px-4 border-emerald-500/10">
            <ShieldCheck size={14} />
            <span className="uppercase font-black text-[9px] tracking-widest">Support Center</span>
          </div>
        </header>

        {/* SUPPORT HUB MENU (Tab Navigation) */}
        <div className="flex border-b border-gray-800 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("DIAGNOSTIC")}
            className={`px-6 py-4 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === "DIAGNOSTIC"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Zap size={18} />
            Diagnostic
          </button>

          <button
            onClick={() => setActiveTab("TICKETS")}
            className={`px-6 py-4 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === "TICKETS" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Ticket size={18} />
            Tickets
          </button>

          <button
            onClick={() => setActiveTab("MIGRATION")}
            className={`px-6 py-4 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === "MIGRATION"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <MapPin size={18} />
            Relocation
          </button>

          <button
            onClick={() => setActiveTab("TERMINATE")}
            className={`px-6 py-4 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === "TERMINATE" ? "border-b-2 border-red-500 text-red-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <ShieldCheck size={18} />
            Terminate Service
          </button>
        </div>

        {/* --- MAIN CONTENT PANELS --- */}
        <div className="max-w-4xl">
          <AnimatePresence mode="wait">
            {/* TICKETS TAB */}
            {activeTab === "TICKETS" && (
              <motion.div
                key="tickets"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Create Ticket Form */}
                <form
                  onSubmit={handleSubmitTicket}
                  className="p-6 border border-white/10 bg-white/5 rounded-xl space-y-4"
                >
                  <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                    <Ticket size={20} className="text-ov-primary" /> Open a New Request
                  </h2>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Issue Category</label>
                    <select
                      required
                      className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ov-primary focus:border-transparent outline-none transition-all"
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                    >
                      <option value="" disabled>
                        Select an issue...
                      </option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.display_label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Description</label>
                    <textarea
                      required
                      rows={3}
                      className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ov-primary focus:border-transparent outline-none transition-all resize-none"
                      placeholder="Please describe the issue..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-ov-primary hover:bg-ov-primary/90 text-white font-medium">
                    <Send size={16} className="mr-2" /> Submit Ticket
                  </Button>
                </form>

                {/* Ticket History List */}
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
                          {/* Ticket Header (Clickable) */}
                          <div
                            className="p-4 flex justify-between items-center cursor-pointer"
                            onClick={() => handleToggleTicket(ticket.id)}
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

                          {/* Expanded Messages Thread */}
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
                                        className={`flex flex-col ${msg.sender_type.toLowerCase() === "customer" ? "items-end" : "items-start"}`}
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

                                {/* THE FIX: Exactly ONE active input box rendered here */}
                                {ticket.status !== "closed" && (
                                  <div className="p-3 border-t border-white/10 bg-white/5 flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Reply to this thread..."
                                      className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-ov-primary"
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleSendReply(ticket.id);
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      className="bg-ov-primary hover:bg-ov-primary/90 text-white"
                                      onClick={() => handleSendReply(ticket.id)}
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
              </motion.div>
            )}

            {/* DIAGNOSTIC TAB */}
            {activeTab === "DIAGNOSTIC" && (
              <motion.div key="diag" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="p-10 border border-white/10 rounded-xl bg-white/5 flex flex-col items-center justify-center text-center">
                  <Zap
                    size={48}
                    className="text-yellow-400 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                  />
                  <h2 className="text-2xl font-bold text-white mb-2">Network Telemetry Active</h2>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Your connection to the {sessionData.ispName || "OneVerge"} BTS is stable. Historical telemetry
                    logging is currently parked for future updates.
                  </p>
                </div>
              </motion.div>
            )}

            {/* MIGRATION TAB */}
            {activeTab === "MIGRATION" && (
              <motion.div
                key="migr"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* --- RELOCATION FORM --- */}

                <div className="p-6 border border-white/10 bg-white/5 rounded-xl space-y-6">
                  {/* --- INLINE SUCCESS NOTIFICATION --- */}
                  <AnimatePresence>
                    {relocationSuccessMsg && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 border border-green-500/30 bg-green-500/10 rounded-xl flex items-start gap-3">
                          <ShieldCheck className="text-green-400 shrink-0 mt-0.5" size={20} />
                          <div>
                            <p className="text-green-400 font-medium">Success</p>
                            <p className="text-sm text-green-300/80 mt-1 whitespace-pre-line">{relocationSuccessMsg}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <MapPin size={24} className="text-purple-400" />
                    <div>
                      <h2 className="text-xl font-bold text-white">Relocation Services</h2>
                      <p className="text-sm text-gray-400">Move your active connections to a new address seamlessly.</p>
                    </div>
                  </div>

                  <form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* District Dropdown */}
                      <div className="space-y-2">
                        <label className="text-sm text-gray-400">Target District</label>
                        <select
                          required
                          className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all"
                          value={targetDistrictId}
                          onChange={(e) => {
                            setTargetDistrictId(e.target.value);
                            setTargetAreaName("");
                            setCalculatedFee(null);
                            setRelocationSuccessMsg(null); // <-- Add this to clear the message when restarting
                          }}
                        >
                          <option value="" disabled>
                            Select District...
                          </option>
                          {districts.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Area Dropdown */}
                      <div className="space-y-2">
                        <label className="text-sm text-gray-400">Target Area</label>
                        <select
                          required
                          className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all"
                          value={targetAreaName}
                          onChange={(e) => {
                            setTargetAreaName(e.target.value);
                            setCalculatedFee(null);
                          }}
                          disabled={!targetDistrictId || areas.length === 0}
                        >
                          <option value="" disabled>
                            {!targetDistrictId ? "Select District First..." : "Select Area..."}
                          </option>
                          {areas.map((a) => (
                            <option key={a.id} value={a.name}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Detailed New Address</label>
                      <input
                        required
                        type="text"
                        placeholder="House / Road / Apartment details..."
                        className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all"
                        value={detailAddress}
                        onChange={(e) => setDetailAddress(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Preferred Relocation Date</label>
                      {/* Replace your old date input with this block */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal border-gray-800 bg-gray-900/50 text-white hover:bg-gray-800",
                              !relocationDate && "text-gray-400",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {relocationDate ? format(relocationDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-gray-950 border-gray-800 text-white">
                          <Calendar
                            mode="single"
                            selected={relocationDate}
                            onSelect={setRelocationDate}
                            initialFocus
                            /* Optional: Disable past dates */
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Dynamic Fee Calculator Box */}
                    {targetAreaName && (
                      <div className="mt-6 p-4 rounded-lg bg-purple-400/10 border border-purple-400/20">
                        {calculatedFee ? (
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-300">Estimated Relocation Fee</p>
                              <p className="text-2xl font-bold text-white">৳{calculatedFee.total}</p>
                            </div>
                            <Button
                              type="button"
                              className="bg-purple-500 hover:bg-purple-600 text-white"
                              onClick={handleRelocationSubmit}
                            >
                              Request Confirmation
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-300">
                              Target area selected. Calculate routing fees to continue.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="border-purple-400/50 text-purple-400 hover:bg-purple-400/10"
                              onClick={handleCalculateFee}
                            >
                              Calculate Fees
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </form>
                </div>
                {/* --- ACTIVE RELOCATION REQUESTS LIST --- */}
                {relocationRequests.length > 0 && (
                  <div className="mb-8 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-300 border-b border-white/10 pb-2">
                      Your Relocation Requests
                    </h3>
                    <div className="grid gap-4">
                      {relocationRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-4 border border-white/10 rounded-lg bg-black/50 flex justify-between items-center transition-colors hover:bg-white/5"
                        >
                          <div>
                            <p className="font-medium text-white flex items-center gap-2">
                              <MapPin size={14} className="text-purple-400" />
                              Moving to: {req.target_area}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              Scheduled: {new Date(req.relocation_date).toLocaleDateString()} | Status:{" "}
                              <span
                                className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                                  req.status === "pending"
                                    ? "bg-amber-400/10 text-amber-400"
                                    : req.status === "cancelled"
                                      ? "bg-red-400/10 text-red-400"
                                      : "bg-green-400/10 text-green-400"
                                }`}
                              >
                                {req.status.toUpperCase()}
                              </span>
                            </p>
                          </div>

                          {/* Only allow cancellation if the request is still pending */}
                          {req.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelRelocation(req.id, req.transaction_id)}
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                            >
                              Cancel Request
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TERMINATION TAB CONTENT */}
            {activeTab === "TERMINATE" &&
              (hasPendingTermination ? (
                // SHOW THIS IF A REQUEST IS ALREADY PENDING
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl mt-6 bg-red-950/40 border border-red-500/50 p-6 rounded-lg flex items-start gap-4"
                >
                  <div className="p-2 bg-red-500/20 rounded-full shrink-0">
                    <ShieldCheck className="text-red-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-400">Termination Request Pending</h3>
                    <p className="text-sm text-red-200/80 mt-2">
                      We have received your request to permanently terminate your OneVerge services. Our support team is
                      currently reviewing your account. Your connection and digital services will remain active until
                      the request is fully processed.
                    </p>
                  </div>
                </motion.div>
              ) : (
                // SHOW THIS IF NO REQUEST HAS BEEN MADE YET
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl mt-6 p-8 border border-red-900/50 bg-red-950/20 rounded-xl"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-red-500/20 rounded-full">
                      <ShieldCheck className="text-red-500" size={28} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-red-400">Termination Request</h2>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 text-sm text-gray-300">
                    <ul className="list-disc pl-5 space-y-2 text-red-200/80">
                      <li>Our Team will connect you by 6 hours</li>
                      <li>
                        Your service(s) will be permanently suspended once terminated:{" "}
                        <span className="font-semibold">
                          {ALL_SERVICES.filter((service) => sessionData?.active_services?.includes(service.id))
                            .map((service) => service.name)
                            .join(", ") || "None"}
                        </span>
                        .
                      </li>
                      <li>Any pending wallet balances or relocation fees must be settled.</li>
                      <li>You will not receive any refund for current month subscription.</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleTerminateService}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"
                  >
                    Termination Request
                  </Button>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default SupportCenter;
