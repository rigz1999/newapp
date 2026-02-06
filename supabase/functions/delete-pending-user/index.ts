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

    console.log('Delete API response:', JSON.stringify(deleteData));

    // IMPORTANT: Verify the user was actually deleted by trying to fetch them again
    const { data: verifyUser, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (verifyUser?.user) {
      console.error('User still exists after delete call!', verifyUser.user.email);
      throw new Error('Delete operation failed - user still exists after deletion attempt');
    }

    // If we get a "user not found" error, that confirms deletion worked
    if (verifyError && verifyError.message.includes('not found')) {
      console.log('Verified: User successfully deleted:', userId);
    } else if (verifyError) {
      console.log('Verify check returned error (may be ok):', verifyError.message);
    }

    console.log('User deleted successfully:', userId);

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
