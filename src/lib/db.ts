import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

const pool =
  global.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  global.pgPool = pool;
}

export interface Memory {
  id: string;
  name: string | null;
  memory_text: string;
  submitted_at: string;
}

export async function getMemories(sort: 'date' | 'alpha' = 'date'): Promise<Memory[]> {
  const orderClause =
    sort === 'alpha'
      ? '(name IS NULL) DESC, LOWER(name) ASC, submitted_at DESC'
      : '(name IS NULL) DESC, submitted_at DESC';

  const { rows } = await pool.query<Memory>(
    `SELECT id, name, memory_text, submitted_at
     FROM memories
     WHERE approved = TRUE
     ORDER BY ${orderClause}`
  );
  return rows;
}

export async function createMemory(
  name: string | null,
  memoryText: string
): Promise<Memory> {
  const { rows } = await pool.query<Memory>(
    `INSERT INTO memories (name, memory_text)
     VALUES ($1, $2)
     RETURNING id, name, memory_text, submitted_at`,
    [name, memoryText]
  );
  return rows[0];
}
