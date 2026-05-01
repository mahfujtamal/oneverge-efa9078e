import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivationModalProps {
  open: boolean;
  onClose: () => void;
  selectedServices: any[];
  savings: number;
  totalBDT: number;
}

const ActivationModal = ({ open, onClose, selectedServices, savings, totalBDT }: ActivationModalProps) => {
  const rawTotal = selectedServices.reduce((s, svc) => s + svc.price, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div className="relative z-10 w-full max-w-md bg-[#0f172a] rounded-2xl p-8 border border-white/10 shadow-2xl">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Activate Your Suite</h2>
            <div className="space-y-2 mb-6 bg-black/20 p-4 rounded-xl">
              {selectedServices.map((svc) => (
                <div key={svc.name} className="flex justify-between text-sm text-gray-400">
                  <span>{svc.name}</span>
                  <span>৳{svc.price.toLocaleString("en-BD")}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-2 mt-3 flex justify-between font-bold text-white">
                <span>Total</span>
                <span className="text-cyan-400">৳{totalBDT.toLocaleString("en-BD")}/mo</span>
              </div>
            </div>
            <div className="space-y-3">
              <Button className="w-full bg-white text-black hover:bg-gray-200">Continue with Google</Button>
              <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                Continue with Email
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActivationModal;
