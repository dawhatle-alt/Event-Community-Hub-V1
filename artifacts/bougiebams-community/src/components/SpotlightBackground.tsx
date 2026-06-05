import { motion } from "framer-motion";

interface BeamProps {
  top: string;
  left: string;
  color: string;
  width: number;
  height: number;
  initialRotate: number;
  animateRotate: number[];
  duration: number;
  delay?: number;
  opacity: number;
}

function Beam({ top, left, color, width, height, initialRotate, animateRotate, duration, delay = 0, opacity }: BeamProps) {
  return (
    <motion.div
      style={{
        position: "absolute",
        top,
        left,
        width,
        height,
        background: `linear-gradient(to bottom, ${color} 0%, transparent 80%)`,
        clipPath: "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)",
        transformOrigin: "50% 0%",
        filter: "blur(12px)",
        opacity,
        willChange: "transform",
      }}
      initial={{ rotate: initialRotate }}
      animate={{ rotate: animateRotate }}
      transition={{ duration, ease: "easeInOut", repeat: Infinity, repeatType: "mirror", delay }}
    />
  );
}

export function SpotlightBackground({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden", background: "linear-gradient(135deg, #0D1020 0%, #181D37 45%, #1e2444 75%, #130e00 100%)" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }} aria-hidden>
        <Beam
          top="-20%"
          left="15%"
          color="rgba(201,162,39,0.55)"
          width={320}
          height={700}
          initialRotate={-20}
          animateRotate={[-20, -5, -20]}
          duration={10}
          opacity={1}
        />
        <Beam
          top="-15%"
          left="42%"
          color="rgba(201,162,39,0.35)"
          width={280}
          height={650}
          initialRotate={5}
          animateRotate={[5, 18, 5]}
          duration={14}
          delay={2}
          opacity={1}
        />
        <Beam
          top="-25%"
          left="68%"
          color="rgba(100,130,220,0.3)"
          width={360}
          height={750}
          initialRotate={15}
          animateRotate={[15, -5, 15]}
          duration={18}
          delay={4}
          opacity={1}
        />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
