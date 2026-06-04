import { useState } from "react";
import {
  useListEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useGetRegistrationStats,
  getListEventsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Calendar, Users, DollarSign, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const ADMIN_KEY = "bb_admin_auth";

function getStoredPassword(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_KEY);
  } catch {
    return null;
  }
}

function storePassword(pw: string) {
  try {
    sessionStorage.setItem(ADMIN_KEY, pw);
  } catch {
    // ignore
  }
}

function clearPassword() {
  try {
    sessionStorage.removeItem(ADMIN_KEY);
  } catch {
    // ignore
  }
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
      if (res.ok || res.status === 200) {
        onAuth(pw);
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

export default function Admin() {
  const [adminPassword, setAdminPassword] = useState<string | null>(getStoredPassword);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const adminHeaders = adminPassword ? { Authorization: `Bearer ${adminPassword}` } : {};

  const { data: events, isLoading: eventsLoading } = useListEvents(
    {},
    { request: adminPassword ? { headers: adminHeaders } : undefined }
  );
  const { data: stats } = useGetRegistrationStats(
    { request: adminPassword ? { headers: adminHeaders } : undefined }
  );

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
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
  });

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
    });
  };

  const handleNew = () => {
    setIsEditing(true);
    setEditingId(null);
    setFormData({
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
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteEvent.mutate(
        { id, params: undefined as any },
        {
          headers: adminHeaders,
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
            toast({ title: "Event deleted" });
          },
        } as any,
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, date: new Date(formData.date).toISOString() };

    if (editingId) {
      updateEvent.mutate(
        { id: editingId, data: payload },
        {
          headers: adminHeaders,
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
            setIsEditing(false);
            toast({ title: "Event updated" });
          },
        } as any,
      );
    } else {
      createEvent.mutate(
        { data: payload },
        {
          headers: adminHeaders,
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
            setIsEditing(false);
            toast({ title: "Event created" });
          },
        } as any,
      );
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
            <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-xl text-muted-foreground">
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
                  <Label>Image URL</Label>
                  <Input value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input type="number" required min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input type="number" required min="1" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea required className="min-h-[100px]" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(c) => setFormData({ ...formData, featured: !!c })}
                />
                <Label htmlFor="featured">Featured on Homepage</Label>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl"><DollarSign className="w-6 h-6 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <h3 className="text-2xl font-bold">${stats?.totalRevenue || 0}</h3>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl"><Users className="w-6 h-6 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Registrations</p>
                    <h3 className="text-2xl font-bold">{stats?.totalRegistrations || 0}</h3>
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

            {/* Events List */}
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h3 className="font-serif text-xl font-medium">Manage Events</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase">
                    <tr>
                      <th className="px-6 py-4 font-medium">Title</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Price</th>
                      <th className="px-6 py-4 font-medium">Capacity</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventsLoading ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading…</td></tr>
                    ) : events?.map((event) => (
                      <tr key={event.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-6 py-4 font-medium">
                          {event.title}
                          {event.featured && <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded">Featured</span>}
                        </td>
                        <td className="px-6 py-4">{format(new Date(event.date), "MMM d, yyyy")}</td>
                        <td className="px-6 py-4">${event.price}</td>
                        <td className="px-6 py-4">{event.capacity - (event.spotsRemaining ?? 0)} / {event.capacity}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(event.id)}><Trash2 className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
