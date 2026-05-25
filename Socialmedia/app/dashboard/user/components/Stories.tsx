"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Plus, Camera, Sparkles } from "lucide-react";
import { StoryViewer } from "./StoryViewer";
import { CreateStory } from "./CreateStory";

interface Story {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  media_url: string;
  viewed: boolean;
}

export function Stories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<number | null>(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const data = await fetch("/api/stories").then((res) => res.json());
      setStories(data);
    } catch (error) {
      console.error("Failed to fetch stories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = (index: number) => {
    setSelectedStory(index);
  };

  const handleStoryComplete = () => {
    if (selectedStory !== null && selectedStory < stories.length - 1) {
      setSelectedStory(selectedStory + 1);
    } else {
      setSelectedStory(null);
    }
  };

  const handleStoryViewed = (storyId: string) => {
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, viewed: true } : s))
    );
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:from-gray-800 dark:via-purple-900/10 dark:to-pink-900/10 rounded-2xl p-5 mb-6 shadow-xl border border-purple-100/50 dark:border-purple-900/30 backdrop-blur-sm">
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-300/20 to-pink-300/20 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-300/20 to-purple-300/20 dark:from-blue-500/10 dark:to-purple-500/10 rounded-full blur-2xl"></div>
        
        <div className="relative flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-200/50 via-pink-200/50 to-orange-200/50 dark:from-purple-700/30 dark:via-pink-700/30 dark:to-orange-700/30 animate-pulse shadow-lg" 
                style={{ animationDelay: `${i * 0.1}s` }} 
              />
              <div className="w-16 h-3 mt-2 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full animate-pulse" 
                style={{ animationDelay: `${i * 0.1}s` }} 
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-purple-50/40 to-pink-50/40 dark:from-gray-800 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl p-5 mb-6 shadow-xl border border-purple-100/60 dark:border-purple-900/40 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:border-purple-200/80 dark:hover:border-purple-800/60 animate-slideInDown">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/5 via-pink-400/5 to-orange-400/5 dark:from-purple-600/5 dark:via-pink-600/5 dark:to-orange-600/5 animate-gradient-x"></div>
        
        {/* Decorative sparkle elements */}
        <div className="absolute top-2 right-2 opacity-30">
          <Sparkles className="h-4 w-4 text-purple-500 dark:text-purple-400 animate-pulse" />
        </div>
        <div className="absolute bottom-2 left-2 opacity-20" style={{ animationDelay: '1s' }}>
          <Sparkles className="h-3 w-3 text-pink-500 dark:text-pink-400 animate-pulse" />
        </div>

        <div className="relative flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
          {/* Create Story Button */}
          <motion.div
            whileHover={{ scale: 1.08, y: -4 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 text-center cursor-pointer group"
            onClick={() => setShowCreateStory(true)}
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400 p-0.5 shadow-lg group-hover:shadow-purple-500/50 transition-all duration-300 group-hover:scale-105">
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-purple-50 group-hover:to-pink-50 dark:group-hover:from-purple-900/30 dark:group-hover:to-pink-900/30">
                  <Camera className="h-6 w-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-1 shadow-lg group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-110">
                <Plus className="h-4 w-4 text-white" />
              </div>
            </div>
            <span className="text-xs mt-2 block font-medium bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Your Story
            </span>
          </motion.div>

          {/* Stories List */}
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.08, y: -4 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 text-center cursor-pointer group"
              onClick={() => handleStoryClick(index)}
            >
              <div
                className={`w-16 h-16 rounded-full p-0.5 shadow-lg transition-all duration-300 ${
                  story.viewed
                    ? "bg-gradient-to-tr from-gray-300 via-gray-400 to-gray-300 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600 group-hover:shadow-gray-400/50"
                    : "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 group-hover:shadow-pink-500/60 animate-gradient-rotate"
                }`}
              >
                <Avatar
                  src={story.avatar_url}
                  alt={story.username}
                  className="w-full h-full border-[3px] border-white dark:border-gray-800 transition-all duration-300 group-hover:border-purple-100 dark:group-hover:border-purple-900"
                />
              </div>
              <span className="text-xs mt-2 block truncate w-16 font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">
                {story.full_name?.split(" ")[0] || story.username}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {selectedStory !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={selectedStory}
          onClose={() => setSelectedStory(null)}
          onComplete={handleStoryComplete}
          onStoryViewed={handleStoryViewed}
        />
      )}

      {/* Create Story Modal */}
      {showCreateStory && (
        <CreateStory
          onClose={() => setShowCreateStory(false)}
          onStoryCreated={fetchStories}
        />
      )}
    </>
  );
}
