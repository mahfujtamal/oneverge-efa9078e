# OneVerge Platform — Master Architecture & Implementation Plan

## 1. Overview

An interactive, registration-free landing page where users build their custom OneVerge bundle by toggling 7 services, see a live connectivity map and savings counter, proceed through a seamless KYC and ISP feasibility check, and finalize their bundle via a dynamic payment gateway [1]. OneVerge operates as a strict **Prepaid-First, Unified Wallet** ecosystem that allows customers to bundle fixed broadband with digital add-on services (Cloud, AI Chatbot, IT Security). The platform bridges the gap between ISP infrastructure accountability and seamless consumer billing.

## 2. Design System & Frontend Specifications

- **Background**: Deep Navy (`#0f172a` / `#03060b`) with subtle gradients [1].
- **Accent**: Electric Cyan (`#06b6d4` / `#22d3ee`) for active states, glows, and connections, paired with Signature Magenta (`#e2136e`) for balance widgets [1].
- **Cards**: Glassmorphism — translucent white/navy backgrounds, backdrop-blur, soft borders [2].
- **Typography**: Clean sans-serif, white text with cyan highlights, heavily utilizing uppercase and wide-tracking labels [2].
- **Animations**: Framer Motion for card toggles, connectivity web, progress bars, and modal transitions [2].

## 3. Core Modules & Architecture

### Module A: Identity & Lead Capture (Onboarding)

- **Value-First UI**: Users build their bundle via an interactive 7-card grid and a live connectivity map before providing PII [3].
- **Strict Authentication & Enterprise UX**: Password-based signup enforcing a mandatory 13-character complexity rule (1 uppercase, 1 lowercase, 1 number, 1 special char) across all platform users.
  - _UX Pattern:_ Implement a real-time visual password checklist and strength meter during input to prevent user drop-off.
- **Data Collection**: Collects Name, Phone, Email, NID, Address, and Date of Birth [5].
- **Temporary Account Lifecycle**: Accounts are created immediately post-KYC/Auth and marked `account_status = 'temporary'`.
- **Privacy Purge (8-Week TTL)**: A daily `pg_cron` job automatically purges Personally Identifiable Information for temporary accounts that fail to make a payment within 8 weeks.

### Module B: The Unified Billing Vault

- **Prepaid-First Wallet**: Customers deposit funds into a central `currentCreditBalance`, and can check their Settlement Estimate that calculates the total payable amount for the next billing cycle [6, 7].
- **Next Cycle Config**: Customers can add or remove individual services on/off, or change tiers (via dropdowns) [6, 7]. React dynamically calculates the `nextCycleTotal` and immediately flags any deficit or carryover surplus [6, 7].
- **No Partial Activations**: The entire family bundle operates on a unified ledger. Scheduled modifications take effect starting from the next billing cycle after saving [6, 7].

### Module C: Subscription Lifecycle & Escrow

- **Transfer of Ownership**: Handled via a secure database handshake (`subscription_transfers`).
- **Smart Transfer Routing**:
  - If the receiver is an _existing_ customer of the ISP: Bypass KYC → Route to Connectivity/Feasibility check.
  - If the receiver is a _new_ customer: Route to KYC capture → Route to Connectivity/Feasibility check.
- **ISP Accountability**: OneVerge handles orchestration; ISPs handle legal KYC and physical node feasibility.

### Module D: Staggered Financial Settlement

- **Customer Cycle (Scattered)**: Customers are billed on their individual `billing_anchor_date` (e.g., the 17th of every month). A daily cron job executes their scheduled modifications, deducts wallet funds, and writes to the `revenue_allocations` ledger.
- **B2B Settlement (Strictly the 1st)**: Partner ISPs, Add-on Providers, and Regulators/Govt are settled in bulk on the 1st of the month using aggregated data from the previous calendar month's `revenue_allocations`.

### Module E: ITSM & Omnichannel Ticketing

- **Ticket Ingestion**: Omnichannel generation via Dashboard, WhatsApp, or Email.
- **Ticket Visibility**: Dedicated "My Tickets" tab for customers to view real-time chat threads and statuses.
- **Multi-Tier Queues**:
  - `ISP_QUEUE`: Broadband issues (Isolated via RLS so ISPs only see their own tickets).
  - `L1A_ADDON_QUEUE`: Digital service issues (Routed to OneVerge L1A).
  - `L1A_INFRA_QUEUE`: API/Backbone issues (Escalated by ISPs to OneVerge L1A).
- **Dynamic SLAs**: Priority (P1-P4) deadlines calculated dynamically via the `sla_policies` table, utilizing fallback logic (Strict ISP Rule → ISP Tier [Premium vs. Standard] → Global Default).
- **Granular Service Fees**: Relocation fees are calculated dynamically based on ISP and Area pairings via RPC (`calculate_relocation_fee`), falling back to a global default.

## 4. Database Schema Tracker (Supabase)

1. `profiles` (Auth extensions & 13-char enforcement)
2. `customers` (Ledger, `account_status`, `kyc_status`)
3. `subscriptions` (Physical links, `billing_anchor_date`)
4. `subscription_transfers` (Escrow for ownership changes)
5. `scheduled_modifications` (Queued plan changes)
6. `revenue_allocations` (B2B split ledgers)
7. `tickets` & `ticket_messages` (ITSM engine)
8. `relocation_fees` & `sla_policies` (Dynamic configurations)

## 5. Future Infrastructure Roadmap

_Note: Currently utilizing direct Supabase DB connections for rapid prototyping._

- **4-Tier Network Isolation**: Moving forward to production, the architecture will shift to an Enterprise Defense-in-Depth model:
  1. **Exposed Zone (Public Subnet)**: React UI / API Gateway.
  2. **Non-Exposed Zone (Private Subnet 1)**: Node.js/Edge API Layer (Validates business logic).
  3. **Secure Zone (Isolated Subnet 2)**: PostgreSQL Database (No direct public internet access).
  4. **Management Layer**: Admin controls, Partner Settlement Portal, and telemetry.
