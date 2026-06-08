import { useState, useEffect } from "react";
import { Link } from "wouter";
import { formatDateTimeFullCT } from "@/lib/dateUtils";
import { Calendar, MapPin, Users, Mail, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { motion } from "framer-motion";

interface RegInfo {
  id: number;
  firstName: string;
  lastName: string;
  status: string;
  quantity: number;
  totalAmount: number;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventAddress: string | null;
}

export default function CancelRegistration() {
  const params = new URLSearchParams(window.location.search);
  const regId = params.get("reg");
  const token = params.get("token");

  if (regId && token) {
    return <CancelConfirmPage regId={Number(regId)} token={token} />;
  }
  return <EmailLookupPage />;
}

function EmailLookupPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/registrations/send-cancel-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong");
      }
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/events">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to events
          </Button>
        </Link>

        <h1 className="font-serif text-3xl font-semibold mb-2">Cancel a Registration</h1>
        <p className="text-muted-foreground mb-8">
          Enter the email address you used when registering. We'll send you a secure link to cancel any upcoming registrations.
        </p>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
            <h2 className="font-semibold text-lg text-green-800">Check your email</h2>
            <p className="text-green-700 text-sm leading-relaxed">
              If we found any upcoming registrations for <strong>{email}</strong>, we've sent cancellation links. Each link is valid for 7 days.
            </p>
            <p className="text-green-600 text-xs">
              Didn't receive anything? Check your spam folder or try again.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => { setSent(false); setEmail(""); }}>
              Try a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={submitting}
                className="h-11"
              />
            </div>
            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
            <Button type="submit" className="w-full h-11 rounded-full" disabled={submitting || !email.trim()}>
              <Mail className="h-4 w-4 mr-2" />
              {submitting ? "Sending…" : "Send cancellation link"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

function CancelConfirmPage({ regId, token }: { regId: number; token: string }) {
  const [info, setInfo] = useState<RegInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [result, setResult] = useState<{ refundStatus: string } | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/registrations/${regId}/cancel-info?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Error ${res.status}`);
        }
        return res.json() as Promise<RegInfo>;
      })
      .then((data) => { setInfo(data); setLoading(false); })
      .catch((err) => { setLoadError(err.message); setLoading(false); });
  }, [regId, token]);

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/registrations/${regId}/cancel-by-token?token=${encodeURIComponent(token)}`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <p className="text-muted-foreground">Loading your registration…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        <h1 className="font-serif text-2xl font-semibold">Link invalid or expired</h1>
        <p className="text-muted-foreground">{loadError}</p>
        <p className="text-sm text-muted-foreground">
          Cancellation links expire after 7 days. Request a new one below.
        </p>
        <Link href="/cancel">
          <Button className="rounded-full px-8">Request a new link</Button>
        </Link>
      </div>
    );
  }

  if (result) {
    const refunded = result.refundStatus === "refunded";
    const refundFailed = result.refundStatus === "failed";
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
          <h1 className="font-serif text-2xl font-semibold">Registration cancelled</h1>
          <p className="text-muted-foreground">
            Your registration for <strong>{info?.eventTitle}</strong> has been cancelled and your spot released.
          </p>
          {refunded && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
              A full refund of <strong>${info?.totalAmount.toFixed(2)}</strong> has been issued to your original payment method. Please allow a few business days to appear.
            </div>
          )}
          {refundFailed && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              We couldn't process your refund automatically. Please contact us and we'll issue it manually.
            </div>
          )}
          <div className="pt-2">
            <Link href="/events">
              <Button className="rounded-full px-8">Browse other events</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const isCancelled = info?.status === "cancelled";
  const isPaid = info?.status === "paid";
  const hasCost = (info?.totalAmount ?? 0) > 0;

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <Link href="/cancel">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
          </Link>
          <h1 className="font-serif text-2xl font-semibold">Cancel Registration</h1>
          {info && (
            <p className="text-muted-foreground mt-1">
              Hi {info.firstName} — please confirm you'd like to cancel your spot.
            </p>
          )}
        </div>

        {info && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="font-serif font-semibold text-lg">{info.eventTitle}</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{formatDateTimeFullCT(info.eventDate)} CT</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{info.eventLocation}{info.eventAddress ? ` · ${info.eventAddress}` : ""}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {info.quantity} ticket{info.quantity !== 1 ? "s" : ""}
                  {hasCost ? ` · $${info.totalAmount.toFixed(2)} total` : " · Free"}
                </span>
              </div>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground text-center">
            This registration is already cancelled.
          </div>
        )}

        {cancelError && (
          <p className="text-destructive text-sm">{cancelError}</p>
        )}

        {!isCancelled && (
          <div className="space-y-3">
            {isPaid && hasCost && (
              <p className="text-sm text-muted-foreground">
                Since your payment was confirmed, a full refund of <strong>${info?.totalAmount.toFixed(2)}</strong> will be issued automatically.
              </p>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full rounded-full"
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling…" : isPaid && hasCost ? "Cancel & Refund" : "Cancel Registration"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm cancellation</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel your registration for <strong>{info?.eventTitle}</strong> and release your spot.
                    {isPaid && hasCost && (
                      <> A full refund of <strong>${info?.totalAmount.toFixed(2)}</strong> will be issued to your original payment method.</>
                    )}
                    {" "}This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my spot</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isPaid && hasCost ? "Yes, cancel & refund" : "Yes, cancel"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Link href="/events">
              <Button variant="ghost" className="w-full rounded-full text-muted-foreground">
                Keep my registration
              </Button>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
