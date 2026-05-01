# OneVerge Platform

## Overview

OneVerge is an interactive, registration-free orchestration platform operating as a strict **Prepaid-First, Unified Wallet** ecosystem [1]. It bridges the gap between ISP infrastructure accountability and seamless consumer billing by allowing customers to bundle fixed broadband with digital add-on services, such as Cloud, AI Chatbots, and IT Security [1].

## Core Features

### 1. Value-First Onboarding & Enterprise Auth

- **Interactive Bundle Builder:** Users build their custom bundle via an interactive 7-card grid by toggling mandatory and optional services [3].
- **Connectivity Map & Value Counter:** Features a live connectivity map with animated SVG lines linking active services, alongside a dynamic savings counter [2, 3].
- **Identity Registry (KYC):** Captures user details with a strict 13-character, highly complex password policy supported by enterprise-grade UX (real-time validation checklists) [5].
- **Site Audit & Feasibility:** Displays dynamic coordinate mapping and animated simulations to check the local fiber grid and path latency [8].

### 2. Unified Billing Vault & Staggered Settlement

- **Next Cycle Config:** Customers can add/remove services. Modifications take effect strictly from the next billing cycle [6, 7].
- **Smart Ledger:** Evaluates individual customer billing anchor dates and separates them from bulk B2B partner settlements (which execute on the 1st of every month).
- **Proactive Payments:** Users can manage their unified wallet by clicking **Pay in Advance** or **Renew Subscription** [6, 7].

### 3. Dynamic Order Review & Checkout

- **Real-time Checkout Editing:** During checkout, users can seamlessly add inactive services back or remove them, with the total payable amount recalculating instantly [8].
- **Provisioning Engine:** Post-payment, a progress bar details "Node Deployment" and "Encrypted Handshake Protocols", ultimately generating a Transaction ID and OneVerge ID [4].

### 4. Customer Dashboard & Omnichannel ITSM

- **Self-Care Command Center:** Provides telemetry cards displaying node uptime, path latency, active services, and the current wallet balance [4].
- **Multi-Tier Ticketing:** A sophisticated support center featuring P1-P4 SLA routing, separate ISP/OneVerge support queues, and granular, dynamic relocation fee calculation logic.

## Tech Stack

- **Core:** React 18, Vite, TypeScript.
- **Styling & UI:** Tailwind CSS, Radix UI (Shadcn primitives), and Lucide React icons.
- **Animations:** Framer Motion for glassmorphic card toggles, connectivity webs, and progress bars [2].
- **Routing & Forms:** React Router DOM and React Hook Form.

## Getting Started

To run the OneVerge frontend locally:

**1. Install dependencies:**

```bash
npm install
2. Start the development server:
npm run dev
3. Build for production:
npm run build
```
