import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Truck } from 'lucide-react';

export interface DeliveryLocation {
  id: string;
  name: string;
  price: number;
}

export const DELIVERY_LOCATIONS: DeliveryLocation[] = [
  { id: 'cbd', name: 'CBD (Free Delivery)', price: 0 },
  { id: 'eastlands', name: 'Eastlands', price: 200 },
  { id: 'westlands', name: 'Westlands', price: 250 },
  { id: 'thika', name: 'Thika', price: 400 },
  { id: 'rongai', name: 'Rongai', price: 350 },
  { id: 'kitengela', name: 'Kitengela', price: 400 },
  { id: 'outside_nairobi', name: 'Outside Nairobi', price: 600 },
];

interface DeliveryLocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  hidePrice?: boolean;
}

const DeliveryLocationSelect = ({ value, onChange, hidePrice = false }: DeliveryLocationSelectProps) => {
  const selectedLocation = DELIVERY_LOCATIONS.find(l => l.id === value);
  const isOutsideCBD = value && value !== 'cbd';
  
  return (
    <div className="space-y-3">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select delivery location" />
        </SelectTrigger>
        <SelectContent>
          {DELIVERY_LOCATIONS.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              <span>{location.name.replace(' (Free Delivery)', location.id === 'cbd' ? ' (Free)' : '')}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedLocation && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Truck className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Delivery to {selectedLocation.name.replace(' (Free Delivery)', '')}
            </p>
          </div>
        </div>
      )}

      {/* Warning for outside CBD */}
      {isOutsideCBD && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
          <span className="text-lg">👉</span>
          <p className="text-sm font-medium text-warning">
            NOTE: Delivery fee will be paid directly to the driver upon delivery.
          </p>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
        <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-accent">
          <strong>Pay on Delivery Available:</strong> You can pay for your order upon delivery. 
          Please have the exact amount ready for our delivery agent.
        </p>
      </div>
    </div>
  );
};

export default DeliveryLocationSelect;
