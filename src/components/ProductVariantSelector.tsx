import { AlertCircle } from 'lucide-react';

interface VariantOption {
  name: string;
  image?: string;
}

interface VariantGroup {
  type: string;
  label: string;
  options: VariantOption[];
}

interface NamedImage {
  name: string;
  url: string;
}

interface ProductVariantSelectorProps {
  variantGroups: VariantGroup[];
  namedImages: NamedImage[];
  selectedVariants: Record<string, string>;
  onVariantChange: (type: string, value: string) => void;
  required?: boolean;
}

const ProductVariantSelector = ({
  variantGroups,
  namedImages,
  selectedVariants,
  onVariantChange,
  required = false,
}: ProductVariantSelectorProps) => {
  if (variantGroups.length === 0) return null;

  const getOptionImage = (optionName: string): string | null => {
    // Check named images for a match
    const match = namedImages.find(
      (img) => img.name.toLowerCase() === optionName.toLowerCase()
    );
    return match?.url || null;
  };

  return (
    <div className="space-y-4">
      {variantGroups.map((group) => {
        const selectedValue = selectedVariants[group.type] || '';
        return (
          <div key={group.type}>
            <label className="block text-sm font-medium text-foreground mb-3">
              {group.label} {required && <span className="text-destructive">*</span>}
            </label>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const isSelected = selectedValue === option.name;
                const optImage = getOptionImage(option.name);
                return (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => onVariantChange(group.type, option.name)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/5 text-foreground'
                        : 'border-border hover:border-primary/50 text-foreground'
                    }`}
                  >
                    {optImage && (
                      <img
                        src={optImage}
                        alt={option.name}
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                    {option.name}
                  </button>
                );
              })}
            </div>
            {required && !selectedValue && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Please select {group.label.toLowerCase()}
              </p>
            )}
            {selectedValue && (
              <div className="mt-2 text-sm text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selectedValue}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProductVariantSelector;
