import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useGetRegistrationBySession, getGetRegistrationBySessionQueryKey } from "@workspace/api-client-react";
import { CheckCircle2, Calendar, MapPin, Loader2, Share2, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Confirmation() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("sessionId");

  const { data: confirmation, isLoading } = useGetRegistrationBySession(
    { sessionId: sessionId || "" },
    {
      query: {
        enabled: !!sessionId,
        queryKey: getGetRegistrationBySessionQueryKey({ sessionId: sessionId || "" }),
        // Keep polling every 3 s while payment is still being processed by Square
        refetchInterval: (query: any) =>
          query.state.data?.registration?.status === "pending" ? 3000 : false,
      },
    }
  );

  // Hooks must be called unconditionally — before any early returns
  const [copied, setCopied] = useState(false);
  const [refCopied, setRefCopied] = useState(false);

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

  // Payment still being confirmed by Square — poll until it resolves
  if (registration.status === "pending") {
    return (
      <div className="w-full bg-background min-h-[80vh] py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="bg-card rounded-3xl p-8 md:p-12 shadow-lg border border-border text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-8">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4 text-foreground">
              Processing payment…
            </h1>
            <p className="text-lg text-muted-foreground mb-4 max-w-lg mx-auto font-light">
              Hi {registration.firstName}, your registration is in — we're just waiting on confirmation from Square. This usually takes a few seconds.
            </p>
            <p className="text-sm text-muted-foreground font-light">
              This page will update automatically. Please don't close it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const shareText = `I'm going to "${event.title}" with @bougiebams! 🀄 Join me — ${window.location.origin}/events/${event.id}`;
  const shareUrl = `${window.location.origin}/events/${event.id}`;

  const referralLink = registration.referralCode
    ? `${window.location.origin}/events/${event.id}?ref=${registration.referralCode}`
    : null;

  const handleCopyReferral = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: shareText, url: shareUrl });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

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
            Thank you, {registration.firstName}. Your reservation for {registration.quantity} spot(s) is confirmed. We've sent the confirmation details to your email.
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

          {/* Refer a Friend section */}
          {referralLink && (
            <div className="w-full rounded-2xl border border-[#C9A227]/30 bg-[#C9A227]/5 p-6 mb-6 text-center">
              <p className="text-xs tracking-[3px] uppercase text-[#C9A227] font-medium mb-2">Refer a Friend</p>
              <p className="text-sm text-muted-foreground mb-4 font-light">
                Share your unique link — when a friend signs up through it, we'll know you sent them!
              </p>
              <div className="flex items-center gap-2 bg-background rounded-xl border border-border px-4 py-2.5 mb-3 text-left">
                <span className="flex-1 text-xs text-muted-foreground truncate font-mono">{referralLink}</span>
                <button
                  onClick={handleCopyReferral}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A227] text-white font-medium text-xs hover:bg-[#b08f22] transition-colors"
                >
                  {refCopied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
              <p className="text-xs text-muted-foreground/70 font-light">Your code: <span className="font-mono font-medium text-foreground/60">{registration.referralCode}</span></p>
            </div>
          )}

          {/* Share section */}
          <div className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-6 mb-6 text-center">
            <p className="text-xs tracking-[3px] uppercase text-primary font-medium mb-2">Spread the Word</p>
            <p className="text-sm text-muted-foreground mb-4 font-light">
              Let your friends know — share on Instagram Stories or anywhere else!
            </p>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-medium text-sm shadow-md hover:opacity-90 transition-opacity"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied to clipboard!
                </>
              ) : navigator.share ? (
                <>
                  <Share2 className="w-4 h-4" />
                  Share to Instagram Stories
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy share message
                </>
              )}
            </button>
            {!navigator.share && !copied && (
              <p className="text-xs text-muted-foreground mt-3 font-light italic">
                Copies a ready-to-paste message with your event link.
              </p>
            )}
          </div>

          <Button size="lg" className="rounded-xl px-8 h-14 text-base" asChild>
            <Link href="/">Return to Homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
