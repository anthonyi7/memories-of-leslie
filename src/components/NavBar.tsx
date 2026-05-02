'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SortControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') ?? 'date';

  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-stone-400 mr-1">Sort:</span>
      <button
        onClick={() => router.push('/')}
        className={`px-3 py-1 rounded-full transition-colors ${
          currentSort === 'date'
            ? 'bg-stone-600 text-white'
            : 'text-stone-300 hover:text-white'
        }`}
      >
        By Date
      </button>
      <button
        onClick={() => router.push('/?sort=alpha')}
        className={`px-3 py-1 rounded-full transition-colors ${
          currentSort === 'alpha'
            ? 'bg-stone-600 text-white'
            : 'text-stone-300 hover:text-white'
        }`}
      >
        Alphabetical
      </button>
    </div>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <nav className="bg-stone-800 text-white px-4 py-3 sticky top-0 z-10 shadow-md">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-medium text-stone-200 mr-auto">Memories of Leslie</span>
        <Link
          href="/"
          className={`text-sm transition-colors hover:text-white ${
            isHome ? 'text-white font-medium' : 'text-stone-300'
          }`}
        >
          View Memories
        </Link>
        <Link
          href="/submit"
          className={`text-sm transition-colors hover:text-white ${
            pathname === '/submit' ? 'text-white font-medium' : 'text-stone-300'
          }`}
        >
          Submit a Memory
        </Link>
        {isHome && (
          <Suspense fallback={null}>
            <SortControls />
          </Suspense>
        )}
      </div>
    </nav>
  );
}
