import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

interface SurveyInfo {
  eventTitle: string;
  eventDate: string | null;
  firstName: string;
  alreadySubmitted: boolean;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          <Star
            className={`w-10 h-10 transition-colors ${
              star <= (hovered || value)
                ? "fill-[#C9A227] stroke-[#C9A227]"
                : "fill-none stroke-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [, params] = useRoute("/feedback/:token");
  const token = params?.token ?? "";

  const [info, setInfo] = useState<SurveyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/feedback/${token}`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); return; }
        const data = await r.json();
        setInfo(data);
        if (data.alreadySubmitted) setSubmitted(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError("Please select a rating."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/feedback/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comments }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
      timeZone: "America/New_York",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="font-serif text-2xl mb-2 text-foreground">Survey not found</h1>
          <p className="text-muted-foreground">This link may be invalid or expired. If you think this is an error, please contact us.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Star className="w-8 h-8 fill-primary stroke-primary" />
          </div>
          <h1 className="font-serif text-3xl mb-3 text-foreground">Thank you, {info?.firstName}!</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Your feedback on <strong>{info?.eventTitle}</strong> means the world to us. We use every response to make BougieBams events even better.
          </p>
          <p className="mt-6 text-muted-foreground text-sm">— The BougieBams Team</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm font-medium tracking-widest uppercase text-primary mb-3">BougieBams</p>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">
            How was the event?
          </h1>
          <p className="text-muted-foreground">
            Hi <strong>{info?.firstName}</strong> — we'd love to hear your thoughts on{" "}
            <strong>{info?.eventTitle}</strong>
            {info?.eventDate ? ` on ${formatDate(info.eventDate)}` : ""}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-8">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Overall rating <span className="text-destructive">*</span>
            </label>
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {["", "Needs improvement", "Below expectations", "Good", "Great", "Excellent!"][rating]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground" htmlFor="comments">
              Any comments? <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="comments"
              placeholder="What did you love? What could be better? Any suggestions for future events…"
              className="min-h-[120px] rounded-xl resize-none"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            type="submit"
            className="w-full rounded-xl h-12 text-base"
            disabled={submitting || rating === 0}
          >
            {submitting ? "Submitting…" : "Submit feedback"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your response is private and will only be seen by the BougieBams team.
        </p>
      </div>
    </div>
  );
}
