import { Dialog, DialogContent } from '@/components/ui/dialog';
import Auth from '@/pages/Auth';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const AuthModal = ({ open, onClose }: AuthModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-0 bg-transparent border-0 shadow-none">
        <Auth isModal onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
