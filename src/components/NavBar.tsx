'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function NavControls({ names }: { names: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') ?? 'date';
  const currentFilter = searchParams.get('filter') ?? '';

  function buildUrl(sort: string, filter: string) {
    const params = new URLSearchParams();
    if (sort !== 'date') params.set('sort', sort);
    if (filter) params.set('filter', filter);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  }

  return (
    <div className="flex items-center gap-1 text-sm flex-wrap">
      <span className="text-stone-400 mr-1">Sort:</span>
      <button
        onClick={() => router.push(buildUrl('date', currentFilter))}
        className={`px-3 py-1 rounded-full transition-colors ${
          currentSort === 'date' ? 'bg-stone-600 text-white' : 'text-stone-300 hover:text-white'
        }`}
      >
        By Date
      </button>
      <button
        onClick={() => router.push(buildUrl('alpha', currentFilter))}
        className={`px-3 py-1 rounded-full transition-colors ${
          currentSort === 'alpha' ? 'bg-stone-600 text-white' : 'text-stone-300 hover:text-white'
        }`}
      >
        Alphabetical
      </button>
      <span className="text-stone-400 ml-2 mr-1">Name:</span>
      <div className="relative">
        <select
          value={currentFilter}
          onChange={(e) => router.push(buildUrl(currentSort, e.target.value))}
          className={`appearance-none pl-3 pr-7 py-1 rounded-full text-sm cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400 ${
            currentFilter ? 'bg-stone-600 text-white' : 'text-stone-300 hover:text-white bg-transparent'
          }`}
        >
          <option value="">All</option>
          <option value="anonymous">Anonymous</option>
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-stone-400 text-xs">
          ▾
        </span>
      </div>
    </div>
  );
}

export default function NavBar({ names }: { names: string[] }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <nav className="bg-stone-800 text-white sticky top-0 z-10 shadow-md">
      {/* Main row — always visible */}
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-x-6">
        <span className="font-medium text-stone-200 mr-auto">Memories of Leslie</span>

        {/* Desktop: View first (md:order-1), Submit second (md:order-2)
            Mobile:  Submit first (order-1), View second (order-2) */}
        <Link
          href="/submit"
          className={`text-sm transition-colors hover:text-white order-1 md:order-2 ${
            pathname === '/submit' ? 'text-white font-medium' : 'text-stone-300'
          }`}
        >
          Submit a Memory
        </Link>
        <Link
          href="/"
          className={`text-sm transition-colors hover:text-white order-2 md:order-1 ${
            isHome ? 'text-white font-medium' : 'text-stone-300'
          }`}
        >
          View Memories
        </Link>

        {/* Sort + filter controls — inline on desktop only */}
        {isHome && (
          <div className="hidden md:flex order-3">
            <Suspense fallback={null}>
              <NavControls names={names} />
            </Suspense>
          </div>
        )}
      </div>

      {/* Mobile-only sort/filter row — shown below main row when on home page */}
      {isHome && (
        <div className="md:hidden border-t border-stone-700 bg-stone-900">
          <div className="max-w-5xl mx-auto px-4 py-2">
            <Suspense fallback={null}>
              <NavControls names={names} />
            </Suspense>
          </div>
        </div>
      )}
    </nav>
  );
}
