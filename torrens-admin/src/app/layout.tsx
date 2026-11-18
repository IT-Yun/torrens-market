import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = { title: 'Torrens Admin', description: 'Local operations console' };

const nav = [
  ['/', 'Dashboard'], ['/analytics', 'Analytics'],
  ['/members', 'Members'], ['/listings', 'Listings'], ['/chats', 'Chats'], ['/reviews', 'Reviews'],
  ['/reports', 'Reports'], ['/feedback', 'Feedback'],
  ['/config', 'Kill switches'], ['/security', 'Security'], ['/infra', 'Infra & releases'], ['/audit', 'Audit log'],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <div className="flex min-h-screen">
          <aside className="w-56 shrink-0 border-r border-stone-200 bg-white px-4 py-6">
            <div className="mb-8 px-2">
              <div className="text-lg font-semibold tracking-tight text-teal-800">Torrens Admin</div>
              <div className="text-xs text-stone-500">localhost · service role</div>
            </div>
            <nav className="space-y-1">
              {nav.map(([href, label]) => (
                <Link key={href} href={href}
                  className="block rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-teal-50 hover:text-teal-900">
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 px-8 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
