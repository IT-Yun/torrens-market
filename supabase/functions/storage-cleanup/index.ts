// Weekly storage lifecycle (ops roadmap): delete photos of listings that
// have been sold/deleted for 90+ days. Listing rows and reviews stay;
// only the storage objects and photo links are purged.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.headers.get('x-notify-secret') !== Deno.env.get('NOTIFY_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const { data: stale, error } = await supabase
      .from('listings')
      .select('id, listing_photos (id, storage_path)')
      .in('status', ['sold', 'deleted'])
      .lt('status_changed_at', cutoff)
      .limit(200);
    if (error) throw error;

    const photos = (stale ?? []).flatMap(
      (l) => (l.listing_photos as { id: string; storage_path: string }[]) ?? [],
    );
    if (photos.length === 0) return new Response(JSON.stringify({ purged: 0 }), { status: 200 });

    const paths = photos.map((p) => p.storage_path);
    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from('listing-photos').remove(paths.slice(i, i + 100));
    }
    await supabase
      .from('listing_photos')
      .delete()
      .in('id', photos.map((p) => p.id));

    return new Response(JSON.stringify({ purged: photos.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
