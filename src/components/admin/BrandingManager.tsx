import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Palette, Loader2, RotateCcw } from 'lucide-react';
import { applyTheme } from '@/components/ThemeApplier';

const KEYS = [
  'theme_primary',
  'theme_accent',
  'theme_font_heading',
  'theme_font_body',
  'site_title',
  'logo_url',
] as const;

const FONT_OPTIONS = [
  'Playfair Display', 'Cormorant Garamond', 'Cinzel', 'DM Serif Display',
  'Inter', 'Poppins', 'Montserrat', 'Lato', 'Nunito', 'Raleway',
];

const DEFAULTS = {
  theme_primary: '#e6a4b4',
  theme_accent: '#d4af37',
  theme_font_heading: 'Playfair Display',
  theme_font_body: 'Inter',
  site_title: 'Chopa Cosmetics – Beauty At Your Proximity',
  logo_url: '',
};

type FormState = Record<(typeof KEYS)[number], string>;

const BrandingManager = () => {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', KEYS as unknown as string[]);
      if (data) {
        const next = { ...DEFAULTS } as FormState;
        data.forEach((r: { key: string; value: string | null }) => {
          if (r.value && KEYS.includes(r.key as (typeof KEYS)[number])) {
            next[r.key as (typeof KEYS)[number]] = r.value;
          }
        });
        setForm(next);
      }
      setLoading(false);
    })();
  }, []);

  const update = <K extends keyof FormState>(k: K, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleLogoUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Logo too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }
    const path = `branding/logo-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
    update('logo_url', publicUrl);
  };

  const save = async () => {
    setSaving(true);
    try {
      const rows = KEYS.map(key => ({ key, value: form[key] }));
      const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      applyTheme(form);
      toast({ title: 'Branding saved', description: 'Theme applied across the site.' });
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setForm(DEFAULTS);
    applyTheme(DEFAULTS);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Site Branding & Theme
        </CardTitle>
        <CardDescription>
          Customize colors, fonts, site title, and logo. Changes apply instantly across the website.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Colors */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={form.theme_primary}
                onChange={e => update('theme_primary', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={form.theme_primary}
                onChange={e => update('theme_primary', e.target.value)}
                placeholder="#e6a4b4"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={form.theme_accent}
                onChange={e => update('theme_accent', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={form.theme_accent}
                onChange={e => update('theme_accent', e.target.value)}
                placeholder="#d4af37"
              />
            </div>
          </div>
        </div>

        {/* Fonts */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Heading Font</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.theme_font_heading}
              onChange={e => update('theme_font_heading', e.target.value)}
            >
              {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Body Font</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.theme_font_body}
              onChange={e => update('theme_font_body', e.target.value)}
            >
              {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label>Site Title (browser tab)</Label>
          <Input
            value={form.site_title}
            onChange={e => update('site_title', e.target.value)}
            placeholder="Chopa Cosmetics – Beauty At Your Proximity"
          />
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo preview" className="w-14 h-14 rounded-md object-contain bg-muted/40 border" />
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
            />
          </div>
          <Input
            value={form.logo_url}
            onChange={e => update('logo_url', e.target.value)}
            placeholder="https://... (or upload above)"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save & Apply'}
          </Button>
          <Button variant="outline" onClick={reset} disabled={saving}>
            <RotateCcw className="w-4 h-4 mr-2" />Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BrandingManager;
