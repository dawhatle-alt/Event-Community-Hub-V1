import { motion } from "framer-motion";
import img4 from "@assets/bb-image-4.png";
import img1 from "@assets/bb-image-1.png";

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
                More than a network.<br/>
                <span className="text-primary italic">A sanctuary.</span>
              </h1>
              <div className="space-y-6 text-lg text-muted-foreground font-light leading-relaxed">
                <p>
                  BougieBams was born from a simple desire: Black women needing a space that didn't ask us to code-switch, tone it down, or shrink. We wanted a room where luxury was the baseline, and genuine connection was the goal.
                </p>
                <p>
                  We are tired of sterile networking events and overcrowded, noisy lounges. We curate intimate gatherings—from private vineyard tours to beautifully styled dinner parties—designed for the woman who appreciates the finer things.
                </p>
                <p>
                  When you attend a BougieBams event, you're not just buying a ticket. You're stepping into a community of elevated, ambitious, and vibrant women who celebrate each other.
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
                <img src={img4} alt="Women gathered" className="w-full h-full object-cover" />
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
              <p className="font-light opacity-80">Our gatherings are kept small by design, ensuring real conversations and meaningful connections.</p>
            </div>
            <div>
              <h3 className="font-serif text-3xl mb-4 text-primary">Luxury</h3>
              <p className="font-light opacity-80">Beautiful venues, exquisite food, and thoughtful details. We believe we deserve the best spaces.</p>
            </div>
            <div>
              <h3 className="font-serif text-3xl mb-4 text-primary">Sisterhood</h3>
              <p className="font-light opacity-80">A warm, welcoming environment where you can arrive solo and leave with lifelong friends.</p>
            </div>
          </div>
        </div>
      </section>

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
                "I started BougieBams because I was looking for my people. I wanted to dress up, drink good wine, and talk about everything from investments to reality TV with women who understood my journey. This is our soft place to land."
              </p>
              <div className="font-serif text-xl font-medium">— The Founder</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
