import { useParams, useLocation } from "wouter";
import { formatDateCT, formatTimeCT, formatDateShortCT } from "@/lib/dateUtils";
import { Calendar, MapPin, Users, ArrowLeft, Loader2, ExternalLink, X } from "lucide-react";
import { useGetEvent, useCreateCheckoutSession, getGetEventQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const eventId = parseInt(id || "0", 10);

  const { data: event, isLoading } = useGetEvent(eventId, {
    query: { enabled: !!eventId, queryKey: getGetEventQueryKey(eventId) }
  });

  const createCheckout = useCreateCheckoutSession();
  const { user, isAuthenticated, login } = useAuth();
  const [checkoutData, setCheckoutData] = useState<{ sessionId: string } | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    quantity: 1,
    seatingPreference: "",
    jokersPreference: "" as "" | "yes" | "no" | "open",
    skillLevel: "" as "" | "learn" | "learning" | "intermediate" | "advanced",
    couponCode: "",
  });
  const [couponStatus, setCouponStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [prefillNoteDismissed, setPrefillNoteDismissed] = useState(
    () => localStorage.getItem("prefill_note_dismissed") === "true"
  );

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || user.firstName || "",
        lastName:  prev.lastName  || user.lastName  || "",
        email:     prev.email     || user.email      || "",
      }));
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!formData.couponCode) {
      setCouponStatus("idle");
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
        const res = await fetch(`${base}/api/events/${eventId}/validate-coupon`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: formData.couponCode }),
        });
        const data = await res.json();
        setCouponStatus(data.valid ? "valid" : "invalid");
      } catch {
        setCouponStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.couponCode, eventId]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center">Event not found</div>;
  }

  const isSoldOut = event.spotsRemaining != null && event.spotsRemaining <= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCheckout.mutate(
      {
        data: {
          eventId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          quantity: formData.quantity,
          seatingPreference: formData.seatingPreference || undefined,
          jokersPreference: (formData.jokersPreference || undefined) as "yes" | "no" | "open" | undefined,
          skillLevel: (formData.skillLevel || undefined) as "learn" | "learning" | "intermediate" | "advanced" | undefined,
          couponCode: formData.couponCode || undefined,
        }
      },
      {
        onSuccess: (data) => {
          setCheckoutData({ sessionId: data.sessionId });
        }
      }
    );
  };

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <div className="relative h-[40vh] min-h-[300px] w-full">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #181D37 0%, #2a3160 50%, #1a1f3e 100%)" }}>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 60%, #C9A227 0%, transparent 50%), radial-gradient(circle at 75% 30%, #C9A227 0%, transparent 40%)" }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="container mx-auto px-4 max-w-5xl -mt-32 relative z-10">
        <Link href="/events" className="inline-flex items-center text-sm font-medium text-foreground bg-background/80 backdrop-blur px-4 py-2 rounded-full mb-6 hover:bg-background transition-colors shadow-sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Events
        </Link>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card p-8 md:p-12 rounded-3xl shadow-sm border border-border">
              <div className="text-primary font-medium text-sm mb-4 uppercase tracking-wider">
                {event.category}
              </div>
              <h1 className="font-serif text-4xl md:text-5xl font-medium mb-6 text-foreground">{event.title}</h1>
              
              <div className="flex flex-wrap gap-6 mb-8 text-muted-foreground border-b border-border pb-8">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">{formatDateCT(event.date)}</div>
                    <div className="text-sm">{formatTimeCT(event.date)} CT</div>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || event.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 group"
                >
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                      {event.location}
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </div>
                    {event.address && <div className="text-sm group-hover:text-primary/70 transition-colors">{event.address}</div>}
                  </div>
                </a>
              </div>

              <div className="prose prose-lg prose-headings:font-serif dark:prose-invert max-w-none">
                <h3 className="text-2xl font-serif font-medium text-foreground">About this experience</h3>
                <p className="whitespace-pre-wrap font-light leading-relaxed">{event.description}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-card p-8 rounded-3xl shadow-lg border border-primary/20">
              {checkoutData ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl font-medium mb-1">Review your order</h2>
                    <p className="text-sm text-muted-foreground">Check the details below then enter your card to complete payment.</p>
                  </div>
                  <div className="bg-muted/50 rounded-2xl p-4 space-y-3 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground">Event</span>
                      <span className="font-medium text-right max-w-[60%]">{event.title}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{formatDateShortCT(event.date)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tickets</span>
                      <span className="font-medium">{formData.quantity}</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between items-center">
                      <span className="font-medium">Total</span>
                      <span className="text-lg font-serif font-medium">${(Number(event.price) * formData.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full h-14 text-lg rounded-xl"
                    onClick={() => {
                      const total = (Number(event.price) * formData.quantity).toFixed(2);
                      const params = new URLSearchParams({
                        sessionId: checkoutData.sessionId,
                        eventTitle: event.title,
                        total,
                      });
                      setLocation(`/events/pay?${params.toString()}`);
                    }}
                  >
                    Enter Payment Details
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl"
                    onClick={() => setCheckoutData(null)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                  </Button>
                </div>
              ) : (
              <>
              <div className="mb-6">
                <span className="text-3xl font-serif font-medium">${event.price}</span>
                <span className="text-muted-foreground ml-2">per person</span>
              </div>

              <div className="flex items-center gap-2 text-sm mb-8 bg-muted/50 p-3 rounded-lg">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-medium">{event.spotsRemaining} spots remaining</span>
              </div>

              {isSoldOut ? (
                <Button className="w-full h-14 text-lg rounded-xl" disabled>
                  Sold Out
                </Button>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isAuthenticated && user && !prefillNoteDismissed && (
                    <div className="flex items-start gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5 text-xs text-foreground/80">
                      <span className="flex-1 leading-relaxed">
                        Signed in as <Link href="/my-events" className="font-medium text-primary hover:underline">{user.firstName} {user.lastName}</Link> — fields pre-filled from your account.
                      </span>
                      <button
                        type="button"
                        onClick={() => { localStorage.setItem("prefill_note_dismissed", "true"); setPrefillNoteDismissed(true); }}
                        className="mt-0.5 text-foreground/40 hover:text-foreground/70 transition-colors flex-shrink-0"
                        aria-label="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Number of Tickets</Label>
                    <Input id="quantity" type="number" min="1" max={event.spotsRemaining ?? event.capacity} required value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value, 10) || 1})} className="bg-background" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seatingPreference">
                      Do you prefer to sit with someone you know?
                      <span className="block text-xs text-muted-foreground font-normal mt-0.5">If yes, provide their name(s)</span>
                    </Label>
                    <Textarea
                      id="seatingPreference"
                      placeholder="e.g. Jane Smith, Michelle Lee"
                      value={formData.seatingPreference}
                      onChange={e => setFormData({...formData, seatingPreference: e.target.value})}
                      className="bg-background resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Do you want to play with blanks and 10 jokers?</Label>
                    <p className="text-xs text-muted-foreground -mt-1">No guarantees</p>
                    <RadioGroup
                      value={formData.jokersPreference}
                      onValueChange={v => setFormData({...formData, jokersPreference: v as typeof formData.jokersPreference})}
                      className="space-y-1 pt-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="jokers-yes" />
                        <Label htmlFor="jokers-yes" className="font-normal cursor-pointer">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="jokers-no" />
                        <Label htmlFor="jokers-no" className="font-normal cursor-pointer">No</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="open" id="jokers-open" />
                        <Label htmlFor="jokers-open" className="font-normal cursor-pointer">I'm open to either</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>What is your skill level?</Label>
                    <RadioGroup
                      value={formData.skillLevel}
                      onValueChange={v => setFormData({...formData, skillLevel: v as typeof formData.skillLevel})}
                      className="space-y-1 pt-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="learn" id="skill-learn" />
                        <Label htmlFor="skill-learn" className="font-normal cursor-pointer">I want to learn how to play</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="learning" id="skill-learning" />
                        <Label htmlFor="skill-learning" className="font-normal cursor-pointer">I'm still learning</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="intermediate" id="skill-intermediate" />
                        <Label htmlFor="skill-intermediate" className="font-normal cursor-pointer">Intermediate</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="advanced" id="skill-advanced" />
                        <Label htmlFor="skill-advanced" className="font-normal cursor-pointer">Advanced</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="couponCode" className="text-sm font-medium">
                      Coupon Code{" "}
                      <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="couponCode"
                      placeholder="Enter code for free registration"
                      value={formData.couponCode}
                      onChange={e => {
                        setFormData({ ...formData, couponCode: e.target.value.toUpperCase() });
                        setCouponStatus("idle");
                      }}
                      className={`bg-background ${couponStatus === "valid" ? "border-green-500 focus-visible:ring-green-500" : couponStatus === "invalid" ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {couponStatus === "valid" && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Coupon applied — this event is FREE</p>
                    )}
                    {couponStatus === "invalid" && (
                      <p className="text-xs text-destructive">That code isn't valid for this event</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg rounded-xl mt-4"
                    disabled={createCheckout.isPending}
                  >
                    {createCheckout.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    Reserve Your Spot
                  </Button>
                </form>
              )}
              </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
