import { useLocation } from "wouter";
import { useEffect } from "react";
import { useGetRegistrationBySession, getGetRegistrationBySessionQueryKey } from "@workspace/api-client-react";
import { CheckCircle2, Calendar, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Confirmation() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("sessionId");

  const { data: confirmation, isLoading } = useGetRegistrationBySession(
    { sessionId: sessionId || "" },
    { query: { enabled: !!sessionId, queryKey: getGetRegistrationBySessionQueryKey({ sessionId: sessionId || "" }) } }
  );

  if (!sessionId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="font-serif text-3xl mb-4">Invalid Session</h1>
        <p className="text-muted-foreground mb-8">No registration session ID was found.</p>
        <Button asChild><Link href="/events">Browse Events</Link></Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Confirming your reservation...</p>
      </div>
    );
  }

  if (!confirmation) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="font-serif text-3xl mb-4">Registration Not Found</h1>
        <p className="text-muted-foreground mb-8">We couldn't find a registration matching this session.</p>
        <Button asChild><Link href="/events">Browse Events</Link></Button>
      </div>
    );
  }

  const { registration, event } = confirmation;

  return (
    <div className="w-full bg-background min-h-[80vh] py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-card rounded-3xl p-8 md:p-12 shadow-lg border border-border text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-8">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4 text-foreground">
            You're on the list.
          </h1>
          <p className="text-lg text-muted-foreground mb-12 max-w-lg mx-auto font-light">
            Thank you, {registration.firstName}. Your reservation for {registration.quantity} spot(s) is confirmed. We've sent the details to {registration.email}.
          </p>

          <div className="bg-background w-full rounded-2xl p-6 md:p-8 text-left border border-border/50 mb-10">
            <h2 className="font-serif text-2xl font-medium mb-6 text-foreground">{event.title}</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">{format(new Date(event.date), "EEEE, MMMM d, yyyy")}</div>
                  <div className="text-muted-foreground">{format(new Date(event.date), "h:mm a")}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">{event.location}</div>
                  {event.address && <div className="text-muted-foreground">{event.address}</div>}
                </div>
              </div>
            </div>
          </div>

          <Button size="lg" className="rounded-xl px-8 h-14 text-base" asChild>
            <Link href="/">Return to Homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
