import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Calendar, Users, MapPin } from "lucide-react";
import { useListEvents, useListEventCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import img1 from "@assets/bb-image-1.png";

export default function Events() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);

  const { data: categories } = useListEventCategories();
  const { data: events, isLoading } = useListEvents({
    ...(selectedCategory ? { category: selectedCategory } : {}),
    ...(showUpcomingOnly ? { upcoming: true } : {}),
  });

  return (
    <div className="w-full">
      <section className="bg-foreground text-background py-20 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <h1 className="font-serif text-5xl md:text-6xl font-medium mb-6">Our Gatherings</h1>
          <p className="text-lg md:text-xl text-muted font-light max-w-2xl mx-auto">
            From intimate wine tastings to vibrant brunches, discover our upcoming curated experiences.
          </p>
        </div>
      </section>

      <section className="py-12 bg-background min-h-[60vh]">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
                className="rounded-full"
              >
                All Experiences
              </Button>
              {categories?.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat)}
                  className="rounded-full"
                >
                  {cat}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showUpcomingOnly ? "default" : "outline"}
                onClick={() => setShowUpcomingOnly(true)}
                className="rounded-full"
              >
                Upcoming
              </Button>
              <Button
                variant={!showUpcomingOnly ? "default" : "outline"}
                onClick={() => setShowUpcomingOnly(false)}
                className="rounded-full"
              >
                Past
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse flex flex-col gap-4">
                  <div className="w-full h-64 bg-muted rounded-xl"></div>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : events?.length === 0 ? (
            <div className="text-center py-24">
              <h3 className="font-serif text-2xl text-muted-foreground">No events found matching your criteria.</h3>
              <Button 
                variant="outline" 
                className="mt-6 rounded-full"
                onClick={() => { setSelectedCategory(null); setShowUpcomingOnly(true); }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events?.map((event, i) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group cursor-pointer flex flex-col h-full bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <img
                        src={event.imageUrl || img1}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium border border-border/50">
                        {format(new Date(event.date), "MMM d, yyyy")}
                      </div>
                      <div className="absolute bottom-4 right-4 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold shadow-md">
                        ${event.price}
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="text-primary font-medium text-xs mb-2 uppercase tracking-wider">
                        {event.category}
                      </div>
                      <h3 className="font-serif text-2xl font-medium mb-3 group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      
                      <div className="mt-auto space-y-2 pt-4">
                        <div className="flex items-center text-sm text-muted-foreground gap-2">
                          <Calendar className="w-4 h-4 text-primary/70" />
                          <span>{format(new Date(event.date), "h:mm a")}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground gap-2">
                          <MapPin className="w-4 h-4 text-primary/70" />
                          <span className="truncate">{event.location}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground gap-2">
                          <Users className="w-4 h-4 text-primary/70" />
                          <span>{event.spotsRemaining} spots left</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
