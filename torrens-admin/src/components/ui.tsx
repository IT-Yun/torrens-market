export function H1({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-stone-500">{sub}</p>}
    </div>
  );
}
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}
export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-stone-500">{hint}</div>}
    </Card>
  );
}
export function Badge({ children, tone = 'stone' }: { children: React.ReactNode; tone?: 'stone' | 'green' | 'amber' | 'red' | 'teal' }) {
  const tones = {
    stone: 'bg-stone-100 text-stone-700', green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800', teal: 'bg-teal-100 text-teal-800',
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-stone-100">{children}</tbody>
      </table>
    </div>
  );
}
export function Btn({ children, tone = 'stone', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'stone' | 'red' | 'teal' }) {
  const tones = {
    stone: 'border-stone-300 text-stone-700 hover:bg-stone-100',
    red: 'border-red-300 text-red-700 hover:bg-red-50',
    teal: 'border-teal-600 bg-teal-600 text-white hover:bg-teal-700',
  };
  return <button {...rest} className={`rounded-md border px-2.5 py-1 text-xs font-medium ${tones[tone]} disabled:opacity-40`}>{children}</button>;
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">{children}</div>;
}
