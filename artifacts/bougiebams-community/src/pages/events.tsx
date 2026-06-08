import { useState } from "react";
import { Link } from "wouter";
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, format } from "date-fns";
import { formatDateShortCT, formatTimeCT, formatDateTimeCT } from "@/lib/dateUtils";
import { Calendar, Users, MapPin, Search, LayoutGrid, LayoutList, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useListEvents } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import type { Event } from "@workspace/api-client-react";

type ViewMode = "grid" | "list" | "calendar";

function CalendarView({ events }: { events: Event[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start
  const startDow = monthStart.getDay();
  const paddedDays: (Date | null)[] = [...Array(startDow).fill(null), ...days];

  const eventsOnDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.date), day));

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Month header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-serif text-xl font-medium">{format(currentMonth, "MMMM yyyy")}</h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground uppercase py-2 border-b border-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7">
        {paddedDays.map((day, idx) => {
          const dayEvents = day ? eventsOnDay(day) : [];
          const isToday = day ? isSameDay(day, new Date()) : false;
          return (
            <div
              key={idx}
              className={`min-h-[80px] p-2 border-b border-r border-border/50 last:border-r-0 ${
                day && !isSameMonth(day, currentMonth) ? "opacity-30" : ""
              }`}
            >
              {day && (
                <>
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full mb-1 ${
                      isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <div className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded truncate hover:bg-primary/25 transition-colors cursor-pointer">
                          {event.title}
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Events() {
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const { data: events, isLoading } = useListEvents({
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
      <section className="relative text-background py-20 px-4 overflow-hidden">
        <img
          src="/bougie-zebra-v2.png"
          alt="Bougie Zebra — Events banner"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-foreground/55" />
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <h1 className="font-serif text-5xl md:text-6xl font-medium mb-6">Bougie Events!</h1>
          <p className="text-lg md:text-xl text-muted font-light max-w-2xl mx-auto">
            Life's too short for ordinary. Let's make mahjong bougie — bam!
          </p>
          <p className="mt-6 text-sm text-white/60 italic max-w-xl mx-auto border-l-2 border-[#C9A227]/60 pl-4 text-left">
            "Bougie Bams is more than a business. It's an extension of who I am — a colorful, slightly over-the-top Texan who believes life is better when people gather around a beautiful table."
            <span className="block mt-1 not-italic text-white/40 text-xs">— Patsy Miller, Founder & CEO</span>
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

              {/* View mode toggle: grid / list / calendar */}
              <div className="ml-2 flex items-center gap-1 border border-border rounded-full p-1">
                {(["grid", "list", "calendar"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-1.5 rounded-full transition-colors ${viewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    aria-label={`${mode} view`}
                  >
                    {mode === "grid" && <LayoutGrid className="w-4 h-4" />}
                    {mode === "list" && <LayoutList className="w-4 h-4" />}
                    {mode === "calendar" && <CalendarDays className="w-4 h-4" />}
                  </button>
                ))}
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
          ) : viewMode === "calendar" ? (
            <CalendarView events={filtered ?? []} />
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
                        {formatDateShortCT(event.date)}
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
                          <span>{formatTimeCT(event.date)} CT</span>
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
                      <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDateTimeCT(event.date)} CT</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>
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
