import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const THEME_KEYS = [
  'theme_primary',
  'theme_accent',
  'theme_font_heading',
  'theme_font_body',
  'site_title',
  'logo_url',
] as const;

// Convert "#rrggbb" to "H S% L%" (Tailwind HSL channel format)
function hexToHslChannels(hex: string): string | null {
  const m = hex.trim().match(/^#?([a-f\d]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const loadedFonts = new Set<string>();
function loadGoogleFont(family: string) {
  if (!family || loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const id = `gf-${family.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function applyTheme(settings: Record<string, string>) {
  const root = document.documentElement;
  if (settings.theme_primary) {
    const hsl = hexToHslChannels(settings.theme_primary);
    if (hsl) {
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--ring', hsl);
    }
  }
  if (settings.theme_accent) {
    const hsl = hexToHslChannels(settings.theme_accent);
    if (hsl) root.style.setProperty('--accent', hsl);
  }
  if (settings.theme_font_heading) {
    loadGoogleFont(settings.theme_font_heading);
    root.style.setProperty('--font-heading', `'${settings.theme_font_heading}', serif`);
  }
  if (settings.theme_font_body) {
    loadGoogleFont(settings.theme_font_body);
    root.style.setProperty('--font-body', `'${settings.theme_font_body}', sans-serif`);
    document.body.style.fontFamily = `'${settings.theme_font_body}', sans-serif`;
  }
  if (settings.site_title) {
    document.title = settings.site_title;
  }
  if (settings.logo_url) {
    const link = (document.querySelector("link[rel='icon']") as HTMLLinkElement) || document.createElement('link');
    link.rel = 'icon';
    link.href = settings.logo_url;
    if (!link.parentNode) document.head.appendChild(link);
  }
}

const ThemeApplier = () => {
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', THEME_KEYS as unknown as string[]);
      if (!mounted || !data) return;
      const map: Record<string, string> = {};
      data.forEach((r: { key: string; value: string | null }) => {
        if (r.value) map[r.key] = r.value;
      });
      applyTheme(map);
    })();
    return () => { mounted = false; };
  }, []);
  return null;
};

export default ThemeApplier;
