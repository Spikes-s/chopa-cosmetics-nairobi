
CREATE TABLE public.user_search_history (
  user_id uuid PRIMARY KEY,
  recent jsonb NOT NULL DEFAULT '[]'::jsonb,
  trending jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_search_history TO authenticated;
GRANT ALL ON public.user_search_history TO service_role;

ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history"
ON public.user_search_history FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
ON public.user_search_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own search history"
ON public.user_search_history FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history"
ON public.user_search_history FOR DELETE TO authenticated
USING (auth.uid() = user_id);
