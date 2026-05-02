import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import NavBar from '@/components/NavBar';
import { getDistinctNames } from '@/lib/db';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Memories of Leslie',
  description: 'A living memory book celebrating the life of Leslie.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const names = await getDistinctNames();
  return (
    <html lang="en">
      <body className={`${inter.className} bg-stone-50 text-stone-800 min-h-screen`}>
        <NavBar names={names} />
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
