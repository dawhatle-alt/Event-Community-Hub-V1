import * as React from "react";
import { motion } from "framer-motion";
import logoPath from "@assets/Bougie_Bams_NEW_logo_-_white_1780941860680.png";
import { cn } from "@/lib/utils";
import { getHeroTiles, TILES_UPDATED_EVENT, type TileConfig } from "@/lib/heroTiles";

export function HeroShuffleGrid({ className }: { className?: string }) {
  const [tiles, setTiles] = React.useState<TileConfig[]>(getHeroTiles);
  const [order, setOrder] = React.useState(() => tiles.map((_, i) => i));

  React.useEffect(() => {
    const handler = () => {
      const updated = getHeroTiles();
      setTiles(updated);
      setOrder(updated.map((_, i) => i));
    };
    window.addEventListener(TILES_UPDATED_EVENT, handler);
    return () => window.removeEventListener(TILES_UPDATED_EVENT, handler);
  }, []);

  React.useEffect(() => {
    setOrder(tiles.map((_, i) => i));
  }, [tiles]);

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
          <img src={tile.src} alt={tile.label} className="w-full h-full object-cover" />
        </motion.div>
      ))}
    </div>
  );
}
