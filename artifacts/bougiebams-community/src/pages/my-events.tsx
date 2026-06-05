import { useAuth } from "@workspace/replit-auth-web";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Calendar, MapPin, Users, LogIn, X, Mail, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

interface ProfileOverride {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  email: string | null | undefined;
}

export default function MyEvents() {
  const { user, isLoading, isAuthenticated, login } = useAuth();
  const [items, setItems] = useState<RegistrationWithEvent[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profileOverride, setProfileOverride] = useState<ProfileOverride | null>(null);
  const [editing, setEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  function handleCancelled(registrationId: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.registration.id === registrationId
          ? { ...item, registration: { ...item.registration, status: "cancelled" } }
          : item
      )
    );
  }

  function startEditing() {
    const firstName = profileOverride?.firstName ?? user?.firstName ?? "";
    const lastName = profileOverride?.lastName ?? user?.lastName ?? "";
    const email = profileOverride?.email ?? user?.email ?? "";
    setEditFirstName(firstName || "");
    setEditLastName(lastName || "");
    setEditEmail(email || "");
    setSaveError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setSaveError(null);
  }

  async function saveProfile() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName.trim() || undefined,
          lastName: editLastName.trim() || undefined,
          email: editEmail.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json() as { user: { firstName: string | null; lastName: string | null; email: string | null } };
      setProfileOverride({
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
      });
      setEditing(false);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

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

  const displayFirstName = profileOverride?.firstName ?? user?.firstName;
  const displayLastName = profileOverride?.lastName ?? user?.lastName;
  const displayEmail = profileOverride?.email ?? user?.email;
  const initials = `${displayFirstName?.[0] ?? ""}${displayLastName?.[0] ?? ""}`.toUpperCase() || "U";
  const fullName = [displayFirstName, displayLastName].filter(Boolean).join(" ") || "Member";

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl px-6 py-5 mb-10"
      >
        {!editing ? (
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16 shrink-0">
              {user?.profileImageUrl && (
                <AvatarImage src={user.profileImageUrl} alt={fullName} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight truncate">
                {fullName}
              </h1>
              {displayEmail && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{displayEmail}</span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full shrink-0 text-muted-foreground hover:text-foreground"
              onClick={startEditing}
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold">Edit Profile</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground"
                onClick={cancelEditing}
                disabled={saving}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-first-name">First name</Label>
                <Input
                  id="edit-first-name"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="First name"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-last-name">Last name</Label>
                <Input
                  id="edit-last-name"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Last name"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={saving}
                />
              </div>
            </div>
            {saveError && (
              <p className="text-destructive text-sm">{saveError}</p>
            )}
            <div className="flex items-center gap-3">
              <Button
                onClick={saveProfile}
                disabled={saving}
                size="sm"
                className="rounded-full px-6"
              >
                <Check className="h-4 w-4 mr-1.5" />
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      <div className="mb-8">
        <h2 className="font-serif text-xl font-semibold">My Registrations</h2>
        <p className="text-muted-foreground text-sm mt-1">Your upcoming and past event registrations.</p>
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
              <RegistrationCard
                key={registration.id}
                registration={registration}
                event={event}
                index={i}
                onCancelled={handleCancelled}
              />
            ))}
          </div>
        </section>
      )}

      {!fetching && !error && past.length > 0 && (
        <section>
          <h2 className="font-serif text-xl font-semibold mb-4 text-muted-foreground">Past Events</h2>
          <div className="space-y-4 opacity-75">
            {past.map(({ registration, event }, i) => (
              <RegistrationCard
                key={registration.id}
                registration={registration}
                event={event}
                index={i}
                isPast
              />
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
  onCancelled,
}: {
  registration: Registration;
  event: Event;
  index: number;
  isPast?: boolean;
  onCancelled?: (id: number) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/registrations/${registration.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onCancelled?.(registration.id);
    } catch (err: any) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
  }

  const isCancelled = registration.status === "cancelled";
  const canCancel = !isPast && !isCancelled && onCancelled;

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
            variant={
              isCancelled ? "destructive" : registration.status === "paid" ? "default" : "secondary"
            }
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

        {cancelError && (
          <p className="text-destructive text-xs">{cancelError}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {!isPast && !isCancelled && (
            <Link href={`/events/${event.id}`}>
              <Button variant="outline" size="sm" className="rounded-full text-xs">
                View Event
              </Button>
            </Link>
          )}
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={cancelling}
                >
                  <X className="h-3 w-3 mr-1" />
                  {cancelling ? "Cancelling…" : "Cancel Registration"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your registration?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel your registration for <strong>{event.title}</strong>. Your spot
                    will be released back to the event. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Registration</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </motion.div>
  );
}
