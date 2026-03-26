import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { pool } from '@/lib/db';
import { pusherServer } from '@/lib/pusher';

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = params.userId;
    const currentUserId = session.user.id;

    if (currentUserId === targetUserId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Ensure follows table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS follows (
        follower_id TEXT NOT NULL,
        following_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (follower_id, following_id)
      )
    `);

    // Check if already following
    const existing = await pool.query(
      'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
      [currentUserId, targetUserId]
    );

    if (existing.rows.length > 0) {
      // Unfollow
      await pool.query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [currentUserId, targetUserId]
      );
      return NextResponse.json({ following: false });
    } else {
      // Follow
      await pool.query(
        'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
        [currentUserId, targetUserId]
      );

      // Notify the followed user
      const actorResult = await pool.query(
        'SELECT username, full_name, avatar_url FROM users WHERE id = $1',
        [currentUserId]
      );
      const actor = actorResult.rows[0];

      // Insert a notification in DB
      const notifResult = await pool.query(
        `INSERT INTO notifications (user_id, type, actor_id, content)
         VALUES ($1, 'follow', $2, $3) RETURNING *`,
        [targetUserId, currentUserId, `${actor?.username || 'Someone'} started following you`]
      );

      if (pusherServer && notifResult.rows.length > 0) {
        await pusherServer.trigger(
          `user-notifications-${targetUserId}`,
          'new-notification',
          {
            ...notifResult.rows[0],
            actor: {
              id: currentUserId,
              username: actor?.username,
              full_name: actor?.full_name,
              avatar_url: actor?.avatar_url,
            }
          }
        );
      }

      return NextResponse.json({ following: true });
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    return NextResponse.json({ error: 'Failed to toggle follow' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ following: false });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS follows (
        follower_id TEXT NOT NULL,
        following_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (follower_id, following_id)
      )
    `);

    const result = await pool.query(
      'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
      [session.user.id, params.userId]
    );
    return NextResponse.json({ following: result.rows.length > 0 });
  } catch (error) {
    console.error('Error checking follow status:', error);
    return NextResponse.json({ following: false });
  }
}
