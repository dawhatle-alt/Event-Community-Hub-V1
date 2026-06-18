import { useState, useMemo, useEffect } from "react";
import {
  useListEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useGetRegistrationStats,
  useListEventRegistrations,
  useRequestUploadUrl,
  getListEventsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Calendar, Users, DollarSign, Lock, Upload, X, ChevronDown, ChevronRight, XCircle, RotateCcw, CheckCircle2, LayoutGrid, Star, MessageSquare, Send, ClipboardList, BellRing, Bell, Download, Search, ShoppingBag, Trash } from "lucide-react";
import { getHeroTiles, saveHeroTiles, AVAILABLE_PHOTOS, DEFAULT_TILES, type TileConfig } from "@/lib/heroTiles";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FAVORITES, CATEGORIES, CATEGORY_DESCRIPTIONS } from "@/data/favorites";

const ADMIN_KEY = "bb_admin_auth";

function getStoredPassword(): string | null {
  try { return sessionStorage.getItem(ADMIN_KEY); } catch { return null; }
}
function storePassword(pw: string) {
  try { sessionStorage.setItem(ADMIN_KEY, pw); } catch { /* ignore */ }
}
function clearPassword() {
  try { sessionStorage.removeItem(ADMIN_KEY); } catch { /* ignore */ }
}

