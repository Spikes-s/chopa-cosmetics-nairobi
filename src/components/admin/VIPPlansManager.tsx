import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_ksh: number;
  duration_days: number;
  perks: string[];
  is_active: boolean;
  sort_order: number;
}

const blank = (): Omit<Plan, "id"> => ({
  name: "", slug: "", price_ksh: 0, duration_days: 30,
  perks: [], is_active: true, sort_order: 0,
});

const VIPPlansManager = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Omit<Plan, "id">>(blank());
  const [perksText, setPerksText] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("vip_plans").select("*").order("sort_order");
    setPlans(
      ((data as any[]) || []).map((p) => ({
        ...p,
        perks: Array.isArray(p.perks) ? p.perks : [],
      })),
    );
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createPlan = async () => {
    if (!draft.name || !draft.slug) return toast.error("Name and slug required");
    setCreating(true);
    const perks = perksText.split("\n").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("vip_plans").insert({
      ...draft, slug: draft.slug.toLowerCase().trim(), perks,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Plan created");
    setDraft(blank()); setPerksText("");
    load();
  };

  const updatePlan = async (p: Plan, patch: Partial<Plan>) => {
    const { error } = await supabase.from("vip_plans").update(patch).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Delete this plan? Members on it will keep their existing access.")) return;
    const { error } = await supabase.from("vip_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plan deleted"); load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-lg">Add a VIP Plan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Gold VIP" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="gold" />
            </div>
            <div>
              <Label>Price (Ksh)</Label>
              <Input type="number" min={0} value={draft.price_ksh} onChange={(e) => setDraft({ ...draft, price_ksh: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Duration (days)</Label>
              <Input type="number" min={1} value={draft.duration_days} onChange={(e) => setDraft({ ...draft, duration_days: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Perks (one per line)</Label>
            <Textarea rows={3} value={perksText} onChange={(e) => setPerksText(e.target.value)} placeholder="10% off all orders&#10;Bi-weekly coupons" />
          </div>
          <Button onClick={createPlan} disabled={creating} variant="gradient" className="gap-2">
            <Plus className="w-4 h-4" /> {creating ? "Creating…" : "Add Plan"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Price</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Perks</th>
                <th className="p-3">Active</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No plans yet.</td></tr>
              ) : plans.map((p) => (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="p-3 font-semibold">{p.name}</td>
                  <td className="p-3 font-mono text-xs">{p.slug}</td>
                  <td className="p-3">Ksh {Number(p.price_ksh).toLocaleString()}</td>
                  <td className="p-3">{p.duration_days}d</td>
                  <td className="p-3 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {p.perks.map((perk, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{perk}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <Switch checked={p.is_active} onCheckedChange={(v) => updatePlan(p, { is_active: v })} />
                  </td>
                  <td className="p-3">
                    <Button variant="ghost" size="icon" onClick={() => deletePlan(p.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default VIPPlansManager;
