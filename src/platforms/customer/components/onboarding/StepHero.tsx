import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_SERVICES, BRANDING_CONFIG, PAGE_TITLES } from "@/shared/lib/constants";

interface StepHeroProps {
  onNext: () => void;
}

const StepHero = ({ onNext }: StepHeroProps) => (
  <motion.div
    key="s1"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="ov-flex-center min-h-[calc(100vh-64px)] px-6 py-12"
  >
    <div className="text-center mb-12 max-w-4xl">
      <h2 className="ov-h1 text-3xl md:!text-5xl leading-[1.1] mb-6 tracking-tightest uppercase whitespace-nowrap font-mono font-normal">
        {BRANDING_CONFIG.HERO_TITLE}
      </h2>
      <p className="ov-section-label !text-gray-400 normal-case tracking-widest opacity-60 italic">
        {BRANDING_CONFIG.HERO_SUBTITLE}
      </p>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 w-full max-w-6xl mb-16 px-4">
      {ALL_SERVICES.map((s) => (
        <div
          key={s.id}
          className="ov-glass-card p-4 flex flex-col items-center justify-center text-center group border-white/5"
        >
          <div className={`${s.color} mb-3 group-hover:scale-110 transition-transform`}>
            <s.icon size={22} />
          </div>
          <h3 className="text-[8px] font-black uppercase tracking-widest text-white/70 leading-none">
            {s.name}
          </h3>
        </div>
      ))}
    </div>

    <Button
      onClick={onNext}
      className="ov-btn-primary !h-16 !px-14 !rounded-2xl shadow-ov-primary/20"
    >
      {PAGE_TITLES.ORCHESTRATE} <ChevronRight size={20} className="ml-2" />
    </Button>
  </motion.div>
);

export default StepHero;
