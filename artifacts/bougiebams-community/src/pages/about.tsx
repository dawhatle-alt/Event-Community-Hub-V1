import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import mahjongTiles from "/mahjong-tiles.jpeg";
import mahjongTable from "/mahjong-table.jpeg";

const venuePhotos = [
  "/event-boss-moves.jpeg",
  "/event-rose.jpeg",
  "/mahjong-table.jpeg",
  "/mahjong-tiles.jpeg",
  "/event-spa.jpeg",
];

export default function About() {
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhotoIndex((i) => (i + 1) % venuePhotos.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-background">
      <section className="py-20 md:py-32 overflow-hidden">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="font-serif text-5xl md:text-7xl font-medium mb-8 leading-tight">
                More than a game.<br/>
                <span className="text-primary italic">An experience.</span>
              </h1>
              <div className="space-y-6 text-lg text-muted-foreground font-light leading-relaxed">
                <p>
                  Bougie Bams was born from a love of mahjong and a belief that every gathering deserves to be memorable. We wanted events where the setup was stunning, the company was warm, and the atmosphere was nothing short of luxurious.
                </p>
                <p>
                  We're done with plain folding tables and mismatched tiles. Bougie Bams curates intimate mahjong events where you can choose from over <strong className="font-medium text-foreground">40 premium mats, tile sets, and racks</strong> — so your table looks and feels exactly the way you want it.
                </p>
                <p>
                  Whether you're a seasoned player or picking up tiles for the first time, when you attend a Bougie Bams event you're stepping into a welcoming community that celebrates the game and the people who play it.
                </p>
                <blockquote className="mt-8 border-l-4 border-primary pl-5 py-1">
                  <p className="italic text-foreground font-light text-base leading-relaxed">
                    "Bougie Bams is more than a business. It's an extension of who I am — a colorful, slightly over-the-top Texan who believes life is better when people gather around a beautiful table."
                  </p>
                  <cite className="block mt-2 text-sm text-primary not-italic font-medium">— Patsy Miller, Founder &amp; CEO</cite>
                </blockquote>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-[3/4] rounded-full overflow-hidden border-8 border-background shadow-2xl relative z-10">
                <img src={mahjongTiles} alt="Mahjong tiles and dice" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-primary/20 blur-3xl -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div>
              <h3 className="font-serif text-3xl mb-4 text-primary">Intimacy</h3>
              <p className="font-light opacity-80">Our gatherings are kept small by design, ensuring real conversations and meaningful connections around the table.</p>
            </div>
            <div>
              <h3 className="font-serif text-3xl mb-4 text-primary">Customization</h3>
              <p className="font-light opacity-80">Over 40 premium mats, tile sets, and racks to choose from — build a table setup that's uniquely yours.</p>
            </div>
            <div>
              <h3 className="font-serif text-3xl mb-4 text-primary">Community</h3>
              <p className="font-light opacity-80">A warm, welcoming environment open to everyone — arrive solo, leave with new friends and a love for the game.</p>
            </div>
          </div>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden"
      >
        <div className="aspect-[21/9] w-full">
          <img
            src={mahjongTable}
            alt="Bougie Bams custom mahjong table setup"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-background">
            <p className="font-serif text-2xl md:text-3xl italic">Where every table tells a story.</p>
          </div>
        </div>
      </motion.section>

      {/* Venue photo slideshow — kept as a standalone visual break */}
      <section className="py-14 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="relative aspect-[4/3] md:aspect-[16/7] rounded-2xl overflow-hidden shadow-lg">
            <AnimatePresence mode="crossfade">
              <motion.img
                key={venuePhotos[photoIndex]}
                src={venuePhotos[photoIndex]}
                alt="Bougie Bams venue"
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              />
            </AnimatePresence>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {venuePhotos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIndex ? "bg-white w-4" : "bg-white/50"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About the Founder */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="py-20 bg-foreground text-background"
      >
        <div className="container mx-auto px-4 max-w-5xl">
          <p className="text-xs tracking-[4px] uppercase text-primary mb-3 font-medium">About the Founder</p>
          <div className="grid md:grid-cols-[1fr_1.6fr] gap-14 items-start">
            {/* Photo — swap src for a real photo of Patsy when available */}
            <div className="relative">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="/event-boss-moves.jpeg"
                  alt="Patsy Miller — Founder & CEO of Bougie Bams"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-primary text-background text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-xl shadow-md">
                Founder &amp; CEO
              </div>
            </div>

            {/* Bio */}
            <div className="flex flex-col justify-center gap-6 pt-2 md:pt-0">
              <div>
                <h2 className="font-serif text-4xl md:text-5xl font-medium mb-1">Patsy Miller</h2>
                <p className="text-primary text-sm tracking-wide">Founder &amp; CEO, Bougie Bams</p>
              </div>
              <div className="space-y-4 text-background/80 font-light leading-relaxed text-[15px]">
                <p>
                  Patsy Miller is a colorful, self-described over-the-top Texan with a passion for beautiful tables, warm company, and the art of the gather. She founded Bougie Bams out of a simple conviction: mahjong deserved better — and so did the people who play it.
                </p>
                <p>
                  What started as a personal love of the game grew into a full community — intimate events where premium setups, curated mats, and genuine hospitality come together to create something truly unforgettable.
                </p>
              </div>
              <blockquote className="border-l-4 border-primary pl-5 py-1">
                <p className="italic text-background/90 font-light text-base leading-relaxed">
                  "Bougie Bams is more than a business. It's an extension of who I am — a colorful, slightly over-the-top Texan who believes life is better when people gather around a beautiful table."
                </p>
              </blockquote>
              <blockquote className="border-l-4 border-primary/40 pl-5 py-1">
                <p className="italic text-background/70 font-light text-sm leading-relaxed">
                  "I started Bougie Bams because I wanted mahjong nights that felt as elevated as the game itself. Beautiful tiles, gorgeous mats, good company, and an environment where everyone belongs. This is the gathering place I always wished existed."
                </p>
              </blockquote>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
