import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Palette } from 'lucide-react';

interface CustomColor {
  name: string;
  hex: string;
}

interface ColorPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onColorsConfirmed: (colors: CustomColor[]) => void;
  existingColors?: CustomColor[];
}

const ColorPickerDialog = ({ open, onOpenChange, onColorsConfirmed, existingColors = [] }: ColorPickerDialogProps) => {
  const [colors, setColors] = useState<CustomColor[]>(existingColors);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');

  const addColor = () => {
    const trimmed = newColorName.trim();
    if (!trimmed) return;
    
    if (colors.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    setColors([...colors, { name: trimmed, hex: newColorHex }]);
    setNewColorName('');
    setNewColorHex('#000000');
  };

  const removeColor = (name: string) => {
    setColors(colors.filter(c => c.name !== name));
  };

  const handleConfirm = () => {
    onColorsConfirmed(colors);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onColorsConfirmed([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Add Available Braid Colors?
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Hair extensions can have multiple color options. Add the colors available for this product.
        </p>

        <div className="space-y-4">
          {/* Color List */}
          {colors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <Badge key={color.name} variant="secondary" className="flex items-center gap-2 pr-1">
                  <div 
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: color.hex }}
                  />
                  {color.name}
                  <button 
                    type="button" 
                    onClick={() => removeColor(color.name)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Add Color Input */}
          <div className="space-y-2">
            <Label>Add Color</Label>
            <div className="flex gap-2">
              <Input
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                placeholder="e.g., #1, Burgundy, Honey Blonde"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                className="flex-1"
              />
              <input
                type="color"
                value={newColorHex}
                onChange={(e) => setNewColorHex(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer border border-border"
                title="Select color shade"
              />
              <Button type="button" variant="outline" size="icon" onClick={addColor}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter color name/number and pick the exact shade
            </p>
          </div>

          {/* Preview Selected Color */}
          {newColorName && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <div 
                className="w-8 h-8 rounded-full border border-border"
                style={{ backgroundColor: newColorHex }}
              />
              <span className="text-sm">Preview: {newColorName || 'Unnamed'}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={handleSkip}>
            Skip (No Colors)
          </Button>
          <Button onClick={handleConfirm}>
            Confirm {colors.length > 0 && `(${colors.length} colors)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ColorPickerDialog;
