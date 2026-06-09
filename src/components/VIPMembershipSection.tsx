import { useEffect, useState } from "react";
import { Gem, Sparkles, Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const freeSchema = z.object({
  full_name: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Please enter a valid email").max(255),
});

const paidSchema = freeSchema.extend({
  phone: z.string().trim().min(9, "Enter your M-Pesa phone").max(20),
  plan_slug: z.string().min(1, "Select a plan"),
  mpesa_code: z.string().trim().regex(/^[A-Z0-9]{8,15}$/i, "Enter a valid M-Pesa code"),
});

interface VIPPlan {
  id: string;
  name: string;
  slug: string;
  price_ksh: number;
  duration_days: number;
  perks: string[];
  sort_order: number;
}

const TILL_NUMBER = "4623226";

const VIPMembershipSection = () => {
  const [paidEnabled, setPaidEnabled] = useState(false);
  const [plans, setPlans] = useState<VIPPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: setting }, { data: planRows }] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "vip_paid_enabled").maybeSingle(),
        supabase.from("vip_plans").select("*").eq("is_active", true).order("sort_order"),
      ]);
      const enabled = (setting?.value || "false").toLowerCase() === "true";
      setPaidEnabled(enabled);
      if (planRows) {
        const mapped = planRows.map((p: any) => ({
          ...p,
          perks: Array.isArray(p.perks) ? p.perks : [],
        })) as VIPPlan[];
        setPlans(mapped);
        if (mapped[0]) setSelectedPlan(mapped[0].slug);
      }
    })();
  }, []);

  const selected = plans.find((p) => p.slug === selectedPlan);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (paidEnabled) {
        const parsed = paidSchema.safeParse({
          full_name: fullName || undefined,
          email, phone, plan_slug: selectedPlan,
          mpesa_code: mpesaCode.toUpperCase(),
        });
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke("vip-subscribe", {
          body: { ...parsed.data, website },
        });
        if (error) throw error;
        if (data?.already) {
          toast.info(data.message);
        } else if (data?.success) {
          toast.success(data.message);
          setFullName(""); setEmail(""); setPhone(""); setMpesaCode("");
        } else {
          throw new Error(data?.error || "Submission failed");
        }
      } else {
        const parsed = freeSchema.safeParse({ full_name: fullName || undefined, email });
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke("vip-signup", {
          body: { ...parsed.data, website },
        });
        if (error) throw error;
        if (data?.already) {
          toast.info(data.message || "You are already a VIP Member.");
        } else {
          toast.success(data?.message || "Welcome to Chopa VIP Membership 💖");
          setFullName(""); setEmail("");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 md:py-24" id="vip-membership">
      <div className="container mx-auto px-4">
        <div className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-6 md:p-12 shadow-xl">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/70 border border-primary/30 mb-5">
              <Gem className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold tracking-wide uppercase text-foreground/80">
                Members Only
              </span>
            </div>

            <h2 className="text-3xl md:text-5xl font-display font-bold mb-3">
              <span className="gradient-text">💎 Join Chopa VIP Membership</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              {paidEnabled
                ? "Choose a VIP tier and unlock exclusive discounts, early access, and members-only perks."
                : "Get exclusive discounts, early access to offers, beauty tips, and members-only coupon codes."}
            </p>

            {paidEnabled && plans.length > 0 && (
              <div className="grid md:grid-cols-3 gap-4 mb-8 text-left">
                {plans.map((p) => {
                  const active = p.slug === selectedPlan;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlan(p.slug)}
                      className={`text-left rounded-2xl p-5 border-2 transition-all bg-card/60 backdrop-blur ${
                        active
                          ? "border-primary shadow-lg shadow-primary/20 -translate-y-1"
                          : "border-border/50 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className={`w-5 h-5 ${active ? "text-accent" : "text-muted-foreground"}`} />
                        <span className="font-display font-bold">{p.name}</span>
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        Ksh {Number(p.price_ksh).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        Valid for {p.duration_days} days
                      </div>
                      <ul className="space-y-1.5">
                        {p.perks.map((perk, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs">
                            <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <span>{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}

            {paidEnabled && selected && (
              <Card className="p-4 mb-6 bg-card/80 text-left text-sm border-accent/30">
                <p className="font-semibold mb-2">💳 How to pay</p>
                <ol className="space-y-1 text-muted-foreground list-decimal list-inside">
                  <li>Go to <strong>M-Pesa → Lipa na M-Pesa → Buy Goods and Services</strong>.</li>
                  <li>Enter Till Number <strong className="text-foreground">{TILL_NUMBER}</strong>.</li>
                  <li>Enter amount <strong className="text-foreground">Ksh {Number(selected.price_ksh).toLocaleString()}</strong> and confirm.</li>
                  <li>Paste the M-Pesa confirmation code below. We activate within 24 hours.</li>
                </ol>
              </Card>
            )}

            <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
              <div>
                <Label htmlFor="vip-name" className="text-xs text-muted-foreground">Full Name {paidEnabled ? "" : "(optional)"}</Label>
                <Input id="vip-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" maxLength={100} autoComplete="name" required={paidEnabled} />
              </div>
              <div>
                <Label htmlFor="vip-email" className="text-xs text-muted-foreground">Email Address</Label>
                <Input id="vip-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" maxLength={255} autoComplete="email" />
              </div>

              {paidEnabled && (
                <>
                  <div>
                    <Label htmlFor="vip-phone" className="text-xs text-muted-foreground">M-Pesa Phone</Label>
                    <Input id="vip-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" maxLength={20} autoComplete="tel" />
                  </div>
                  <div>
                    <Label htmlFor="vip-code" className="text-xs text-muted-foreground">M-Pesa Code</Label>
                    <Input id="vip-code" required value={mpesaCode} onChange={(e) => setMpesaCode(e.target.value.toUpperCase())} placeholder="e.g. SGH7H8K9LM" maxLength={15} />
                  </div>
                </>
              )}

              {/* honeypot */}
              <input
                type="text" value={website} onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1} autoComplete="off" aria-hidden="true"
                style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }}
              />
              <div className="sm:col-span-2 mt-2">
                <Button type="submit" variant="gradient" size="lg" disabled={loading} className="w-full">
                  <Sparkles className="w-4 h-4" />
                  {loading
                    ? "Submitting…"
                    : paidEnabled
                      ? `Submit Payment${selected ? ` · Ksh ${Number(selected.price_ksh).toLocaleString()}` : ""}`
                      : "Join VIP Membership"}
                </Button>
              </div>
            </form>

            <p className="text-xs text-muted-foreground mt-4">
              {paidEnabled
                ? "Your membership activates within 24 hours after we verify your M-Pesa payment."
                : "By joining, you agree to receive occasional VIP marketing emails. Unsubscribe anytime."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VIPMembershipSection;
