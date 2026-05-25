"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Post } from "./Post";
import { PostSkeleton } from "./PostSkeleton";
import { toast } from "react-hot-toast";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface FeedProps {
  userId: string;
}

export function Feed({ userId }: FeedProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { ref, inView } = useInView();
  
  const loadingRef = useRef(false);

  const loadPosts = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return;
      if (!reset && !hasMore) return;

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const currentPage = reset ? 1 : page;
        const offset = (currentPage - 1) * 5;
        
        console.log(`📡 Fetching posts: page=${currentPage}, offset=${offset}`);
        
        const response = await fetch(`/api/posts?limit=5&offset=${offset}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error:', response.status, errorText);
          throw new Error(`Failed to fetch posts: ${response.status}`);
        }

        const newPosts = await response.json();
        console.log(`✅ Loaded ${newPosts.length} posts`);

        if (newPosts.length < 5) {
          setHasMore(false);
        }

        setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
        if (!reset) {
          setPage((prev) => prev + 1);
        }
      } catch (error) {
        console.error("❌ Failed to load posts:", error);
        setError(error instanceof Error ? error.message : "Failed to load posts");
        toast.error("Failed to load posts");
      } finally {
        setLoading(false);
        setInitialLoading(false);
        loadingRef.current = false;
      }
    },
    [page, hasMore]
  );

  useEffect(() => {
    loadPosts(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (inView && !initialLoading && !loading && hasMore && !error) {
      loadPosts();
    }
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePostUpdate = (updatedPost: any) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  };

  const handlePostDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success("Post removed from feed");
  };

  const handleNewPost = (newPost: any) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="relative overflow-hidden text-center py-16 bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-red-900/20 rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30 backdrop-blur-sm">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-200/20 dark:bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-200/20 dark:bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/40 dark:to-orange-900/40 rounded-full shadow-lg">
            <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
            Something went wrong
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto px-4">
            {error}
          </p>
          <Button 
            onClick={() => {
              setPage(1);
              setHasMore(true);
              loadPosts(true);
            }}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.length === 0 ? (
        <div className="relative overflow-hidden text-center py-20 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900/20 rounded-2xl shadow-xl border border-purple-100 dark:border-purple-900/30 backdrop-blur-sm">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-purple-200/30 dark:bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-200/30 dark:bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 rounded-full shadow-xl animate-bounce">
              <Sparkles className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
              No posts yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto px-4">
              Create your first post or follow some users to see their amazing content!
            </p>
          </div>
        </div>
      ) : (
        posts.map((post, index) => (
          <div
            key={post.id}
            className="animate-slideInUp opacity-0"
            style={{
              animation: `slideInUp 0.5s ease-out ${index * 0.1}s forwards`,
            }}
          >
            <Post
              post={post}
              currentUserId={userId}
              onUpdate={handlePostUpdate}
              onDelete={handlePostDelete}
            />
          </div>
        ))
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-lg opacity-50 animate-pulse"></div>
            <Loader2 className="relative h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      )}

      {hasMore && !loading && posts.length > 0 && (
        <div ref={ref} className="h-10" />
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full shadow-lg border border-purple-200 dark:border-purple-800">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-pulse" />
            <p className="text-purple-700 dark:text-purple-300 font-medium">
              You've reached the end! 🎉
            </p>
            <Sparkles className="h-5 w-5 text-pink-600 dark:text-pink-400 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}
