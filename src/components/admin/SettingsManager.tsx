import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Save, Upload, Image } from 'lucide-react';

const SettingsManager = () => {
  const [logoUrl, setLogoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'logo_url')
        .maybeSingle();

      if (data?.value) {
        setLogoUrl(data.value);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveLogo = async () => {
    setIsLoading(true);

    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .eq('key', 'logo_url')
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from('site_settings')
        .update({ value: logoUrl })
        .eq('key', 'logo_url');
      error = result.error;
    } else {
      const result = await supabase
        .from('site_settings')
        .insert([{ key: 'logo_url', value: logoUrl }]);
      error = result.error;
    }

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save logo URL',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Logo URL saved successfully',
      });
    }

    setIsLoading(false);
  };

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
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter the URL of your logo image. The image should be optimized for web display.
            </p>
          </div>

          {logoUrl && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <img
                src={logoUrl}
                alt="Logo Preview"
                className="max-h-20 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <Button onClick={handleSaveLogo} disabled={isLoading} className="gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Logo'}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
          <CardDescription>
            Basic store information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Store Name</p>
                <p className="font-medium">CHOPA COSMETICS LIMITED</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Motto</p>
                <p className="font-medium">"Beauty At Your Proximity"</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">KAKA HOUSE – OTC, along Racecourse Road</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opening Hours</p>
                <p className="font-medium">7:30 AM – 9:00 PM</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">M-Pesa Till Number</p>
                <p className="font-medium">4623226</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsManager;
