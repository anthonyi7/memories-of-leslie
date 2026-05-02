import { NextRequest, NextResponse } from 'next/server';
import { getMemories, createMemory } from '@/lib/db';

// In-memory rate limit store: 5 submissions per IP per hour.
// Per-pod, not shared across replicas — adequate for a family memorial site.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }

  if (entry.count >= 5) return true;

  entry.count++;
  return false;
}

export async function GET(request: NextRequest) {
  const sort = request.nextUrl.searchParams.get('sort') === 'alpha' ? 'alpha' : 'date';
  const filter = request.nextUrl.searchParams.get('filter') || null;

  try {
    const memories = await getMemories(sort, filter);
    return NextResponse.json(memories);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait before trying again.' },
      { status: 429 }
    );
  }

  let body: { name?: unknown; memory_text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, memory_text } = body;

  if (!memory_text || typeof memory_text !== 'string' || memory_text.trim().length === 0) {
    return NextResponse.json({ error: 'Memory text is required' }, { status: 400 });
  }

  if (memory_text.length > 10000) {
    return NextResponse.json({ error: 'Memory text exceeds 10000 characters' }, { status: 400 });
  }

  if (name !== null && name !== undefined && typeof name !== 'string') {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }

  try {
    const memory = await createMemory(
      typeof name === 'string' && name.trim() ? name.trim() : null,
      memory_text.trim()
    );
    return NextResponse.json(memory, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 });
  }
}
