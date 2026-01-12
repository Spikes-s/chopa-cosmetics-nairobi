import { Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PhoneContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  contactName: string;
}

const PhoneContactDialog = ({ isOpen, onClose, phoneNumber, contactName }: PhoneContactDialogProps) => {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  const whatsappNumber = cleanNumber.startsWith('0') 
    ? '254' + cleanNumber.slice(1) 
    : cleanNumber;

  const handleCall = () => {
    window.location.href = `tel:${phoneNumber}`;
    onClose();
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${whatsappNumber}`, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Contact {contactName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          <p className="text-center text-lg font-semibold text-accent">{phoneNumber}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              size="lg" 
              className="flex flex-col gap-2 h-auto py-4"
              onClick={handleCall}
            >
              <Phone className="w-6 h-6 text-primary" />
              <span>Call</span>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="flex flex-col gap-2 h-auto py-4 hover:bg-green-500/10 hover:border-green-500"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-6 h-6 text-green-500" />
              <span>WhatsApp</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneContactDialog;
