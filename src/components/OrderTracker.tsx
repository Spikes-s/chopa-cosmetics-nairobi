import { Check, Clock, Package, Truck, MapPin, ShoppingBag } from 'lucide-react';

interface OrderTrackerProps {
  currentStatus: string;
  statusHistory?: { status: string; timestamp: string }[];
}

const ORDER_STEPS = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'payment_verified', label: 'Payment Verified', icon: Check },
  { key: 'processing', label: 'Preparing Order', icon: Package },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: MapPin },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'completed', label: 'Completed', icon: ShoppingBag },
];

const statusMap: Record<string, number> = {};
ORDER_STEPS.forEach((s, i) => { statusMap[s.key] = i; });

const OrderTracker = ({ currentStatus, statusHistory }: OrderTrackerProps) => {
  const normalizedStatus = currentStatus.toLowerCase().replace(/\s+/g, '_');
  const currentStepIndex = statusMap[normalizedStatus] ?? -1;
  const isCancelled = normalizedStatus === 'cancelled';

  if (isCancelled) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-semibold text-lg">Order Cancelled</p>
        <p className="text-muted-foreground text-sm mt-1">This order has been cancelled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {ORDER_STEPS.map((step, index) => {
        const isCompleted = index <= currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const Icon = step.icon;

        // Find timestamp from history
        const historyEntry = statusHistory?.find(
          h => h.status.toLowerCase().replace(/\s+/g, '_') === step.key
        );

        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Line + Circle */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                isCompleted
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-border bg-muted text-muted-foreground'
              } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              {index < ORDER_STEPS.length - 1 && (
                <div className={`w-0.5 h-8 ${index < currentStepIndex ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>

            {/* Label */}
            <div className="pt-1">
              <p className={`text-sm font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </p>
              {historyEntry && (
                <p className="text-xs text-muted-foreground">
                  {new Date(historyEntry.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderTracker;
