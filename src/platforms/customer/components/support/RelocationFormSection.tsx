import React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, ShieldCheck } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface RelocationFormSectionProps {
  districts: any[];
  areas: any[];
  targetDistrictId: string;
  setTargetDistrictId: (id: string) => void;
  targetAreaName: string;
  setTargetAreaName: (name: string) => void;
  detailAddress: string;
  setDetailAddress: (addr: string) => void;
  relocationDate: Date | undefined;
  setRelocationDate: (date: Date | undefined) => void;
  calculatedFee: { base: number; vat: number; tax: number; surcharge: number; total: number } | null;
  relocationSuccessMsg: string | null;
  relocationRequests: any[];
  onCalculateFee: () => void;
  onSubmit: () => void;
  onCancelRelocation: (requestId: string, transactionId: string) => void;
}

const RelocationFormSection = ({
  districts,
  areas,
  targetDistrictId,
  setTargetDistrictId,
  targetAreaName,
  setTargetAreaName,
  detailAddress,
  setDetailAddress,
  relocationDate,
  setRelocationDate,
  calculatedFee,
  relocationSuccessMsg,
  relocationRequests,
  onCalculateFee,
  onSubmit,
  onCancelRelocation,
}: RelocationFormSectionProps) => (
  <>
    <div className="p-6 border border-white/10 bg-white/5 rounded-xl space-y-6">
      <AnimatePresence>
        {relocationSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border border-green-500/30 bg-green-500/10 rounded-xl flex items-start gap-3">
              <ShieldCheck className="text-green-400 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-green-400 font-medium">Success</p>
                <p className="text-sm text-green-300/80 mt-1 whitespace-pre-line">{relocationSuccessMsg}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <MapPin size={24} className="text-purple-400" />
        <div>
          <h2 className="text-xl font-bold text-white">Relocation Services</h2>
          <p className="text-sm text-gray-400">Move your active connections to a new address seamlessly.</p>
        </div>
      </div>

      <form className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Target District</label>
            <select
              required
              className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all"
              value={targetDistrictId}
              onChange={(e) => {
                setTargetDistrictId(e.target.value);
                setTargetAreaName("");
                onCalculateFee && (() => {})(); // reset fee on district change handled by parent
              }}
            >
              <option value="" disabled>Select District...</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Target Area</label>
            <select
              required
              className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all"
              value={targetAreaName}
              onChange={(e) => setTargetAreaName(e.target.value)}
              disabled={!targetDistrictId || areas.length === 0}
            >
              <option value="" disabled>
                {!targetDistrictId ? "Select District First..." : "Select Area..."}
              </option>
              {areas.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">Detailed New Address</label>
          <input
            required
            type="text"
            maxLength={255}
            placeholder="House / Road / Apartment details..."
            className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all"
            value={detailAddress}
            onChange={(e) => setDetailAddress(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">Preferred Relocation Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal border-gray-800 bg-gray-900/50 text-white hover:bg-gray-800",
                  !relocationDate && "text-gray-400",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {relocationDate ? format(relocationDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-950 border-gray-800 text-white">
              <Calendar
                mode="single"
                selected={relocationDate}
                onSelect={setRelocationDate}
                initialFocus
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {targetAreaName && (
          <div className="mt-6 p-4 rounded-lg bg-purple-400/10 border border-purple-400/20">
            {calculatedFee ? (
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-300">Estimated Relocation Fee</p>
                  <p className="text-2xl font-bold text-white">৳{calculatedFee.total}</p>
                </div>
                <Button
                  type="button"
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                  onClick={onSubmit}
                >
                  Request Confirmation
                </Button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-300">
                  Target area selected. Calculate routing fees to continue.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="border-purple-400/50 text-purple-400 hover:bg-purple-400/10"
                  onClick={onCalculateFee}
                >
                  Calculate Fees
                </Button>
              </div>
            )}
          </div>
        )}
      </form>
    </div>

    {relocationRequests.length > 0 && (
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-semibold text-gray-300 border-b border-white/10 pb-2">
          Your Relocation Requests
        </h3>
        <div className="grid gap-4">
          {relocationRequests.map((req) => (
            <div
              key={req.id}
              className="p-4 border border-white/10 rounded-lg bg-black/50 flex justify-between items-center transition-colors hover:bg-white/5"
            >
              <div>
                <p className="font-medium text-white flex items-center gap-2">
                  <MapPin size={14} className="text-purple-400" />
                  Moving to: {req.target_area}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Scheduled: {new Date(req.relocation_date).toLocaleDateString()} | Status:{" "}
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                      req.status === "pending"
                        ? "bg-amber-400/10 text-amber-400"
                        : req.status === "cancelled"
                          ? "bg-red-400/10 text-red-400"
                          : "bg-green-400/10 text-green-400"
                    }`}
                  >
                    {req.status.toUpperCase()}
                  </span>
                </p>
              </div>
              {req.status === "pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancelRelocation(req.id, req.transaction_id)}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  Cancel Request
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </>
);

export default RelocationFormSection;
