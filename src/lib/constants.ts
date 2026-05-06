import { Wifi, Globe, MessageSquare, ShieldCheck, Home, CloudUpload, Gamepad2, PlayCircle } from "lucide-react";

/**
 * BRANDING & IDENTITY
 */
export const BRANDING_CONFIG = {
  HERO_TITLE: "One Bill - Unified Services",
  HERO_SUBTITLE: "Simplified Connectivity and Digital Lifestyle",
  PLATFORM_NAME: "OneVerge",
  PLATFORM_TAGLINE: "Bringing Together",
};

/**
 * PAGE & SECTION TITLES
 */
export const PAGE_TITLES = {
  ORCHESTRATE: "Configure My Suite",
  REGISTRY: "KYC Verification",
  SITE_AUDIT: "Connectivity Check",
  INFRA_HUB: "Support Center",
  LOCATION_CHANGE: "Location Change",
  STEP_3_LEFT: "Locate Area",
  STEP_3_RIGHT: "Select Partner",
  REVIEW_SUITE: "Review Your Bundle",
  SUCCESS: "Payment Successful",
  PROVISIONING: "Activating Your Bundle",
};

/**
 * SITE AUDIT CONFIGURATION
 */
export const AUDIT_LABELS = {
  SUBTITLE: "Verifying Local Node Integrity",
  SCANNING_INFRA: "Scanning Local Fiber Grid",
  LATENCY_CHECK: "Measuring Path Latency",
  SUCCESS_MSG: "Site Integrity Verified",
  FAILED_MSG: "Signal Weakness Detected",
};

/**
 * BUTTON LABELS
 */
export const BUTTON_LABELS = {
  START_CONFIG: "Configure My Suite",
  FINALIZE_LAYERS: "Confirm",
  VERIFY_IDENTITY: "Verify",
  SETTLE_SCHEDULE: "Settle & Schedule",
  SUPPORT_HELP: "Support Help",
  COMMAND_CENTER: "Self Care",
  BACK: "Back",
  PAY_NOW: "Pay & Activate",
};

/**
 * INFRASTRUCTURE & FEASIBILITY
 */
export const INFRA_LABELS = {
  STEP_01_PRE: "01.",
  STEP_02_PRE: "02.",
  FEASIBILITY_CHECK: "Check ISP Feasibility",
  PARTNER_UNLOCK: "Select Area",
  LOCATION_FIRST: "Select Location",
  AVAILABLE_IN: "Available in",
};

/**
 * KYC & REGISTRY
 */
export const REGISTRY_LABELS = {
  PLACEHOLDER_NAME: "Name",
  PLACEHOLDER_PHONE: "Mobile Number",
  PLACEHOLDER_ADDRESS: "Installation Address",
  PLACEHOLDER_NID: "National ID",
  PLACEHOLDER_DOB: "Date of Birth",
  SUBTITLE: "Assemble your information",
  DATA_SECURE: "All data is encrypted via OneVerge",
};

/**
 * SUPPORT HUB
 */
export const SUPPORT_LABELS = {
  TITLE: "",
  SUBTITLE: "Support Center - 24/7 For You",
  TABS: { DIAGNOSTIC: "Diagnostic", MIGRATION: "Location Change", TERMINATE: "Terminate", MY_TICKETS: "My Tickets" },
  MIGRATION_SUBTITLE: "Location Relocation Service",
  FEE_LABEL: "Relocation Fee",
  WHATSAPP_ACTION: "WhatsApp Support",
  WHATSAPP_MOBILE_TEXT: "Talk to an agent on WhatsApp",
};

/**
 * REVIEW & PAYMENT
 */
export const REVIEW_LABELS = {
  SUMMARY_HEADER: "Order Summary",
  SUBTITLE_CONFIG: "Confirm Your Bundle",
  PROCEED_TO_PAY: "Proceed to Payment",
  EDIT_BUNDLE: "Edit Bundle",
  SUBTOTAL: "Monthly Subscription",
  ADDONS: "Selected Add-ons",
  TOTAL_PAYABLE: "Total Amount Due",
  SECURE_NOTICE: "Transactions secured by OneVerge",
};

/**
 * BILLING & VAULT
 */
export const BILLING_LABELS = {
  TITLE: "Manage subscriptions and settlement",
  SUBTITLE: "Your Services",
  UPCOMING_BILL: "Next Cycle Estimate",
  DUE_DATE: "Renewal Date",
  ADVANCE_PAY: "Pay in Advance",
  RENEW_NOW: "Renew Subscription",
  FUTURE_LAYERS: "Scheduled Add-ons",
  LAYER_NOTICE: "Changes will be effective from the next billing cycle.",
  SAVE_SCHEDULE: "Save Scheduled Changes",
};

