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

export async function getMemories(
  sort: 'date' | 'alpha' = 'date',
  filter?: string | null
): Promise<Memory[]> {
  const orderClause =
    sort === 'alpha'
      ? '(name IS NULL) DESC, LOWER(name) ASC, submitted_at DESC'
      : '(name IS NULL) DESC, submitted_at DESC';

  let whereClause = 'WHERE approved = TRUE';
  const params: unknown[] = [];

  if (filter === 'anonymous') {
    whereClause += ' AND name IS NULL';
  } else if (filter) {
    params.push(filter);
    whereClause += ` AND name = $${params.length}`;
  }

  const { rows } = await pool.query<Memory>(
    `SELECT id, name, memory_text, submitted_at FROM memories ${whereClause} ORDER BY ${orderClause}`,
    params
  );
  return rows;
}

export async function getDistinctNames(): Promise<string[]> {
  const { rows } = await pool.query<{ name: string }>(
    `SELECT name FROM memories WHERE approved = TRUE AND name IS NOT NULL GROUP BY name ORDER BY LOWER(name) ASC`
  );
  return rows.map((r) => r.name);
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
