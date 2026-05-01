import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";

interface Position {
  x: number;
  y: number;
}

interface ConnectivityMapProps {
  activeIndices: number[];
  cardRefs: (HTMLDivElement | null)[];
  containerRef: HTMLDivElement | null;
}

const ConnectivityMap = ({ activeIndices, cardRefs, containerRef }: ConnectivityMapProps) => {
  const [positions, setPositions] = useState<Position[]>([]);

  const updatePositions = useCallback(() => {
    if (!containerRef) return;
    const containerRect = containerRef.getBoundingClientRect();
    const newPositions = cardRefs.map((ref) => {
      if (!ref) return { x: 0, y: 0 };
      const rect = ref.getBoundingClientRect();
      return {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      };
    });
    setPositions(newPositions);
  }, [cardRefs, containerRef]);

  useEffect(() => {
    updatePositions();
    window.addEventListener("resize", updatePositions);
    const t = setTimeout(updatePositions, 100);
    return () => {
      window.removeEventListener("resize", updatePositions);
      clearTimeout(t);
    };
  }, [updatePositions, activeIndices]);

  if (activeIndices.length < 2 || positions.length === 0) return null;

  const lines: { from: Position; to: Position; key: string }[] = [];
  for (let i = 0; i < activeIndices.length; i++) {
    for (let j = i + 1; j < activeIndices.length; j++) {
      const a = activeIndices[i];
      const b = activeIndices[j];
      if (positions[a] && positions[b]) {
        lines.push({ from: positions[a], to: positions[b], key: `${a}-${b}` });
      }
    }
  }

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(187 96% 42% / 0.6)" />
          <stop offset="100%" stopColor="hsl(187 96% 42% / 0.2)" />
        </linearGradient>
      </defs>
      <AnimatePresence>
        {lines.map(({ from, to, key }) => (
          <motion.line
            key={key}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="url(#lineGradient)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 1, pathLength: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          />
        ))}
      </AnimatePresence>
    </svg>
  );
};

export default ConnectivityMap;
