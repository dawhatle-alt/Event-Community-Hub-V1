import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GOLD = "#C9A227";
const NAVY = "#181D37";
const CREAM = "#FAF8F5";
const DARK = "#0D1020";
const MID_NAVY = "#252D55";
const WARM_GOLD = "#8B6914";
const LIGHT_GOLD = "#F0D060";

/* ─────────────────────────────────────────────
   Smooth background: pure-CSS keyframe shift on
   a stretched gradient — zero state, zero gaps.
───────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap');

  @keyframes gradientCycle {
    0%   { background-position: 0% 50%; }
    25%  { background-position: 50% 0%; }
    50%  { background-position: 100% 50%; }
    75%  { background-position: 50% 100%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes shimmer {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.35; transform: scale(1); }
    50%       { opacity: 0.65; transform: scale(1.12); }
  }

  .gradient-bg {
    background: linear-gradient(
      -45deg,
      ${DARK},
      ${NAVY},
      ${MID_NAVY},
      ${WARM_GOLD},
      ${NAVY},
      #1a2850,
      ${MID_NAVY},
      ${WARM_GOLD},
      ${NAVY},
      ${DARK}
    );
    background-size: 600% 600%;
    animation: gradientCycle 18s ease infinite;
  }

  .shimmer-btn {
    background: linear-gradient(90deg, ${GOLD}, ${LIGHT_GOLD}, ${WARM_GOLD}, ${GOLD});
    background-size: 300% 100%;
    animation: shimmer 3s linear infinite;
  }
`;

/* Slowly drifting radial orbs for depth */
function FloatingOrb({
  color, size, x, y, dx, dy, duration, delay,
}: {
  color: string; size: number;
  x: string; y: string;
  dx: number; dy: number;
  duration: number; delay: number;
}) {
  return (
    <motion.div
      style={{
        position: "absolute",
        left: x, top: y,
        width: size, height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: `blur(${size * 0.35}px)`,
        pointerEvents: "none",
      }}
      animate={{
        x: [0, dx, 0, -dx * 0.6, 0],
        y: [0, dy * 0.5, dy, dy * 0.3, 0],
        opacity: [0.45, 0.7, 0.45, 0.65, 0.45],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

/* ─────────────────────────────────────────────
   Inline shuffle grid (no external imports)
───────────────────────────────────────────── */
const tiles = [
  { id: "logo",     type: "logo" },
  { id: "brunch",   type: "gradient", label: "Bougie Brunch",  bg: "linear-gradient(135deg,#8B6914 0%,#C49A2A 50%,#F0D060 100%)", icon: "🥂" },
  { id: "wine",     type: "gradient", label: "Wine Tastings",  bg: "linear-gradient(135deg,#1a1f3a 0%,#2d3561 50%,#4a5490 100%)", icon: "🍷" },
  { id: "art",      type: "gradient", label: "Arts & Culture", bg: "linear-gradient(135deg,#6B4226 0%,#A0642A 50%,#C49A6C 100%)", icon: "🎨" },
  { id: "wellness", type: "gradient", label: "Wellness",       bg: "linear-gradient(135deg,#2C4A3E 0%,#3D6B5A 50%,#5E9E85 100%)", icon: "✨" },
  { id: "connect",  type: "gradient", label: "Connection",     bg: "linear-gradient(135deg,#4a1a2a 0%,#7a2d45 50%,#B05070 100%)", icon: "💫" },
];

function HeroShuffleGrid() {
  const [order, setOrder] = useState(tiles.map((_, i) => i));

  useEffect(() => {
    const id = setInterval(() => {
      setOrder((prev) => {
        const next = [...prev];
        const i1 = Math.floor(Math.random() * next.length);
        let i2 = Math.floor(Math.random() * next.length);
        while (i2 === i1) i2 = Math.floor(Math.random() * next.length);
        [next[i1], next[i2]] = [next[i2], next[i1]];
        return next;
      });
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const sorted = order.map((i) => tiles[i]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      <AnimatePresence mode="popLayout">
        {sorted.map((tile) => (
          <motion.div
            key={tile.id}
            layout
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            style={{ aspectRatio: "4/5", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
          >
            {tile.type === "logo" ? (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f5f0e8 0%,#ede4cf 100%)" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: NAVY }}>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.6rem", fontWeight: 600, letterSpacing: "0.05em" }}>BB</span>
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.42rem", letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.6 }}>BougieBams</span>
                </div>
              </div>
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: (tile as any).bg }}>
                <span style={{ fontSize: "2.4rem" }}>{(tile as any).icon}</span>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.62rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)" }}>{(tile as any).label}</span>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main export
───────────────────────────────────────────── */
export function GradientHero() {
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", minHeight: "100vh", backgroundColor: DARK, display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>

      {/* Nav */}
      <div style={{ position: "relative", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", borderBottom: `1px solid ${GOLD}22` }}>
        <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.4rem", fontWeight: 600, color: CREAM, letterSpacing: "0.04em" }}>BougieBams</span>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {["Events", "About", "Contact"].map((item) => (
            <span key={item} style={{ fontSize: "0.82rem", color: `${CREAM}88`, letterSpacing: "0.06em", cursor: "pointer" }}>{item}</span>
          ))}
          <div style={{ fontSize: "0.8rem", background: GOLD, color: NAVY, borderRadius: 8, padding: "6px 18px", fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer" }}>Book Now</div>
        </div>
      </div>

      {/* Hero */}
      <section style={{ position: "relative", flex: 1, overflow: "hidden" }}>

        {/* Smooth CSS-animated gradient base */}
        <div className="gradient-bg" style={{ position: "absolute", inset: 0 }} />

        {/* Floating radial orbs for depth */}
        <FloatingOrb color={`${GOLD}55`}   size={520} x="55%"  y="-15%" dx={80}  dy={60}  duration={20} delay={0}   />
        <FloatingOrb color={`${MID_NAVY}cc`} size={600} x="-8%"  y="30%"  dx={60}  dy={80}  duration={25} delay={3}   />
        <FloatingOrb color={`${GOLD}33`}   size={400} x="10%"  y="60%"  dx={-50} dy={-40} duration={18} delay={6}   />
        <FloatingOrb color={`${WARM_GOLD}44`} size={360} x="70%"  y="55%"  dx={-60} dy={50}  duration={22} delay={9}   />

        {/* Vignette */}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 100% 80% at 50% 50%, transparent 30%, ${DARK}88 100%)`, pointerEvents: "none" }} />

        {/* Content grid */}
        <div style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "72px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>

          {/* Left — text */}
          <motion.div
            style={{ display: "flex", flexDirection: "column", gap: 28 }}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 99, border: `1px solid ${GOLD}44`, padding: "6px 16px", width: "fit-content", backgroundColor: `${GOLD}11`, backdropFilter: "blur(8px)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: GOLD, flexShrink: 0 }} />
              <span style={{ fontSize: "0.76rem", color: `${CREAM}bb`, letterSpacing: "0.06em" }}>Premium mahjong experiences for everyone</span>
            </div>

            {/* Heading */}
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(3rem,5vw,5.2rem)", fontWeight: 500, lineHeight: 1.08, color: CREAM, margin: 0, letterSpacing: "-0.01em" }}>
              You're invited to<br />
              <em style={{ color: GOLD, fontStyle: "italic" }}>something special</em>.
            </h1>

            {/* Body */}
            <p style={{ fontSize: "1rem", color: `${CREAM}88`, lineHeight: 1.75, maxWidth: "30rem", fontWeight: 300, margin: 0 }}>
              BougieBams brings people together around beautifully curated mahjong tables — intimate gatherings, premium setups, and connections that feel rich, polished, and entirely your own.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div className="shimmer-btn" style={{ borderRadius: 13, padding: 2 }}>
                <button style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: NAVY, color: CREAM, border: "none", borderRadius: 11, padding: "13px 26px", fontSize: "0.88rem", fontWeight: 500, fontFamily: "'Inter',sans-serif", cursor: "pointer", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                  Explore Events <span>→</span>
                </button>
              </div>
              <button style={{ backgroundColor: "transparent", border: `1px solid ${CREAM}30`, color: `${CREAM}bb`, borderRadius: 11, padding: "13px 26px", fontSize: "0.88rem", fontWeight: 400, fontFamily: "'Inter',sans-serif", cursor: "pointer", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                Our Story
              </button>
            </div>

            {/* Social proof */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex" }}>
                {[0,1,2,3].map((i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}55, ${MID_NAVY}88)`, border: `2px solid ${DARK}`, marginLeft: i === 0 ? 0 : -9 }} />
                ))}
              </div>
              <span style={{ fontSize: "0.76rem", color: `${CREAM}55`, letterSpacing: "0.03em" }}>
                <span style={{ color: GOLD, fontWeight: 500 }}>200+</span> guests at our last event
              </span>
            </div>
          </motion.div>

          {/* Right — grid */}
          <motion.div
            style={{ position: "relative" }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 55% 55% at 50% 50%, ${GOLD}1a 0%, transparent 70%)`, filter: "blur(40px)", borderRadius: "50%", animation: "pulse 6s ease-in-out infinite" }} />
            <div style={{ position: "relative" }}>
              <HeroShuffleGrid />
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  );
}
