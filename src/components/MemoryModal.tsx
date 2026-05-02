'use client';

import { useEffect } from 'react';
import { Memory } from '@/lib/db';

interface Props {
  memory: Memory;
  onClose: () => void;
}

export default function MemoryModal({ memory, onClose }: Props) {
  const displayName = memory.name ?? 'Anonymous';
  const date = new Date(memory.submitted_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* X bubble — top-left corner */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -left-3 w-8 h-8 bg-stone-700 text-white rounded-full flex items-center justify-center hover:bg-stone-600 transition-colors z-10 text-sm font-bold leading-none"
        >
          ✕
        </button>

        <div className="px-6 pt-6 pb-3 border-b border-stone-100 flex items-baseline justify-between gap-2 shrink-0">
          <span className="font-medium text-stone-700">From: {displayName}</span>
          <time className="text-xs text-stone-400 shrink-0">{date}</time>
        </div>

        <div className="px-6 py-4 overflow-y-auto">
          <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">
            {memory.memory_text}
          </p>
        </div>
      </div>
    </div>
  );
}
