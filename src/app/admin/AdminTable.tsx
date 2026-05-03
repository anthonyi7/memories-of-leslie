'use client';

import { useState } from 'react';
import type { AdminMemory } from '@/lib/db';

const th: React.CSSProperties = { padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '0.5rem 0.75rem', verticalAlign: 'top', borderBottom: '1px solid #f3f4f6' };

export default function AdminTable({ initialMemories }: { initialMemories: AdminMemory[] }) {
  const [memories, setMemories] = useState(initialMemories);

  async function handleDelete(id: string) {
    if (!confirm('Delete this memory permanently?')) return;

    const res = await fetch(`/api/admin/memories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } else {
      alert('Failed to delete memory.');
    }
  }

  if (memories.length === 0) {
    return <p style={{ color: '#6b7280' }}>No memories found.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr>
            <th style={th}>Submitted</th>
            <th style={th}>From</th>
            <th style={th}>Memory</th>
            <th style={th}>IP</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {memories.map((m) => (
            <tr key={m.id}>
              <td style={{ ...td, whiteSpace: 'nowrap', color: '#6b7280', fontSize: '0.8rem' }}>
                {new Date(m.submitted_at).toLocaleString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </td>
              <td style={{ ...td, whiteSpace: 'nowrap', fontWeight: 500 }}>
                {m.name ?? <span style={{ color: '#9ca3af' }}>Anonymous</span>}
              </td>
              <td style={{ ...td, maxWidth: '400px' }}>
                <span title={m.memory_text}>
                  {m.memory_text.length > 100 ? m.memory_text.slice(0, 100) + '…' : m.memory_text}
                </span>
              </td>
              <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                {m.submitter_ip ?? '—'}
              </td>
              <td style={td}>
                <button
                  onClick={() => handleDelete(m.id)}
                  style={{ padding: '0.25rem 0.625rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
