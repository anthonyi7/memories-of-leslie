'use client';

import { useState } from 'react';

export default function OtherPage() {
  const [programOpen, setProgramOpen] = useState(false);

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-stone-700 mb-2">"She is not gone, she is just walking ahead of us on a path we have not yet taken."</h1>
        <p className="text-stone-500">More resources in memory of Leslie</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* Spotify playlist card */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-5 flex flex-col gap-3">
          <h2 className="font-medium text-stone-700">Music Playlist</h2>
          <iframe
            src="https://open.spotify.com/embed/playlist/0GbM87ES7eNOGfsHpNeN6o?utm_source=generator"
            width="100%"
            height="352"
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ borderRadius: '12px' }}
          />
        </div>

        {/* Program card */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-5 flex flex-col gap-3">
          <h2 className="font-medium text-stone-700">Program</h2>
          <img
            src="/program_preview.png"
            alt="Program preview"
            className="w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setProgramOpen(true)}
          />
          <button
            onClick={() => setProgramOpen(true)}
            className="text-sm text-stone-500 hover:text-stone-700 transition-colors self-start"
          >
            View full program →
          </button>
        </div>

      </div>

      {/* Program modal */}
      {programOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setProgramOpen(false)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full my-8 p-4 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-stone-700">Program</span>
              <button
                onClick={() => setProgramOpen(false)}
                className="text-stone-400 hover:text-stone-700 transition-colors text-xl leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <img src="/program_1.jpeg" alt="Program page 1" className="w-full rounded" />
            <img src="/program_2.jpeg" alt="Program page 2" className="w-full rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
