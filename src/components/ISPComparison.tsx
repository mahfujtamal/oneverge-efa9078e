import React, { useMemo, useState, useEffect } from "react";
import { Zap, ChevronRight, Search, ChevronDown, ChevronUp, Loader2, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { INFRA_LABELS, PRICING_CONFIG } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

interface ISPComparisonProps {
  location: string;
  addonTotal?: number;
  onSelect: (isp: any, offer: any) => void;
}

const ISPComparison = ({ location, addonTotal = 0, onSelect }: ISPComparisonProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIsp, setExpandedIsp] = useState<string | null>(null);
  const [dbIsps, setDbIsps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Maps isp_id → installation fee total
  const [installFees, setInstallFees] = useState<Record<string, number>>({});

  const fetchInstallFee = async (ispId: string) => {
    if (installFees[ispId] !== undefined) return;
    try {
      const { data } = await (supabase as any).rpc("calculate_detailed_installation_fee", {
        p_isp_id: ispId,
      });
      if (data) {
        setInstallFees((prev) => ({ ...prev, [ispId]: Number(data.total_fee) || 0 }));
      }
    } catch {
      setInstallFees((prev) => ({ ...prev, [ispId]: 0 }));
    }
  };

  // Dynamic Relational Fetch: Resolves Area -> ISPs -> Specific ISP-Tagged Plans
  useEffect(() => {
    const fetchIspsAndPlans = async () => {
      setIsLoading(true);
      try {
        const [areaName] = location.split(", ");
        if (!areaName) throw new Error("Area name could not be parsed.");

        // 1. Get the Area ID
        const { data: areaData, error: areaError } = await (supabase as any)
          .from("areas")
          .select("id")
          .eq("name", areaName)
          .single();

        if (areaError || !areaData) throw new Error("Area not found in database.");

        // 2. Fetch the Junction Table (Includes ISP info + Plan info via Foreign Keys)
        const { data: coverageData, error: coverageError } = await (supabase as any)
          .from("isp_area_plans")
          .select(
            `
            isp_id,
            isps ( id, name, tier ),
            broadband_plans ( id, name, speed, price )
          `,
          )
          .eq("area_id", areaData.id);

        if (coverageError) throw coverageError;

        // 3. Group the flat relational data by ISP so the UI can map it natively
        const groupedISPs = (coverageData || []).reduce((acc: any[], row: any) => {
          const isp = row.isps;
          const plan = row.broadband_plans;

          if (!isp || !plan) return acc; // Skip broken relations

          // Check if we already added this ISP to our grouped array
          let existingISP = acc.find((i) => i.id === isp.id);

          if (!existingISP) {
            existingISP = { ...isp, offers: [] };
            acc.push(existingISP);
          }

          // Add this specific plan to the ISP's offerings
          existingISP.offers.push(plan);

          return acc;
        }, []);

        // Sort offers by price from lowest to highest for a cleaner UX
        groupedISPs.forEach((isp: any) => {
          isp.offers.sort((a: any, b: any) => a.price - b.price);
        });

        setDbIsps(groupedISPs);
      } catch (err) {
        console.error("Error fetching local area ISPs:", err);
        setDbIsps([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (location) fetchIspsAndPlans();
  }, [location]);

  const filteredResults = useMemo(() => {
    return dbIsps.filter((isp) => isp.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [dbIsps, searchTerm]);

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
      {/* SEARCH BAR */}
      <div className="p-4 border-b border-white/5 bg-white/[0.02] space-y-3">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500 mb-1">
              {INFRA_LABELS.AVAILABLE_IN}
            </p>
            <h3 className="text-xs font-bold text-cyan-400 uppercase italic">{location}</h3>
          </div>
        </div>

        <div className="relative group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-400 transition-colors"
            size={14}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Partner Name..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-[10px] font-bold uppercase outline-none focus:border-cyan-400/50 transition-all"
          />
        </div>
      </div>

      {/* ISP LISTING */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 opacity-50">
            <Loader2 size={28} className="text-cyan-400 animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Syncing Local Plans...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-10 opacity-40">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              No Partners Found in this Area
            </p>
          </div>
        ) : (
          filteredResults.map((isp) => {
            const isExpanded = expandedIsp === isp.id;
            const allOffers = isp.offers || []; // Uses the dynamically grouped plans

            return (
              <div
                key={isp.id}
                className={`rounded-[2rem] border transition-all duration-300 overflow-hidden ${
                  isExpanded
                    ? "bg-white/[0.07] border-cyan-400/30 shadow-2xl"
                    : "bg-white/[0.03] border-white/10 hover:border-white/20"
                }`}
              >
                {/* ISP HEADER */}
                <button
                  onClick={() => {
                    const next = isExpanded ? null : isp.id;
                    setExpandedIsp(next);
                    if (next) fetchInstallFee(isp.id);
                  }}
                  className="w-full p-5 flex justify-between items-center group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-cyan-400/30 transition-all">
                      <Zap size={18} className={isExpanded ? "text-cyan-400" : "text-gray-500"} />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-black uppercase italic text-white tracking-tighter">{isp.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest bg-yellow-500/10 px-2 py-0.5 rounded">
                          {isp.tier}
                        </span>
                        <span className="text-[7px] font-black text-cyan-400/40 uppercase tracking-widest">
                          Local Node
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest">
                      {allOffers.length} Plans
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-cyan-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-600" />
                    )}
                  </div>
                </button>

                {/* EXPANDABLE OFFERS LIST */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 space-y-2"
                    >
                      {allOffers.map((offer: any, idx: number) => {
                        const installFee = installFees[isp.id] ?? null;
                        const monthlyTotal = offer.price + addonTotal;
                        return (
                          <Tooltip key={idx}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => onSelect(isp, offer)}
                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-400/50 hover:bg-black/60 transition-all group/offer"
                              >
                                <div className="text-left">
                                  <p className="text-xl font-black italic text-white leading-none tracking-tighter group-hover/offer:text-cyan-400 transition-colors">
                                    {offer.speed}
                                  </p>
                                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">
                                    {offer.name}
                                  </p>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-black text-white">
                                      {PRICING_CONFIG.CURRENCY} {offer.price.toLocaleString()}
                                    </p>
                                    <p className="text-[7px] font-black text-gray-600 uppercase">Monthly</p>
                                  </div>
                                  <Info size={13} className="text-gray-600 group-hover/offer:text-cyan-400 transition-colors" />
                                  <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover/offer:bg-cyan-400 group-hover/offer:text-black transition-all">
                                    <ChevronRight size={14} strokeWidth={3} />
                                  </div>
                                </div>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="left"
                              className="bg-gray-950 border border-white/10 p-3 rounded-xl shadow-2xl min-w-[180px]"
                            >
                              <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                Cost Summary
                              </p>
                              <div className="space-y-1.5">
                                <div className="flex justify-between gap-6">
                                  <span className="text-[9px] text-gray-400 uppercase font-bold">Broadband</span>
                                  <span className="text-[9px] font-mono font-black text-white">
                                    {PRICING_CONFIG.CURRENCY}{offer.price.toLocaleString()}
                                  </span>
                                </div>
                                {addonTotal > 0 && (
                                  <div className="flex justify-between gap-6">
                                    <span className="text-[9px] text-gray-400 uppercase font-bold">Add-ons</span>
                                    <span className="text-[9px] font-mono font-black text-white">
                                      {PRICING_CONFIG.CURRENCY}{addonTotal.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between gap-6">
                                  <span className="text-[9px] text-gray-400 uppercase font-bold">Installation</span>
                                  <span className="text-[9px] font-mono font-black text-white">
                                    {installFee === null ? "..." : `${PRICING_CONFIG.CURRENCY}${installFee.toLocaleString()}`}
                                  </span>
                                </div>
                                <div className="border-t border-white/10 pt-1.5 flex justify-between gap-6">
                                  <span className="text-[9px] text-cyan-400 uppercase font-black">Monthly</span>
                                  <span className="text-[9px] font-mono font-black text-cyan-400">
                                    {PRICING_CONFIG.CURRENCY}{monthlyTotal.toLocaleString()}
                                  </span>
                                </div>
                                {installFee !== null && installFee > 0 && (
                                  <p className="text-[7px] text-gray-600 uppercase tracking-wider pt-0.5">
                                    + {PRICING_CONFIG.CURRENCY}{installFee.toLocaleString()} one-time install
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ISPComparison;
