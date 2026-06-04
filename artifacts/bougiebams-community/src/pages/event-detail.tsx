import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar, MapPin, Users, ArrowLeft, Loader2 } from "lucide-react";
import { useGetEvent, useCreateCheckoutSession, getGetEventQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import img3 from "@assets/bb-image-3.png";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const eventId = parseInt(id || "0", 10);

  const { data: event, isLoading } = useGetEvent(eventId, {
    query: { enabled: !!eventId, queryKey: getGetEventQueryKey(eventId) }
  });

  const createCheckout = useCreateCheckoutSession();
  const { user, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    quantity: 1
  });

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
          quantity: formData.quantity
        }
      },
      {
        onSuccess: (data) => {
          window.location.href = data.url; // Redirect to Stripe
        }
      }
    );
  };

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <div className="relative h-[40vh] min-h-[300px] w-full">
        <img 
          src={event.imageUrl || img3} 
          alt={event.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-background/20" />
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
                    <div className="font-medium text-foreground">{format(new Date(event.date), "MMMM d, yyyy")}</div>
                    <div className="text-sm">{format(new Date(event.date), "h:mm a")}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">{event.location}</div>
                    {event.address && <div className="text-sm">{event.address}</div>}
                  </div>
                </div>
              </div>

              <div className="prose prose-lg prose-headings:font-serif dark:prose-invert max-w-none">
                <h3 className="text-2xl font-serif font-medium text-foreground">About this experience</h3>
                <p className="whitespace-pre-wrap font-light leading-relaxed">{event.description}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-card p-8 rounded-3xl shadow-lg border border-primary/20">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
