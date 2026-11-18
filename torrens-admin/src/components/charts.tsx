// Tiny dependency-free bars — enough for a local console.
export function Bars({ data, label }: { data: { day: string; n: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((a, b) => a + b.n, 0);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between"><span className="text-sm font-semibold">{label}</span><span className="text-xs text-stone-500">{total} in {data.length}d</span></div>
      <div className="flex h-24 items-end gap-[2px]">
        {data.map((d) => (
          <div key={d.day} title={`${d.day}: ${d.n}`} className="flex-1 rounded-sm bg-teal-600/80 hover:bg-teal-700" style={{ height: `${Math.max(2, (100 * d.n) / max)}%` }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-stone-400"><span>{data[0]?.day.slice(5)}</span><span>{data.at(-1)?.day.slice(5)}</span></div>
    </div>
  );
}
export function Breakdown({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <ul className="space-y-1">
        {rows.length === 0 && <li className="text-xs text-stone-400">no data</li>}
        {rows.map(([k, n]) => (
          <li key={k} className="text-xs">
            <div className="flex justify-between"><span className="truncate">{k}</span><span className="tabular-nums text-stone-500">{n} · {total ? Math.round((100 * n) / total) : 0}%</span></div>
            <div className="mt-0.5 h-1.5 rounded bg-stone-100"><div className="h-1.5 rounded bg-teal-500" style={{ width: `${total ? (100 * n) / total : 0}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
