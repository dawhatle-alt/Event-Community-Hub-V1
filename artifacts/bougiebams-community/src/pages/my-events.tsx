import { useAuth } from "@workspace/replit-auth-web";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Calendar, MapPin, Users, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface Registration {
  id: number;
  eventId: number;
  quantity: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface Event {
  id: number;
  title: string;
  date: string;
  endDate?: string | null;
  location: string;
  address?: string | null;
  price: number;
  imageUrl?: string | null;
  category: string;
}

interface RegistrationWithEvent {
  registration: Registration;
  event: Event;
}

export default function MyEvents() {
  const { user, isLoading, isAuthenticated, login } = useAuth();
  const [items, setItems] = useState<RegistrationWithEvent[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    setFetching(true);
    fetch("/api/registrations/my", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<RegistrationWithEvent[]>;
      })
      .then((data) => {
        setItems(data);
        setFetching(false);
      })
      .catch((err) => {
        setError(err.message);
        setFetching(false);
      });
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-6">
        <h1 className="font-serif text-3xl md:text-4xl font-semibold">My Events</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Log in to view the events you've registered for.
        </p>
        <Button onClick={login} size="lg" className="rounded-full px-8">
          <LogIn className="mr-2 h-4 w-4" />
          Log in
        </Button>
      </div>
    );
  }

  const now = new Date();
  const upcoming = items.filter((i) => new Date(i.event.date) >= now);
  const past = items.filter((i) => new Date(i.event.date) < now);

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-10">
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">My Events</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName || "friend"}! Here are your registrations.
        </p>
      </div>

      {fetching && (
        <p className="text-muted-foreground text-center py-12">Loading your registrations…</p>
      )}

      {error && (
        <p className="text-destructive text-center py-12">Could not load registrations: {error}</p>
      )}

      {!fetching && !error && items.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground text-lg">You haven't registered for any events yet.</p>
          <Link href="/events">
            <Button className="rounded-full px-8">Browse Events</Button>
          </Link>
        </div>
      )}

      {!fetching && !error && upcoming.length > 0 && (
        <section className="mb-12">
          <h2 className="font-serif text-xl font-semibold mb-4 text-primary">Upcoming</h2>
          <div className="space-y-4">
            {upcoming.map(({ registration, event }, i) => (
              <RegistrationCard key={registration.id} registration={registration} event={event} index={i} />
            ))}
          </div>
        </section>
      )}

      {!fetching && !error && past.length > 0 && (
        <section>
          <h2 className="font-serif text-xl font-semibold mb-4 text-muted-foreground">Past Events</h2>
          <div className="space-y-4 opacity-75">
            {past.map(({ registration, event }, i) => (
              <RegistrationCard key={registration.id} registration={registration} event={event} index={i} isPast />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RegistrationCard({
  registration,
  event,
  index,
  isPast = false,
}: {
  registration: Registration;
  event: Event;
  index: number;
  isPast?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-border rounded-xl overflow-hidden bg-card flex flex-col sm:flex-row"
    >
      {event.imageUrl && (
        <div className="sm:w-40 h-40 sm:h-auto flex-shrink-0">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-serif font-semibold text-lg leading-tight">{event.title}</h3>
            <Badge variant="outline" className="mt-1 text-xs">{event.category}</Badge>
          </div>
          <Badge
            variant={registration.status === "paid" ? "default" : "secondary"}
            className="shrink-0"
          >
            {registration.status}
          </Badge>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{format(new Date(event.date), "EEEE, MMMM d, yyyy · h:mm a")}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{event.location}{event.address ? ` · ${event.address}` : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>
              {registration.quantity} ticket{registration.quantity !== 1 ? "s" : ""}
              {registration.totalAmount > 0
                ? ` · $${registration.totalAmount.toFixed(2)} total`
                : " · Free"}
            </span>
          </div>
        </div>

        {!isPast && (
          <Link href={`/events/${event.id}`}>
            <Button variant="outline" size="sm" className="mt-1 rounded-full text-xs">
              View Event
            </Button>
          </Link>
        )}
      </div>
    </motion.div>
  );
}
