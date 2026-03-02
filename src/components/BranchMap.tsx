import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Phone, Mail, Route } from 'lucide-react';

interface StartingPoint {
  name: string;
  latitude: number;
  longitude: number;
}

interface Branch {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_main: boolean;
  is_active: boolean;
  service_radius_km: number | null;
  starting_points: StartingPoint[] | null;
}

const BranchMap = () => {
  const { theme } = useTheme();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('branches-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'branches'
      }, () => {
        fetchBranches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('is_main', { ascending: false })
      .order('display_order');
    
    if (!error && data) {
      // Parse starting_points from JSONB
      const parsedData = data.map(branch => ({
        ...branch,
        starting_points: Array.isArray(branch.starting_points) 
          ? (branch.starting_points as unknown as StartingPoint[])
          : null
      }));
      setBranches(parsedData);
      // Select main branch by default
      const mainBranch = parsedData.find(b => b.is_main) || parsedData[0];
      if (mainBranch && !selectedBranch) {
        setSelectedBranch(mainBranch);
      }
    }
    setLoading(false);
  };

  const handleGetDirections = (branch: Branch, startingPoint?: StartingPoint) => {
    if (branch.latitude && branch.longitude) {
      let url = `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`;
      
      if (startingPoint) {
        url += `&origin=${startingPoint.latitude},${startingPoint.longitude}`;
      }
      
      window.open(url, '_blank');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <Card variant="glass">
        <CardContent className="py-8 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Location will be available soon.</p>
        </CardContent>
      </Card>
    );
  }

  // Generate embed URL for Google Maps with theme-aware styling
  const getMapEmbedUrl = () => {
    if (!selectedBranch?.latitude || !selectedBranch?.longitude) return null;
    
    const center = `${selectedBranch.latitude},${selectedBranch.longitude}`;
    return `https://maps.google.com/maps?q=${center}&output=embed&z=15`;
  };

  const mapUrl = getMapEmbedUrl();
  const startingPoints = selectedBranch?.starting_points || [];

  return (
    <div className="space-y-6">
      {/* Branch Selector */}
      {branches.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {branches.map((branch) => (
            <Button
              key={branch.id}
              variant={selectedBranch?.id === branch.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedBranch(branch)}
              className="gap-2"
            >
              <MapPin className="w-4 h-4" />
              {branch.name}
              {branch.is_main && (
                <span className="text-xs bg-accent/20 px-1.5 py-0.5 rounded">Main</span>
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Map Container */}
      <Card variant="glass" className="overflow-hidden">
        <div 
          className={`w-full h-64 md:h-80 relative ${
            theme === 'dark' ? 'brightness-75 contrast-125 invert hue-rotate-180' : ''
          }`}
        >
          {mapUrl ? (
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map showing ${selectedBranch?.name}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted">
              <p className="text-muted-foreground">Map not available</p>
            </div>
          )}
        </div>
      </Card>

      {/* Branch Info */}
      {selectedBranch && (
        <Card variant="gradient">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5 text-primary" />
              {selectedBranch.name}
              {selectedBranch.is_main && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  Main Branch
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedBranch.address && (
              <p className="text-muted-foreground text-sm">{selectedBranch.address}</p>
            )}
            
            <div className="flex flex-wrap gap-3">
              {selectedBranch.contact_phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{selectedBranch.contact_phone}</span>
                </div>
              )}
              {selectedBranch.contact_email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>{selectedBranch.contact_email}</span>
                </div>
              )}
            </div>

            {/* Directions Buttons */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleGetDirections(selectedBranch)}
                  className="gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </Button>
              </div>

              {/* Starting Points for Directions */}
              {startingPoints.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Route className="w-4 h-4 text-destructive" />
                    Quick Directions From:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {startingPoints.map((point, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleGetDirections(selectedBranch, point)}
                        className="gap-2 border-destructive/30 hover:border-destructive hover:bg-destructive/10"
                      >
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        {point.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Branches List (if more than one) */}
      {branches.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.filter(b => b.id !== selectedBranch?.id).map((branch) => (
            <Card 
              key={branch.id} 
              variant="glass" 
              className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setSelectedBranch(branch)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">{branch.name}</h4>
                    {branch.address && (
                      <p className="text-sm text-muted-foreground mt-1">{branch.address}</p>
                    )}
                  </div>
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BranchMap;
