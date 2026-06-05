import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoPath from "@assets/bougiebams-logo.png";
import { cn } from "@/lib/utils";

const photos = [
  { src: "/mahjong-table.jpeg",    label: "Bougie Brunch" },
  { src: "/event-boss-moves.jpeg", label: "Wine Tastings" },
  { src: "/event-rose.jpeg",       label: "Arts & Culture" },
  { src: "/event-spa.jpeg",        label: "Wellness" },
  { src: "/mahjong-tiles.jpeg",    label: "Connection" },
  { src: "/event-test.jpeg",       label: "Gatherings" },
];

const SLOTS = 5;

export function HeroShuffleGrid({ className }: { className?: string }) {
  const [indices, setIndices] = React.useState(
    Array.from({ length: SLOTS }, (_, i) => i % photos.length)
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      const slot = Math.floor(Math.random() * SLOTS);
      setIndices((prev) => {
        const next = [...prev];
        let candidate = (next[slot] + 1) % photos.length;
        while (candidate === next[slot]) candidate = (candidate + 1) % photos.length;
        next[slot] = candidate;
        return next;
      });
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4", className)}>
      <div
        className="aspect-[4/5] relative overflow-hidden rounded-2xl shadow-md flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #f5f0e8 0%, #ede4cf 100%)" }}
      >
        <img
          src={logoPath}
          alt="BougieBams"
          className="w-3/4 h-3/4 object-contain drop-shadow-lg"
        />
      </div>

      {indices.map((photoIdx, slot) => (
        <div
          key={slot}
          className="aspect-[4/5] relative overflow-hidden rounded-2xl shadow-md"
        >
          <AnimatePresence mode="crossfade">
            <motion.img
              key={`${slot}-${photoIdx}`}
              src={photos[photoIdx].src}
              alt={photos[photoIdx].label}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <span className="absolute bottom-3 left-0 right-0 text-center text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.9)" }}>
            {photos[photoIdx].label}
          </span>
        </div>
      ))}
    </div>
  );
}
