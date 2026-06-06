import { useState } from "react";
import { Gem, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Please enter a valid email").max(255),
});

const VIPMembershipSection = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ full_name: fullName || undefined, email });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vip-signup", {
        body: { ...parsed.data, website },
      });
      if (error) throw error;
      if (data?.already) {
        toast.info(data.message || "You are already a VIP Member.");
      } else {
        toast.success(data?.message || "Welcome to Chopa VIP Membership 💖");
        setFullName("");
        setEmail("");
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
        <div className="relative max-w-3xl mx-auto rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-8 md:p-12 text-center shadow-xl">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
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
              Get exclusive discounts, early access to offers, beauty tips, and members-only coupon codes.
            </p>

            <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
              <div className="sm:col-span-1">
                <Label htmlFor="vip-name" className="text-xs text-muted-foreground">Full Name (optional)</Label>
                <Input
                  id="vip-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  maxLength={100}
                  autoComplete="name"
                />
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="vip-email" className="text-xs text-muted-foreground">Email Address</Label>
                <Input
                  id="vip-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  maxLength={255}
                  autoComplete="email"
                />
              </div>
              {/* honeypot */}
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }}
              />
              <div className="sm:col-span-2 mt-2">
                <Button type="submit" variant="gradient" size="lg" disabled={loading} className="w-full">
                  <Sparkles className="w-4 h-4" />
                  {loading ? "Joining…" : "Join VIP Membership"}
                </Button>
              </div>
            </form>

            <p className="text-xs text-muted-foreground mt-4">
              By joining, you agree to receive occasional VIP marketing emails. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VIPMembershipSection;
