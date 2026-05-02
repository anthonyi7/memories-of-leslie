import { getMemories } from '@/lib/db';
import MemoryGrid from '@/components/MemoryGrid';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { sort?: string | string[] };
}

export default async function HomePage({ searchParams }: Props) {
  const sortParam = Array.isArray(searchParams.sort)
    ? searchParams.sort[0]
    : searchParams.sort;
  const sort = sortParam === 'alpha' ? 'alpha' : 'date';
  const memories = await getMemories(sort);

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-stone-700 mb-2">Memories of Leslie</h1>
        <p className="text-stone-500">A living collection of memories shared by those who loved her.</p>
      </div>
      {memories.length === 0 ? (
        <p className="text-center text-stone-400 mt-16">
          No memories yet. Be the first to share one.
        </p>
      ) : (
        <MemoryGrid memories={memories} />
      )}
    </div>
  );
}
