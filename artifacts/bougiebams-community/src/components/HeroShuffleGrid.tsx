import * as React from "react";
import { motion } from "framer-motion";
import logoPath from "@assets/bougiebams-logo.png";
import { cn } from "@/lib/utils";

const tiles = [
  {
    id: "logo",
    type: "logo" as const,
  },
  {
    id: "brunch",
    type: "photo" as const,
    label: "Bougie Brunch",
    src: "/mahjong-table.jpeg",
  },
  {
    id: "wine",
    type: "photo" as const,
    label: "Wine Tastings",
    src: "/event-boss-moves.jpeg",
  },
  {
    id: "art",
    type: "photo" as const,
    label: "Arts & Culture",
    src: "/event-rose.jpeg",
  },
  {
    id: "wellness",
    type: "photo" as const,
    label: "Wellness",
    src: "/event-spa.jpeg",
  },
  {
    id: "connect",
    type: "photo" as const,
    label: "Connection",
    src: "/mahjong-tiles.jpeg",
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
        {sorted.map((tile) => (
          <motion.div
            key={tile.id}
            layout
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
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
              <div className="w-full h-full relative">
                <img
                  src={tile.src}
                  alt={tile.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span
                  className="absolute bottom-3 left-0 right-0 text-center text-xs font-medium tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.9)" }}
                >
                  {tile.label}
                </span>
              </div>
            )}
          </motion.div>
        ))}
    </div>
  );
}
