DROP POLICY IF EXISTS "Public can view non-sensitive settings" ON public.site_settings;

CREATE POLICY "Public can view non-sensitive settings"
ON public.site_settings
FOR SELECT
TO public
USING (
  key = ANY (ARRAY[
    'hours','location','logo_url','map_location','map_url',
    'hair_extension_sections','ai_auto_reply_enabled',
    'theme_primary','theme_accent','theme_font_heading','theme_font_body','site_title'
  ])
  OR has_role(auth.uid(), 'admin'::app_role)
);