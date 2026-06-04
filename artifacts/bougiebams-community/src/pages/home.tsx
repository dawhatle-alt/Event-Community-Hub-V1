import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Users, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroShuffleGrid } from "@/components/HeroShuffleGrid";
import { AnimatedGradientBorder } from "@/components/AnimatedGradientBorder";
import { useListFeaturedEvents } from "@workspace/api-client-react";
import { format } from "date-fns";
import img2 from "@assets/bb-image-2.png";
import img5 from "@assets/bb-image-5.png";

export default function Home() {
  const { data: featuredEvents, isLoading } = useListFeaturedEvents();

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full relative overflow-hidden bg-[#faf8f5] pt-12 pb-24 md:pt-24 md:pb-32">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col space-y-8 z-10">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-background/50 backdrop-blur w-fit">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              Curated experiences for elevated Black women
            </div>
            
            <h1 className="font-serif text-5xl md:text-7xl font-medium tracking-tight text-foreground leading-[1.1]">
              You're invited to <br />
              <span className="text-primary italic">something special</span>.
            </h1>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md font-light">
              BougieBams is a private gathering space for brunches, wine tastings, and connections that feel rich, polished, and unmistakably ours.
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

      {/* Philosophy Section */}
      <section className="w-full py-24 bg-foreground text-background">
        <div className="container mx-auto px-4 max-w-5xl text-center flex flex-col items-center">
          <Wine className="h-12 w-12 text-primary mb-8 opacity-80" />
          <h2 className="font-serif text-3xl md:text-5xl font-medium leading-tight mb-8">
            "A well-dressed room, a poured glass, and the magic of Black women gathering."
          </h2>
          <p className="text-lg text-muted md:text-xl font-light max-w-2xl leading-relaxed opacity-90">
            We believe in creating spaces where we can show up fully, beautifully, and luxuriously. No stuffy networking—just genuine connection in gorgeous environments.
          </p>
        </div>
      </section>

      {/* Featured Events */}
      <section className="w-full py-24 bg-background">
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
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <img 
                        src={event.imageUrl || img2} 
                        alt={event.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium border border-border/50 shadow-sm">
                        {format(new Date(event.date), "MMM d, yyyy")}
                      </div>
                      <div className="absolute bottom-4 right-4 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold shadow-md">
                        ${event.price}
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
                        <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {event.spotsRemaining} spots left</span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Image Banner */}
      <section className="w-full h-[60vh] min-h-[400px] relative">
        <img src={img5} alt="BougieBams gathering" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center">
          <h2 className="font-serif text-4xl md:text-6xl text-background font-medium text-center px-4 max-w-4xl drop-shadow-lg">
            Where luxury meets community.
          </h2>
        </div>
      </section>
    </div>
  );
}
