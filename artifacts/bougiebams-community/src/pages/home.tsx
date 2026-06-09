import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Users, Sparkles, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeroShuffleGrid } from "@/components/HeroShuffleGrid";
import { AnimatedGradientBorder } from "@/components/AnimatedGradientBorder";
import { SpotlightBackground } from "@/components/SpotlightBackground";
import { useListFeaturedEvents } from "@workspace/api-client-react";
import { formatDateShortCT, formatTimeCT } from "@/lib/dateUtils";

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
      <SpotlightBackground>
        <div className="pt-12 pb-24 md:pt-24 md:pb-32">
          <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col space-y-8">
              <h1 className="font-serif text-5xl md:text-7xl font-medium tracking-tight text-[#FAF8F5] leading-[1.1]">
                You're invited to <br />
                <span className="text-primary italic">something special</span>.
              </h1>

              <p className="text-lg text-[#FAF8F5]/55 leading-relaxed max-w-md font-light">
                Bougie Bams brings people together around beautifully curated mahjong tables — intimate gatherings, premium setups, and connections that feel rich, polished, and entirely your own.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <AnimatedGradientBorder className="inline-block">
                  <Button size="lg" className="w-full rounded-xl bg-[#181D37] text-[#FAF8F5] hover:bg-[#181D37]/90 font-medium px-8 h-14 text-base" asChild>
                    <Link href="/events">Explore Events</Link>
                  </Button>
                </AnimatedGradientBorder>
                <AnimatedGradientBorder className="inline-block">
                  <Button size="lg" className="w-full rounded-xl bg-[#181D37] text-[#FAF8F5] hover:bg-[#181D37]/90 font-medium px-8 h-14 text-base" asChild>
                    <Link href="/about">Our Story</Link>
                  </Button>
                </AnimatedGradientBorder>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full"></div>
              <HeroShuffleGrid />
            </div>
          </div>
        </div>
      </SpotlightBackground>

      {/* Style-Your-Own Table Section */}
      <section className="w-full py-24 bg-foreground text-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-primary text-sm font-medium uppercase tracking-widest mb-6">
                <LayoutGrid className="w-4 h-4" />
                A Signature Event
              </div>
              <h2 className="font-serif text-4xl md:text-5xl font-medium leading-tight mb-6">
                Style-Your-Own <span className="text-primary italic">Table Night.</span>
              </h2>
              <p className="text-lg font-light opacity-90 leading-relaxed mb-8">
                One of our most-loved event formats — guests choose from over <strong className="font-semibold text-primary">40 premium mats, tile sets, and racks</strong> to build a setup that's completely their own. It's part game night, part art project, and entirely bougie. We host a rotating lineup of experiences, so there's always something new to discover.
              </p>
              <AnimatedGradientBorder className="inline-block">
                <Button size="lg" className="rounded-xl bg-[#181D37] text-[#FAF8F5] hover:bg-[#181D37]/90 font-medium h-14 px-8 text-base" asChild>
                  <Link href="/events">Browse Upcoming Events</Link>
                </Button>
              </AnimatedGradientBorder>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                `${import.meta.env.BASE_URL}mats-rack-1.jpg`,
                `${import.meta.env.BASE_URL}mats-rack-2.jpg`,
              ].map((src, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl overflow-hidden border-2 border-primary/90"
                  style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.6), 0 0 18px 4px rgba(201,162,39,0.55), 0 0 48px 12px rgba(201,162,39,0.25)" }}
                >
                  <img src={src} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
              <div
                className="col-span-2 rounded-2xl overflow-hidden border-2 border-primary/90 h-44"
                style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.6), 0 0 18px 4px rgba(201,162,39,0.55), 0 0 48px 12px rgba(201,162,39,0.25)" }}
              >
                <img src={`${import.meta.env.BASE_URL}tiles-collection.jpg`} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
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
                      {event.imageUrl && !event.imageUrl.toLowerCase().includes("logo") ? (
                        <img
                          src={
                            event.imageUrl.startsWith("/api/") || event.imageUrl.startsWith("http")
                              ? event.imageUrl
                              : `${import.meta.env.BASE_URL}${event.imageUrl.replace(/^\//, "")}`
                          }
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-foreground/10">
                          <span className="font-serif text-5xl text-primary/30">BB</span>
                        </div>
                      )}
                      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium border border-border/50 shadow-sm">
                        {formatDateShortCT(event.date)}
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
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatTimeCT(event.date)} CT</span>
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

      {/* Follow Along — Instagram Grid */}
      <section className="w-full py-24 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs tracking-[4px] uppercase text-primary mb-3 font-medium">Follow Along</p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium mb-4">
              Life at the Table
            </h2>
            <p className="text-muted-foreground font-light text-lg">
              See what's happening at Bougie Bams gatherings — follow us on Instagram.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3"
          >
            {[
              `${import.meta.env.BASE_URL}bb-new-1.jpg`,
              `${import.meta.env.BASE_URL}bb-new-2.jpg`,
              `${import.meta.env.BASE_URL}bb-new-3.jpg`,
              `${import.meta.env.BASE_URL}bb-new-4.jpg`,
              `${import.meta.env.BASE_URL}bb-new-5.jpg`,
              `${import.meta.env.BASE_URL}bb-new-6.jpg`,
            ].map((src, i) => (
              <a
                key={i}
                href="https://instagram.com/bougiebams"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square overflow-hidden rounded-xl block"
              >
                <img
                  src={src}
                  alt={`Bougie Bams gathering ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors duration-300 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
              </a>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center mt-8"
          >
            <a
              href="https://instagram.com/bougiebams"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/40 text-primary font-medium text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              @bougiebams on Instagram
            </a>
          </motion.div>
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
