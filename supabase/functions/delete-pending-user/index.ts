import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://finixar.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log('Deleting user:', userId);

    // First check if the user exists in auth.users
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    const userExistsInAuth = !getUserError && existingUser?.user;

    if (userExistsInAuth) {
      console.log('Found user to delete:', existingUser.user.email);

      // Delete user from auth.users
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        throw deleteError;
      }

      console.log('Auth user deleted');
    } else {
      console.log('User not found in auth.users, will clean up orphaned data');
    }

    // Manually clean up memberships and profiles since CASCADE is unreliable
    // This handles both normal deletion and orphaned data cleanup
    const { error: membershipError } = await supabaseAdmin
      .from('memberships')
      .delete()
      .eq('user_id', userId);

    if (membershipError) {
      console.error('Error deleting memberships:', membershipError);
      // Don't throw - continue to try profile deletion
    } else {
      console.log('Memberships deleted for user:', userId);
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      // Don't throw - the main deletion may have still worked
    } else {
      console.log('Profile deleted for user:', userId);
    }

    console.log('User deletion complete:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
