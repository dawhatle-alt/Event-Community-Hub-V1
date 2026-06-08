import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Instagram, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Message Sent",
        description: "We've received your message and will be in touch soon.",
      });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <div className="w-full bg-background min-h-screen py-20">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="font-serif text-5xl md:text-6xl font-medium mb-6">Say Hello</h1>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            Have a question about an upcoming gathering? Interested in partnering with us? We'd love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-12 bg-card rounded-3xl overflow-hidden shadow-lg border border-border">
          <div className="md:col-span-2 bg-foreground text-background p-10 flex flex-col justify-between">
            <div>
              <h3 className="font-serif text-3xl font-medium mb-8">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Mail className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <div className="font-medium">Email Us</div>
                    <a href="mailto:patsy@bougiebams.com" className="text-background/80 font-light mt-1 hover:text-primary transition-colors">patsy@bougiebams.com</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <div className="font-medium">Location</div>
                    <div className="text-background/80 font-light mt-1">Based in Leander, TX</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <h4 className="font-serif text-xl mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <a
                  href="https://instagram.com/bougiebams"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow @bougiebams on Instagram"
                  className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary hover:text-foreground transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <span className="self-center text-sm text-background/60 font-light">@bougiebams</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 p-10 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" required className="bg-background border-border/50 focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" required className="bg-background border-border/50 focus:border-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" required className="bg-background border-border/50 focus:border-primary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message" 
                  required 
                  className="min-h-[150px] bg-background border-border/50 focus:border-primary resize-none" 
                />
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="w-full md:w-auto rounded-xl px-8 h-14 text-base"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
