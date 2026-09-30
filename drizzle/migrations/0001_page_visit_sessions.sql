ALTER TABLE public.page_visits ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.page_visits ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
CREATE INDEX IF NOT EXISTS page_visits_visited_at_idx ON public.page_visits (visited_at DESC);
CREATE INDEX IF NOT EXISTS page_visits_session_idx ON public.page_visits (session_id);

CREATE OR REPLACE FUNCTION public.touch_page_visit(_id uuid, _visitor_id text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.page_visits SET last_seen_at = now()
  WHERE id = _id AND visitor_id = _visitor_id AND visited_at > now() - interval '6 hours';
$$;
REVOKE ALL ON FUNCTION public.touch_page_visit(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.touch_page_visit(uuid, text) TO anon, authenticated;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.page_visits;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;