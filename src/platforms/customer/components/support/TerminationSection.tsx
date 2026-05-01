import React from "react";
import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ALL_SERVICES } from "@/shared/lib/constants";

interface TerminationSectionProps {
  hasPendingTermination: boolean;
  sessionData: any;
  onTerminate: () => void;
}

const TerminationSection = ({ hasPendingTermination, sessionData, onTerminate }: TerminationSectionProps) => {
  if (hasPendingTermination) {
    return (
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
    );
  }

  const activeServiceNames = ALL_SERVICES
    .filter((service) => sessionData?.active_services?.includes(service.id))
    .map((service) => service.name)
    .join(", ") || "None";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mt-6 p-8 border border-red-900/50 bg-red-950/20 rounded-xl"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-red-500/20 rounded-full">
          <ShieldCheck className="text-red-500" size={28} />
        </div>
        <h2 className="text-xl font-semibold text-red-400">Termination Request</h2>
      </div>

      <ul className="list-disc pl-5 space-y-2 text-sm text-red-200/80 mb-8">
        <li>Our Team will connect you within 6 hours</li>
        <li>
          Your service(s) will be permanently suspended once terminated:{" "}
          <span className="font-semibold">{activeServiceNames}</span>.
        </li>
        <li>Any pending wallet balances or relocation fees must be settled.</li>
        <li>You will not receive any refund for the current month's subscription.</li>
      </ul>

      <Button
        onClick={onTerminate}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"
      >
        Termination Request
      </Button>
    </motion.div>
  );
};

export default TerminationSection;
