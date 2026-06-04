import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimationFrame } from "framer-motion";

const GOLD = "#C9A227";
const NAVY = "#181D37";
const CREAM = "#FAF8F5";
const DARK = "#0D1020";
const MID_NAVY = "#252D55";
const WARM_GOLD = "#8B6914";
const LIGHT_GOLD = "#F0D060";

const gradientSets = [
  [
    `radial-gradient(ellipse 80% 60% at 15% 40%, ${MID_NAVY}cc 0%, transparent 70%)`,
    `radial-gradient(ellipse 70% 80% at 85% 20%, ${GOLD}44 0%, transparent 65%)`,
    `radial-gradient(ellipse 50% 50% at 50% 90%, ${GOLD}22 0%, transparent 60%)`,
    `radial-gradient(ellipse 60% 60% at 70% 70%, ${WARM_GOLD}33 0%, transparent 55%)`,
  ],
  [
    `radial-gradient(ellipse 90% 70% at 80% 60%, ${MID_NAVY}dd 0%, transparent 70%)`,
    `radial-gradient(ellipse 60% 50% at 20% 30%, ${GOLD}55 0%, transparent 60%)`,
    `radial-gradient(ellipse 40% 40% at 60% 10%, ${LIGHT_GOLD}22 0%, transparent 55%)`,
    `radial-gradient(ellipse 70% 70% at 30% 80%, ${WARM_GOLD}22 0%, transparent 65%)`,
  ],
  [
    `radial-gradient(ellipse 100% 60% at 50% 20%, ${GOLD}33 0%, transparent 70%)`,
    `radial-gradient(ellipse 70% 90% at 10% 70%, ${MID_NAVY}cc 0%, transparent 65%)`,
    `radial-gradient(ellipse 50% 40% at 90% 80%, ${GOLD}44 0%, transparent 50%)`,
    `radial-gradient(ellipse 60% 50% at 40% 50%, ${WARM_GOLD}22 0%, transparent 60%)`,
  ],
];

