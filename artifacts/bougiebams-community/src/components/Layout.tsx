import { Link, useLocation } from "wouter";
import logoPath from "@assets/bougiebams-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile menu on navigate
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src={logoPath} alt="BougieBams" className="h-10 w-auto" />
            <span className="font-serif font-semibold text-xl tracking-tight hidden sm:inline-block">BougieBams</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className={cn("text-sm font-medium transition-colors hover:text-primary", location === "/" ? "text-primary" : "text-muted-foreground")}>Home</Link>
            <Link href="/events" className={cn("text-sm font-medium transition-colors hover:text-primary", location === "/events" ? "text-primary" : "text-muted-foreground")}>Events</Link>
            <Link href="/about" className={cn("text-sm font-medium transition-colors hover:text-primary", location === "/about" ? "text-primary" : "text-muted-foreground")}>About</Link>
            <Link href="/contact" className={cn("text-sm font-medium transition-colors hover:text-primary", location === "/contact" ? "text-primary" : "text-muted-foreground")}>Contact</Link>
            <Link href="/events" className="text-sm">
              <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6 shadow-sm">
                Join Us
              </Button>
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t overflow-hidden bg-background"
            >
              <nav className="flex flex-col p-4 space-y-4">
                <Link href="/" className="text-lg font-medium p-2 hover:bg-muted rounded-md">Home</Link>
                <Link href="/events" className="text-lg font-medium p-2 hover:bg-muted rounded-md">Events</Link>
                <Link href="/about" className="text-lg font-medium p-2 hover:bg-muted rounded-md">About</Link>
                <Link href="/contact" className="text-lg font-medium p-2 hover:bg-muted rounded-md">Contact</Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 w-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="h-full flex flex-col"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-foreground text-background py-16 mt-auto">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <img src={logoPath} alt="BougieBams" className="h-12 w-auto mb-6 brightness-0 invert opacity-90" />
            <p className="text-muted text-sm leading-relaxed max-w-sm">
              A luxury, intimate event community for Black women. Curated gatherings, rich connections, and elevated experiences.
            </p>
          </div>
          <div>
            <h4 className="font-serif text-lg mb-4 text-primary">Explore</h4>
            <ul className="space-y-3 text-sm text-muted">
              <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/events" className="hover:text-primary transition-colors">Events</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif text-lg mb-4 text-primary">Connect</h4>
            <ul className="space-y-3 text-sm text-muted">
              <li><a href="#" className="hover:text-primary transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">TikTok</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Facebook</a></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-muted/20 text-sm text-muted/60 text-center">
          &copy; {new Date().getFullYear()} BougieBams Community & Events. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
