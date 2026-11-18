// Account deletion (App Store Guideline 5.1.1(v) requirement).
// Runs with JWT verification ON: the caller can only delete themselves.
// profiles/listings/chats/reviews cascade from the auth.users delete.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return new Response('unauthorized', { status: 401 });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) return new Response('unauthorized', { status: 401 });

    const { error } = await admin.auth.admin.deleteUser(userData.user.id);
    if (error) throw error;

    return new Response(JSON.stringify({ deleted: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
