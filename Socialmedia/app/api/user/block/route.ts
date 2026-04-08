import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: blockedUserId, action } = await request.json();

    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    const userId = userResult.rows[0].id;

    if (action === 'block') {
      await sql`
        INSERT INTO blocks (user_id, blocked_user_id) 
        VALUES (${userId}, ${blockedUserId}) 
        ON CONFLICT DO NOTHING
      `;
    } else if (action === 'unblock') {
      await sql`
        DELETE FROM blocks 
        WHERE user_id = ${userId} AND blocked_user_id = ${blockedUserId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating block status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}