function AnimatedGradientBackground() {
  const [setIdx, setSetIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSetIdx((i) => (i + 1) % gradientSets.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: DARK }}
      />
      {gradientSets[setIdx].map((grad, i) => (
        <motion.div
          key={`${setIdx}-${i}`}
          className="absolute inset-0"
          style={{ background: grad }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 120% 80% at 50% 0%, transparent 40%, ${DARK}99 100%)`,
        }}
      />
    </div>
  );
}

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

function HeroShuffleGrid() {
  const [order, setOrder] = useState(tiles.map((_, i) => i));

  useEffect(() => {
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
    <div className="grid grid-cols-3 gap-3">
      <AnimatePresence mode="popLayout">
        {sorted.map((tile) => (
          <motion.div
            key={tile.id}
            layout
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            className="aspect-[4/5] relative overflow-hidden rounded-2xl shadow-lg"
          >
            {tile.type === "logo" ? (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f5f0e8 0%, #ede4cf 100%)" }}
              >
                <div
                  className="flex flex-col items-center justify-center gap-1"
                  style={{ color: NAVY }}
                >
                  <span style={{ fontSize: "1.6rem", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, letterSpacing: "0.05em" }}>BB</span>
                  <span style={{ fontSize: "0.45rem", fontFamily: "'Inter', sans-serif", letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.6 }}>BougieBams</span>
                </div>
              </div>
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-2"
                style={{ background: (tile as any).bg }}
              >
                <span className="text-4xl drop-shadow-sm">{(tile as any).icon}</span>
                <span
                  className="text-xs font-medium tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {(tile as any).label}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function GradientHero() {
  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        minHeight: "100vh",
        backgroundColor: DARK,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <link
        rel="stylesheet"
        media="print"
        onLoad={(e) => { (e.target as HTMLLinkElement).media = "all"; }}
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap"
      />

      {/* Nav stub */}
      <div
        className="relative z-20 flex items-center justify-between px-8 py-5"
        style={{ borderBottom: `1px solid rgba(201,162,39,0.15)` }}
      >
        <span
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.4rem",
            fontWeight: 600,
            color: CREAM,
            letterSpacing: "0.04em",
          }}
        >
          BougieBams
        </span>
        <div className="flex items-center gap-8">
          {["Events", "About", "Contact"].map((item) => (
            <span
              key={item}
              style={{ fontSize: "0.85rem", color: `${CREAM}99`, letterSpacing: "0.06em", cursor: "pointer" }}
            >
              {item}
            </span>
          ))}
          <div
            style={{
              fontSize: "0.8rem",
              background: GOLD,
              color: NAVY,
              borderRadius: "8px",
              padding: "6px 18px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              cursor: "pointer",
            }}
          >
            Book Now
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative flex-1 overflow-hidden">
        <AnimatedGradientBackground />

        {/* Particle-like gold dots */}
        <div className="absolute inset-0 pointer-events-none">
          {[
            { top: "12%", left: "8%", size: 3, delay: 0 },
            { top: "28%", left: "42%", size: 2, delay: 1.2 },
            { top: "65%", left: "18%", size: 4, delay: 0.7 },
            { top: "78%", left: "62%", size: 2, delay: 2 },
            { top: "18%", left: "88%", size: 3, delay: 0.4 },
            { top: "52%", left: "75%", size: 2, delay: 1.6 },
          ].map((dot, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                top: dot.top,
                left: dot.left,
                width: dot.size,
                height: dot.size,
                backgroundColor: GOLD,
              }}
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: dot.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div
          className="relative z-10 container mx-auto px-8 grid gap-16 items-center"
          style={{
            gridTemplateColumns: "1fr 1fr",
            paddingTop: "5rem",
            paddingBottom: "5rem",
          }}
        >
          {/* Left column — text */}
          <motion.div
            className="flex flex-col"
            style={{ gap: "2rem" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "99px",
                border: `1px solid ${GOLD}44`,
                padding: "6px 16px",
                width: "fit-content",
                backgroundColor: `${GOLD}11`,
                backdropFilter: "blur(8px)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: GOLD,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "0.78rem",
                  color: `${CREAM}cc`,
                  letterSpacing: "0.06em",
                  fontWeight: 400,
                }}
              >
                Premium mahjong experiences for everyone
              </span>
            </div>

            {/* Heading */}
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(3.2rem, 5.5vw, 5.5rem)",
                fontWeight: 500,
                lineHeight: 1.08,
                color: CREAM,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              You're invited to
              <br />
              <em
                style={{
                  color: GOLD,
                  fontStyle: "italic",
                }}
              >
                something special
              </em>
              .
            </h1>

            {/* Description */}
            <p
              style={{
                fontSize: "1.05rem",
                color: `${CREAM}99`,
                lineHeight: 1.7,
                maxWidth: "30rem",
                fontWeight: 300,
                margin: 0,
              }}
            >
              BougieBams brings people together around beautifully curated
              mahjong tables — intimate gatherings, premium setups, and
              connections that feel rich, polished, and entirely your own.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              {/* Primary CTA — with animated gold border */}
              <div
                style={{
                  position: "relative",
                  borderRadius: "14px",
                  padding: "2px",
                  background: `linear-gradient(90deg, ${GOLD}, ${LIGHT_GOLD}, ${GOLD})`,
                  backgroundSize: "200% 100%",
                  animation: "shimmer 3s linear infinite",
                }}
              >
                <style>{`
                  @keyframes shimmer {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                  }
                `}</style>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: NAVY,
                    color: CREAM,
                    border: "none",
                    borderRadius: "12px",
                    padding: "14px 28px",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    fontFamily: "'Inter', sans-serif",
                    cursor: "pointer",
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Explore Events
                  <span style={{ fontSize: "1rem" }}>→</span>
                </button>
              </div>

              {/* Secondary CTA */}
              <button
                style={{
                  backgroundColor: "transparent",
                  border: `1px solid ${CREAM}33`,
                  color: `${CREAM}cc`,
                  borderRadius: "12px",
                  padding: "14px 28px",
                  fontSize: "0.9rem",
                  fontWeight: 400,
                  fontFamily: "'Inter', sans-serif",
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                }}
              >
                Our Story
              </button>
            </div>

            {/* Social proof */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                paddingTop: "0.5rem",
              }}
            >
              <div style={{ display: "flex" }}>
                {["💛", "🤍", "💛", "🤍"].map((emoji, i) => (
                  <div
                    key={i}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      backgroundColor: `${GOLD}33`,
                      border: `2px solid ${DARK}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      marginLeft: i === 0 ? 0 : -8,
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: "0.78rem",
                  color: `${CREAM}66`,
                  letterSpacing: "0.03em",
                }}
              >
                <span style={{ color: GOLD, fontWeight: 500 }}>200+</span> guests at our last event
              </span>
            </div>
          </motion.div>

          {/* Right column — shuffle grid */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Glow behind the grid */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${GOLD}22 0%, transparent 70%)`,
                filter: "blur(40px)",
                borderRadius: "50%",
              }}
            />
            <div className="relative">
              <HeroShuffleGrid />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
