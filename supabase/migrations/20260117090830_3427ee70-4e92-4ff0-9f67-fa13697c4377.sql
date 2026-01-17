-- Allow admins to insert/update/delete user_roles (for roles management)
CREATE POLICY "Super admins can manage roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));