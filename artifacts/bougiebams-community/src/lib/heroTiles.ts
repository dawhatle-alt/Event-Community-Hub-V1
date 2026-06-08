export interface TileConfig {
  id: string;
  label: string;
  src: string;
}

export const LS_KEY = "bb_hero_tiles";
export const TILES_UPDATED_EVENT = "bb-hero-tiles-updated";

export const DEFAULT_TILES: TileConfig[] = [
  { id: "tile1", label: "", src: "/bb-new-1.jpg" },
  { id: "tile2", label: "", src: "/bb-new-2.jpg" },
  { id: "tile3", label: "", src: "/bb-new-3.jpg" },
  { id: "tile4", label: "", src: "/bb-new-4.jpg" },
  { id: "tile5", label: "", src: "/bb-new-5.jpg" },
  { id: "tile6", label: "", src: "/bb-new-6.jpg" },
];

export const AVAILABLE_PHOTOS = [
  { src: "/bb-new-1.jpg", label: "Pink & Ducks" },
  { src: "/bb-new-2.jpg", label: "Dark Floral & Bees" },
  { src: "/bb-new-3.jpg", label: "Flamingos & Tiger" },
  { src: "/bb-new-4.jpg", label: "Dragons" },
  { src: "/bb-new-5.jpg", label: "Dream Mat & Ducks" },
  { src: "/bb-new-6.jpg", label: "Green Floral" },
  { src: "/event-boss-moves.jpeg", label: "Wine & Mahjong Night" },
  { src: "/event-rose.jpeg",       label: "Rose / Seahorse Mat" },
  { src: "/event-spa.jpeg",        label: "Wellness" },
  { src: "/event-book-club.jpeg",  label: "Book Club" },
  { src: "/mahjong-table.jpeg",    label: "Mahjong Table" },
  { src: "/mahjong-tiles.jpeg",    label: "Mahjong Tiles" },
  { src: "/mats-rack-1.jpg",       label: "Mat Rack (1)" },
  { src: "/mats-rack-2.jpg",       label: "Mat Rack (2)" },
  { src: "/tiles-collection.jpg",  label: "Tile Collection" },
];

export function getHeroTiles(): TileConfig[] {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return DEFAULT_TILES;
}

export function saveHeroTiles(tiles: TileConfig[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(tiles));
    window.dispatchEvent(new CustomEvent(TILES_UPDATED_EVENT));
  } catch { /* ignore */ }
}
