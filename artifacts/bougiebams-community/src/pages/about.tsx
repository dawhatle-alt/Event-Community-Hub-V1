import { motion } from "framer-motion";

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
                <video
                  src={`${import.meta.env.BASE_URL}about-oval-video.mp4`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-primary/20 blur-3xl -z-10"></div>
            </motion.div>
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
          <p className="text-xs tracking-[4px] uppercase text-primary mb-3 font-medium">Meet the Founder</p>
          <div className="grid md:grid-cols-[1fr_1.6fr] gap-14 items-start">
            {/* Patsy photos */}
            <div className="relative flex flex-col gap-3">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="/patsy-atx-tournament.jpg"
                  alt="Patsy Miller — Founder & CEO of Bougie Bams"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="aspect-square rounded-xl overflow-hidden shadow-md">
                  <img
                    src="/patsy-mahj-bash.jpg"
                    alt="Patsy at a Bougie Bams Mahj Bash"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="aspect-square rounded-xl overflow-hidden shadow-md">
                  <img
                    src="/patsy-earthly-hand.jpg"
                    alt="Patsy showing off a mahjong hand"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-primary text-background text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-xl shadow-md">
                Founder &amp; CEO
              </div>
            </div>

            {/* Bio */}
            <div className="flex flex-col gap-5 pt-2 md:pt-0">
              <div>
                <h2 className="font-serif text-4xl md:text-5xl font-medium mb-1">Patsy Miller</h2>
                <p className="text-primary text-sm tracking-wide">Founder &amp; CEO, Bougie Bams</p>
              </div>
              <div className="space-y-4 text-background/80 font-light leading-relaxed text-[15px]">
                <p>
                  If you know me, you know I love bringing people together. Whether it's hosting a dinner party, planning an event, or simply gathering friends around a table, I've always been happiest when there's food, laughter, conversation, and maybe just a touch of over-the-top flair. Most people who know me would tell you that "bougie" has always been one of my defining characteristics — and I happily embrace it.
                </p>
                <p>
                  I'm a proud 12th-generation Texan and the second of six children. Family and community have always been at the center of my life, and there's never a shortage of reasons to gather and celebrate.
                </p>
                <p>
                  I'm also known for my eyeglasses. Bright colors are kind of my thing — I own more than twenty pairs, and each one is a little reflection of my personality: bold, fun, and unapologetically colorful. So when I discovered mahjong, it felt like fate. I was immediately drawn to the beautiful tables, vibrant tiles, and endless pops of color. But what I fell in love with most was the social side of the game. Mahjong has a way of turning strangers into friends and ordinary afternoons into memories.
                </p>
                <p>
                  The name is actually pretty simple. "Bougie" is what friends and family have called me for years. And "Bams"? Mahjong players know that's a nod to bamboo tiles — a little wink to the game that brought all of this together.
                </p>
              </div>
              <blockquote className="border-l-4 border-primary pl-5 py-1">
                <p className="italic text-background/90 font-light text-base leading-relaxed">
                  "My hope is that every Bougie Bams gathering becomes more than just a game. I hope it becomes a place where friendships are formed, traditions are created, and people leave feeling a little happier than when they arrived."
                </p>
              </blockquote>
              <p className="text-background/60 font-light text-sm italic">
                Because life is simply better when there's color, community, and a seat for everyone at the table. I'm so glad you're here.
              </p>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
