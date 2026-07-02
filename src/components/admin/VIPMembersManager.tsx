import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Crown, Users, Mail, Ticket, Download, Sparkles, Send, RefreshCw, Copy, Check,
} from "lucide-react";
import DOMPurify from "dompurify";
import VIPPlansManager from "./VIPPlansManager";

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ["p", "h1", "h2", "h3", "a", "b", "strong", "i", "em", "br", "ul", "ol", "li", "img", "span", "div"],
  ALLOWED_ATTR: ["href", "src", "alt", "title", "style", "target", "rel"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};
const sanitizeEmailHtml = (html: string) => DOMPurify.sanitize(html, SANITIZE_CONFIG);

interface VIPMember {
  id: string;
  email: string;
  full_name: string | null;
  status: "active" | "unsubscribed" | "blocked";
  joined_at: string;
  last_email_sent_at: string | null;
  coupons_used_count: number;
  tier?: string | null;
  plan_id?: string | null;
  payment_status?: "free" | "pending" | "paid" | "expired" | null;
  paid_until?: string | null;
  mpesa_code?: string | null;
  phone?: string | null;
}

interface PlanLite { id: string; slug: string; name: string; duration_days: number; price_ksh: number; }

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  starts_at: string;
  expires_at: string;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
}

const COSMETIC_CODES = [
  "BEAUTYGLOW", "PINKBLUSH", "SILKSKIN", "GLOWUP", "CHOPALOVE",
  "ROSEGLOW", "BEAUTYVIP", "SKINQUEEN", "VELVETLIP", "GOLDENGLOW",
  "PEACHPERFECT", "BLOSSOMVIP", "RADIANTYOU", "SHIMMERSKIN", "SOFTKISS",
];

function randomCouponCode(used: Set<string>) {
  for (let i = 0; i < 50; i++) {
    const base = COSMETIC_CODES[Math.floor(Math.random() * COSMETIC_CODES.length)];
    const candidate = `${base}${Math.floor(Math.random() * 90 + 10)}`;
    if (!used.has(candidate.toUpperCase())) return candidate;
  }
  return `CHOPAVIP${Date.now().toString().slice(-5)}`;
}

