import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star, Camera, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/ui/loading-button';

interface ReviewFormProps {
  productId: string;
  onReviewSubmitted: () => void;
}

const ReviewForm = ({ productId, onReviewSubmitted }: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 3) {
      toast.error('Maximum 3 photos allowed');
      return;
    }
    const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      toast.error('Only images under 5MB are allowed');
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
      const ext = file.name.split('.').pop();
      const path = `reviews/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please sign in to leave a review'); return; }
    if (rating === 0) { toast.error('Please select a rating'); return; }
    if (submitting) return;

    setSubmitting(true);

    // Timeout fallback - 15 seconds max
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutRef.current = setTimeout(() => {
        reject(new Error('Request timed out. Please try again.'));
      }, 15000);
    });

    try {
      const submitPromise = (async () => {
        const reviewImages = images.length > 0 ? await uploadImages() : [];

        const { error } = await supabase
          .from('product_reviews')
          .insert({
            product_id: productId,
            user_id: user.id,
            customer_name: customerName.trim() || user.email?.split('@')[0] || 'Anonymous',
            rating,
            review_text: reviewText.trim() || null,
            review_images: reviewImages,
          });

        if (error) throw error;
        return true;
      })();

      await Promise.race([submitPromise, timeoutPromise]);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      toast.success('Review submitted successfully!');
      setRating(0);
      setReviewText('');
      setCustomerName('');
      setImages([]);
      setImagePreviews([]);
      onReviewSubmitted();
    } catch (error: any) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      console.error('Review submission error:', error);
      toast.error(error.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
        <Label htmlFor="reviewText">Your Review (optional)</Label>
        <Textarea
          id="reviewText"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience with this product..."
          rows={3}
          disabled={submitting}
        />
      </div>

      {/* Photo Upload */}
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
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
          )}
        </div>
      </div>

      <LoadingButton
        type="submit"
        disabled={rating === 0}
        loading={submitting}
        loadingText="Submitting…"
      >
        Submit Review
      </LoadingButton>
    </form>
  );
};

export default ReviewForm;
