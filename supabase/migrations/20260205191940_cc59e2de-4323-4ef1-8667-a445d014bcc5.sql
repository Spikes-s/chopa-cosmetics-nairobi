-- Add starting_points column to branches table for directions feature
-- This stores up to 3 starting points as JSONB array
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS starting_points JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.branches.starting_points IS 'Array of starting points for directions, each with name, latitude, longitude';