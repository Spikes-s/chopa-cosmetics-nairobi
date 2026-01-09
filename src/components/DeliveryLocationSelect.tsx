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
}

const DeliveryLocationSelect = ({ value, onChange }: DeliveryLocationSelectProps) => {
  const selectedLocation = DELIVERY_LOCATIONS.find(l => l.id === value);
  
  return (
    <div className="space-y-3">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select delivery location" />
        </SelectTrigger>
        <SelectContent>
          {DELIVERY_LOCATIONS.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              <div className="flex items-center justify-between w-full gap-4">
                <span>{location.name}</span>
                <span className="text-muted-foreground text-sm">
                  {location.price === 0 ? 'FREE' : `Ksh ${location.price}`}
                </span>
              </div>
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
            <p className="text-lg font-bold text-accent">
              {selectedLocation.price === 0 ? 'FREE' : `Ksh ${selectedLocation.price.toLocaleString()}`}
            </p>
          </div>
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