/**
 * DASHBOARD & TELEMETRY
 */
export const DASHBOARD_LABELS = {
  GREETING: "Welcome",
  SUITE_OVERVIEW: "Service Overview",
  NAV: {
    HOME: "My Dashboard",
    SUPPORT: "Support Hub",
    BILLING: "Subscription",
    SETTINGS: "Node Settings",
    HISTORY: "Billing History",
    LOCATION_CHANGE: "Location Change",
  },
  WIDGETS: {
    UPTIME_OK: "Operational",
    LATENCY: "Path Latency",
    UPTIME: "Network Status",
    BALANCE: "Current Balance",
    STATUS_PAID: "Paid & Verified",
    SUBSCRIBER_ID: "Subscriber ID",
  },
  ACCOUNT_METRICS: {
    IP_LABEL: "IP Address",
    MAC_LABEL: "MAC ID",
  },
};

export const TELEMETRY_CONFIG = {
  DEFAULT_LATENCY: "0.4 ms",
  DEFAULT_UPTIME: "100%",
  MOCK_IP: "103.145.2.14",
  MOCK_MAC: "48:A1:C3:92",
  BALANCE_COLOR: "#e2136e",
  MOCK_EXPIRY_DATE: "2028-04-01", // Unified Expiry Control
};

/**
 * PAYMENT & PRICING
 */
/**
 * PAYMENT CONFIGURATION (Fixes PaymentGateway.tsx error)
 */
export const PAYMENT_CONFIG = {
  SECURE_CHECKOUT: "Secure Checkout",
  METHODS: [
    {
      id: "bkash",
      label: "bKash",
      color: "bg-[#e2136e]",
      hover: "hover:bg-[#d01165]",
      textColor: "text-white",
      logo: "",
    },
    {
      id: "nagad",
      label: "Nagad",
      color: "bg-[#f69220]",
      hover: "hover:bg-[#e5851d]",
      textColor: "text-white",
      logo: "",
    },
    {
      id: "upay",
      label: "Upay",
      color: "bg-[#005a8d]",
      hover: "hover:bg-[#004a75]",
      textColor: "text-white",
      logo: "",
    },
    {
      id: "card",
      label: "Debit/Credit Card",
      color: "bg-[#008d09]",
      hover: "hover:bg-[#0b4b0f]",
      textColor: "text-white",
      logo: "",
    },
  ],
  SECURITY_BADGE: "Transactions secured by 256-bit Encryption",
};

export const ONEVERGE_SUITE_RATES: Record<string, number> = {
  cloud: 500,
  "ai-chatbot": 800,
  security: 150,
  streaming: 600,
  "smart-home": 1200,
  mobility: 900,
  gaming: 450,
  broadband: 0, // Fallback key to prevent calculation errors
};

export const PRICING_CONFIG = { RELOCATION_FEE: 500, CURRENCY: "BDT " };

export const SUPPORT_CONFIG = {
  WHATSAPP_NUMBER: "8801711086859",
  HOTLINE: "8801711086859",
  EMAIL: "mahfujur.r@grameenphone.com",
};

export const SUCCESS_LABELS = {
  ORDER_ID: "Transaction ID",
  USER_ID: "OneVerge ID",
  STATUS_MSG: "Your Service is being Deployed",
  CONGRATS: "Welcome to ",
};

/**
 * MASTER SERVICES LIST
 */
export const ALL_SERVICES = [
  { id: "broadband", name: "Fixed Broadband", icon: Wifi, color: "text-cyan-400" },
  { id: "mobility", name: "Mobile Connect", icon: Globe, color: "text-blue-500" },
  { id: "ai-chatbot", name: "AI Chatbot", icon: MessageSquare, color: "text-purple-400" },
  { id: "security", name: "IT Security", icon: ShieldCheck, color: "text-red-400" },
  { id: "smart-home", name: "Smart Living", icon: Home, color: "text-emerald-400" },
  { id: "cloud", name: "Cloud", icon: CloudUpload, color: "text-blue-400" },
  { id: "gaming", name: "Gaming", icon: Gamepad2, color: "text-pink-500" },
  { id: "streaming", name: "Streaming", icon: PlayCircle, color: "text-orange-400" },
];
