import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/db';

// Initialize Upstash Redis (optional — presence degrades gracefully)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

interface PresenceEntry {
  userId: string | null;
  displayName: string;
  avatarColor: string;
  isEditing: boolean;
  lastSeen: number;
  showPublicProfile: boolean;
}

// Deterministic color from userId hash
function getAvatarColor(id: string): string {
  const colors = [
    '#D4A827', '#6366F1', '#22C55E', '#FF6B2B', '#EC4899',
    '#06B6D4', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

// Resolve display name based on privacy settings
async function resolveDisplayName(
  clerkUserId: string | null,
  dbUserId: number | null
): Promise<{ displayName: string; showPublicProfile: boolean }> {
  if (!clerkUserId || !dbUserId) {
    return { displayName: 'Anonymous', showPublicProfile: false };
  }

  // Get user settings
  const settings = await query<{ show_profile_on_public: boolean; name: string }>(
    `SELECT u.name, COALESCE(us.show_profile_on_public, FALSE) as show_profile_on_public
     FROM users u
     LEFT JOIN user_settings us ON us.user_id = u.id
     WHERE u.id = $1 LIMIT 1`,
    [dbUserId]
  );

  if (!settings.length) {
    return { displayName: 'Unknown User', showPublicProfile: false };
  }

  if (settings[0].show_profile_on_public) {
    return {
      displayName: settings[0].name || 'Unknown User',
      showPublicProfile: true,
    };
  }

  return { displayName: 'Unknown User', showPublicProfile: false };
}

const PRESENCE_TTL = 90; // seconds

// POST — upsert presence entry (heartbeat)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await req.json();
    const { isEditing = false } = body;

    // If Redis is not configured, return empty viewers gracefully
    if (!redis) {
      return NextResponse.json({ viewers: [] });
    }

    const { userId: clerkUserId } = await auth();

    // Resolve DB user ID
    let dbUserId: number | null = null;
    if (clerkUserId) {
      const users = await query<{ id: number }>(
        `SELECT id FROM users WHERE clerk_id = $1 LIMIT 1`,
        [clerkUserId]
      );
      if (users.length) dbUserId = users[0].id;
    }

    // Create a unique identifier for this viewer
    const viewerId = clerkUserId || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon-' + Date.now();

    const { displayName, showPublicProfile } = await resolveDisplayName(clerkUserId, dbUserId);

    const entry: PresenceEntry = {
      userId: clerkUserId,
      displayName,
      avatarColor: getAvatarColor(viewerId),
      isEditing,
      lastSeen: Date.now(),
      showPublicProfile,
    };

    // Store in Redis hash
    const key = `presence:${sessionId}`;
    await redis.hset(key, { [viewerId]: JSON.stringify(entry) });
    await redis.expire(key, PRESENCE_TTL);

    // Get all current viewers
    const allPresence = await redis.hgetall(key);
    const now = Date.now();
    const viewers: (PresenceEntry & { viewerId: string })[] = [];

    if (allPresence) {
      for (const [vid, value] of Object.entries(allPresence)) {
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          // Filter out stale entries (> 90 seconds)
          if (now - parsed.lastSeen < PRESENCE_TTL * 1000) {
            viewers.push({ ...parsed, viewerId: vid });
          } else {
            // Clean up stale entry
            await redis.hdel(key, vid);
          }
        } catch {
          // Skip invalid entries
        }
      }
    }

    return NextResponse.json({ viewers });
  } catch (error) {
    console.error('Presence POST error:', error);
    return NextResponse.json({ viewers: [] }, { status: 500 });
  }
}

// GET — get all active viewers
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // If Redis is not configured, return empty viewers gracefully
    if (!redis) {
      return NextResponse.json({ viewers: [] });
    }

    const key = `presence:${sessionId}`;

    const allPresence = await redis.hgetall(key);
    const now = Date.now();
    const viewers: (PresenceEntry & { viewerId: string })[] = [];

    if (allPresence) {
      for (const [vid, value] of Object.entries(allPresence)) {
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          if (now - parsed.lastSeen < PRESENCE_TTL * 1000) {
            viewers.push({ ...parsed, viewerId: vid });
          } else {
            await redis.hdel(key, vid);
          }
        } catch {
          // Skip invalid entries
        }
      }
    }

    return NextResponse.json({ viewers });
  } catch (error) {
    console.error('Presence GET error:', error);
    return NextResponse.json({ viewers: [] }, { status: 500 });
  }
}

// DELETE — remove own presence
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { userId: clerkUserId } = await auth();

    // If Redis is not configured, no-op
    if (!redis) {
      return NextResponse.json({ success: true });
    }

    const viewerId = clerkUserId || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';

    if (viewerId) {
      const key = `presence:${sessionId}`;
      await redis.hdel(key, viewerId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Presence DELETE error:', error);
    return NextResponse.json({ success: true }, { status: 500 });
  }
}
