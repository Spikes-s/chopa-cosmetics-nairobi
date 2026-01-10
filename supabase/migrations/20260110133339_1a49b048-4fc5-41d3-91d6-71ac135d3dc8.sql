-- Add expiry_date column to products table for tracking product expiration
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS expiry_date DATE NULL;