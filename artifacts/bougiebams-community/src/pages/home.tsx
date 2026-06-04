import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Users, Sparkles, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeroShuffleGrid } from "@/components/HeroShuffleGrid";
import { AnimatedGradientBorder } from "@/components/AnimatedGradientBorder";
import { useListFeaturedEvents } from "@workspace/api-client-react";
import { format } from "date-fns";

export default function Home() {
  const { data: featuredEvents, isLoading } = useListFeaturedEvents();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full relative overflow-hidden bg-[#faf8f5] pt-12 pb-24 md:pt-24 md:pb-32">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col space-y-8 z-10">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-background/50 backdrop-blur w-fit">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              Premium mahjong experiences for everyone
            </div>

            <h1 className="font-serif text-5xl md:text-7xl font-medium tracking-tight text-foreground leading-[1.1]">
              You're invited to <br />
              <span className="text-primary italic">something special</span>.
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-md font-light">
              BougieBams brings people together around beautifully curated mahjong tables — intimate gatherings, premium setups, and connections that feel rich, polished, and entirely your own.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <AnimatedGradientBorder className="inline-block">
                <Button size="lg" className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90 font-medium px-8 h-14 text-base" asChild>
                  <Link href="/events">Explore Events</Link>
                </Button>
              </AnimatedGradientBorder>
              <Button size="lg" variant="outline" className="w-full rounded-xl bg-transparent border-foreground/20 hover:bg-foreground/5 font-medium px-8 h-14 text-base" asChild>
                <Link href="/about">Our Story</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full"></div>
            <HeroShuffleGrid />
          </div>
        </div>
      </section>

      {/* Custom Table Setup Section */}
      <section className="w-full py-24 bg-foreground text-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-primary text-sm font-medium uppercase tracking-widest mb-6">
                <LayoutGrid className="w-4 h-4" />
                Build Your Table
              </div>
              <h2 className="font-serif text-4xl md:text-5xl font-medium leading-tight mb-6">
                Your table, <span className="text-primary italic">your way.</span>
              </h2>
              <p className="text-lg font-light opacity-90 leading-relaxed mb-8">
                Choose from over <strong className="font-semibold text-primary">40 premium mats, tile sets, and racks</strong> to create a setup that's completely your own. Every detail is yours to customize — from the feel of the tiles to the look of the table — for an experience that's as unique as you are.
              </p>
              <Button size="lg" variant="outline" className="rounded-xl border-background/30 text-background hover:bg-background/10 h-12 px-8" asChild>
                <Link href="/events">Browse Upcoming Events</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: "🀄", label: "40+ Tile Sets", desc: "Hand-selected premium sets" },
                { icon: "🎨", label: "Premium Mats", desc: "Luxurious playing surfaces" },
                { icon: "🏮", label: "Styled Racks", desc: "Matching rack collections" },
                { icon: "✨", label: "Full Curation", desc: "Every detail considered" },
              ].map((item) => (
                <div key={item.label} className="bg-background/10 rounded-2xl p-6 border border-background/10 hover:bg-background/15 transition-colors">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className="font-serif text-lg font-medium mb-1">{item.label}</div>
                  <div className="text-sm opacity-70 font-light">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="w-full py-24 bg-background">
        <div className="container mx-auto px-4 max-w-5xl text-center flex flex-col items-center">
          <Sparkles className="h-10 w-10 text-primary mb-8 opacity-80" />
          <h2 className="font-serif text-3xl md:text-5xl font-medium leading-tight mb-8 text-foreground">
            "A well-dressed table, a warm welcome, and the magic of gathering."
          </h2>
          <p className="text-lg text-muted-foreground md:text-xl font-light max-w-2xl leading-relaxed">
            We believe every gathering deserves to be beautiful. No stuffy events — just genuine connection, stunning setups, and unforgettable evenings around the table.
          </p>
        </div>
      </section>

      {/* Featured Events */}
      <section className="w-full py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="font-serif text-4xl md:text-5xl font-medium text-foreground mb-4">Upcoming Gatherings</h2>
              <p className="text-muted-foreground text-lg">Secure your spot at our next intimate event.</p>
            </div>
            <Button variant="link" className="text-primary hover:text-primary/80 text-base group p-0" asChild>
              <Link href="/events">View all events <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-8">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse flex flex-col gap-4">
                  <div className="w-full h-80 bg-muted rounded-xl"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {featuredEvents?.slice(0, 2).map((event, i) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group cursor-pointer flex flex-col h-full bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                      {event.imageUrl ? (
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-foreground/10">
                          <span className="font-serif text-5xl text-primary/30">BB</span>
                        </div>
                      )}
                      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium border border-border/50 shadow-sm">
                        {format(new Date(event.date), "MMM d, yyyy")}
                      </div>
                      <div className="absolute bottom-4 right-4 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold shadow-md">
                        {Number(event.price) === 0 ? "Free" : `$${event.price}`}
                      </div>
                    </div>
                    <div className="p-8 flex flex-col flex-1">
                      <div className="flex items-center gap-2 text-primary font-medium text-sm mb-3 uppercase tracking-wider">
                        <span>{event.category}</span>
                      </div>
                      <h3 className="font-serif text-3xl font-medium mb-3 group-hover:text-primary transition-colors">{event.title}</h3>
                      <p className="text-muted-foreground line-clamp-2 mb-6 font-light">{event.description}</p>
                      <div className="mt-auto flex items-center text-sm text-muted-foreground gap-4">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(event.date), "h:mm a")}</span>
                        <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {event.spotsRemaining ?? event.capacity} spots left</span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Join the Community — Email Capture */}
      <section className="w-full py-24 bg-foreground">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-4xl md:text-5xl text-background font-medium mb-4">
              Join the Community
            </h2>
            <p className="text-muted text-lg font-light mb-10">
              Be the first to know about upcoming gatherings, exclusive member events, and early-access tickets.
            </p>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/20 border border-primary/30 rounded-2xl px-8 py-6 text-background"
              >
                <p className="font-serif text-2xl mb-2">You're on the list ✨</p>
                <p className="text-muted text-sm">We'll be in touch with something special.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 h-12 rounded-xl bg-background/10 border-background/20 text-background placeholder:text-muted focus-visible:ring-primary"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium whitespace-nowrap"
                >
                  Join Us
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
