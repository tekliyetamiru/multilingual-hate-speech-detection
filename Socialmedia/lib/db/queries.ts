import { pool } from './index';
import { User, Post, Comment, Notification } from '@/types';

const isBrowser = typeof window !== 'undefined';

const mockPosts = [
  {
    id: '1',
    user_id: '1',
    username: 'johndoe',
    full_name: 'John Doe',
    avatar_url: 'https://i.pravatar.cc/150?u=1',
    content: 'Just finished building this amazing social media platform! 🚀 The journey was incredible. #coding #webdev',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    likes_count: 42,
    comments_count: 7,
    is_liked: false,
    is_bookmarked: false,
    visibility: 'public' as const,
  },
  {
    id: '2',
    user_id: '2',
    username: 'janedoe',
    full_name: 'Jane Doe',
    avatar_url: 'https://i.pravatar.cc/150?u=2',
    content: 'Beautiful sunset today! 🌅',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    likes_count: 128,
    comments_count: 23,
    is_liked: true,
    is_bookmarked: false,
    visibility: 'public' as const,
    media_urls: ['https://picsum.photos/800/600?random=1'],
    media_types: ['image'],
  },
  {
    id: '3',
    user_id: '3',
    username: 'techguru',
    full_name: 'Tech Guru',
    avatar_url: 'https://i.pravatar.cc/150?u=3',
    content: 'Check out this new React feature! 🎯\n\nuse() hook is amazing for async data fetching. What do you think?',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    likes_count: 89,
    comments_count: 15,
    is_liked: false,
    is_bookmarked: true,
    visibility: 'public' as const,
    tags: ['react', 'javascript', 'webdev'],
  },
];

export const db = {
  users: {
    async create(userData: any) {
      if (isBrowser) return null;
      try {
        const result = await pool.query(
          'INSERT INTO users (username, email, password_hash, full_name) VALUES ($1, $2, $3, $4) RETURNING *',
          [userData.username, userData.email, userData.password_hash, userData.full_name]
        );
        return result.rows[0];
      } catch (error) {
        return null;
      }
    },
    async findByEmail(email: string) {
      if (isBrowser) return null;
      try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
      } catch (error) {
        return null;
      }
    },
    async findByUsername(username: string) {
      if (isBrowser) return null;
      try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return result.rows[0];
      } catch (error) {
        return null;
      }
    },
    async findById(id: string) {
      if (isBrowser) return null;
      try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
      } catch (error) {
        return null;
      }
    },
    async getFollowersCount(userId: string) { return 0; },
    async getFollowingCount(userId: string) { return 0; },
    async isFollowing(followerId: string, followingId: string) { return false; },
    async isCloseFriend(userId: string, friendId: string) { return false; },
  },

  posts: {
    async getFeed(userId: string, limit: number = 10, offset: number = 0) { return mockPosts; },
    async getUserPosts(userId: string, viewerId: string | null, limit: number, offset: number) { return mockPosts; },
    async getExploreFeed(limit: number = 10, offset: number = 0) { return mockPosts; },
    async like(postId: string, userId: string) { return { success: true }; },
    async unlike(postId: string, userId: string) { return { success: true }; },
    async addReaction(postId: string, userId: string, reactionType: string) { return { success: true }; },
    async delete(postId: string) { return { success: true }; },
    async archive(postId: string) { return { success: true }; },
  },

  hashtags: {
    async getTrending(limit: number = 5) { return []; },
  },

  notifications: {
    async getFeed(userId: string) {
      if (isBrowser) return [];
      try {
        const result = await pool.query(
          `SELECT
            n.id,
            n.type,
            n.content,
            n.is_read,
            n.created_at,
            n.post_id,
            json_build_object(
              'id', u.id,
              'username', u.username,
              'full_name', u.full_name,
              'avatar_url', u.avatar_url
            ) AS actor,
            CASE WHEN n.post_id IS NOT NULL THEN
              json_build_object('id', p.id, 'content', p.content)
            ELSE NULL END AS post
          FROM notifications n
          JOIN users u ON u.id = n.actor_id
          LEFT JOIN posts p ON p.id = n.post_id
          WHERE n.user_id = $1
          ORDER BY n.created_at DESC
          LIMIT 50`,
          [userId]
        );
        return result.rows;
      } catch (error) {
        console.error('Error fetching notification feed:', error);
        return [];
      }
    },
    async getUnreadCount(userId: string) {
      if (isBrowser) return 0;
      try {
        const result = await pool.query(
          'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
          [userId]
        );
        return parseInt(result.rows[0].count, 10);
      } catch (error) {
        return 0;
      }
    },
    async markAsRead(notificationId: string) {
      if (isBrowser) return { success: false };
      try {
        await pool.query('UPDATE notifications SET is_read = true WHERE id = $1', [notificationId]);
        return { success: true };
      } catch (error) {
        return { success: false };
      }
    },
    async markAllAsRead(userId: string) {
      if (isBrowser) return { success: false };
      try {
        await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
        return { success: true };
      } catch (error) {
        return { success: false };
      }
    }
  },
};