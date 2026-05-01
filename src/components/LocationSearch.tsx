import { useState, useEffect } from "react";
import { Search, MapPin, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";

interface LocationData {
  displayName: string;
  areaId: string;
}

interface LocationSearchProps {
  onConfirm: (data: LocationData) => void;
  onBack: () => void;
  currentLocation?: string;
  selectedAreaId?: string | null; // <-- ADD THIS
}

const LocationSearch = ({ onConfirm, onBack, currentLocation, selectedAreaId }: LocationSearchProps) => {
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // FETCH RELATIONAL DATA FROM SUPABASE
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await (supabase as any).from("areas").select(`
            id,
            name,
            districts ( name )
          `);

        if (error) throw error;

        if (data) {
          const formatted = data.map((area: any) => ({
            areaId: area.id,
            displayName: `${area.name}, ${area.districts?.name || "Unknown"}`,
          }));
          setLocations(formatted);
        }
      } catch (err) {
        console.error("Error fetching locations:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const results =
    query.length > 0
      ? locations.filter((loc) => loc.displayName.toLowerCase().includes(query.toLowerCase()))
      : locations;

  return (
    <div className="relative z-[3] max-w-xl mx-auto space-y-6 bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center gap-4 mb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-gray-500 hover:text-white rounded-full hover:bg-white/5"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tighter">Select Your Area</h2>
          <div className="mt-6 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin text-gray-400" />
              </div>
            ) : (
              results.map((loc) => (
                <button
                  key={loc.areaId}
                  onClick={() => onConfirm(loc)}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedAreaId === loc.areaId
                      ? "border-ov-primary bg-ov-primary/10 text-white"
                      : "border-white/10 bg-black/40 text-gray-400 hover:border-white/30"
                  }`}
                >
                  <span>{loc.displayName}</span>

                  {/* Optional: Add a checkmark icon to the highlighted row */}
                  {selectedAreaId === loc.areaId && <CheckCircle2 size={18} className="text-ov-primary" />}
                </button>
              ))
            )}
          </div>
          {/*className="mt-6 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2"*/}
        </div>
        {/* no class attached*/}
      </div>
    </div>
  );
};

export default LocationSearch;
