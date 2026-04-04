import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save, Image, MapPin, Phone, Mail, Clock } from 'lucide-react';
import SuperAdminControls from './SuperAdminControls';
import { useAuth } from '@/context/AuthContext';

interface SiteSettings {
  logo_url: string;
  location: string;
  phone_primary: string;
  phone_secondary: string;
  email: string;
  hours: string;
  map_url: string;
  hair_extension_sections: string[];
}

const DEFAULT_SECTIONS = ['Braids', 'Crotchets', 'Weaves', 'Wigs', 'Brazilian Wool', 'Extensions'];

const SettingsManager = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SiteSettings>({
    logo_url: '',
    location: 'KAKA HOUSE – OTC, along Racecourse Road, opposite Kaka Travellers Sacco',
    phone_primary: '0715167179',
    phone_secondary: '0757435912',
    email: 'info@chopa.co.ke',
    hours: '7:30 AM – 9:00 PM',
    map_url: '',
    hair_extension_sections: DEFAULT_SECTIONS,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [newSection, setNewSection] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value');

      if (data) {
        const settingsMap: Record<string, string> = {};
        data.forEach(item => {
          if (item.value) settingsMap[item.key] = item.value;
        });

        setSettings(prev => ({
          ...prev,
          logo_url: settingsMap.logo_url || prev.logo_url,
          location: settingsMap.location || prev.location,
          phone_primary: settingsMap.phone_primary || prev.phone_primary,
          phone_secondary: settingsMap.phone_secondary || prev.phone_secondary,
          email: settingsMap.email || prev.email,
          hours: settingsMap.hours || prev.hours,
          map_url: settingsMap.map_url || prev.map_url,
          hair_extension_sections: settingsMap.hair_extension_sections 
            ? JSON.parse(settingsMap.hair_extension_sections) 
            : prev.hair_extension_sections,
        }));
      }
      setIsFetching(false);
    };

    fetchSettings();
  }, []);

  const addSection = () => {
    const trimmed = newSection.trim();
    if (!trimmed) return;
    if (settings.hair_extension_sections.includes(trimmed)) {
      toast({ title: 'Section already exists', variant: 'destructive' });
      return;
    }
    setSettings({
      ...settings,
      hair_extension_sections: [...settings.hair_extension_sections, trimmed],
    });
    setNewSection('');
  };

  const removeSection = (section: string) => {
    if (DEFAULT_SECTIONS.includes(section)) {
      toast({ title: 'Cannot remove default sections', variant: 'destructive' });
      return;
    }
    setSettings({
      ...settings,
      hair_extension_sections: settings.hair_extension_sections.filter(s => s !== section),
    });
  };

  const saveSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .eq('key', key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('site_settings')
        .update({ value })
        .eq('key', key);
    } else {
      await supabase
        .from('site_settings')
        .insert([{ key, value }]);
    }
  };

  const handleSaveAll = async () => {
    setIsLoading(true);

    try {
      await Promise.all([
        saveSetting('logo_url', settings.logo_url),
        saveSetting('location', settings.location),
        saveSetting('phone_primary', settings.phone_primary),
        saveSetting('phone_secondary', settings.phone_secondary),
        saveSetting('email', settings.email),
        saveSetting('hours', settings.hours),
        saveSetting('map_url', settings.map_url),
        saveSetting('hair_extension_sections', JSON.stringify(settings.hair_extension_sections)),
      ]);

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  if (isFetching) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Logo Settings
          </CardTitle>
          <CardDescription>
            Update your store logo by providing an image URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              type="url"
              placeholder="https://example.com/logo.png"
              value={settings.logo_url}
              onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
            />
          </div>

          {settings.logo_url && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <img
                src={settings.logo_url}
                alt="Logo Preview"
                className="max-h-20 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location & Contact
          </CardTitle>
          <CardDescription>
            Update your store location and contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Store Location</Label>
            <Textarea
              id="location"
              placeholder="Enter your store address"
              value={settings.location}
              onChange={(e) => setSettings({ ...settings, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone_primary" className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> Primary Phone
              </Label>
              <Input
                id="phone_primary"
                type="tel"
                placeholder="0712345678"
                value={settings.phone_primary}
                onChange={(e) => setSettings({ ...settings, phone_primary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_secondary" className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> Secondary Phone
              </Label>
              <Input
                id="phone_secondary"
                type="tel"
                placeholder="0712345678"
                value={settings.phone_secondary}
                onChange={(e) => setSettings({ ...settings, phone_secondary: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="info@example.com"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours" className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Business Hours
            </Label>
            <Input
              id="hours"
              placeholder="e.g., 7:30 AM – 9:00 PM"
              value={settings.hours}
              onChange={(e) => setSettings({ ...settings, hours: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="map_url">Google Maps Embed URL (optional)</Label>
            <Input
              id="map_url"
              type="url"
              placeholder="https://www.google.com/maps/embed?..."
              value={settings.map_url}
              onChange={(e) => setSettings({ ...settings, map_url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Paste the embed URL from Google Maps to show a map on the contact page
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            Hair Extensions Sections
          </CardTitle>
          <CardDescription>
            Manage subcategories under Hair Extensions. Add new sections without code changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings.hair_extension_sections.map(section => (
              <Badge key={section} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                {section}
                {!DEFAULT_SECTIONS.includes(section) && (
                  <button onClick={() => removeSection(section)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="New section name..."
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSection()}
            />
            <Button onClick={addSection} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Section
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSaveAll} disabled={isLoading} className="gap-2 w-full md:w-auto">
        <Save className="w-4 h-4" />
        {isLoading ? 'Saving...' : 'Save All Settings'}
      </Button>

      {/* Super Admin Controls - only visible to super admin */}
      <SuperAdminControls userEmail={user?.email} />
    </div>
  );
};

export default SettingsManager;
