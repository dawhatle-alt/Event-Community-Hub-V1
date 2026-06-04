import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Calendar, Users, MapPin, Search, LayoutGrid, LayoutList } from "lucide-react";
import { useListEvents, useListEventCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function Events() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: categories } = useListEventCategories();
  const { data: events, isLoading } = useListEvents({
    ...(selectedCategory ? { category: selectedCategory } : {}),
    ...(showUpcomingOnly ? { upcoming: true } : {}),
  });

  const filtered = events?.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    );
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
          {/* Search bar */}
          <div className="relative mb-8 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search events by name, location, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-full bg-card border-border"
            />
          </div>

          {/* Filters + view toggle */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
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
              <div className="ml-2 flex items-center gap-1 border border-border rounded-full p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-full transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-full transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  aria-label="List view"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
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
          ) : filtered?.length === 0 ? (
            <div className="text-center py-24">
              <h3 className="font-serif text-2xl text-muted-foreground">No events found matching your criteria.</h3>
              <Button
                variant="outline"
                className="mt-6 rounded-full"
                onClick={() => { setSelectedCategory(null); setShowUpcomingOnly(true); setSearch(""); }}
              >
                Clear Filters
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered?.map((event, i) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
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
                          <span className="font-serif text-4xl text-primary/40">BB</span>
                        </div>
                      )}
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
                          <span>{event.spotsRemaining ?? event.capacity} spots left</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered?.map((event, i) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group cursor-pointer flex items-center gap-6 bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all duration-300 p-4"
                  >
                    <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
                      {event.imageUrl ? (
                        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-foreground/10">
                          <span className="font-serif text-xl text-primary/40">BB</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-primary font-medium text-xs mb-1 uppercase tracking-wider">{event.category}</div>
                      <h3 className="font-serif text-xl font-medium group-hover:text-primary transition-colors truncate">{event.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(new Date(event.date), "MMM d, yyyy · h:mm a")}</span>
                        <span className="flex items-center gap-1 hidden sm:flex"><MapPin className="w-3.5 h-3.5" />{event.location}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold">${event.price}</div>
                      <div className="text-xs text-muted-foreground mt-1">{event.spotsRemaining ?? event.capacity} spots left</div>
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
