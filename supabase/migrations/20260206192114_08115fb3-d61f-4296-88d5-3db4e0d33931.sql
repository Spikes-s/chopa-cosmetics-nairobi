-- Create saved_carts table to persist cart data for logged-in users
CREATE TABLE public.saved_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_viewed_products JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_carts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own cart
CREATE POLICY "Users can view own cart" 
ON public.saved_carts 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own cart
CREATE POLICY "Users can insert own cart" 
ON public.saved_carts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own cart
CREATE POLICY "Users can update own cart" 
ON public.saved_carts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own cart
CREATE POLICY "Users can delete own cart" 
ON public.saved_carts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_saved_carts_updated_at
BEFORE UPDATE ON public.saved_carts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();