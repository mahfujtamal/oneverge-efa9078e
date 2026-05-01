import React from "react";
import { motion } from "framer-motion";
import KYCVerification from "@/components/KYCVerification";
import FeasibilityCheck from "@/components/FeasibilityCheck";

interface StepFeasibilityProps {
  step: number;
  userData: any;
  selectedISP: any;
  onVerified: () => void;
  onResult: (success: boolean) => void;
}

const StepFeasibility = ({ step, userData, selectedISP, onVerified, onResult }: StepFeasibilityProps) => (
  <motion.div key="s5" className="min-h-full ov-flex-center flex-col lg:flex-row gap-8 p-6">
    <KYCVerification userData={userData} onVerified={onVerified} />
    {step === 5.5 && (
      <FeasibilityCheck
        userData={userData}
        ispName={selectedISP?.name}
        onResult={onResult}
      />
    )}
  </motion.div>
);

export default StepFeasibility;
