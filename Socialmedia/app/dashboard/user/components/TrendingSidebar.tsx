"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Hash, TrendingUp, Users, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useSession } from "next-auth/react";

interface TrendingTopic {
  id: string;
  name: string;
  posts_count: number;
}

interface SuggestedUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

export function TrendingSidebar() {
  const { data: session } = useSession();
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch('/api/trending/hashtags');
        const data = await res.json();
        setTrending(data.trending || []);
      } catch (error) {
        console.error('Failed to fetch trending hashtags:', error);
      } finally {
        setLoadingTrending(false);
      }
    };
    fetchTrending();
  }, []);

  useEffect(() => {
    const fetchSuggested = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch('/api/users/suggested');
        const data = await res.json();
        setSuggested(data.suggested || []);
      } catch (error) {
        console.error('Failed to fetch suggested users:', error);
      } finally {
        setLoadingSuggested(false);
      }
    };
    fetchSuggested();
  }, [session]);

  const handleFollow = async (userId: string) => {
    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
      const data = await res.json();
      setFollowingMap(prev => ({ ...prev, [userId]: data.following }));
      if (data.following) {
        setSuggested(prev => prev.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Failed to follow user:', error);
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (loadingTrending) {
    return (
      <div className="space-y-5 sticky top-20">
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-purple-50/40 to-pink-50/40 dark:from-gray-800 dark:via-purple-900/15 dark:to-pink-900/15 rounded-2xl p-5 shadow-xl border border-purple-100/60 dark:border-purple-900/30 backdrop-blur-md">
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-purple-300/20 dark:bg-purple-500/10 rounded-full blur-2xl" />
          <div className="h-6 bg-gradient-to-r from-purple-200 to-pink-200 dark:from-purple-800/60 dark:to-pink-800/60 rounded-lg animate-pulse w-2/5 mb-5" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/40 to-purple-50/40 dark:from-gray-800 dark:via-blue-900/15 dark:to-purple-900/15 rounded-2xl p-5 shadow-xl border border-blue-100/60 dark:border-blue-900/30 backdrop-blur-md">
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-blue-300/20 dark:bg-blue-500/10 rounded-full blur-2xl" />
          <div className="h-6 bg-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-800/60 dark:to-purple-800/60 rounded-lg animate-pulse w-2/5 mb-5" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/5" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sticky top-20 animate-slideInRight">
      {/* Trending Topics */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-purple-50/40 to-pink-50/40 dark:from-gray-800 dark:via-purple-900/15 dark:to-pink-900/15 rounded-2xl p-5 shadow-xl border border-purple-100/60 dark:border-purple-900/30 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:border-purple-200/80 dark:hover:border-purple-800/50">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-300/20 dark:bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-pink-300/20 dark:bg-pink-500/10 rounded-full blur-3xl" />

        <div className="relative flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg flex items-center text-gray-800 dark:text-gray-100">
            <span className="inline-flex items-center justify-center mr-3 p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25">
              <TrendingUp className="h-4 w-4 text-white" />
            </span>
            <span className="bg-gradient-to-r from-purple-700 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Trending This Week
            </span>
          </h2>
          <Sparkles className="h-4 w-4 text-purple-400 dark:text-purple-500 opacity-50 animate-pulse" />
        </div>

        <div className="space-y-1">
          {trending.length === 0 ? (
            <div className="text-center py-6 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No trending topics yet
              </p>
            </div>
          ) : (
            trending.map((topic, index) => {
              const rank = index + 1;
              const isTop = rank <= 3;
              return (
                <Link
                  key={topic.id}
                  href={`/hashtag/${topic.name}`}
                  className="group flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 hover:shadow-md hover:scale-[1.02]"
                >
                  <div className="flex items-center min-w-0">
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold mr-3 shrink-0 transition-all ${
                        rank === 1
                          ? "bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-md"
                          : rank === 2
                          ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md"
                          : rank === 3
                          ? "bg-gradient-to-br from-orange-300 to-amber-500 text-white shadow-md"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {rank}
                    </span>
                    <Hash
                      className={`h-4 w-4 mr-2 shrink-0 transition-colors ${
                        isTop
                          ? "text-purple-500 dark:text-purple-400"
                          : "text-gray-400 dark:text-gray-500 group-hover:text-purple-500"
                      }`}
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                      {topic.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors shrink-0 ml-3">
                    {topic.posts_count} {topic.posts_count === 1 ? 'post' : 'posts'}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Suggested Users */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/40 to-purple-50/40 dark:from-gray-800 dark:via-blue-900/15 dark:to-purple-900/15 rounded-2xl p-5 shadow-xl border border-blue-100/60 dark:border-blue-900/30 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:border-blue-200/80 dark:hover:border-blue-800/50">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-300/20 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-purple-300/20 dark:bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg flex items-center text-gray-800 dark:text-gray-100">
            <span className="inline-flex items-center justify-center mr-3 p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/25">
              <Users className="h-4 w-4 text-white" />
            </span>
            <span className="bg-gradient-to-r from-blue-700 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Suggested for You
            </span>
          </h2>
          <Sparkles className="h-4 w-4 text-blue-400 dark:text-blue-500 opacity-50 animate-pulse" />
        </div>

        <div className="relative space-y-3">
          {loadingSuggested ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/5" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/5" />
                </div>
              </div>
            ))
          ) : suggested.length === 0 ? (
            <div className="text-center py-6 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No suggestions right now
              </p>
            </div>
          ) : (
            suggested.map((user, index) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 p-2 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 hover:shadow-md hover:scale-[1.02]"
                style={{
                  animation: `slideInRight 0.35s ease-out ${index * 0.06}s backwards`,
                }}
              >
                <Link
                  href={`/profile/${user.username}`}
                  className="flex items-center space-x-3 flex-1 min-w-0"
                >
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur opacity-0 hover:opacity-60 transition-opacity" />
                    <Avatar
                      src={user.avatar_url}
                      alt={user.username}
                      size="sm"
                      className="relative ring-[2.5px] ring-white dark:ring-gray-700 shadow-md"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                      {user.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{user.username}
                    </p>
                  </div>
                </Link>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleFollow(user.id)}
                  disabled={followLoading[user.id]}
                  className="shrink-0 rounded-full border-purple-200 dark:border-purple-800 bg-gradient-to-r from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/40 text-purple-700 dark:text-purple-300 hover:text-white hover:border-transparent hover:from-purple-600 hover:to-pink-600 hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100"
                >
                  {followLoading[user.id] ? '...' : 'Follow'}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
