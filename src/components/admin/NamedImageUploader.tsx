import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface NamedImage {
  name: string;
  url: string;
}

interface NamedImageUploaderProps {
  namedImages: NamedImage[];
  onChange: (images: NamedImage[]) => void;
}

const NamedImageUploader = ({ namedImages, onChange }: NamedImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [imageName, setImageName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be under 5MB', variant: 'destructive' });
      return;
    }
    if (!imageName.trim()) {
      toast({ title: 'Error', description: 'Please enter an image name first', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(`products/${fileName}`, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(`products/${fileName}`);
      
      onChange([...namedImages, { name: imageName.trim(), url: publicUrl }]);
      setImageName('');
      toast({ title: 'Success', description: 'Variant image uploaded' });
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    onChange(namedImages.filter((_, i) => i !== index));
  };

  const saveEditName = (index: number) => {
    if (!editName.trim()) return;
    const updated = [...namedImages];
    updated[index] = { ...updated[index], name: editName.trim() };
    onChange(updated);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
      <Label className="flex items-center gap-2 font-semibold">
        <Image className="w-4 h-4 text-primary" />
        Variant Images (Named)
      </Label>
      <p className="text-xs text-muted-foreground">
        Upload images and name them to match variant values (e.g. "27", "250g", "Small"). Images auto-link to matching variants.
      </p>

      {/* Existing named images */}
      {namedImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {namedImages.map((img, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border bg-background">
              <img src={img.url} alt={img.name} className="w-full h-20 object-cover" />
              <div className="p-1.5">
                {editingIndex === i ? (
                  <div className="flex gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEditName(i); } }}
                      className="h-6 text-xs"
                      autoFocus
                    />
                    <Button type="button" size="icon" className="h-6 w-6" onClick={() => saveEditName(i)}>✓</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate text-foreground">{img.name}</span>
                    <button
                      type="button"
                      onClick={() => { setEditingIndex(i); setEditName(img.name); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload new named image */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Image Name</Label>
          <Input
            value={imageName}
            onChange={(e) => setImageName(e.target.value)}
            placeholder="e.g. 27, 250g, Small, Pack of 3"
            className="text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !imageName.trim()}
          className="gap-1"
        >
          {uploading ? (
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Upload
        </Button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
    </div>
  );
};

export default NamedImageUploader;
