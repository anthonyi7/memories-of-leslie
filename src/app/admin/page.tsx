import { getAllMemoriesAdmin } from '@/lib/db';
import AdminTable from './AdminTable';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const memories = await getAllMemoriesAdmin();

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Admin</h1>
        <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{memories.length} memories</span>
      </div>
      <AdminTable initialMemories={memories} />
    </div>
  );
}
