import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star, Camera, X, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/ui/loading-button';
import { submitReview, validateReviewInput } from '@/lib/reviews';

interface ReviewFormProps {
  productId: string;
  onReviewSubmitted: () => void;
}


const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// Verify real file content (magic bytes) — MIME type alone is spoofable (e.g. SVG with scripts).
const sniffImageType = async (file: File): Promise<string | null> => {
  const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const startsWith = (bytes: number[], offset = 0) => bytes.every((b, i) => buf[offset + i] === b);
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
};

const ReviewForm = ({ productId, onReviewSubmitted }: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 3) {
      toast.error('Maximum 3 photos allowed');
      return;
    }

    const validFiles: File[] = [];
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) continue;
      const sniffed = await sniffImageType(f);
      if (!sniffed || !ALLOWED_IMAGE_TYPES[sniffed]) continue;
      validFiles.push(f);
    }

    if (validFiles.length !== files.length) {
      toast.error('Only real PNG, JPEG or WEBP photos under 5MB are allowed');
    }
    setImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of images) {
      const sniffed = await sniffImageType(file);
      const safeType = sniffed && ALLOWED_IMAGE_TYPES[sniffed] ? sniffed : null;
      if (!safeType) {
        toast.error('One of your photos was not a valid image and was skipped.');
        continue;
      }
      const ext = ALLOWED_IMAGE_TYPES[safeType];
      if (!user) break;
      const path = `reviews/${user.id}/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false, contentType: safeType });
      if (error) {
        console.error('Review image upload failed:', error);
        // Surface to user but don't block submission of the text review
        toast.error('Could not upload one of your photos — submitting your review without it.');
        continue;
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please sign in to leave a review'); return; }
    if (submitting) return;

    const resolvedName = customerName.trim() || user.email?.split('@')[0] || '';
    const errors = validateReviewInput({
      productId,
      customerName: resolvedName,
      rating,
      reviewText,
    });

    const firstError = errors.productId || errors.rating || errors.customerName || errors.reviewText;
    if (firstError) {
      toast.error(firstError);
      return;
    }

    setSubmitting(true);
    try {
      const reviewImages = images.length > 0 ? await uploadImages() : [];

      await submitReview({
        productId,
        customerName: resolvedName,
        rating,
        reviewText,
        reviewImages,
      });

      toast.success('Thank you for your review ❤️');
      setJustSubmitted(true);
      setRating(0);
      setReviewText('');
      setCustomerName('');
      setImages([]);
      setImagePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onReviewSubmitted();
      setTimeout(() => setJustSubmitted(false), 2500);
    } catch (error: any) {
      console.error('Review submission error:', error);
      toast.error(error?.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (justSubmitted) {
    return (
      <div className="text-center py-8 animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
          <Heart className="w-8 h-8 text-primary fill-primary" />
        </div>
        <p className="font-display text-lg text-foreground">Thank you for your review ❤️</p>
        <p className="text-sm text-muted-foreground mt-1">Your feedback helps the Chopa community.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>Please sign in to leave a review</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="mb-2 block">Your Rating *</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
              disabled={submitting}
            >
              <Star
                className={`w-6 h-6 ${
                  star <= (hoverRating || rating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-muted-foreground/30'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="customerName">Your Name (optional)</Label>
        <Input
          id="customerName"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Leave blank to use your email"
          disabled={submitting}
        />
      </div>

      <div>
        <Label htmlFor="reviewText">Your Review *</Label>
        <Textarea
          id="reviewText"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience with this product..."
          rows={3}
          disabled={submitting}
          required
        />
      </div>

      <div>
        <Label className="mb-2 block">Add Photos (optional, max 3)</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {imagePreviews.map((preview, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
              <img src={preview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                disabled={submitting}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {images.length < 3 && !submitting && (
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors">
              <Camera className="w-5 h-5 text-muted-foreground" />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
          )}
        </div>
      </div>

      <LoadingButton
        type="submit"
        disabled={rating === 0 || !productId}
        loading={submitting}
        loadingText="Submitting…"
      >
        Submit Review
      </LoadingButton>
    </form>
  );
};

export default ReviewForm;
