'use client';

import { useRef, useState, useEffect } from 'react';
import { Memory } from '@/lib/db';

interface Props {
  memory: Memory;
  onExpand: () => void;
}

export default function MemoryCard({ memory, onExpand }: Props) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  const displayName = memory.name ?? 'Anonymous';
  const date = new Date(memory.submitted_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsClamped(el.scrollHeight > el.clientHeight);
    }
  }, []);

  return (
    <article className="bg-white rounded-lg shadow-sm border border-stone-100 p-5 flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-stone-700">From: {displayName}</span>
        <time className="text-xs text-stone-400 shrink-0">{date}</time>
      </header>
      <p ref={textRef} className="text-stone-600 leading-relaxed whitespace-pre-wrap line-clamp-10">
        {memory.memory_text}
      </p>
      {isClamped && (
        <button
          onClick={onExpand}
          className="text-sm text-stone-500 hover:text-stone-700 transition-colors self-start"
        >
          Read more →
        </button>
      )}
    </article>
  );
}
