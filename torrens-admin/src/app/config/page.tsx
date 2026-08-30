import { db } from '@/lib/db';
import { H1, Card, Btn, Badge } from '@/components/ui';
import { when } from '@/lib/format';
import { saveConfig } from '@/lib/config-actions';
export const dynamic = 'force-dynamic';

export default async function Config() {
  const { data } = await db.from('app_config').select('key, value, updated_at');
  const c = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as { maintenance_mode?: boolean; uploads_enabled?: boolean; min_app_version?: string; banner?: { en: string; ko: string; zh: string } };
  const updated = (data ?? []).map((r) => r.updated_at).sort().at(-1);
  return (
    <>
      <H1 sub="Emergency levers read by the app on launch (app_config, public read, operator write). Changes are audited.">Kill switches</H1>
      <div className="mb-4 flex gap-2 text-xs">
        <Badge tone={c.maintenance_mode ? 'red' : 'green'}>{c.maintenance_mode ? 'MAINTENANCE MODE ON' : 'serving normally'}</Badge>
        <Badge tone={c.uploads_enabled === false ? 'amber' : 'green'}>{c.uploads_enabled === false ? 'uploads OFF' : 'uploads on'}</Badge>
        <span className="text-stone-500">last change {when(updated)}</span>
      </div>
      <form action={saveConfig} className="grid max-w-2xl gap-4">
        <Card>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="maintenance_mode" defaultChecked={!!c.maintenance_mode} className="h-4 w-4" /><span><b>Maintenance mode</b> — app shows the banner and goes read-only (no posting/chat)</span></label>
          <label className="mt-3 flex items-center gap-3 text-sm"><input type="checkbox" name="uploads_enabled" defaultChecked={c.uploads_enabled !== false} className="h-4 w-4" /><span><b>Uploads enabled</b> — turn off during a storage abuse wave</span></label>
          <label className="mt-3 block text-sm"><b>Minimum app version</b> (older builds get a force-update screen)<input name="min_app_version" defaultValue={c.min_app_version ?? '1.0.0'} className="ml-3 w-32 rounded-md border border-stone-300 px-2 py-1 text-sm" /></label>
        </Card>
        <Card>
          <div className="mb-2 text-sm font-semibold">Banner (empty = hidden)</div>
          {(['en', 'ko', 'zh'] as const).map((l) => <label key={l} className="mb-2 block text-xs uppercase text-stone-500">{l}<input name={`banner_${l}`} defaultValue={c.banner?.[l] ?? ''} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-sm normal-case" placeholder={l === 'en' ? 'e.g. Scheduled maintenance tonight 11pm–12am' : l === 'ko' ? '예: 오늘 밤 11시~12시 점검' : '例：今晚 11 点至 12 点维护'} /></label>)}
        </Card>
        <div><Btn tone="teal" type="submit">Save switches</Btn> <span className="ml-2 text-xs text-stone-500">App-side reader ships with 1.0.1 (app lane); until then these are recorded but not enforced.</span></div>
      </form>
    </>
  );
}
