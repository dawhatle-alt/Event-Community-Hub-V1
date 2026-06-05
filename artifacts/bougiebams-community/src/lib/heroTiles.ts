export interface TileConfig {
  id: string;
  label: string;
  src: string;
}

export const LS_KEY = "bb_hero_tiles";
export const TILES_UPDATED_EVENT = "bb-hero-tiles-updated";

export const DEFAULT_TILES: TileConfig[] = [
  { id: "brunch",   label: "Bougie Brunch",  src: "/mahjong-table.jpeg" },
  { id: "wine",     label: "Wine Tastings",  src: "/event-boss-moves.jpeg" },
  { id: "art",      label: "Arts & Culture", src: "/event-rose.jpeg" },
  { id: "wellness", label: "Wellness",       src: "/event-spa.jpeg" },
  { id: "connect",  label: "Connection",     src: "/mahjong-tiles.jpeg" },
];

export const AVAILABLE_PHOTOS = [
  { src: "/event-boss-moves.jpeg", label: "Wine & Mahjong Night" },
  { src: "/event-rose.jpeg",       label: "Rose / Seahorse Mat" },
  { src: "/event-spa.jpeg",        label: "Wellness" },
  { src: "/event-book-club.jpeg",  label: "Book Club" },
  { src: "/event-test.jpeg",       label: "Gatherings" },
  { src: "/events-banner.jpeg",    label: "Events Banner" },
  { src: "/mahjong-table.jpeg",    label: "Mahjong Table" },
  { src: "/mahjong-tiles.jpeg",    label: "Mahjong Tiles" },
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
