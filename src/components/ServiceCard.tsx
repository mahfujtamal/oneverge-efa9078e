import React from "react";
import { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  id: string;
  name: string;
  description?: string;
  icon: LucideIcon;
  active: boolean;
  onToggle: (id: string) => void;
  isMandatory?: boolean;
  color?: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  id,
  name,
  description,
  icon: Icon,
  active,
  onToggle,
  isMandatory,
  color = "text-cyan-400",
}) => {
  return (
    <div
      onClick={() => !isMandatory && onToggle(id)}
      className={`relative p-5 rounded-3xl border transition-all cursor-pointer group ${
        active ? "bg-white/10 border-white/20 shadow-xl" : "bg-white/[0.02] border-white/5 opacity-60"
      }`}
    >
      <div className={`mb-4 transition-transform group-hover:scale-110 ${active ? color : "text-gray-500"}`}>
        <Icon size={32} />
      </div>
      <h3 className="text-xs font-black uppercase tracking-widest text-white mb-1">{name}</h3>
      <p className="text-[9px] text-gray-500 uppercase font-medium leading-tight">{description}</p>
      {isMandatory && (
        <span className="absolute top-4 right-4 text-[7px] font-black bg-cyan-400 text-black px-1.5 py-0.5 rounded uppercase">
          Required
        </span>
      )}
    </div>
  );
};

export default ServiceCard;
