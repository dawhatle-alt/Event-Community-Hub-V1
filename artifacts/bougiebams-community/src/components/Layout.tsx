import { Link, useLocation } from "wouter";
import logoPath from "@assets/bougiebams-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogIn, LogOut, CalendarDays } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_LINKS = [
  { id: "home",    href: "/",        label: "Home" },
  { id: "events",  href: "/events",  label: "Events" },
  { id: "about",   href: "/about",   label: "About" },
  { id: "contact", href: "/contact", label: "Contact" },
] as const;

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src={logoPath} alt="Bougie Bams Events" className="h-10 w-auto" />
            <span className="font-serif font-semibold text-xl tracking-tight hidden sm:inline-block">Bougie Bams Events</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ id, href, label }) => {
              const isActive = location === href;
              const isHovered = hoveredId === id;
              return (
                <div
                  key={id}
                  className="relative"
                  onMouseEnter={() => setHoveredId(id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <Link
                    href={href}
                    className={cn(
                      "relative z-10 flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200",
                      isHovered
                        ? "text-[#FAF8F5]"
                        : isActive
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </Link>
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        layoutId="nav-highlight"
                        className="absolute inset-0 rounded-xl"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1.05 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        style={{
                          background: "linear-gradient(135deg, #181D37 0%, #252c55 100%)",
                          boxShadow:
                            "0 8px 30px rgba(201,162,39,0.25), 0 4px 12px rgba(24,29,55,0.5), 0 0 0 1px rgba(201,162,39,0.2)",
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {!isLoading && isAuthenticated && (
              <div className="ml-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <Avatar className="h-9 w-9">
                        {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={user.firstName ?? "User"} />}
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-3 py-2 text-sm font-medium truncate">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/my-events" className="flex items-center gap-2 cursor-pointer">
                        <CalendarDays className="h-4 w-4" />
                        My Events
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
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
                {isAuthenticated && (
                  <>
                    <Link href="/my-events" className="text-lg font-medium p-2 hover:bg-muted rounded-md flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      My Events
                    </Link>
                    <button
                      onClick={logout}
                      className="text-lg font-medium p-2 hover:bg-muted rounded-md flex items-center gap-2 text-left text-destructive"
                    >
                      <LogOut className="h-5 w-5" />
                      Log out
                    </button>
                  </>
                )}
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
            <img src={logoPath} alt="BougieBams" className="h-12 w-auto mb-6 opacity-90" style={{ mixBlendMode: "screen" }} />
            <p className="text-muted text-sm leading-relaxed max-w-sm">
              A luxury, intimate mahjong community for everyone. Curated gatherings, rich connections, and elevated experiences.
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
          &copy; {new Date().getFullYear()} Bougie Bams Events. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
