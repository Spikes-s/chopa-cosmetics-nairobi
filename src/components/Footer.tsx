import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Clock, ExternalLink, Facebook, Instagram, Youtube, MessageCircle, Send, Mail, Globe, Linkedin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type SocialRow = { id: string; platform: string; handle_or_url: string };
type WebLinkRow = { id: string; label: string; url: string };

const socialIcon = (platform: string) => {
  switch (platform) {
    case 'facebook': return Facebook;
    case 'instagram': return Instagram;
    case 'youtube': return Youtube;
    case 'whatsapp': return MessageCircle;
    case 'telegram': return Send;
    case 'email': return Mail;
    case 'phone': return Phone;
    case 'linkedin': return Linkedin;
    default: return Globe;
  }
};

const buildSocialUrl = (platform: string, value: string): string => {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '');
  switch (platform) {
    case 'facebook': return `https://facebook.com/${handle}`;
    case 'instagram': return `https://instagram.com/${handle}`;
    case 'tiktok': return `https://tiktok.com/@${handle}`;
    case 'youtube': return `https://youtube.com/@${handle}`;
    case 'twitter':
    case 'x': return `https://x.com/${handle}`;
    case 'threads': return `https://threads.net/@${handle}`;
    case 'pinterest': return `https://pinterest.com/${handle}`;
    case 'linkedin': return `https://linkedin.com/in/${handle}`;
    case 'whatsapp': return `https://wa.me/${handle.replace(/\D/g, '')}`;
    case 'telegram': return `https://t.me/${handle}`;
    case 'email': return `mailto:${handle}`;
    case 'phone': return `tel:${handle}`;
    default: return v;
  }
};

const Footer = () => {
  const [mapLocation, setMapLocation] = useState<string | null>(null);
  const [socials, setSocials] = useState<SocialRow[]>([]);
  const [webLinks, setWebLinks] = useState<WebLinkRow[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: mapData }, { data: sData }, { data: wData }] = await Promise.all([
        supabase.from('site_settings').select('value').eq('key', 'map_location').maybeSingle(),
        supabase.from('social_links').select('id, platform, handle_or_url').eq('is_active', true).order('sort_order'),
        supabase.from('website_links').select('id, label, url').eq('is_active', true).order('sort_order'),
      ]);
      if (mapData?.value) setMapLocation(mapData.value);
      setSocials((sData as SocialRow[]) || []);
      setWebLinks((wData as WebLinkRow[]) || []);
    };
    fetchAll();
  }, []);

  const handleOpenMap = () => {
    if (mapLocation) window.open(mapLocation, '_blank');
    else window.open('https://maps.google.com/?q=Nairobi+CBD+Kenya', '_blank');
  };

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-display font-bold gradient-text mb-4">
              CHOPA COSMETICS
            </h3>
            <p className="text-muted-foreground font-body text-sm leading-relaxed mb-4">
              "Beauty At Your Proximity"
            </p>
            <p className="text-muted-foreground font-body text-sm">
              Your trusted destination for premium cosmetics and beauty products in Kenya.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Shop All
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/reviews" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Customer Reviews
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-muted-foreground text-sm">
                <Phone className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p>0715167179 – James (Manager)</p>
                  <p>0757435912 – Pius (Manager)</p>
                  <p>0759829850 – Mark (Developer)</p>
                </div>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground text-sm">
                <Clock className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <span>7:30 AM – 9:00 PM</span>
              </li>
            </ul>
          </div>

          {/* Location */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Location</h4>
            <div className="flex items-start gap-2 text-muted-foreground text-sm mb-4">
              <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="mb-2">
                  <strong>Main Branch:</strong><br />
                  KAKA HOUSE – OTC, along Racecourse Road, opposite Kaka Travellers Sacco
                </p>
                <p>
                  <strong>Thika Branch:</strong><br />
                  Opposite Family Bank
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenMap}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View in Maps
            </Button>
          </div>
        </div>

        {/* Website links + Social icons */}
        {(webLinks.length > 0 || socials.length > 0) && (
          <div className="border-t border-border mt-8 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {webLinks.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {webLinks.map((l) => (
                  <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                     className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5" /> {l.label}
                  </a>
                ))}
              </div>
            )}
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {socials.map((s) => {
                  const Icon = socialIcon(s.platform);
                  return (
                    <a key={s.id} href={buildSocialUrl(s.platform, s.handle_or_url)} target="_blank" rel="noopener noreferrer"
                       aria-label={s.platform}
                       className="p-2 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Chopa Cosmetics Limited. All rights reserved.
          </p>
          <p className="text-muted-foreground text-xs">
            Prices in Kenyan Shillings (Ksh)
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
