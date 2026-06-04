import { motion } from "framer-motion";
import img4 from "@assets/bb-image-4.png";
import img1 from "@assets/bb-image-1.png";
import mahjongTable from "/mahjong-table.jpeg";

export default function About() {
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
                  BougieBams was born from a love of mahjong and a belief that every gathering deserves to be memorable. We wanted events where the setup was stunning, the company was warm, and the atmosphere was nothing short of luxurious.
                </p>
                <p>
                  We're done with plain folding tables and mismatched tiles. BougieBams curates intimate mahjong events where you can choose from over <strong className="font-medium text-foreground">40 premium mats, tile sets, and racks</strong> — so your table looks and feels exactly the way you want it.
                </p>
                <p>
                  Whether you're a seasoned player or picking up tiles for the first time, when you attend a BougieBams event you're stepping into a welcoming community that celebrates the game and the people who play it.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-[3/4] rounded-full overflow-hidden border-8 border-background shadow-2xl relative z-10">
                <img src={img4} alt="Mahjong gathering" className="w-full h-full object-cover" />
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
            alt="BougieBams custom mahjong table setup"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-background">
            <p className="font-serif text-2xl md:text-3xl italic">Where every table tells a story.</p>
          </div>
        </div>
      </motion.section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-secondary rounded-3xl translate-x-4 translate-y-4 -z-10"></div>
              <img src={img1} alt="Founder" className="rounded-3xl w-full h-auto shadow-lg" />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="font-serif text-4xl md:text-5xl font-medium mb-6">The Vision</h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed mb-8">
                "I started BougieBams because I wanted mahjong nights that felt as elevated as the game itself. Beautiful tiles, gorgeous mats, good company, and an environment where everyone belongs. This is the gathering place I always wished existed."
              </p>
              <div className="font-serif text-xl font-medium">— The Founder</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
