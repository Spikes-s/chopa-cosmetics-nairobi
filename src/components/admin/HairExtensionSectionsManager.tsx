import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Scissors, Plus, X, Save } from 'lucide-react';

const DEFAULT_SECTIONS = ['Braids', 'Crotchets', 'Weaves', 'Wigs', 'Brazilian Wool', 'Extensions'];

const HairExtensionSectionsManager = () => {
  const [sections, setSections] = useState<string[]>(DEFAULT_SECTIONS);
  const [newSection, setNewSection] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSections = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hair_extension_sections')
        .maybeSingle();

      if (data?.value) {
        try {
          setSections(JSON.parse(data.value));
        } catch {}
      }
    };
    fetchSections();
  }, []);

  const addSection = () => {
    const trimmed = newSection.trim();
    if (!trimmed) return;
    if (sections.includes(trimmed)) {
      toast({ title: 'Section already exists', variant: 'destructive' });
      return;
    }
    setSections([...sections, trimmed]);
    setNewSection('');
  };

  const removeSection = (section: string) => {
    if (DEFAULT_SECTIONS.includes(section)) {
      toast({ title: 'Cannot remove default sections', variant: 'destructive' });
      return;
    }
    setSections(sections.filter(s => s !== section));
  };

  const saveSections = async () => {
    setIsSaving(true);
    const value = JSON.stringify(sections);
    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .eq('key', 'hair_extension_sections')
      .maybeSingle();

    if (existing) {
      await supabase.from('site_settings').update({ value }).eq('key', 'hair_extension_sections');
    } else {
      await supabase.from('site_settings').insert([{ key: 'hair_extension_sections', value }]);
    }

    toast({ title: 'Hair extension sections saved' });
    setIsSaving(false);
  };

  return (
    <Card className="glass-card mt-6">
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
          {sections.map(section => (
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
            Add
          </Button>
        </div>
        <Button onClick={saveSections} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Sections'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default HairExtensionSectionsManager;
