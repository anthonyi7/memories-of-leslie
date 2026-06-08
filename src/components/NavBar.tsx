'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const activePill = 'bg-white/30 text-white border border-white/80 font-medium';
const inactivePill = 'text-white border border-white/50 hover:border-white';

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
    <div className="flex items-center gap-1 text-sm flex-nowrap">
      <span className="text-white/75 mr-0.5 shrink-0">Sort:</span>
      <button
        onClick={() => router.push(buildUrl('date', currentFilter))}
        className={`shrink-0 px-3 py-1 rounded-full transition-colors ${currentSort === 'date' ? activePill : inactivePill}`}
      >
        By Date
      </button>
      <button
        onClick={() => router.push(buildUrl('alpha', currentFilter))}
        className={`shrink-0 px-3 py-1 rounded-full transition-colors ${currentSort === 'alpha' ? activePill : inactivePill}`}
      >
        Alphabetical
      </button>
      <span className="text-white/75 mr-0.5 shrink-0">Name:</span>
      <div className="relative shrink-0">
        <select
          value={currentFilter}
          onChange={(e) => router.push(buildUrl(currentSort, e.target.value))}
          className={`appearance-none pl-3 pr-7 py-1 rounded-full text-sm cursor-pointer transition-colors focus:outline-none border max-w-[110px] ${currentFilter ? activePill : `bg-transparent ${inactivePill}`
            }`}
        >
          <option value="" className="text-stone-800 bg-white">All</option>
          <option value="anonymous" className="text-stone-800 bg-white">Anonymous</option>
          {names.map((name) => (
            <option key={name} value={name} className="text-stone-800 bg-white">
              {name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-white/75 text-xs select-none">
          ▾
        </span>
      </div>
    </div>
  );
}

export default function NavBar({ names }: { names: string[] }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isOther = pathname === '/other';

  if (pathname.startsWith('/admin')) return null;

  return (
    <nav className="text-white sticky top-0 z-10 shadow-md" style={{ backgroundColor: '#934790' }}>

      {/* Desktop: single row */}
      <div className="hidden md:flex max-w-5xl mx-auto px-4 py-3 items-center relative">
        <span className="font-medium text-white inline-flex items-center gap-1.5 shrink-0">
          Memories of Leslie
          <img src="/rose.png" alt="yellow rose" style={{ height: '24px' }} />
        </span>

        {/* Centered nav links */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
          <Link
            href="/"
            className={`text-sm transition-colors hover:text-white ${isHome ? 'text-white font-medium' : 'text-white/80'}`}
          >
            View Memories
          </Link>
          <Link
            href="/submit"
            className={`text-sm transition-colors hover:text-white ${pathname === '/submit' ? 'text-white font-medium' : 'text-white/80'}`}
          >
            Submit a Memory
          </Link>
          <Link
            href="/other"
            className={`text-sm transition-colors hover:text-white ${isOther ? 'text-white font-medium' : 'text-white/80'}`}
          >
            Other
          </Link>
        </div>

        {/* Sort controls pushed to right */}
        <div className="ml-auto">
          {isHome && (
            <Suspense fallback={null}>
              <NavControls names={names} />
            </Suspense>
          )}
        </div>
      </div>

      {/* Mobile: three rows */}
      <div className="md:hidden">
        {/* Row 1: title */}
        <div className="px-4 py-3 text-center">
          <span className="font-semibold text-white text-lg inline-flex items-center gap-1.5">
            Memories of Leslie
            <img src="/rose.png" alt="yellow rose" style={{ height: '24px' }} />
          </span>
        </div>

        {/* Row 2: nav links */}
        <div className="border-t border-white/20 px-4 py-2.5 flex justify-center gap-6">
          <Link
            href="/submit"
            className={`text-sm transition-colors hover:text-white ${pathname === '/submit' ? 'text-white font-medium' : 'text-white/80'}`}
          >
            Submit a Memory
          </Link>
          <Link
            href="/"
            className={`text-sm transition-colors hover:text-white ${isHome ? 'text-white font-medium' : 'text-white/80'}`}
          >
            View Memories
          </Link>
          <Link
            href="/other"
            className={`text-sm transition-colors hover:text-white ${isOther ? 'text-white font-medium' : 'text-white/80'}`}
          >
            Other
          </Link>
        </div>

        {/* Row 3: sort + filter, home only */}
        {isHome && (
          <div className="border-t border-white/20 bg-black/10 px-4 py-2 overflow-x-auto">
            <Suspense fallback={null}>
              <NavControls names={names} />
            </Suspense>
          </div>
        )}
      </div>

    </nav>
  );
}