function AdminLoginGate({ onAuth }: { onAuth: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/registrations/stats", {
        headers: { Authorization: `Bearer ${pw}` },
      });
      if (res.ok) {
        onAuth(pw);
      } else if (res.status === 503) {
        setError("Admin access is not configured on this server.");
      } else if (res.status === 401 || res.status === 403) {
        setError("Incorrect password. Please try again.");
      } else {
        onAuth(pw);
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-serif text-3xl text-foreground mb-2">Admin Access</h1>
          <p className="text-muted-foreground text-sm">Enter your admin password to continue.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              className="rounded-xl"
              autoFocus
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full rounded-xl" disabled={loading}>
            {loading ? "Verifying…" : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-green-100 text-green-700">{status}</span>;
  if (status === "cancelled") return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-red-100 text-red-600">{status}</span>;
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-yellow-100 text-yellow-700">{status}</span>;
}

function EventRegistrationsPanel({ eventId, eventTitle, adminHeaders }: { eventId: number; eventTitle: string; adminHeaders: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [reinstating, setReinstating] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleExportCSV = () => {
    if (!regs?.length) return;
    const headers = ["First Name", "Last Name", "Email", "Phone", "Qty", "Total ($)", "Status", "Seating", "Jokers", "Skill Level", "Referred By", "Referral Code", "Guest Names", "Registered At", "Reminder Sent"];
    const rows = regs.map(r => [
      r.firstName,
      r.lastName,
      r.email,
      (r as any).phone ?? "",
      String(r.quantity),
      String(r.totalAmount ?? "0"),
      r.status,
      (r as any).seatingPreference ?? "",
      (r as any).jokersPreference ?? "",
      (r as any).skillLevel ?? "",
      (r as any).referredBy ?? "",
      (r as any).referralCode ?? "",
      (() => { try { const g = (r as any).guestNames; return g ? JSON.parse(g).join("; ") : ""; } catch { return (r as any).guestNames ?? ""; } })(),
      r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
      (r as any).reminderSentAt ? new Date((r as any).reminderSentAt).toLocaleString() : "",
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const queryKey = ["event-registrations", eventId];
  const { data: regs, isLoading } = useListEventRegistrations(eventId, {
    request: { headers: adminHeaders },
    query: { enabled: open, queryKey: queryKey as any },
  });

  const counts = useMemo(() => {
    if (!regs) return { paid: 0, pending: 0, cancelled: 0 };
    return regs.reduce(
      (acc, r) => {
        if (r.status === "paid") acc.paid++;
        else if (r.status === "cancelled") acc.cancelled++;
        else acc.pending++;
        return acc;
      },
      { paid: 0, pending: 0, cancelled: 0 }
    );
  }, [regs]);

  const handleCancel = async (regId: number, name: string) => {
    if (!confirm(`Remove ${name}'s registration? This will cancel it and restore their spot(s) to the event.`)) return;
    setCancelling(regId);
    try {
      const res = await fetch(`/api/registrations/${regId}/cancel`, {
        method: "POST",
        headers: adminHeaders,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Failed to remove", description: err.error ?? "Unknown error", variant: "destructive" });
        return;
      }
      const data = await res.json().catch(() => ({}));
      const refundStatus: string = data.refundStatus ?? "no_payment";
      if (refundStatus === "refunded") {
        toast({ title: "Registration cancelled & refunded", description: "A full refund was issued to the attendee via Square." });
      } else if (refundStatus === "failed") {
        toast({ title: "Registration cancelled — refund failed", description: "The registration was cancelled but the Square refund could not be processed. Please issue it manually in Square.", variant: "destructive" });
      } else {
        toast({ title: "Registration cancelled", description: "No charge had been made, so no refund was needed." });
      }
      queryClient.invalidateQueries({ queryKey });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setCancelling(null);
    }
  };

  const handleMarkPaid = async (regId: number, name: string) => {
    if (!confirm(`Mark ${name}'s registration as paid? This confirms their spot and sends them a confirmation email.`)) return;
    setMarkingPaid(regId);
    try {
      const res = await fetch(`/api/registrations/${regId}/mark-paid`, {
        method: "POST",
        headers: adminHeaders,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Failed to mark as paid", description: err.error ?? "Unknown error", variant: "destructive" });
        return;
      }
      toast({ title: "Marked as paid", description: "Registration confirmed and confirmation email sent." });
      queryClient.invalidateQueries({ queryKey });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleReinstate = async (regId: number) => {
    if (!confirm("Reinstate this registration? This will mark it as paid and reduce available spots by the registered quantity.")) return;
    setReinstating(regId);
    try {
      const res = await fetch(`/api/registrations/${regId}/reinstate`, {
        method: "POST",
        headers: adminHeaders,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Failed to reinstate", description: err.error ?? "Unknown error", variant: "destructive" });
        return;
      }
      toast({ title: "Registration reinstated" });
      queryClient.invalidateQueries({ queryKey });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setReinstating(null);
    }
  };

  return (
    <div className="border-t border-border mt-2 pt-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
        >
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Registrations
          {regs && regs.length > 0 && (
            <span className="ml-1 flex gap-1">
              {counts.paid > 0 && <span className="bg-green-100 text-green-700 rounded px-1">{counts.paid} paid</span>}
              {counts.pending > 0 && <span className="bg-yellow-100 text-yellow-700 rounded px-1">{counts.pending} pending</span>}
              {counts.cancelled > 0 && <span className="bg-red-100 text-red-600 rounded px-1">{counts.cancelled} cancelled</span>}
            </span>
          )}
        </button>
        {regs && regs.length > 0 && (
          <button
            onClick={handleExportCSV}
            title="Export attendee list as CSV"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 text-xs space-y-1">
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !regs?.length ? (
            <p className="text-muted-foreground">No registrations yet.</p>
          ) : (
            regs.map((r) => (
              <div
                key={r.id}
                className={`rounded px-2 py-1.5 ${r.status === "cancelled" ? "bg-red-50/60 opacity-80" : "bg-muted/40"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-medium ${r.status === "cancelled" ? "line-through text-muted-foreground" : ""}`}>
                    {r.firstName} {r.lastName}
                  </span>
                  <span className="text-muted-foreground truncate">{r.email}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <StatusBadge status={r.status} />
                    {(r as any).reminderSentAt ? (
                      <span title={`Reminder sent ${new Date((r as any).reminderSentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}>
                        <Bell className="w-3 h-3 text-primary/60" />
                      </span>
                    ) : r.status === "paid" ? (
                      <span title="No reminder sent yet">
                        <Bell className="w-3 h-3 text-muted-foreground/30" />
                      </span>
                    ) : null}
                    {r.status === "cancelled" ? (
                      <button
                        onClick={() => handleReinstate(r.id)}
                        disabled={reinstating === r.id}
                        title="Reinstate registration"
                        className="ml-1 text-primary hover:text-primary/80 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    ) : (
                      <>
                        {r.status === "pending" && (
                          <button
                            onClick={() => handleMarkPaid(r.id, `${r.firstName} ${r.lastName}`)}
                            disabled={markingPaid === r.id}
                            title="Mark as paid"
                            className="ml-1 text-green-600 hover:text-green-700 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCancel(r.id, `${r.firstName} ${r.lastName}`)}
                          disabled={cancelling === r.id}
                          title="Remove registration"
                          className="ml-1 text-muted-foreground hover:text-destructive disabled:opacity-50 transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {((r as any).seatingPreference || (r as any).jokersPreference || (r as any).skillLevel || (r as any).referredBy || (r as any).guestNames) && (
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground pl-0.5">
                    {(r as any).guestNames && (() => { try { const g: string[] = JSON.parse((r as any).guestNames); return g.length > 0 ? <span><span className="font-medium text-foreground/70">Guests:</span> {g.join(", ")}</span> : null; } catch { return null; } })()}
                    {(r as any).seatingPreference && (
                      <span><span className="font-medium text-foreground/70">Seating:</span> {(r as any).seatingPreference}</span>
                    )}
                    {(r as any).jokersPreference && (
                      <span><span className="font-medium text-foreground/70">Jokers:</span> {{ yes: "Yes", no: "No", open: "Open to either" }[(r as any).jokersPreference] ?? (r as any).jokersPreference}</span>
                    )}
                    {(r as any).skillLevel && (
                      <span><span className="font-medium text-foreground/70">Skill:</span> {{ learn: "Want to learn", learning: "Still learning", intermediate: "Intermediate", advanced: "Advanced" }[(r as any).skillLevel] ?? (r as any).skillLevel}</span>
                    )}
                    {(r as any).referredBy && (
                      <span className="text-[#C9A227]"><span className="font-medium text-foreground/70">Referred by:</span> <span className="font-mono">{(r as any).referredBy}</span></span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface FeedbackResponse {
  id: number;
  rating: number;
  comments: string | null;
  submittedAt: string;
  firstName: string | null;
  lastName: string | null;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`w-3 h-3 ${s <= rating ? "fill-[#C9A227] stroke-[#C9A227]" : "fill-none stroke-muted-foreground"}`} />
      ))}
    </span>
  );
}

function EventFeedbackPanel({ event, adminHeaders }: { event: any; adminHeaders: Record<string, string> }) {
  const isPast = new Date(event.date) < new Date();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [responses, setResponses] = useState<FeedbackResponse[] | null>(null);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const { toast } = useToast();

  const fetchResponses = async () => {
    setLoadingResponses(true);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/feedback`, { headers: adminHeaders });
      if (res.ok) setResponses(await res.json());
    } catch { /* ignore */ }
    finally { setLoadingResponses(false); }
  };

  const toggleOpen = () => {
    if (!open && responses === null) fetchResponses();
    setOpen(o => !o);
  };

  const handleSend = async () => {
    if (!confirm(`Send a feedback survey email to all paid attendees of "${event.title}"? Anyone already sent a survey will be skipped.`)) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/send-feedback`, {
        method: "POST",
        headers: adminHeaders,
      });
      const body = await res.json();
      if (res.ok) {
        toast({ title: `Survey sent to ${body.sent} attendee${body.sent !== 1 ? "s" : ""}${body.skipped ? ` (${body.skipped} skipped)` : ""}` });
        fetchResponses();
      } else {
        toast({ title: "Failed to send", description: body.error ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSending(false); }
  };

  if (!isPast) return null;

  return (
    <div className="border-t border-border mt-2 pt-2">
      <div className="flex items-center justify-between">
        <button
          onClick={toggleOpen}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
        >
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <MessageSquare className="w-3 h-3" />
          Feedback
          {responses !== null && responses.length > 0 && (
            <span className="ml-1 bg-primary/10 text-primary rounded px-1">{responses.length} response{responses.length !== 1 ? "s" : ""}</span>
          )}
          {responses !== null && responses.length === 0 && (
            <span className="ml-1 text-muted-foreground">(none yet)</span>
          )}
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium disabled:opacity-50 transition-colors"
          title="Send feedback survey to paid attendees"
        >
          <Send className="w-3 h-3" />
          {sending ? "Sending…" : "Send Survey"}
        </button>
      </div>
      {open && (
        <div className="mt-2 text-xs space-y-1">
          {loadingResponses ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !responses?.length ? (
            <p className="text-muted-foreground">No feedback responses yet.</p>
          ) : responses.map(r => (
            <div key={r.id} className="bg-muted/40 rounded px-2 py-1.5 space-y-0.5">
              <div className="flex items-center gap-2">
                <StarDisplay rating={r.rating} />
                <span className="text-muted-foreground">
                  {r.firstName} {r.lastName} · {new Date(r.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              {r.comments && <p className="text-foreground/80 leading-relaxed pl-0.5">"{r.comments}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WaitlistPanel({ eventId, adminHeaders }: { eventId: number; adminHeaders: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [notifying, setNotifying] = useState(false);
  const { toast } = useToast();

  // Eagerly fetch count on mount for at-a-glance display
  useEffect(() => {
    fetch(`/api/waitlist/${eventId}/count`, { headers: adminHeaders })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCount(data.count); })
      .catch(() => {});
  }, [eventId]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/waitlist/${eventId}`, { headers: adminHeaders });
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
        setCount(data.length);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const toggleOpen = () => {
    if (!open && entries === null) fetchEntries();
    setOpen(o => !o);
  };

  const handleNotifyAll = async () => {
    if (!confirm(`Send a spot-available email to all unnotified people on this waitlist? People already notified will be skipped.`)) return;
    setNotifying(true);
    try {
      const res = await fetch(`/api/waitlist/${eventId}/notify-all`, {
        method: "POST",
        headers: adminHeaders,
      });
      const body = await res.json();
      if (res.ok) {
        if (body.sent === 0) {
          toast({ title: "No one to notify", description: "Everyone on the waitlist has already been notified." });
        } else {
          toast({ title: `Notified ${body.sent} person${body.sent !== 1 ? "s" : ""}`, description: "Spot-available emails sent." });
        }
        // Refresh entries if panel is open
        if (open) fetchEntries();
      } else {
        toast({ title: "Failed to send", description: body.error ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setNotifying(false);
    }
  };

  const handleRemove = async (id: number, name: string) => {
    if (!confirm(`Remove ${name} from the waitlist?`)) return;
    setRemoving(id);
    try {
      const res = await fetch(`/api/waitlist/${id}`, { method: "DELETE", headers: adminHeaders });
      if (res.ok) {
        setEntries(prev => prev?.filter(e => e.id !== id) ?? null);
        toast({ title: `${name} removed from waitlist` });
      } else {
        toast({ title: "Failed to remove", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="border-t border-border mt-2 pt-2">
      <div className="flex items-center justify-between">
        <button
          onClick={toggleOpen}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
        >
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <ClipboardList className="w-3 h-3" />
          Waitlist
          {count !== null && count > 0 && (
            <span className="ml-1 bg-amber-100 text-amber-700 rounded px-1">{count} waiting</span>
          )}
          {count !== null && count === 0 && (
            <span className="ml-1 text-muted-foreground">(empty)</span>
          )}
        </button>
        {count !== null && count > 0 && (
          <button
            onClick={handleNotifyAll}
            disabled={notifying}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium disabled:opacity-50 transition-colors"
            title="Email all unnotified waitlist members that a spot is available"
          >
            <Send className="w-3 h-3" />
            {notifying ? "Sending…" : "Notify all"}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 text-xs space-y-1">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !entries?.length ? (
            <p className="text-muted-foreground">No one on the waitlist yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_1.2fr_1fr_auto_auto] gap-x-3 px-2 py-1 text-muted-foreground font-medium uppercase tracking-wide text-[10px]">
                <span>Name</span>
                <span>Email</span>
                <span>Phone</span>
                <span>Status</span>
                <span></span>
              </div>
              {entries.map(e => (
                <div key={e.id} className="grid grid-cols-[1fr_1.2fr_1fr_auto_auto] gap-x-3 items-center bg-muted/40 rounded px-2 py-1.5">
                  <div className="min-w-0">
                    <span className="font-medium truncate block">{e.firstName} {e.lastName}</span>
                    <span className="text-muted-foreground text-[10px]">{new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                  <span className="text-muted-foreground truncate">{e.email}</span>
                  <span className="text-muted-foreground">{e.phone || "—"}</span>
                  {e.notified
                    ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-green-100 text-green-700 whitespace-nowrap">Notified</span>
                    : <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-100 text-amber-700 whitespace-nowrap">Waiting</span>
                  }
                  <button
                    onClick={() => handleRemove(e.id, `${e.firstName} ${e.lastName}`)}
                    disabled={removing === e.id}
                    className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                    title="Remove from waitlist"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EventAnnouncementPanel({ eventId, adminHeaders }: { eventId: number; adminHeaders: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; total: number; ts: Date } | null>(null);
  const { toast } = useToast();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    if (!confirm(`Send this push notification to all paid registrants of this event who have the app installed?`)) return;
    setSending(true);
    try {
      const res = await fetch(`/api/notifications/blast/${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastResult({ sent: data.sent, total: data.total ?? data.sent, ts: new Date() });
        if (data.sent === 0) {
          toast({ title: "No notifications sent", description: data.message ?? "No registrants have push tokens registered." });
        } else {
          toast({ title: `Announcement sent to ${data.sent} device${data.sent !== 1 ? "s" : ""}` });
        }
        setTitle("");
        setBody("");
      } else {
        toast({ title: "Failed to send", description: data.error ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-border mt-2 pt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <BellRing className="w-3 h-3" />
        Send Announcement
        {lastResult && (
          <span className="ml-1 text-muted-foreground font-normal">
            — last sent {format(lastResult.ts, "h:mm a")} ({lastResult.sent}/{lastResult.total} delivered)
          </span>
        )}
      </button>
      {open && (
        <form onSubmit={handleSend} className="mt-2 space-y-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground/70">Notification Title</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Doors open early tonight!"
              className="h-7 text-xs rounded-lg"
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground/70">Message</label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="e.g. We're opening doors at 6 PM instead of 7 PM. See you soon!"
              className="text-xs rounded-lg min-h-[60px] resize-none"
              maxLength={256}
              required
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-7 text-xs rounded-lg"
            disabled={sending || !title.trim() || !body.trim()}
          >
            <Send className="w-3 h-3 mr-1" />
            {sending ? "Sending…" : "Send to all registrants"}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Sends immediately to all paid registrants who have the mobile app installed and notifications enabled.
          </p>
        </form>
      )}
    </div>
  );
}

interface CustomProduct {
  id: string;
  dbId: number;
  name: string;
  category: string;
  description: string;
  affiliateUrl: string;
  image: string | null;
}

const BLANK_CUSTOM = { name: "", category: CATEGORIES[0], description: "", affiliateUrl: "" };

function PhotoTile({
  image,
  name,
  isUploading,
  isRemoving,
  anyBusy,
  onUpload,
  onRemove,
}: {
  image: string | null;
  name: string;
  isUploading: boolean;
  isRemoving: boolean;
  anyBusy: boolean;
  onUpload: (f: File) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="aspect-square relative rounded-xl overflow-hidden border border-border bg-muted group flex-shrink-0 w-16 h-16">
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#C9A227]/20 to-[#181D37]/20">
          <span className="font-serif text-lg text-[#C9A227]/50 font-medium">BB</span>
        </div>
      )}
      <label className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${isUploading ? "opacity-100" : ""}`}>
        <div className="flex flex-col items-center gap-0.5 text-white text-center px-1">
          {isUploading ? <span className="text-[10px]">…</span> : <Upload className="w-3 h-3" />}
        </div>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={anyBusy}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }}
        />
      </label>
      {image && !isUploading && onRemove && (
        <button
          onClick={onRemove}
          disabled={anyBusy}
          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive disabled:opacity-40"
          title="Remove photo"
        >
          {isRemoving ? <span className="text-[8px]">…</span> : <X className="w-2.5 h-2.5" />}
        </button>
      )}
    </div>
  );
}

function FavoritesSection({ adminPassword }: { adminPassword: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const requestUploadUrl = useRequestUploadUrl({ request: { headers: { Authorization: `Bearer ${adminPassword}` } } });
  const adminHeaders = { Authorization: `Bearer ${adminPassword}` };

  // ── state ──────────────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK_CUSTOM);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFilePreview, setFormFilePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // ── data ───────────────────────────────────────────────────────────────────
  const { data: imagesData } = useQuery<{ images: Record<string, string> }>({
    queryKey: ["favorites-images"],
    queryFn: async () => {
      const res = await fetch("/api/favorites/images");
      if (!res.ok) return { images: {} };
      return res.json();
    },
    staleTime: 0,
  });
  const imageMap = imagesData?.images ?? {};

  const { data: customData, refetch: refetchCustom } = useQuery<{ products: CustomProduct[] }>({
    queryKey: ["admin-favorites-custom"],
    queryFn: async () => {
      const res = await fetch("/api/favorites/custom-products");
      if (!res.ok) return { products: [] };
      return res.json();
    },
    staleTime: 0,
  });
  const customProducts = customData?.products ?? [];

  // ── helpers ────────────────────────────────────────────────────────────────
  const anyBusy = uploading !== null || removing !== null || saving || deleting !== null;

  const doUpload = async (file: File): Promise<string> => {
    const result = await new Promise<{ uploadURL: string; objectPath: string }>((resolve, reject) => {
      requestUploadUrl.mutate(
        { data: { name: file.name, size: file.size, contentType: file.type } },
        { onSuccess: resolve, onError: reject }
      );
    });
    await fetch(result.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    return result.objectPath;
  };

  // ── static product photo upload / remove ──────────────────────────────────
  const handleStaticUpload = async (productId: string, file: File) => {
    setUploading(productId);
    try {
      const objectPath = await doUpload(file);
      const res = await fetch(`/api/admin/favorites/${productId}/image`, {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath }),
      });
      if (!res.ok) throw new Error();
      await queryClient.invalidateQueries({ queryKey: ["favorites-images"] });
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleStaticRemove = async (productId: string) => {
    setRemoving(productId);
    try {
      await fetch(`/api/admin/favorites/${productId}/image`, { method: "DELETE", headers: adminHeaders });
      await queryClient.invalidateQueries({ queryKey: ["favorites-images"] });
      toast({ title: "Photo removed" });
    } catch {
      toast({ title: "Remove failed", variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  };

  // ── custom product photo upload ────────────────────────────────────────────
  const handleCustomPhotoUpload = async (dbId: number, file: File) => {
    const key = `cp-${dbId}`;
    setUploading(key);
    try {
      const objectPath = await doUpload(file);
      const res = await fetch(`/api/admin/favorites/custom-products/${dbId}/image`, {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath }),
      });
      if (!res.ok) throw new Error();
      await refetchCustom();
      await queryClient.invalidateQueries({ queryKey: ["favorites-custom-products"] });
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  // ── form helpers ──────────────────────────────────────────────────────────
  const openAddForm = () => {
    setEditingId(null);
    setForm(BLANK_CUSTOM);
    setFormFile(null);
    setFormFilePreview(null);
    setShowAddForm(true);
  };

  const openEditForm = (p: CustomProduct) => {
    setEditingId(p.dbId);
    setForm({ name: p.name, category: p.category, description: p.description, affiliateUrl: p.affiliateUrl });
    setFormFile(null);
    setFormFilePreview(p.image);
    setShowAddForm(true);
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setForm(BLANK_CUSTOM);
    setFormFile(null);
    setFormFilePreview(null);
  };

  const handleFormFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFormFile(f);
    const url = URL.createObjectURL(f);
    setFormFilePreview(url);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category.trim()) {
      toast({ title: "Name and category are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let objectPath: string | undefined;
      if (formFile) {
        objectPath = await doUpload(formFile);
      }

      if (editingId !== null) {
        const body: Record<string, unknown> = { ...form };
        if (objectPath) body.objectPath = objectPath;
        const res = await fetch(`/api/admin/favorites/custom-products/${editingId}`, {
          method: "PUT",
          headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        if (objectPath) {
          await fetch(`/api/admin/favorites/custom-products/${editingId}/image`, {
            method: "POST",
            headers: { ...adminHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ objectPath }),
          });
        }
        toast({ title: "Product updated" });
      } else {
        const body: Record<string, unknown> = { ...form };
        if (objectPath) body.objectPath = objectPath;
        const res = await fetch("/api/admin/favorites/custom-products", {
          method: "POST",
          headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        toast({ title: "Product added" });
      }

      await refetchCustom();
      await queryClient.invalidateQueries({ queryKey: ["favorites-custom-products"] });
      cancelForm();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dbId: number) => {
    setDeleting(dbId);
    try {
      await fetch(`/api/admin/favorites/custom-products/${dbId}`, { method: "DELETE", headers: adminHeaders });
      await refetchCustom();
      await queryClient.invalidateQueries({ queryKey: ["favorites-custom-products"] });
      toast({ title: "Product deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const uploadedCount = Object.keys(imageMap).length;

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="p-6 border-b border-border flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-primary" />
        <h3 className="font-serif text-xl font-medium">Favorites Products</h3>
      </div>

      {/* ── Custom Products ─────────────────────────────────── */}
      <div className="p-6 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-sm">Custom Products</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Add new products that appear on the Favorites page alongside the existing ones.</p>
          </div>
          {!showAddForm && (
            <Button size="sm" className="rounded-xl gap-1.5" onClick={openAddForm}>
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          )}
        </div>

        {/* Add / Edit form */}
        {showAddForm && (
          <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">{editingId !== null ? "Edit Product" : "New Product"}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Pink Flamingos"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category *</Label>
                <select
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Short description shown on the card"
                  className="text-sm resize-none h-16"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Amazon Affiliate URL</Label>
                <Input
                  value={form.affiliateUrl}
                  onChange={e => setForm(p => ({ ...p, affiliateUrl: e.target.value }))}
                  placeholder="https://amzn.to/..."
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Photo (optional)</Label>
                <div className="flex items-center gap-3">
                  {formFilePreview && (
                    <img src={formFilePreview} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0" />
                  )}
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-primary/50 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    {formFilePreview ? "Replace photo" : "Choose photo"}
                    <input type="file" accept="image/*" className="sr-only" onChange={handleFormFileChange} />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="rounded-xl" disabled={saving} onClick={handleSave}>
                {saving ? "Saving…" : editingId !== null ? "Save Changes" : "Add Product"}
              </Button>
              <Button size="sm" variant="ghost" className="rounded-xl" disabled={saving} onClick={cancelForm}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Custom product list */}
        {customProducts.length > 0 ? (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {customProducts.map((p) => {
              const key = `cp-${p.dbId}`;
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                  <PhotoTile
                    image={p.image}
                    name={p.name}
                    isUploading={uploading === key}
                    isRemoving={false}
                    anyBusy={anyBusy}
                    onUpload={(f) => handleCustomPhotoUpload(p.dbId, f)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                    {p.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8" title="Edit" onClick={() => openEditForm(p)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      title="Delete"
                      disabled={deleting === p.dbId || anyBusy}
                      onClick={() => handleDelete(p.dbId)}
                    >
                      {deleting === p.dbId ? <span className="text-xs">…</span> : <Trash className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !showAddForm && (
            <p className="text-sm text-muted-foreground py-2">No custom products yet. Click "Add Product" to get started.</p>
          )
        )}
      </div>

      {/* ── Static product photo management ─────────────────── */}
      <div className="p-6 space-y-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-sm">Existing Products — Photo Management</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{uploadedCount} of {FAVORITES.length} photos uploaded. Hover a tile to upload or replace its photo.</p>
          </div>
        </div>
        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const products = FAVORITES.filter((p) => p.category === cat);
            return (
              <div key={cat}>
                <div className="mb-3">
                  <h5 className="font-serif text-base font-medium text-foreground">{cat}</h5>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                  {products.map((product) => {
                    const currentImage = imageMap[product.id];
                    return (
                      <div key={product.id} className="flex flex-col gap-1.5">
                        <div className="aspect-square relative rounded-xl overflow-hidden border border-border bg-muted group w-full">
                          {currentImage ? (
                            <img src={currentImage} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#C9A227]/20 to-[#181D37]/20">
                              <span className="font-serif text-2xl text-[#C9A227]/50 font-medium">BB</span>
                            </div>
                          )}
                          <label className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${uploading === product.id ? "opacity-100" : ""}`}>
                            <div className="flex flex-col items-center gap-1 text-white text-center px-2">
                              {uploading === product.id ? (
                                <span className="text-xs">Uploading…</span>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  <span className="text-xs font-medium leading-tight">{currentImage ? "Replace" : "Upload"}</span>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              disabled={anyBusy}
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleStaticUpload(product.id, f); e.target.value = ""; }}
                            />
                          </label>
                          {currentImage && uploading !== product.id && (
                            <button
                              onClick={() => handleStaticRemove(product.id)}
                              disabled={anyBusy}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive disabled:opacity-40"
                            >
                              {removing === product.id ? <span className="text-[8px]">…</span> : <X className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                        <p className="text-xs font-medium text-foreground leading-tight text-center line-clamp-2">{product.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HeroTilesSection({ adminPassword }: { adminPassword: string }) {
  const { toast } = useToast();
  const [tiles, setTiles] = useState<TileConfig[]>(() => getHeroTiles());
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const requestUploadUrl = useRequestUploadUrl({ request: { headers: { Authorization: `Bearer ${adminPassword}` } } });

  useEffect(() => { setTiles(getHeroTiles()); }, []);

  const update = (idx: number, field: keyof TileConfig, value: string) => {
    setTiles(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
    setDirty(true);
  };

  const handleUpload = async (idx: number, file: File) => {
    setUploading(idx);
    try {
      const result = await new Promise<{ uploadURL: string; objectPath: string }>((resolve, reject) => {
        requestUploadUrl.mutate(
          { data: { name: file.name, size: file.size, contentType: file.type } },
          { onSuccess: resolve, onError: reject }
        );
      });
      await fetch(result.uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      const imageUrl = `/api/storage${result.objectPath}`;
      update(idx, "src", imageUrl);
      toast({ title: "Image uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const save = () => {
    saveHeroTiles(tiles);
    setDirty(false);
    toast({ title: "Hero tiles saved" });
  };

  const reset = () => {
    setTiles(DEFAULT_TILES);
    saveHeroTiles(DEFAULT_TILES);
    setDirty(false);
    toast({ title: "Reset to defaults" });
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          <h3 className="font-serif text-xl font-medium">Home Page Tiles</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl text-muted-foreground" onClick={reset}>Reset defaults</Button>
          <Button size="sm" className="rounded-xl" disabled={!dirty} onClick={save}>Save changes</Button>
        </div>
      </div>
      <div className="p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {tiles.map((tile, idx) => (
          <div key={tile.id} className="flex flex-col gap-2">
            <div className="aspect-[4/5] relative rounded-xl overflow-hidden border border-border bg-muted group">
              <img src={tile.src} alt={tile.label || `Tile ${idx + 1}`} className="w-full h-full object-cover" />
              <label className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${uploading === idx ? "opacity-100" : ""}`}>
                <div className="flex flex-col items-center gap-1 text-white">
                  {uploading === idx ? (
                    <span className="text-xs">Uploading…</span>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span className="text-xs font-medium">Replace image</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading !== null}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(idx, f); e.target.value = ""; }}
                />
              </label>
            </div>
            <Input
              value={tile.label}
              onChange={e => update(idx, "label", e.target.value)}
              className="h-8 text-sm rounded-lg"
              placeholder={`Tile ${idx + 1} title`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function toLocalDatetimeInput(date: Date | string): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BLANK_FORM = {
  title: "",
  description: "",
  date: toLocalDatetimeInput(new Date()),
  location: "",
  address: "",
  price: 0,
  capacity: 20,
  category: "Brunch",
  imageUrl: "",
  artistUrl: "",
  featured: false,
  published: false,
  autoSendFeedback: false,
  couponCode: "",
};

function AdminDashboard({ adminPassword, onLogout }: { adminPassword: string; onLogout: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const adminHeaders = useMemo(() => ({ Authorization: `Bearer ${adminPassword}` }), [adminPassword]);
  const requestOpts = useMemo(() => ({ headers: adminHeaders }), [adminHeaders]);

  // All hooks instantiated with auth baked in
  const { data: events, isLoading: eventsLoading } = useListEvents({}, { request: requestOpts });
  const { data: stats } = useGetRegistrationStats({ request: requestOpts });
  const createEvent = useCreateEvent({ request: requestOpts });
  const updateEvent = useUpdateEvent({ request: requestOpts });
  const deleteEvent = useDeleteEvent({ request: requestOpts });
  const requestUploadUrl = useRequestUploadUrl({ request: requestOpts });

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(BLANK_FORM);
  const [uploading, setUploading] = useState(false);
  const [capacityEdits, setCapacityEdits] = useState<Record<number, { open: boolean; value: string }>>({});
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderResult, setReminderResult] = useState<{ sent: number; ts: Date } | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  type SearchResult = {
    id: number; firstName: string; lastName: string; email: string;
    status: string; quantity: number; totalAmount: number;
    createdAt: string; stripeSessionId: string | null;
    eventId: number; eventTitle: string; eventDate: string;
  };

  const { data: searchResults, isFetching: searchFetching } = useQuery<SearchResult[]>({
    queryKey: ["admin-search", debouncedQ],
    queryFn: async () => {
      if (debouncedQ.length < 2) return [];
      const res = await fetch(`/api/registrations/search?q=${encodeURIComponent(debouncedQ)}`, {
        headers: adminHeaders,
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: debouncedQ.length >= 2,
    staleTime: 10_000,
  });

  const [searchMarkingPaid, setSearchMarkingPaid] = useState<number | null>(null);
  const [searchCancelling, setSearchCancelling] = useState<number | null>(null);
  const queryClient2 = useQueryClient();

  const handleSearchMarkPaid = async (reg: SearchResult) => {
    if (!confirm(`Mark ${reg.firstName} ${reg.lastName}'s registration as paid?`)) return;
    setSearchMarkingPaid(reg.id);
    try {
      const res = await fetch(`/api/registrations/${reg.id}/mark-paid`, { method: "POST", headers: adminHeaders });
      if (!res.ok) { const e = await res.json().catch(() => ({})); toast({ title: "Failed", description: e.error, variant: "destructive" }); return; }
      toast({ title: "Marked as paid", description: "Confirmation email sent." });
      queryClient2.invalidateQueries({ queryKey: ["admin-search", debouncedQ] });
      queryClient2.invalidateQueries({ queryKey: ["event-registrations", reg.eventId] });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setSearchMarkingPaid(null); }
  };

  const handleSearchCancel = async (reg: SearchResult) => {
    if (!confirm(`Remove ${reg.firstName} ${reg.lastName}'s registration?`)) return;
    setSearchCancelling(reg.id);
    try {
      const res = await fetch(`/api/registrations/${reg.id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json", ...adminHeaders }, body: JSON.stringify({ reason: "admin" }) });
      if (!res.ok) { toast({ title: "Failed to cancel", variant: "destructive" }); return; }
      toast({ title: "Cancelled" });
      queryClient2.invalidateQueries({ queryKey: ["admin-search", debouncedQ] });
      queryClient2.invalidateQueries({ queryKey: ["event-registrations", reg.eventId] });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setSearchCancelling(null); }
  };

  const handleSendReminders = async () => {
    if (!confirm("Send 48-hour reminder emails to all paid attendees of upcoming events who haven't received one yet? This is idempotent — already-reminded attendees are skipped.")) return;
    setReminderSending(true);
    try {
      const res = await fetch("/api/notifications/send-48h-reminders", {
        method: "POST",
        headers: adminHeaders,
      });
      const body = await res.json();
      if (res.ok) {
        setReminderResult({ sent: body.emailsSent, ts: new Date() });
        toast({ title: body.emailsSent === 0 ? "No new reminders to send" : `Sent ${body.emailsSent} reminder email${body.emailsSent !== 1 ? "s" : ""}`, description: body.emailsSent === 0 ? "All upcoming attendees have already been reminded." : undefined });
      } else {
        toast({ title: "Failed to send reminders", description: body.error ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setReminderSending(false);
    }
  };

  const handleCapacityUpdate = async (event: { id: number; capacity: number; spotsRemaining?: number | null }) => {
    const raw = capacityEdits[event.id]?.value ?? "";
    const newCap = parseInt(raw, 10);
    if (isNaN(newCap) || newCap < event.capacity) return;
    if (newCap === event.capacity) {
      setCapacityEdits(p => ({ ...p, [event.id]: { open: false, value: "" } }));
      return;
    }
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({ capacity: newCap }),
      });
      if (!res.ok) throw new Error("Failed");
      await queryClient.invalidateQueries({ queryKey: getListEventsQueryKey({}) });
      setCapacityEdits(p => ({ ...p, [event.id]: { open: false, value: "" } }));
      toast({ title: `Capacity updated to ${newCap}` });
    } catch {
      toast({ title: "Failed to update capacity", variant: "destructive" });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await new Promise<{ uploadURL: string; objectPath: string }>((resolve, reject) => {
        requestUploadUrl.mutate(
          { data: { name: file.name, size: file.size, contentType: file.type } },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });

      await fetch(result.uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // objectPath is already normalized as "/objects/..." — prepend /api/storage
      const imageUrl = `/api/storage${result.objectPath}`;
      setFormData((f) => ({ ...f, imageUrl }));
      toast({ title: "Image uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (event: any) => {
    setIsEditing(true);
    setEditingId(event.id);
    setFormData({
      title: event.title,
      description: event.description,
      date: toLocalDatetimeInput(event.date),
      location: event.location,
      address: event.address || "",
      price: event.price,
      capacity: event.capacity,
      category: event.category,
      imageUrl: event.imageUrl || "",
      artistUrl: (event as any).artistUrl ?? "",
      featured: event.featured,
      published: event.published,
      autoSendFeedback: (event as any).autoSendFeedback ?? false,
      couponCode: (event as any).couponCode ?? "",
    });
  };

  const handleNew = () => {
    setIsEditing(true);
    setEditingId(null);
    setFormData(BLANK_FORM);
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this event?")) {
      deleteEvent.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          toast({ title: "Event deleted" });
        },
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, date: new Date(formData.date).toISOString() };

    if (editingId) {
      updateEvent.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          setIsEditing(false);
          toast({ title: "Event updated" });
        },
      });
    } else {
      createEvent.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          setIsEditing(false);
          toast({ title: "Event created" });
        },
      });
    }
  };

  return (
    <div className="w-full min-h-screen bg-muted/30 py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-serif text-3xl font-medium">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button onClick={handleNew} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> New Event
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onLogout} className="rounded-xl text-muted-foreground">
              Sign Out
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif text-2xl">{editingId ? "Edit Event" : "Create Event"}</h2>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input type="datetime-local" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Location Name</Label>
                  <Input required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input type="number" required min="0" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input type="number" required min="1" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })} />
                </div>
              </div>

              {/* Artist URL */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="artistUrl">
                  Artist Website URL
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                    Optional — when set, the "+ Meet the Artist" part of the title becomes a clickable link
                  </span>
                </Label>
                <Input
                  id="artistUrl"
                  type="url"
                  placeholder="https://…"
                  value={(formData as any).artistUrl ?? ""}
                  onChange={e => setFormData({ ...formData, artistUrl: e.target.value } as any)}
                />
              </div>

              {/* Image upload */}
              <div className="space-y-2">
                <Label>Event Image</Label>
                <div className="flex items-center gap-4">
                  {formData.imageUrl && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border flex-shrink-0">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: "" })}
                        className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="https://… or upload below"
                      value={formData.imageUrl}
                      onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    />
                    <label className={`inline-flex items-center gap-2 cursor-pointer text-sm text-primary hover:text-primary/80 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                      <Upload className="w-4 h-4" />
                      {uploading ? "Uploading…" : "Upload image file"}
                      <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea required className="min-h-[100px]" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="published"
                    checked={formData.published}
                    onCheckedChange={(c) => setFormData({ ...formData, published: !!c })}
                  />
                  <Label htmlFor="published">Published (visible to public)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="featured"
                    checked={formData.featured}
                    onCheckedChange={(c) => setFormData({ ...formData, featured: !!c })}
                  />
                  <Label htmlFor="featured">Featured on Homepage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoSendFeedback"
                    checked={(formData as any).autoSendFeedback ?? false}
                    onCheckedChange={(c) => setFormData({ ...formData, autoSendFeedback: !!c } as any)}
                  />
                  <Label htmlFor="autoSendFeedback">Auto-send feedback survey the day after event</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="couponCode">
                  Coupon Code
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">Optional — anyone who enters this code registers for free</span>
                </Label>
                <Input
                  id="couponCode"
                  placeholder="e.g. BOUGIE2025"
                  value={(formData as any).couponCode ?? ""}
                  onChange={e => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() } as any)}
                />
              </div>

              <Button
                type="submit"
                className="rounded-xl w-full md:w-auto px-8"
                disabled={createEvent.isPending || updateEvent.isPending}
              >
                Save Event
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl"><DollarSign className="w-6 h-6 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <h3 className="text-2xl font-bold">${stats?.totalRevenue?.toFixed(2) || "0.00"}</h3>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl"><Users className="w-6 h-6 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Registrations</p>
                    <h3 className="text-2xl font-bold">{stats?.totalRegistrations || 0}</h3>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 rounded-xl"><XCircle className="w-6 h-6 text-red-500" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cancellations</p>
                    <h3 className="text-2xl font-bold">{(stats as any)?.totalCancellations || 0}</h3>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl"><Calendar className="w-6 h-6 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Events</p>
                    <h3 className="text-2xl font-bold">{stats?.totalEvents || 0}</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
              <h3 className="font-serif text-xl font-medium mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 rounded-xl"
                  onClick={handleSendReminders}
                  disabled={reminderSending}
                >
                  <BellRing className="w-4 h-4" />
                  {reminderSending ? "Sending…" : "Send 48h Reminders"}
                </Button>
                {reminderResult && (
                  <span className="text-sm text-muted-foreground">
                    Last run {format(reminderResult.ts, "h:mm a")} — {reminderResult.sent === 0 ? "no new reminders" : `${reminderResult.sent} email${reminderResult.sent !== 1 ? "s" : ""} sent`}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Emails paid attendees of events starting within 48 hours who haven't been reminded yet. Safe to run multiple times — duplicates are skipped.
              </p>
            </div>

            <HeroTilesSection adminPassword={adminPassword} />

            <FavoritesSection adminPassword={adminPassword} />

            {/* Attendee Search */}
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h3 className="font-serif text-xl font-medium mb-3">Search Attendees</h3>
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Name or email…"
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>
              {debouncedQ.length >= 2 && (
                <div>
                  {searchFetching && !searchResults && (
                    <div className="px-6 py-4 text-sm text-muted-foreground">Searching…</div>
                  )}
                  {!searchFetching && searchResults?.length === 0 && (
                    <div className="px-6 py-4 text-sm text-muted-foreground">No matches for "{debouncedQ}"</div>
                  )}
                  {searchResults && searchResults.length > 0 && (
                    <div className="divide-y divide-border">
                      {searchResults.map(r => (
                        <div key={r.id} className="px-6 py-3 flex items-center gap-4 hover:bg-muted/10 transition-colors text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{r.firstName} {r.lastName}</div>
                            <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                          </div>
                          <div className="hidden sm:block text-xs text-muted-foreground min-w-0 max-w-[180px] truncate" title={r.eventTitle}>
                            {r.eventTitle}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {r.quantity} ticket{r.quantity !== 1 ? "s" : ""} · ${Number(r.totalAmount).toFixed(2)}
                          </div>
                          <StatusBadge status={r.status} />
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {r.status === "pending" && (
                              <button
                                onClick={() => handleSearchMarkPaid(r)}
                                disabled={searchMarkingPaid === r.id}
                                title="Mark as paid"
                                className="text-green-600 hover:text-green-700 disabled:opacity-50 transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {r.status === "cancelled" ? null : (
                              <button
                                onClick={() => handleSearchCancel(r)}
                                disabled={searchCancelling === r.id}
                                title="Remove registration"
                                className="text-muted-foreground hover:text-destructive disabled:opacity-50 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {debouncedQ.length < 2 && (
                <div className="px-6 py-4 text-sm text-muted-foreground">Type at least 2 characters to search across all events.</div>
              )}
            </div>

            {/* Events List with per-event registration panels */}
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h3 className="font-serif text-xl font-medium">Manage Events</h3>
              </div>
              <div className="divide-y divide-border">
                {eventsLoading ? (
                  <div className="px-6 py-8 text-center text-muted-foreground">Loading…</div>
                ) : events?.map((event) => (
                  <div key={event.id} className="p-6 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-medium truncate">{event.title}</h4>
                          {event.published
                            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Published</span>
                            : <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">Draft</span>
                          }
                          {event.featured && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Featured</span>}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>{format(new Date(event.date), "MMM d, yyyy · h:mm a")}</span>
                          <span>${event.price}</span>
                          <span>{event.capacity - (event.spotsRemaining ?? event.capacity)} / {event.capacity} registered</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(event.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>

                    {/* Inline capacity expander */}
                    {capacityEdits[event.id]?.open ? (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">New capacity (current: {event.capacity}):</span>
                        <Input
                          type="number"
                          min={event.capacity}
                          className="w-24 h-8 text-sm"
                          value={capacityEdits[event.id]?.value ?? ""}
                          onChange={e => setCapacityEdits(p => ({ ...p, [event.id]: { open: true, value: e.target.value } }))}
                          onKeyDown={e => { if (e.key === "Enter") handleCapacityUpdate(event); if (e.key === "Escape") setCapacityEdits(p => ({ ...p, [event.id]: { open: false, value: "" } })); }}
                          autoFocus
                          placeholder={String(event.capacity + 5)}
                        />
                        <Button size="sm" className="h-8" onClick={() => handleCapacityUpdate(event)}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setCapacityEdits(p => ({ ...p, [event.id]: { open: false, value: "" } }))}>Cancel</Button>
                      </div>
                    ) : (
                      <button
                        className="mt-2 text-xs text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
                        onClick={() => setCapacityEdits(p => ({ ...p, [event.id]: { open: true, value: String(event.capacity) } }))}
                      >
                        <Plus className="w-3 h-3" /> Expand capacity
                      </button>
                    )}

                    <EventRegistrationsPanel eventId={event.id} eventTitle={event.title} adminHeaders={adminHeaders} />
                    <WaitlistPanel eventId={event.id} adminHeaders={adminHeaders} />
                    <EventAnnouncementPanel eventId={event.id} adminHeaders={adminHeaders} />
                    <EventFeedbackPanel event={event} adminHeaders={adminHeaders} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const [adminPassword, setAdminPassword] = useState<string | null>(getStoredPassword);

  const handleAuth = (pw: string) => {
    storePassword(pw);
    setAdminPassword(pw);
  };

  const handleLogout = () => {
    clearPassword();
    setAdminPassword(null);
  };

  if (!adminPassword) {
    return <AdminLoginGate onAuth={handleAuth} />;
  }

  return <AdminDashboard adminPassword={adminPassword} onLogout={handleLogout} />;
}
