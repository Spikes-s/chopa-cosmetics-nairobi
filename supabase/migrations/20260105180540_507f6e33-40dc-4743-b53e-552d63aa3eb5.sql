-- Enable realtime for profiles table so admin can see new user registrations instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;