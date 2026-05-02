'use client';

import { useState } from 'react';

const MAX_LENGTH = 10000;

export default function SubmitPage() {
  const [name, setName] = useState('');
  const [memoryText, setMemoryText] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const remaining = MAX_LENGTH - memoryText.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          memory_text: memoryText,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Something went wrong. Please try again.');
      }

      setStatus('success');
      setName('');
      setMemoryText('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  if (status === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="text-5xl mb-4">♡</div>
        <h2 className="text-2xl font-semibold text-stone-700 mb-2">Thank you for sharing</h2>
        <p className="text-stone-500 mb-8">Your memory has been added to the collection.</p>
        <div className="flex gap-4 justify-center">
          <a
            href="/"
            className="px-5 py-2 bg-stone-700 text-white rounded-md hover:bg-stone-600 transition-colors"
          >
            View all memories
          </a>
          <button
            onClick={() => setStatus('idle')}
            className="px-5 py-2 border border-stone-300 rounded-md hover:bg-stone-100 transition-colors"
          >
            Share another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-700 mb-2">Share a Memory</h1>
      <p className="text-stone-500 mb-8">
        Share a memory — a moment she helped you, something she said, or simply what she meant to
        you. You can post anonymously.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-600 mb-1">
            Your name{' '}
            <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Leave blank to post anonymously"
            className="w-full px-3 py-2 border border-stone-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>

        <div>
          <label htmlFor="memory" className="block text-sm font-medium text-stone-600 mb-1">
            Your memory <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="memory"
            required
            value={memoryText}
            onChange={(e) => setMemoryText(e.target.value.slice(0, MAX_LENGTH))}
            rows={7}
            className="w-full px-3 py-2 border border-stone-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 resize-y"
          />
          <p
            className={`text-sm mt-1 text-right ${
              remaining < 20
                ? 'text-rose-600'
                : remaining < 100
                ? 'text-amber-600'
                : 'text-stone-400'
            }`}
          >
            {remaining} characters remaining
          </p>
        </div>

        {status === 'error' && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting' || !memoryText.trim()}
          className="w-full py-2.5 bg-stone-700 text-white rounded-md hover:bg-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {status === 'submitting' ? 'Sharing…' : 'Share Memory'}
        </button>
      </form>
    </div>
  );
}
