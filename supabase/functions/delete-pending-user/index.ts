import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

    // First verify the user exists before attempting deletion
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (getUserError) {
      console.error('Error fetching user:', getUserError);
      throw new Error(`User not found or cannot be accessed: ${getUserError.message}`);
    }

    if (!existingUser?.user) {
      console.error('User not found:', userId);
      throw new Error('User not found');
    }

    console.log('Found user to delete:', existingUser.user.email);

    // Delete user from auth.users (this will cascade to profiles and memberships)
    // Note: Deleting a user automatically invalidates all their sessions, so no need to sign them out first
    const { data: deleteData, error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      throw deleteError;
    }

    // Verify deletion was successful by checking the response
    if (!deleteData?.user) {
      console.error('Delete operation did not return expected user data');
      throw new Error('Delete operation failed - no confirmation received');
    }

    console.log('User deleted successfully:', userId, 'email:', deleteData.user.email);

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
