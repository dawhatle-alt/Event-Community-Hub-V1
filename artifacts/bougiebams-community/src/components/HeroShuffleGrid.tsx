import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoPath from "@assets/bougiebams-logo.png";
import { cn } from "@/lib/utils";

const tiles = [
  {
    id: "logo",
    type: "logo",
  },
  {
    id: "brunch",
    type: "gradient",
    label: "Bougie Brunch",
    bg: "linear-gradient(135deg, #8B6914 0%, #C49A2A 50%, #F0D060 100%)",
    icon: "🥂",
  },
  {
    id: "wine",
    type: "gradient",
    label: "Wine Tastings",
    bg: "linear-gradient(135deg, #1a1f3a 0%, #2d3561 50%, #4a5490 100%)",
    icon: "🍷",
  },
  {
    id: "art",
    type: "gradient",
    label: "Arts & Culture",
    bg: "linear-gradient(135deg, #6B4226 0%, #A0642A 50%, #C49A6C 100%)",
    icon: "🎨",
  },
  {
    id: "wellness",
    type: "gradient",
    label: "Wellness",
    bg: "linear-gradient(135deg, #2C4A3E 0%, #3D6B5A 50%, #5E9E85 100%)",
    icon: "✨",
  },
  {
    id: "connect",
    type: "gradient",
    label: "Connection",
    bg: "linear-gradient(135deg, #4a1a2a 0%, #7a2d45 50%, #B05070 100%)",
    icon: "💫",
  },
];

export function HeroShuffleGrid({ className }: { className?: string }) {
  const [order, setOrder] = React.useState(tiles.map((_, i) => i));

  React.useEffect(() => {
    const interval = setInterval(() => {
      setOrder((prev) => {
        const next = [...prev];
        const i1 = Math.floor(Math.random() * next.length);
        let i2 = Math.floor(Math.random() * next.length);
        while (i2 === i1) i2 = Math.floor(Math.random() * next.length);
        [next[i1], next[i2]] = [next[i2], next[i1]];
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const sorted = order.map((i) => tiles[i]);

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4", className)}>
      <AnimatePresence mode="popLayout">
        {sorted.map((tile) => (
          <motion.div
            key={tile.id}
            layout
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            className="aspect-[4/5] relative overflow-hidden rounded-2xl shadow-md"
          >
            {tile.type === "logo" ? (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f5f0e8 0%, #ede4cf 100%)" }}
              >
                <img
                  src={logoPath}
                  alt="BougieBams"
                  className="w-3/4 h-3/4 object-contain drop-shadow-lg"
                />
              </div>
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-3"
                style={{ background: tile.bg }}
              >
                <span className="text-5xl drop-shadow-sm">{tile.icon}</span>
                <span
                  className="text-sm font-medium tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {tile.label}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
