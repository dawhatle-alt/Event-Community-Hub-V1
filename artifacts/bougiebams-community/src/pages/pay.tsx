import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Square?: any;
  }
}

interface SquareConfig {
  applicationId: string;
  locationId: string;
  environment: string;
}

export default function Pay() {
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("sessionId");
  const orderId = searchParams.get("orderId");
  const eventTitle = searchParams.get("eventTitle") ?? "your event";
  const total = searchParams.get("total") ?? "";

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [config, setConfig] = useState<SquareConfig | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

  // 1. Fetch Square public config from API
  useEffect(() => {
    fetch(`${base}/api/square/config`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setError("Could not load payment configuration. Please try again."));
  }, [base]);

  // 2. Load Web Payments SDK script once we have config
  useEffect(() => {
    if (!config) return;
    if (window.Square) { setSdkReady(true); return; }

    const script = document.createElement("script");
    script.src =
      config.environment === "production"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js";
    script.onload = () => setSdkReady(true);
    script.onerror = () => setError("Could not load the payment form. Please refresh and try again.");
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, [config]);

  // 3. Mount the card form once SDK is ready
  useEffect(() => {
    if (!sdkReady || !config || !containerRef.current || cardRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        const payments = window.Square!.payments(config.applicationId, config.locationId);
        const card = await payments.card();
        if (cancelled) return;
        await card.attach(containerRef.current!);
        cardRef.current = card;
      } catch (e: any) {
        if (!cancelled) setError("Could not initialize the payment form. Please refresh.");
      }
    })();

    return () => { cancelled = true; };
  }, [sdkReady, config]);

  const handlePay = async () => {
    if (!cardRef.current || !sessionId) return;
    setError(null);
    setPaying(true);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK") {
        const msg = result.errors?.map((e: any) => e.message).join(", ") ?? "Card validation failed.";
        setError(msg);
        setPaying(false);
        return;
      }
      const token = result.token;

      const res = await fetch(`${base}/api/registrations/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sourceId: token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Payment failed. Please try again.");
        setPaying(false);
        return;
      }

      setLocation(`/events/confirmation?sessionId=${encodeURIComponent(data.sessionId)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setPaying(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="font-serif text-3xl mb-4">Invalid Session</h1>
        <p className="text-muted-foreground mb-8">No payment session was found.</p>
        <Button asChild><Link href="/events">Browse Events</Link></Button>
      </div>
    );
  }

  return (
    <div className="w-full bg-background min-h-screen py-16">
      <div className="container mx-auto px-4 max-w-lg">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel and return home
        </Link>

        <div className="bg-card rounded-3xl p-8 shadow-lg border border-border">
          <h1 className="font-serif text-3xl font-medium mb-2">Complete Payment</h1>
          <p className="text-muted-foreground text-sm mb-6">{eventTitle}{total ? ` · $${total}` : ""}</p>

          {/* Square Web Payments SDK card form mounts here */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Card Details</label>
            {!sdkReady && !error && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading secure payment form…
              </div>
            )}
            <div
              ref={containerRef}
              id="square-card-container"
              className="rounded-xl border border-border bg-background p-1"
              style={{ minHeight: sdkReady ? 80 : 0 }}
            />
          </div>

          {error && (
            <div className="mb-4 text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <Button
            className="w-full h-14 text-lg rounded-xl"
            onClick={handlePay}
            disabled={!sdkReady || paying || !!error}
          >
            {paying ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {paying ? "Processing…" : `Pay${total ? ` $${total}` : " Now"}`}
          </Button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secured by Square — your card details are never sent to our server
          </div>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
              Cancel and return to home page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
