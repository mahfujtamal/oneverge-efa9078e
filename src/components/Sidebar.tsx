import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, CreditCard, LifeBuoy, LogOut, Zap } from "lucide-react";
import { DASHBOARD_LABELS, BRANDING_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  sessionData: any;
}

const Sidebar = ({ sessionData }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { label: DASHBOARD_LABELS.NAV.HOME, path: "/dashboard", icon: LayoutDashboard },
    { label: DASHBOARD_LABELS.NAV.BILLING, path: "/billing", icon: CreditCard },
    { label: DASHBOARD_LABELS.NAV.SUPPORT, path: "/support", icon: LifeBuoy },
  ];

  /**
   * ATOMIC PURGE PROTOCOL
   * Ensures all local telemetry is wiped before hard-redirecting to Landing.
   */
  const handleTerminateSession = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login", { replace: true, state: { forceReset: true } }); // Changed to /login
  };

  return (
    <>
      {/* DESKTOP SIDEBAR: Visible on lg screens and up */}
      <aside className="hidden lg:flex w-72 h-screen flex-col border-r border-white/5 bg-background relative z-50">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ov-primary flex items-center justify-center text-black shadow-lg shadow-ov-primary/20">
              <Zap size={22} fill="currentColor" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-black italic tracking-tighter leading-none text-white uppercase">
                {BRANDING_CONFIG.PLATFORM_NAME}
              </h1>
              <span className="ov-section-label block mt-1 text-[8px] opacity-50 uppercase tracking-[0.2em]">
                Operations Node
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 text-left">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path, { state: sessionData })}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                  isActive
                    ? "bg-ov-primary text-black font-black shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon
                  size={20}
                  className={isActive ? "text-black" : "group-hover:text-ov-primary transition-colors"}
                />
                <span className="font-bold tracking-tight uppercase text-[11px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <Button
            variant="outline"
            onClick={() => navigate("/logout")}
            className="border-red-500/50 text-red-400 bg-red-950/20 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            Log Out
          </Button>

          <div className="mt-6 flex items-center justify-center gap-2 opacity-20">
            <div className="w-1 h-1 rounded-full bg-ov-primary animate-pulse" />
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white">Secure Node Locked</span>
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION: Visible on all screens below lg */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-xl border-t border-white/10 px-6 flex items-center justify-between z-[100]">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path, { state: sessionData })}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                isActive ? "text-ov-primary scale-110" : "text-gray-500"
              }`}
            >
              <item.icon size={22} strokeWidth={isActive ? 3 : 2} />
              <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          );
        })}

        {/* Mobile Terminate Toggle */}
        <Button
          variant="outline"
          onClick={() => navigate("/logout")}
          className="border-red-500/50 text-red-400 bg-red-950/20 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          Log Out
        </Button>
      </nav>
    </>
  );
};

export default Sidebar;
