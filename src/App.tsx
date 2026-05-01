import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Landing from "@/platforms/customer/pages/Landing";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import SupportCenter from "@/platforms/customer/pages/SupportCenter";
import BillingVault from "@/platforms/customer/pages/BillingVault";
import RenewPayment from "./pages/RenewPayment.tsx";
import NotFound from "./pages/NotFound.tsx";
import Logout from "./pages/Logout.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import RenewalSimulator from "./pages/admin/RenewalSimulator.tsx";

// Hardened ProtectedRoute: Zod session validation + TTL check + server-side RPC verify
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";

const queryClient = new QueryClient();

// Simple error boundary — catches render errors so the full app doesn't white-screen
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-4">
          <p className="ov-section-label">Something went wrong</p>
          <button
            className="ov-btn-ghost px-6"
            onClick={() => window.location.assign("/")}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/logout" element={<Logout />} />

            {/* Customer protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/support" element={<SupportCenter />} />
              <Route path="/billing" element={<BillingVault />} />
              <Route path="/renew" element={<RenewPayment />} />
            </Route>

            {/* Admin-only route — RBAC: restricted to admin email (see ProtectedRoute) */}
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route path="/admin/renewal-simulator" element={<RenewalSimulator />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
