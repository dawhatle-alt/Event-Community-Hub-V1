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
import { Plus, Edit, Trash2, Calendar, Users, DollarSign, Lock, Upload, X, ChevronDown, ChevronRight, XCircle, RotateCcw, LayoutGrid, Star, MessageSquare, Send } from "lucide-react";
import { getHeroTiles, saveHeroTiles, AVAILABLE_PHOTOS, DEFAULT_TILES, type TileConfig } from "@/lib/heroTiles";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

function EventRegistrationsPanel({ eventId, adminHeaders }: { eventId: number; adminHeaders: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [reinstating, setReinstating] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
                    {r.status === "cancelled" && (
                      <button
                        onClick={() => handleReinstate(r.id)}
                        disabled={reinstating === r.id}
                        title="Reinstate registration"
                        className="ml-1 text-primary hover:text-primary/80 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                {((r as any).seatingPreference || (r as any).jokersPreference || (r as any).skillLevel) && (
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground pl-0.5">
                    {(r as any).seatingPreference && (
                      <span><span className="font-medium text-foreground/70">Seating:</span> {(r as any).seatingPreference}</span>
                    )}
                    {(r as any).jokersPreference && (
                      <span><span className="font-medium text-foreground/70">Jokers:</span> {{ yes: "Yes", no: "No", open: "Open to either" }[(r as any).jokersPreference] ?? (r as any).jokersPreference}</span>
                    )}
                    {(r as any).skillLevel && (
                      <span><span className="font-medium text-foreground/70">Skill:</span> {{ learn: "Want to learn", learning: "Still learning", intermediate: "Intermediate", advanced: "Advanced" }[(r as any).skillLevel] ?? (r as any).skillLevel}</span>
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

function HeroTilesSection() {
  const { toast } = useToast();
  const [tiles, setTiles] = useState<TileConfig[]>(() => getHeroTiles());
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setTiles(getHeroTiles()); }, []);

  const update = (idx: number, field: keyof TileConfig, value: string) => {
    setTiles(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
    setDirty(true);
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
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {tiles.map((tile, idx) => (
          <div key={tile.id} className="flex flex-col gap-2">
            <div className="aspect-[4/5] relative rounded-xl overflow-hidden border border-border bg-muted">
              <img src={tile.src} alt={tile.label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-medium tracking-widest uppercase text-white/90">
                {tile.label}
              </span>
            </div>
            <div className="space-y-1.5">
              <Input
                value={tile.label}
                onChange={e => update(idx, "label", e.target.value)}
                className="h-8 text-sm rounded-lg"
                placeholder="Label"
              />
              <select
                value={tile.src}
                onChange={e => update(idx, "src", e.target.value)}
                className="w-full h-8 text-sm rounded-lg border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {AVAILABLE_PHOTOS.map(p => (
                  <option key={p.src} value={p.src}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BLANK_FORM = {
  title: "",
  description: "",
  date: new Date().toISOString().slice(0, 16),
  location: "",
  address: "",
  price: 0,
  capacity: 20,
  category: "Brunch",
  imageUrl: "",
  featured: false,
  published: false,
  autoSendFeedback: false,
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
      date: new Date(event.date).toISOString().slice(0, 16),
      location: event.location,
      address: event.address || "",
      price: event.price,
      capacity: event.capacity,
      category: event.category,
      imageUrl: event.imageUrl || "",
      featured: event.featured,
      published: event.published,
      autoSendFeedback: (event as any).autoSendFeedback ?? false,
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

            <HeroTilesSection />

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
                    <EventRegistrationsPanel eventId={event.id} adminHeaders={adminHeaders} />
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
