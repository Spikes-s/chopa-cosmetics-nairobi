import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, CheckCircle2, XCircle, Phone } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import ProcessingOverlay from '@/components/ProcessingOverlay';

interface MpesaExpressPaymentProps {
  amount: number;
  onSuccess: (receiptNumber: string) => void;
  onError: (message: string) => void;
}

type PaymentStatus = 'idle' | 'sending' | 'waiting' | 'completed' | 'failed' | 'cancelled';

const MpesaExpressPayment = ({ amount, onSuccess, onError }: MpesaExpressPaymentProps) => {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const checkoutIdRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const formatPhone = (input: string): string => {
    const cleaned = input.replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
    if (cleaned.startsWith('254')) return cleaned;
    if (cleaned.startsWith('+254')) return cleaned.slice(1);
    return cleaned;
  };

  const startPolling = (checkoutRequestId: string) => {
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes (5s intervals)

    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(pollRef.current);
        setStatus('failed');
        setStatusMessage('Payment not confirmed. Please try again or use the manual payment option.');
        onError('Payment verification timed out');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('mpesa-query', {
          body: { checkout_request_id: checkoutRequestId },
        });

        if (error) return;

        if (data.status === 'completed') {
          clearInterval(pollRef.current);
          setStatus('completed');
          setStatusMessage(`Payment successful ✅\nReceipt: ${data.mpesa_receipt_number}`);
          onSuccess(data.mpesa_receipt_number);
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          setStatus('failed');
          setStatusMessage(data.result_desc || 'Payment failed or cancelled. Please try again.');
          onError(data.result_desc || 'Payment failed');
        } else if (data.status === 'cancelled') {
          clearInterval(pollRef.current);
          setStatus('cancelled');
          setStatusMessage('You cancelled the M-PESA prompt. Try again or pay manually.');
          onError('Payment cancelled');
        }
      } catch {
        // Keep polling on network errors
      }
    }, 5000);
  };

  const handleSendSTKPush = async () => {
    const formatted = formatPhone(phone);
    if (!/^254[17]\d{8}$/.test(formatted)) {
      onError('Enter a valid Safaricom number (e.g., 0712345678)');
      return;
    }

    setStatus('sending');
    setStatusMessage('Sending payment request to your phone…');

    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: { phone_number: formatted, amount },
      });

      if (error || !data?.success) {
        setStatus('failed');
        const msg = data?.error || error?.message || 'Failed to send payment prompt';
        setStatusMessage(msg);
        onError(msg);
        return;
      }

      checkoutIdRef.current = data.checkout_request_id;
      setStatus('waiting');
      setStatusMessage('Please check your phone and enter your M-Pesa PIN');
      startPolling(data.checkout_request_id);
    } catch (err) {
      setStatus('failed');
      setStatusMessage('Network error. Please check your connection and try again.');
      onError('Network error');
    }
  };

  const handleRetry = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus('idle');
    setStatusMessage('');
  };

  // Show processing overlay for sending/waiting states
  const showOverlay = status === 'sending' || status === 'waiting';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Smartphone className="w-5 h-5 text-primary" />
        <span className="font-semibold text-foreground">M-PESA Express (STK Push)</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Enter your Safaricom number and we'll send an M-PESA prompt directly to your phone.
      </p>

      <div>
        <Label htmlFor="mpesa-phone">Safaricom Phone Number</Label>
        <Input
          id="mpesa-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g., 0712345678"
          disabled={status !== 'idle' && status !== 'failed' && status !== 'cancelled'}
        />
      </div>

      {(status === 'idle') && (
        <LoadingButton
          type="button"
          variant="gradient"
          className="w-full"
          onClick={handleSendSTKPush}
          disabled={!phone.trim()}
        >
          <Phone className="w-4 h-4 mr-2" />
          Pay Ksh {amount.toLocaleString()} via M-PESA
        </LoadingButton>
      )}

      {/* Processing overlay */}
      <ProcessingOverlay
        isOpen={showOverlay}
        status="processing"
        title={status === 'sending' ? 'Sending Payment Request…' : 'Waiting for Payment…'}
        message={statusMessage}
      />

      {status === 'completed' && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
          <p className="text-sm text-foreground font-medium whitespace-pre-line">{statusMessage}</p>
        </div>
      )}

      {(status === 'failed' || status === 'cancelled') && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <XCircle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm text-foreground">{statusMessage}</p>
          </div>
          <LoadingButton type="button" variant="outline" className="w-full" onClick={handleRetry}>
            Try Again
          </LoadingButton>
        </div>
      )}
    </div>
  );
};

export default MpesaExpressPayment;
