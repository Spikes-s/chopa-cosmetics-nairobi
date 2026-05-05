import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Package } from 'lucide-react';

export interface VariantOption {
  name: string;
  image?: string;
  price?: number;
}

export interface VariantGroup {
  type: string;
  label: string;
  options: VariantOption[];
}

const VARIANT_TYPES = [
  { value: 'weight', label: 'Weight (g/kg)' },
  { value: 'capacity', label: 'Capacity (ml/L)' },
  { value: 'size', label: 'Size' },
  { value: 'quantity', label: 'Quantity / Pack' },
  { value: 'colour', label: 'Colour' },
  { value: 'flavour', label: 'Flavour' },
  { value: 'scent', label: 'Scent' },
  { value: 'name', label: 'Name / Style' },
];

interface VariantManagerProps {
  variantGroups: VariantGroup[];
  onChange: (groups: VariantGroup[]) => void;
}

const VariantManager = ({ variantGroups, onChange }: VariantManagerProps) => {
  const [addingType, setAddingType] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);

  const addGroup = () => {
    if (!addingType) return;
    const typeInfo = VARIANT_TYPES.find(t => t.value === addingType);
    if (!typeInfo) return;
    if (variantGroups.some(g => g.type === addingType)) return;

    onChange([...variantGroups, { type: addingType, label: typeInfo.label, options: [] }]);
    setAddingType('');
    setActiveGroupIndex(variantGroups.length);
  };

  const removeGroup = (index: number) => {
    onChange(variantGroups.filter((_, i) => i !== index));
    if (activeGroupIndex === index) setActiveGroupIndex(null);
  };

  const addOption = (groupIndex: number) => {
    const trimmed = newOptionValue.trim();
    if (!trimmed) return;
    const group = variantGroups[groupIndex];
    if (group.options.some(o => o.name.toLowerCase() === trimmed.toLowerCase())) return;

    const price = newOptionPrice ? parseFloat(newOptionPrice) : undefined;
    const updated = [...variantGroups];
    updated[groupIndex] = {
      ...group,
      options: [...group.options, { name: trimmed, price: price && price > 0 ? price : undefined }],
    };
    onChange(updated);
    setNewOptionValue('');
    setNewOptionPrice('');
  };

  const updateOptionPrice = (groupIndex: number, optionIndex: number, priceStr: string) => {
    const price = priceStr ? parseFloat(priceStr) : undefined;
    const updated = [...variantGroups];
    const opts = [...updated[groupIndex].options];
    opts[optionIndex] = { ...opts[optionIndex], price: price && price > 0 ? price : undefined };
    updated[groupIndex] = { ...updated[groupIndex], options: opts };
    onChange(updated);
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const updated = [...variantGroups];
    updated[groupIndex] = {
      ...updated[groupIndex],
      options: updated[groupIndex].options.filter((_, i) => i !== optionIndex),
    };
    onChange(updated);
  };

  const availableTypes = VARIANT_TYPES.filter(t => !variantGroups.some(g => g.type === t.value));

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 font-semibold">
          <Package className="w-4 h-4 text-primary" />
          Product Variants
        </Label>
      </div>

      {variantGroups.map((group, gi) => (
        <div key={group.type} className="space-y-2 p-3 rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{group.label}</span>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeGroup(gi)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
          
          {/* Options with prices */}
          <div className="space-y-1.5">
            {group.options.map((opt, oi) => (
              <div key={opt.name} className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1.5 pr-1 shrink-0">
                  {opt.name}
                  <button type="button" onClick={() => removeOption(gi, oi)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
                <Input
                  type="number"
                  value={opt.price ?? ''}
                  onChange={(e) => updateOptionPrice(gi, oi, e.target.value)}
                  placeholder="Price (Ksh)"
                  className="w-32 h-7 text-xs"
                  min={0}
                />
                {opt.price ? (
                  <span className="text-xs text-muted-foreground">Ksh {opt.price.toLocaleString()}</span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Uses default</span>
                )}
              </div>
            ))}
          </div>

          {/* Add option */}
          <div className="flex gap-2">
            <Input
              value={activeGroupIndex === gi ? newOptionValue : ''}
              onFocus={() => setActiveGroupIndex(gi)}
              onChange={(e) => { setActiveGroupIndex(gi); setNewOptionValue(e.target.value); }}
              placeholder={`Option name (e.g. ${group.type === 'weight' ? '250g' : group.type === 'capacity' ? '250ml' : group.type === 'size' ? 'Small' : 'Pack of 3'})`}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(gi); } }}
              className="text-sm flex-1"
            />
            <Input
              type="number"
              value={activeGroupIndex === gi ? newOptionPrice : ''}
              onFocus={() => setActiveGroupIndex(gi)}
              onChange={(e) => { setActiveGroupIndex(gi); setNewOptionPrice(e.target.value); }}
              placeholder="Price"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(gi); } }}
              className="text-sm w-24"
              min={0}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => addOption(gi)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave price empty to use the product's default price.
          </p>
        </div>
      ))}

      {availableTypes.length > 0 && (
        <div className="flex gap-2">
          <Select value={addingType} onValueChange={setAddingType}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add variant type..." />
            </SelectTrigger>
            <SelectContent>
              {availableTypes.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={addGroup} disabled={!addingType}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      )}

      {variantGroups.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add variant types like Weight, Capacity, Size, or Quantity to allow customers to choose options.
        </p>
      )}
    </div>
  );
};

export default VariantManager;
