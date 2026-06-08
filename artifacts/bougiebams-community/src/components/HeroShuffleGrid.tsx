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

  const allTiles = [{ id: "logo", type: "logo" as const }, ...sorted.map(t => ({ ...t, type: "photo" as const }))];

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4", className)}>
      {allTiles.map((tile) => (
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
              <img src={logoPath} alt="BougieBams" className="w-3/4 h-3/4 object-contain drop-shadow-lg" />
            </div>
          ) : (
            <div className="w-full h-full relative">
              <img src={(tile as TileConfig).src} alt={(tile as TileConfig).label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span
                className="absolute bottom-3 left-0 right-0 text-center text-xs font-medium tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.9)" }}
              >
                {(tile as TileConfig).label}
              </span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
