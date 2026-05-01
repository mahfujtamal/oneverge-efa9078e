import React from "react";
import { motion } from "framer-motion";
import LocationSearch from "@/components/LocationSearch";
import ISPComparison from "@/components/ISPComparison";

interface StepInfraHubProps {
  mobileView: "location" | "isp";
  location: string;
  areaId: string | null;
  addonTotal: number;
  onLocationConfirm: (data: { displayName: string; areaId: string }) => void;
  onBack: () => void;
  onSelectISP: (isp: any, offer: any) => void;
}

const StepInfraHub = ({
  mobileView,
  location,
  areaId,
  addonTotal,
  onLocationConfirm,
  onBack,
  onSelectISP,
}: StepInfraHubProps) => (
  <motion.div
    key="s3"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row p-4 lg:p-8 gap-6"
  >
    <div
      className={`${mobileView === "isp" ? "hidden lg:flex" : "flex"} flex-1 min-h-[70vh] lg:min-h-0 ov-glass-card overflow-hidden flex-col`}
    >
      <LocationSearch
        onConfirm={onLocationConfirm}
        onBack={onBack}
        selectedAreaId={areaId}
      />
    </div>

    {location && (
      <div
        className={`${mobileView === "location" ? "hidden lg:flex" : "flex"} flex-1 min-h-[70vh] lg:min-h-0 ov-glass-card overflow-hidden flex-col`}
      >
        <ISPComparison
          location={location}
          addonTotal={addonTotal}
          onSelect={(isp, offer) => onSelectISP(isp, offer)}
        />
      </div>
    )}
  </motion.div>
);

export default StepInfraHub;
