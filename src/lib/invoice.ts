// Client-side invoice utilities.
// Generates a branded PDF receipt with jsPDF, uploads it to the public
// `invoices` Storage bucket, and returns a public URL that can be embedded
// in transactional emails or shared as a "WhatsApp" link.

import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { PRICING_CONFIG, ALL_SERVICES, ONEVERGE_SUITE_RATES } from "@/shared/lib/constants";

export interface InvoiceLineItem {
  label: string;
  amount: number;
}

export interface InvoiceInput {
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  oneVergeId?: string | null;
  transactionId: string;
  paymentMethod: string;
  paymentType: "activation" | "renewal" | "topup" | "relocation_fee" | string;
  amountPaid: number;
  walletBalanceAfter: number;
  cycleConsumed?: boolean;
  cycleAmount?: number;
  cycleServices?: string[]; // service ids
  issuedAt?: Date;
}

const friendlyServiceName = (id: string): string => {
  const svc = ALL_SERVICES.find((s) => s.id === id);
  return svc?.name || id;
};

const friendlyPaymentType = (t: string): string => {
  switch (t) {
    case "activation":
      return "Service Activation";
    case "renewal":
      return "Subscription Renewal";
    case "topup":
      return "Wallet Top-up";
    case "relocation_fee":
      return "Relocation Fee";
    default:
      return t;
  }
};

/** Build a branded PDF receipt and return it as a Blob. */
export function buildInvoicePdf(input: InvoiceInput): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const issuedAt = input.issuedAt || new Date();

  // Header band
  doc.setFillColor(15, 23, 42); // ov deep navy
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setTextColor(6, 182, 212); // cyan accent
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("ONEVERGE", margin, 50);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Connectivity Receipt", margin, 70);
  doc.setFontSize(9);
  doc.text(`Issued: ${issuedAt.toUTCString()}`, pageWidth - margin, 70, { align: "right" });

  // Body
  doc.setTextColor(20, 20, 20);
  let y = 130;

  // Bill-to block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("BILL TO", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y += 16;
  doc.text(input.customerName || "Customer", margin, y);
  if (input.oneVergeId) {
    y += 14;
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(`OneVerge ID: ${input.oneVergeId}`, margin, y);
    doc.setTextColor(20, 20, 20);
  }
  if (input.customerEmail) {
    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(input.customerEmail, margin, y);
    doc.setTextColor(20, 20, 20);
  }
  if (input.customerPhone) {
    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(input.customerPhone, margin, y);
    doc.setTextColor(20, 20, 20);
  }
  if (input.customerAddress) {
    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    const wrapped = doc.splitTextToSize(input.customerAddress, pageWidth - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 11;
    doc.setTextColor(20, 20, 20);
  }

  // Transaction meta box
  y += 24;
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageWidth - margin * 2, 78, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TRANSACTION ID", margin + 12, y + 18);
  doc.text("PAYMENT METHOD", margin + 12, y + 42);
  doc.text("PURPOSE", margin + 12, y + 66);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(input.transactionId, margin + 150, y + 18);
  doc.text(input.paymentMethod, margin + 150, y + 42);
  doc.text(friendlyPaymentType(input.paymentType), margin + 150, y + 66);

  y += 78 + 28;

  // Amount paid (top-up or relocation: this IS the line item)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("LINE ITEMS", margin, y);
  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const paidLabel =
    input.paymentType === "relocation_fee"
      ? "Relocation Fee"
      : "Wallet Credit (Payment Received)";
  doc.text(paidLabel, margin, y);
  doc.text(
    `${PRICING_CONFIG.CURRENCY} ${input.amountPaid.toLocaleString()}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );
  y += 22;

  // If a cycle was consumed (activation or renewal), itemise the deduction
  if (input.cycleConsumed && input.cycleAmount && input.cycleServices?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Cycle deducted from wallet:", margin, y);
    doc.setTextColor(20, 20, 20);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    input.cycleServices.forEach((svcId) => {
      if (svcId === "broadband") return; // shown as base
      const price = ONEVERGE_SUITE_RATES[svcId] || 0;
      doc.text(`• ${friendlyServiceName(svcId)}`, margin + 14, y);
      doc.text(
        `${PRICING_CONFIG.CURRENCY} ${price.toLocaleString()}`,
        pageWidth - margin,
        y,
        { align: "right" },
      );
      y += 14;
    });
    doc.text("• Broadband (Base Plan)", margin + 14, y);
    const broadbandPart =
      input.cycleAmount -
      input.cycleServices
        .filter((s) => s !== "broadband")
        .reduce((sum, s) => sum + (ONEVERGE_SUITE_RATES[s] || 0), 0);
    doc.text(
      `${PRICING_CONFIG.CURRENCY} ${broadbandPart.toLocaleString()}`,
      pageWidth - margin,
      y,
      { align: "right" },
    );
    y += 18;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.text("Cycle total deducted", margin, y);
    doc.text(
      `- ${PRICING_CONFIG.CURRENCY} ${input.cycleAmount.toLocaleString()}`,
      pageWidth - margin,
      y,
      { align: "right" },
    );
    y += 24;
  }

  // Wallet balance summary
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Wallet Balance After This Transaction", margin, y);
  doc.setTextColor(6, 100, 130);
  doc.text(
    `${PRICING_CONFIG.CURRENCY} ${input.walletBalanceAfter.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );
  doc.setTextColor(20, 20, 20);

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(
    "OneVerge — your unified connectivity layer. Auto-renewal will deduct the cycle amount from your wallet on the next billing date.",
    margin,
    doc.internal.pageSize.getHeight() - 40,
    { maxWidth: pageWidth - margin * 2 },
  );

  return doc.output("blob");
}

/** Upload a generated invoice PDF and return a public URL. */
export async function uploadInvoice(
  blob: Blob,
  customerId: string,
  transactionId: string,
): Promise<string> {
  const safeTxn = transactionId.replace(/[^a-zA-Z0-9-_]/g, "_");
  const path = `${customerId}/${safeTxn}.pdf`;

  const { error } = await supabase.storage.from("invoices").upload(path, blob, {
    cacheControl: "3600",
    upsert: true,
    contentType: "application/pdf",
  });
  if (error) throw error;

  const { data } = supabase.storage.from("invoices").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * One-call helper: build → upload → return URL.
 * Throws on failure; callers can wrap with try/catch if they want a soft fail.
 */
export async function generateAndUploadInvoice(input: InvoiceInput): Promise<string> {
  const blob = buildInvoicePdf(input);
  return uploadInvoice(blob, input.customerId, input.transactionId);
}
