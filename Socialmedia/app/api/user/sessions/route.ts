import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, allDevices } = await request.json();

    // Get user ID from email
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    // Get current session token from the request cookies
    const token = request.headers.get('cookie')?.match(/next-auth.session-token=([^;]+)/)?.[1] ||
                  request.headers.get('cookie')?.match(/__Secure-next-auth.session-token=([^;]+)/)?.[1];

    if (allDevices) {
      // Delete all sessions except current
      if (token) {
        await sql`
          DELETE FROM sessions WHERE user_id = ${userId} AND token != ${token}
        `;
      } else {
        await sql`
          DELETE FROM sessions WHERE user_id = ${userId}
        `;
      }
    } else if (sessionId) {
      // Delete specific session
      await sql`
        DELETE FROM sessions WHERE id = ${sessionId} AND user_id = ${userId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error managing sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to fetch user sessions
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    // Get all active sessions for the user
    const sessionsResult = await sql`
      SELECT id, device_info, ip_address, last_activity, created_at, expires_at 
      FROM sessions 
      WHERE user_id = ${userId} AND expires_at > NOW()
      ORDER BY last_activity DESC
    `;

    return NextResponse.json({ sessions: sessionsResult.rows });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}