'use client';

import { useState } from 'react';
import { Memory } from '@/lib/db';
import MemoryCard from './MemoryCard';
import MemoryModal from './MemoryModal';

interface Props {
  memories: Memory[];
}

export default function MemoryGrid({ memories }: Props) {
  const [expandedMemory, setExpandedMemory] = useState<Memory | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {memories.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            onExpand={() => setExpandedMemory(memory)}
          />
        ))}
      </div>

      {expandedMemory && (
        <MemoryModal
          memory={expandedMemory}
          onClose={() => setExpandedMemory(null)}
        />
      )}
    </>
  );
}
