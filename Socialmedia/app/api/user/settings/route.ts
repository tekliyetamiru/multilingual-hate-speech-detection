import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from email
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    // Fetch all settings in parallel
    const [
      userProfile,
      userSettings,
      privacySettings,
      notificationSettings,
      sessions,
      blockedUsers,
      verificationStatus
    ] = await Promise.all([
      // User profile data
      sql`
        SELECT username, full_name, email, bio, avatar_url, cover_url, 
               website, location, date_of_birth, phone_number, is_verified, is_private,
               two_factor_enabled, language, theme, last_login, created_at
        FROM users WHERE id = ${userId}
      `,
      // User settings
      sql`
        SELECT email_notifications, push_notifications, weekly_digest, 
               show_activity, show_followers, allow_tagging, allow_messaging, content_visibility
        FROM user_settings WHERE user_id = ${userId}
      `,
      // Privacy settings from user_settings
      sql`
        SELECT show_activity as show_online_status, show_followers, 
               allow_tagging as tag_permission, allow_messaging as message_permission,
               content_visibility as post_visibility
        FROM user_settings WHERE user_id = ${userId}
      `,
      // Notification settings
      sql`
        SELECT email_notifications, push_notifications, weekly_digest
        FROM user_settings WHERE user_id = ${userId}
      `,
      // Active sessions
      sql`
        SELECT id, device_info, ip_address, last_activity, created_at, expires_at
        FROM sessions WHERE user_id = ${userId} AND expires_at > NOW()
        ORDER BY last_activity DESC
      `,
      // Blocked users
      sql`
        SELECT u.id, u.username, u.full_name, u.avatar_url, b.created_at
        FROM blocks b
        JOIN users u ON b.blocked_user_id = u.id
        WHERE b.user_id = ${userId}
        ORDER BY b.created_at DESC
      `,
      // Verification status
      sql`
        SELECT status, created_at FROM verification_requests 
        WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1
      `
    ]);

    const profile = userProfile.rows[0];
    const settings = userSettings.rows[0] || {};
    const privacy = privacySettings.rows[0] || {};
    const notifications = notificationSettings.rows[0] || {};

    return NextResponse.json({
      account: {
        fullName: profile?.full_name || '',
        username: profile?.username || '',
        email: profile?.email || '',
        phone: profile?.phone_number || '',
        bio: profile?.bio || '',
        dob: profile?.date_of_birth || '',
        website: profile?.website || '',
        location: profile?.location || '',
        avatarUrl: profile?.avatar_url || null,
        coverUrl: profile?.cover_url || null,
        isVerified: profile?.is_verified || false,
        isPrivate: profile?.is_private || false,
        twoFactorEnabled: profile?.two_factor_enabled || false,
        language: profile?.language || 'en',
        theme: profile?.theme || 'light',
        lastLogin: profile?.last_login,
        createdAt: profile?.created_at
      },
      privacy: {
        profileVisibility: profile?.is_private ? 'private' : 'public',
        postVisibility: settings.content_visibility || 'public',
        messagePermission: settings.allow_messaging || 'everyone',
        tagPermission: settings.allow_tagging ? 'everyone' : 'friends',
        showOnlineStatus: settings.show_activity ?? true,
        showFollowers: settings.show_followers ?? true,
        searchEngineIndexing: !profile?.is_private
      },
      notifications: {
        push: {
          likes: notifications.push_notifications ?? true,
          comments: notifications.push_notifications ?? true,
          follows: notifications.push_notifications ?? true,
          messages: notifications.push_notifications ?? true,
          mentions: notifications.push_notifications ?? true
        },
        email: {
          marketing: false,
          security: notifications.email_notifications ?? true,
          digest: notifications.weekly_digest ?? true,
          mentions: notifications.email_notifications ?? true
        }
      },
      sessions: sessions.rows,
      blockedUsers: blockedUsers.rows,
      verificationStatus: verificationStatus.rows[0]?.status || null,
      appearance: {
        theme: profile?.theme || 'system',
        language: profile?.language || 'en'
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { section, data } = body;

    // Get user ID
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    try {
      switch (section) {
        case 'profile':
          await sql`
            UPDATE users 
            SET full_name = ${data.fullName}, bio = ${data.bio}, website = ${data.website}, 
                location = ${data.location}, phone_number = ${data.phone}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${userId}
          `;
          break;

        case 'account':
          await sql`
            UPDATE users 
            SET username = ${data.username}, date_of_birth = ${data.dob}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${userId}
          `;
          break;

        case 'privacy':
          await sql`
            UPDATE users SET is_private = ${data.profileVisibility === 'private'} WHERE id = ${userId}
          `;
          
          // Check if user_settings exists
          const existingSettings = await sql`
            SELECT * FROM user_settings WHERE user_id = ${userId}
          `;
          
          if (existingSettings.rows.length > 0) {
            await sql`
              UPDATE user_settings 
              SET content_visibility = ${data.postVisibility}, allow_messaging = ${data.messagePermission}, 
                  allow_tagging = ${data.tagPermission === 'everyone'}, show_activity = ${data.showOnlineStatus}, 
                  show_followers = ${data.showFollowers}
              WHERE user_id = ${userId}
            `;
          } else {
            await sql`
              INSERT INTO user_settings (user_id, content_visibility, allow_messaging, 
                allow_tagging, show_activity, show_followers)
              VALUES (${userId}, ${data.postVisibility}, ${data.messagePermission}, 
                ${data.tagPermission === 'everyone'}, ${data.showOnlineStatus}, ${data.showFollowers})
            `;
          }
          break;

        case 'notifications':
          await sql`
            UPDATE user_settings 
            SET push_notifications = ${data.pushEnabled}, email_notifications = ${data.emailEnabled}, 
                weekly_digest = ${data.digestEnabled}
            WHERE user_id = ${userId}
          `;
          break;

        case 'appearance':
          await sql`
            UPDATE users SET theme = ${data.theme}, language = ${data.language}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${userId}
          `;
          break;

        case 'password':
          // Password change would be handled with bcrypt
          await sql`
            UPDATE users SET password_hash = ${data.passwordHash}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${userId}
          `;
          break;

        default:
          return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: `${section} updated successfully` });
    } catch (error) {
      console.error('Error updating settings:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}