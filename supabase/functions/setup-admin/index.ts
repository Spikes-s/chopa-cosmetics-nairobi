import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { email, password } = await req.json();
    
    // Validate admin credentials
    if (email !== 'admin@chopa.co.ke' || password !== 'Spikey-420') {
      return new Response(
        JSON.stringify({ error: 'Invalid admin credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if admin user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    const adminUser = existingUsers?.users?.find(u => u.email === email);
    
    if (adminUser) {
      // Check if admin role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', adminUser.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!existingRole) {
        // Add admin role
        await supabase
          .from('user_roles')
          .insert({ user_id: adminUser.id, role: 'admin' });
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Admin already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Admin' }
    });

    if (createError) {
      console.error('Error creating admin:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role: 'admin' });

    if (roleError) {
      console.error('Error adding admin role:', roleError);
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ user_id: newUser.user.id, full_name: 'Admin' });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    console.log('Admin user created successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Admin created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in setup-admin function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
