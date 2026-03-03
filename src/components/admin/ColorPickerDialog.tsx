import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Palette, Search } from 'lucide-react';
import { ALL_COLORS, autoMatchColor, HairColor } from '@/data/hairColors';

interface CustomColor {
  name: string;
  hex: string;
  hex2?: string;
}

interface ColorPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onColorsConfirmed: (colors: CustomColor[]) => void;
  existingColors?: CustomColor[];
}

const DualShadeCircle = ({ hex, hex2, size = 32 }: { hex: string; hex2?: string; size?: number }) => {
  if (!hex2) {
    return (
      <div
        className="rounded-full border border-border shrink-0"
        style={{ backgroundColor: hex, width: size, height: size }}
      />
    );
  }
  return (
    <svg width={size} height={size} className="shrink-0">
      <defs>
        <linearGradient id={`grad-${hex}-${hex2}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hex} />
          <stop offset="45%" stopColor={hex} />
          <stop offset="55%" stopColor={hex2} />
          <stop offset="100%" stopColor={hex2} />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={size/2 - 1} fill={`url(#grad-${hex}-${hex2})`} stroke="hsl(var(--border))" strokeWidth="1" />
    </svg>
  );
};

const ColorPickerDialog = ({ open, onOpenChange, onColorsConfirmed, existingColors = [] }: ColorPickerDialogProps) => {
  const [colors, setColors] = useState<CustomColor[]>(existingColors);
  const [newColorName, setNewColorName] = useState('');
  const [topHex, setTopHex] = useState('#000000');
  const [bottomHex, setBottomHex] = useState('');
  const [isDualShade, setIsDualShade] = useState(false);
  const [autoMatched, setAutoMatched] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (open) {
      setColors(existingColors);
    }
  }, [open]);

  // Auto-match when typing color code
  useEffect(() => {
    if (!newColorName.trim()) {
      setAutoMatched(false);
      return;
    }
    const match = autoMatchColor(newColorName.trim());
    if (match) {
      setTopHex(match.hex);
      if (match.hex2) {
        setBottomHex(match.hex2);
        setIsDualShade(true);
      } else {
        setIsDualShade(false);
        setBottomHex('');
      }
      setAutoMatched(true);
    } else {
      setAutoMatched(false);
    }
  }, [newColorName]);

  const addColor = () => {
    const trimmed = newColorName.trim();
    if (!trimmed) return;
    if (colors.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) return;

    const newColor: CustomColor = {
      name: trimmed,
      hex: topHex,
      ...(isDualShade && bottomHex ? { hex2: bottomHex } : {}),
    };
    setColors([...colors, newColor]);
    setNewColorName('');
    setTopHex('#000000');
    setBottomHex('');
    setIsDualShade(false);
    setAutoMatched(false);
  };

  const addFromPalette = (color: HairColor) => {
    if (colors.some(c => c.name.toLowerCase() === color.name.toLowerCase())) return;
    setColors([...colors, { name: color.name, hex: color.hex, hex2: color.hex2 }]);
  };

  const removeColor = (name: string) => {
    setColors(colors.filter(c => c.name !== name));
  };

  const handleConfirm = () => {
    onColorsConfirmed(colors);
    onOpenChange(false);
  };

  const filteredPalette = searchFilter
    ? ALL_COLORS.filter(c => c.name.toLowerCase().includes(searchFilter.toLowerCase()) || c.id.toLowerCase().includes(searchFilter.toLowerCase()))
    : ALL_COLORS.slice(0, 20);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Braid Color Manager
          </DialogTitle>
        </DialogHeader>

        {/* Selected Colors */}
        {colors.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Selected Colors ({colors.length})</Label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <Badge key={color.name} variant="secondary" className="flex items-center gap-2 pr-1 py-1">
                  <DualShadeCircle hex={color.hex} hex2={color.hex2} size={20} />
                  {color.name}
                  <button type="button" onClick={() => removeColor(color.name)} className="hover:text-destructive ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Quick add from palette */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Quick Add from Palette</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search colors... (e.g. 27, blonde, red)"
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-1">
            {filteredPalette.map((color) => {
              const isSelected = colors.some(c => c.name.toLowerCase() === color.name.toLowerCase());
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => addFromPalette(color)}
                  disabled={isSelected}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all text-xs ${
                    isSelected 
                      ? 'border-primary bg-primary/10 opacity-50' 
                      : 'border-border hover:border-primary hover:bg-muted'
                  }`}
                  title={color.name}
                >
                  <DualShadeCircle hex={color.hex} hex2={color.hex2} size={28} />
                  <span className="truncate w-full text-center text-foreground">{color.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Manual / Custom Color */}
        <div className="space-y-3 border-t border-border pt-3">
          <Label className="font-medium">Customize Color</Label>
          <div className="flex gap-2">
            <Input
              value={newColorName}
              onChange={(e) => setNewColorName(e.target.value)}
              placeholder="Type code (e.g. 27, 613, 1B)..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="icon" onClick={addColor}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {autoMatched && (
            <p className="text-xs text-green-600">✓ Auto-matched from color database</p>
          )}

          {/* Dual shade toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={isDualShade}
                onChange={(e) => setIsDualShade(e.target.checked)}
                className="rounded"
              />
              Dual Shade (Top/Bottom)
            </label>
          </div>

          {/* Color pickers */}
          <div className="flex gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">{isDualShade ? 'Top Shade' : 'Color'}</Label>
              <input
                type="color"
                value={topHex}
                onChange={(e) => { setTopHex(e.target.value); setAutoMatched(false); }}
                className="w-14 h-10 rounded cursor-pointer border border-border"
              />
            </div>
            {isDualShade && (
              <div className="space-y-1">
                <Label className="text-xs">Bottom Shade</Label>
                <input
                  type="color"
                  value={bottomHex || '#000000'}
                  onChange={(e) => { setBottomHex(e.target.value); setAutoMatched(false); }}
                  className="w-14 h-10 rounded cursor-pointer border border-border"
                />
              </div>
            )}
            {/* Live preview */}
            <div className="space-y-1">
              <Label className="text-xs">Preview</Label>
              <DualShadeCircle hex={topHex} hex2={isDualShade ? (bottomHex || '#000000') : undefined} size={40} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={() => { onColorsConfirmed([]); onOpenChange(false); }}>
            Skip
          </Button>
          <Button onClick={handleConfirm}>
            Confirm {colors.length > 0 && `(${colors.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ColorPickerDialog;