const VIPMembersManager = () => {
  const [members, setMembers] = useState<VIPMember[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [campaignsSent, setCampaignsSent] = useState(0);
  const [couponsRedeemed, setCouponsRedeemed] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [plansLite, setPlansLite] = useState<PlanLite[]>([]);

  // Compose
  const [prompt, setPrompt] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [attachCoupon, setAttachCoupon] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  // Coupon form
  const [newDiscount, setNewDiscount] = useState(15);
  const [newUsageLimit, setNewUsageLimit] = useState<number | "">("");
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [m, c, camps, reds, pl] = await Promise.all([
      supabase.from("vip_members").select("*").order("joined_at", { ascending: false }),
      supabase.from("vip_coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("vip_email_campaigns").select("id", { count: "exact", head: true }).eq("status", "sent"),
      supabase.from("vip_coupon_redemptions").select("id", { count: "exact", head: true }),
      supabase.from("vip_plans").select("id, slug, name, duration_days, price_ksh"),
    ]);
    setMembers((m.data as VIPMember[]) || []);
    setCoupons((c.data as Coupon[]) || []);
    setCampaignsSent(camps.count || 0);
    setCouponsRedeemed(reds.count || 0);
    setPlansLite((pl.data as PlanLite[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: members.length,
      newThisWeek: members.filter((m) => new Date(m.joined_at).getTime() >= weekAgo).length,
      active: members.filter((m) => m.status === "active").length,
      couponsSent: coupons.length,
    };
  }, [members, coupons]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!q) return true;
      return m.email.toLowerCase().includes(q) || (m.full_name || "").toLowerCase().includes(q);
    });
  }, [members, search, statusFilter]);

  const updateMemberStatus = async (id: string, status: VIPMember["status"]) => {
    const { error } = await supabase.from("vip_members").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Member updated");
    loadAll();
  };

  const approvePayment = async (m: VIPMember) => {
    const plan = plansLite.find((p) => p.id === m.plan_id) || plansLite.find((p) => p.slug === m.tier);
    if (!plan) return toast.error("Linked plan not found");
    const paid_until = new Date(Date.now() + plan.duration_days * 86400000).toISOString();
    const { error } = await supabase
      .from("vip_members")
      .update({ payment_status: "paid", paid_until, plan_id: plan.id, tier: plan.slug })
      .eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success(`${m.email} activated as ${plan.name}`);
    loadAll();
  };

  const rejectPayment = async (m: VIPMember) => {
    if (!confirm("Reject this payment? The M-Pesa code will be cleared so the member can resubmit.")) return;
    const { error } = await supabase
      .from("vip_members")
      .update({ payment_status: "free", mpesa_code: null, tier: "free", plan_id: null })
      .eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Payment rejected");
    loadAll();
  };


  const exportCsv = () => {
    const rows = [
      ["Name", "Email", "Status", "Joined", "Last Email", "Coupons Used"],
      ...filtered.map((m) => [
        m.full_name || "",
        m.email,
        m.status,
        new Date(m.joined_at).toISOString(),
        m.last_email_sent_at ? new Date(m.last_email_sent_at).toISOString() : "",
        String(m.coupons_used_count),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chopa-vip-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateCoupon = async () => {
    setCreatingCoupon(true);
    try {
      const usedCodes = new Set(coupons.map((c) => c.code.toUpperCase()));
      const code = randomCouponCode(usedCodes);
      const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("vip_coupons").insert({
        code,
        discount_percent: Number(newDiscount),
        expires_at,
        usage_limit: newUsageLimit === "" ? null : Number(newUsageLimit),
        is_active: true,
      });
      if (error) throw error;
      toast.success(`Coupon ${code} created · previous coupon auto-expired`);
      loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create coupon");
    } finally {
      setCreatingCoupon(false);
    }
  };

  const toggleCoupon = async (c: Coupon) => {
    const { error } = await supabase.from("vip_coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    loadAll();
  };

  const generateEmail = async () => {
    if (!prompt.trim()) return toast.error("Add a short instruction first");
    setGenerating(true);
    try {
      const attachedCoupon = coupons.find((c) => c.id === attachCoupon);
      const { data, error } = await supabase.functions.invoke("vip-generate-email", {
        body: {
          prompt,
          coupon: attachedCoupon
            ? { code: attachedCoupon.code, discount_percent: attachedCoupon.discount_percent, expires_at: attachedCoupon.expires_at }
            : null,
        },
      });
      if (error) throw error;
      setSubject(data.subject);
      setBodyHtml(sanitizeEmailHtml(data.body_html || ""));
      setBodyText(data.body_text);
      toast.success("Email drafted ✨");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const sendCampaign = async () => {
    if (!subject || !bodyHtml) return toast.error("Generate or write an email first");
    if (!confirm(`Send this email to ${stats.active} active VIP members?`)) return;
    setSending(true);
    try {
      const cleanHtml = sanitizeEmailHtml(bodyHtml);
      const { data, error } = await supabase.functions.invoke("vip-send-campaign", {
        body: {
          subject, body_html: cleanHtml, body_text: bodyText,
          prompt_used: prompt, coupon_id: attachCoupon,
        },
      });
      if (error) throw error;
      toast.success(`Sent to ${data.delivered}/${data.total} members${data.failed ? ` · ${data.failed} failed` : ""}`);
      loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-accent" /> VIP Membership
          </h2>
          <p className="text-sm text-muted-foreground">Members, AI emails & smart coupons</p>
        </div>
        <Button variant="outline" onClick={loadAll} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Members" value={stats.total} icon={<Users className="w-4 h-4" />} />
        <StatCard label="New This Week" value={stats.newThisWeek} icon={<Sparkles className="w-4 h-4" />} />
        <StatCard label="Active" value={stats.active} icon={<Users className="w-4 h-4" />} />
        <StatCard label="Coupons Created" value={stats.couponsSent} icon={<Ticket className="w-4 h-4" />} />
        <StatCard label="Coupons Redeemed" value={couponsRedeemed} icon={<Ticket className="w-4 h-4" />} />
        <StatCard label="Campaigns Sent" value={campaignsSent} icon={<Mail className="w-4 h-4" />} />
      </div>

      <Tabs defaultValue="members">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="members">
            Members
            {members.filter((m) => m.payment_status === "pending").length > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white">
                {members.filter((m) => m.payment_status === "pending").length} pending
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="compose">Compose Email</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-2">
            <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv} className="gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Tier</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Paid Until</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No members yet.</td></tr>
                  ) : filtered.map((m) => {
                    const ps = m.payment_status || "free";
                    const tier = m.tier || "free";
                    return (
                      <tr key={m.id} className="border-t border-border align-top">
                        <td className="p-3">
                          <div>{m.full_name || <span className="text-muted-foreground">—</span>}</div>
                          {m.phone && <div className="text-xs text-muted-foreground">{m.phone}</div>}
                        </td>
                        <td className="p-3">{m.email}</td>
                        <td className="p-3">
                          <Badge variant={tier === "free" ? "secondary" : "default"} className="capitalize">{tier}</Badge>
                        </td>
                        <td className="p-3">
                          {ps === "paid" && <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Paid</Badge>}
                          {ps === "pending" && <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Pending</Badge>}
                          {ps === "expired" && <Badge variant="secondary">Expired</Badge>}
                          {ps === "free" && <Badge variant="outline">Free</Badge>}
                          {m.mpesa_code && (
                            <div className="text-[10px] font-mono text-muted-foreground mt-1">{m.mpesa_code}</div>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {m.paid_until ? new Date(m.paid_until).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-3">
                          <Select value={m.status} onValueChange={(v) => updateMemberStatus(m.id, v as VIPMember["status"])}>
                            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          {ps === "pending" ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="default" className="gap-1 h-8" onClick={() => approvePayment(m)}>
                                <Check className="w-3.5 h-3.5" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-8" onClick={() => rejectPayment(m)}>
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <VIPPlansManager />
        </TabsContent>


        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">AI Email Composer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>What should this email be about?</Label>
                <Textarea
                  placeholder='e.g. "Tell customers we have new stock of lotions and offer 10% discount this week"'
                  value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} maxLength={2000}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-3 items-end">
                <div>
                  <Label>Attach an active coupon (optional)</Label>
                  <Select value={attachCoupon || "none"} onValueChange={(v) => setAttachCoupon(v === "none" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="No coupon" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No coupon</SelectItem>
                      {coupons.filter((c) => c.is_active && new Date(c.expires_at) > new Date()).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.code} · {c.discount_percent}% off</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={generateEmail} disabled={generating} variant="gradient" className="gap-2">
                  <Sparkles className="w-4 h-4" /> {generating ? "Generating…" : "Generate Email"}
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" maxLength={150} />
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`${subject}\n\n${bodyText}`); toast.success("Copied"); }} className="gap-2">
                    <Copy className="w-4 h-4" /> Copy
                  </Button>
                  <Button onClick={sendCampaign} disabled={sending} className="gap-2 flex-1">
                    <Send className="w-4 h-4" /> {sending ? "Sending…" : `Send to ${stats.active} members`}
                  </Button>
                </div>
              </div>

              <div>
                <Label>Email body (editable HTML)</Label>
                <Textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} rows={10} className="font-mono text-xs" />
              </div>

              {bodyHtml && (
                <div>
                  <Label>Preview</Label>
                  <div className="rounded-lg border border-border bg-card p-4" dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(bodyHtml) }} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coupons" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Generate Smart Coupon</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3 items-end">
                <div>
                  <Label>Discount %</Label>
                  <Input type="number" min={1} max={100} value={newDiscount} onChange={(e) => setNewDiscount(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Usage limit (optional)</Label>
                  <Input type="number" min={1} value={newUsageLimit} onChange={(e) => setNewUsageLimit(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Unlimited" />
                </div>
                <Button onClick={generateCoupon} disabled={creatingCoupon} variant="gold" className="gap-2">
                  <Sparkles className="w-4 h-4" /> {creatingCoupon ? "Creating…" : "Generate New Coupon"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Generating a new coupon automatically expires the previous active one. All coupons auto-expire after 7 days.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Used</th>
                    <th className="p-3">Expires</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No coupons yet.</td></tr>
                  ) : coupons.map((c) => {
                    const expired = new Date(c.expires_at) <= new Date();
                    return (
                      <tr key={c.id} className="border-t border-border">
                        <td className="p-3 font-mono font-semibold">{c.code}</td>
                        <td className="p-3">{c.discount_percent}%</td>
                        <td className="p-3">{c.times_used}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                        <td className="p-3 text-muted-foreground">{new Date(c.expires_at).toLocaleString()}</td>
                        <td className="p-3">
                          {expired || !c.is_active ? (
                            <Badge variant="secondary">Expired</Badge>
                          ) : (
                            <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Active</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <Switch checked={c.is_active && !expired} disabled={expired} onCheckedChange={() => toggleCoupon(c)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatCard = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {icon}<span>{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

export default VIPMembersManager;
