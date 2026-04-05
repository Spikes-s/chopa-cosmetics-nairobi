
-- Fix 1: site_settings - switch to allowlist for public access
DROP POLICY IF EXISTS "Public can view non-sensitive settings" ON public.site_settings;

CREATE POLICY "Public can view non-sensitive settings" ON public.site_settings
FOR SELECT TO public
USING (
  key = ANY (ARRAY[
    'hours',
    'location',
    'logo_url',
    'map_location',
    'map_url',
    'hair_extension_sections',
    'ai_auto_reply_enabled'
  ])
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 2: orders INSERT - require user_id for authenticated users
DROP POLICY IF EXISTS "Users can insert orders" ON public.orders;

CREATE POLICY "Users can insert orders" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
);
