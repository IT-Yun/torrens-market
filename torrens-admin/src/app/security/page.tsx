import { securityLints, performanceLints, serviceHealth, acceptedReason, hasToken, type Lint } from '@/lib/mgmt';
import { H1, Card, Badge, Table, Empty } from '@/components/ui';
import { when } from '@/lib/format';
export const dynamic = 'force-dynamic';

function LintRows({ lints }: { lints: Lint[] }) {
  return (
    <>
      {lints.map((l, i) => {
        const acc = acceptedReason(l);
        return (
          <tr key={i} className={`align-top ${acc ? 'opacity-60' : ''}`}>
            <td className="px-4 py-2"><Badge tone={l.level === 'ERROR' ? 'red' : l.level === 'WARN' ? 'amber' : 'stone'}>{l.level}</Badge></td>
            <td className="px-4 py-2 text-sm font-medium">{l.title}</td>
            <td className="max-w-lg px-4 py-2 text-xs text-stone-600">{l.detail}
              {acc && <div className="mt-1 text-[11px] text-teal-700">✓ accepted: {acc}</div>}
              {!acc && l.remediation && <a className="mt-1 block text-[11px] text-teal-700 underline" href={l.remediation} target="_blank">remediation guide</a>}
            </td>
          </tr>
        );
      })}
    </>
  );
}

export default async function Security() {
  if (!hasToken()) return <H1 sub="Add SUPABASE_ACCESS_TOKEN to torrens-admin/.env.local">Security — token missing</H1>;
  const [sec, perf, health] = await Promise.all([securityLints(), performanceLints(), serviceHealth()]);
  const secL = sec?.lints ?? [], perfL = perf?.lints ?? [];
  const openSec = secL.filter((l) => !acceptedReason(l));
  const openPerf = perfL.filter((l) => !acceptedReason(l));
  return (
    <>
      <H1 sub={`Supabase Advisor findings (live from the Management API) · accepted-by-design findings are dimmed · ${when(new Date().toISOString())}`}>Security monitoring</H1>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Badge tone={openSec.some((l) => l.level === 'ERROR') ? 'red' : openSec.length ? 'amber' : 'green'}>
          security: {openSec.length ? `${openSec.length} open` : 'all clear'} ({secL.length - openSec.length} accepted)
        </Badge>
        <Badge tone={openPerf.length ? 'amber' : 'green'}>performance: {openPerf.length ? `${openPerf.length} open` : 'all clear'} ({perfL.length - openPerf.length} accepted)</Badge>
        {(health ?? []).map((h) => <Badge key={h.name} tone={h.healthy ? 'green' : 'red'}>{h.name}: {h.healthy ? 'healthy' : h.status}</Badge>)}
      </div>
      <div className="mb-2 text-sm font-semibold">Security advisor</div>
      {secL.length === 0 ? <Empty>No findings.</Empty> : <Table head={['Level', 'Finding', 'Detail']}><LintRows lints={[...secL.filter((l)=>!acceptedReason(l)), ...secL.filter((l)=>!!acceptedReason(l))]} /></Table>}
      <div className="mt-6 mb-2 text-sm font-semibold">Performance advisor</div>
      {perfL.length === 0 ? <Empty>No findings.</Empty> : <Table head={['Level', 'Finding', 'Detail']}><LintRows lints={[...perfL.filter((l)=>!acceptedReason(l)), ...perfL.filter((l)=>!!acceptedReason(l))]} /></Table>}
      <p className="mt-4 text-xs text-stone-500">Sources: Management API advisors + service health. Auth anomaly alerts arrive via Telegram (ops-alert); RLS posture is verified by the attack-sim suite (spec-security-hardening).</p>
    </>
  );
}
