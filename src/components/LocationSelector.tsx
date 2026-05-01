import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft } from "lucide-react";

const LOCATIONS: Record<string, string[]> = {
  Dhaka: ["Dhanmondi", "Gulshan", "Banani", "Uttara", "Mirpur"],
  Chittagong: ["Agrabad", "Nasirabad", "GEC Circle"],
  Sylhet: ["Zindabazar", "Ambarkhana"],
  Rajshahi: ["Shaheb Bazar", "Motihar"],
};

interface LocationSelectorProps {
  onBack: () => void;
  onConfirm: (data: { district: string; area: string }) => void;
}

const LocationSelector = ({ onBack, onConfirm }: LocationSelectorProps) => {
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold">Select Your Location</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-2 block">District</label>
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(LOCATIONS).map((d) => (
              <button
                key={d}
                onClick={() => { setDistrict(d); setArea(""); }}
                className={`glass rounded-xl p-3 text-sm font-medium border transition-all ${
                  district === d ? "border-cyan-400/50 text-cyan-400" : "border-white/10 text-gray-300 hover:border-white/20"
                }`}
              >
                <MapPin size={14} className="inline mr-1.5" />{d}
              </button>
            ))}
          </div>
        </div>

        {district && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <label className="text-sm text-gray-400 mb-2 block">Area</label>
            <div className="grid grid-cols-2 gap-3">
              {LOCATIONS[district].map((a) => (
                <button
                  key={a}
                  onClick={() => setArea(a)}
                  className={`glass rounded-xl p-3 text-sm font-medium border transition-all ${
                    area === a ? "border-cyan-400/50 text-cyan-400" : "border-white/10 text-gray-300 hover:border-white/20"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {district && area && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-4">
          <Button
            onClick={() => onConfirm({ district, area })}
            className="bg-cyan-500 hover:bg-cyan-400 text-black px-10 h-12 rounded-2xl font-bold"
          >
            Compare ISPs
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default LocationSelector;
