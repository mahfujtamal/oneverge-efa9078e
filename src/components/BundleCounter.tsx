import { motion, AnimatePresence } from "framer-motion";

interface BundleCounterProps {
  count: number;
  totalPrice: number;
  savings: number;
}

const BundleCounter = ({ count, totalPrice, savings }: BundleCounterProps) => {
  const originalPrice = savings > 0 ? totalPrice / (1 - savings / 100) : totalPrice;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="fixed bottom-6 right-6 z-50 bg-[#1e293b]/90 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 min-w-[220px]"
        >
          <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1 font-bold">OneVerge Suite Value</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-cyan-400">
              ৳{Math.round(totalPrice).toLocaleString("en-BD")}
            </span>
            <span className="text-sm text-gray-500">/mo</span>
          </div>
          {savings > 0 && (
            <div className="mt-1 text-sm flex items-center gap-2">
              <span className="line-through text-gray-500 text-xs">
                ৳{Math.round(originalPrice).toLocaleString("en-BD")}
              </span>
              <span className="text-emerald-400 font-bold text-[10px] uppercase">Save {savings}%</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-gray-400">{count} services selected</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BundleCounter;
