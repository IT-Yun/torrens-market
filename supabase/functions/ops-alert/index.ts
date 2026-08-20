// ops-alert — sends an operational alert to the maintainer's Telegram bot.
// Called by database triggers (via pg_net) on feedback and abuse signals so the
// solo maintainer gets live notice of bug reports, mass-reported listings, and
// possible bad actors — the interim "admin" until a dashboard exists.
// Secret-authenticated like the other notify functions; deploy --no-verify-jwt.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const SECRET = Deno.env.get('NOTIFY_SECRET') ?? '';
const BOT = Deno.env.get('OPS_TELEGRAM_BOT_TOKEN') ?? '';
const CHAT = Deno.env.get('OPS_TELEGRAM_CHAT_ID') ?? '';

Deno.serve(async (req) => {
  if (req.headers.get('x-notify-secret') !== SECRET) {
    return new Response('unauthorized', { status: 401 });
  }
  try {
    const { text } = await req.json();
    if (!BOT || !CHAT) return new Response(JSON.stringify({ skipped: 'no bot config' }), { status: 200 });
    const res = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT,
        text: String(text ?? 'ops alert').slice(0, 3500),
        disable_web_page_preview: true,
      }),
    });
    return new Response(JSON.stringify({ ok: res.ok }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
