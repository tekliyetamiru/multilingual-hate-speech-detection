// app/(dashboard)/user/notifications/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
  Bell,
  CheckCheck,
  Settings,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { pusherClient } from "@/lib/pusher";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "mention" | "share" | "reaction" | "system";
  actor: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  post?: {
    id: string;
    content: string;
  };
  comment?: {
    id: string;
    content: string;
  };
  content: string;
  is_read: boolean;
  created_at: string;
}

import { useQueryClient } from "@tanstack/react-query";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const { data: session } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchNotifications();

    if (!session?.user?.id) return;

    // Subscribe to Pusher for real-time notifications
    if (!pusherClient) return;
    const userChannel = pusherClient.subscribe(`user-notifications-${session.user.id}`);

    const handleNewNotification = (data: Notification) => {
      // Don't add to feed if it's our own public action
      if (data.type === 'system' && data.actor.id === session.user.id) return;

      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    userChannel.bind("new-notification", handleNewNotification);

    return () => {
      userChannel.unbind("new-notification", handleNewNotification);
      userChannel.unsubscribe();
    };
  }, [session?.user?.id]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        queryClient.setQueryData(['unreadNotifications'], data.unreadCount || 0);
      } else {
        console.error("Failed to fetch notifications:", data.error);
        setNotifications([]);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId?: string) => {
    try {
      const isSoft = notificationId === "all-soft";
      const payloadId = isSoft ? undefined : notificationId;

      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          payloadId
            ? { action: "markAsRead", notificationId: payloadId }
            : { action: "markAllAsRead" },
        ),
      });

      if (!response.ok) throw new Error("Failed to mark as read");

      if (payloadId) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === payloadId ? { ...n, is_read: true } : n,
          ),
        );
        setUnreadCount((prev) => {
          const newCount = Math.max(0, prev - 1);
          queryClient.setQueryData(['unreadNotifications'], newCount);
          return newCount;
        });
      } else {
        if (!isSoft) {
          setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        }
        setUnreadCount(0);
        queryClient.setQueryData(['unreadNotifications'], 0);
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-5 w-5 text-red-500" />;
      case "comment":
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case "follow":
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case "mention":
        return <AtSign className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.is_read;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2 animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAsRead()}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings/notifications">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        <AnimatePresence>
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-gray-500">
                When you get notifications, they'll appear here
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id);
                    }
                    if (notification.type === 'follow') {
                      router.push(`/profile/${notification.actor.username}`);
                    } else if (notification.post?.id) {
                      router.push(`/post/${notification.post.id}`);
                    }
                  }}
                  className={`bg-white dark:bg-gray-800 rounded-lg p-4 hover:shadow-md transition cursor-pointer ${!notification.is_read ? "border-l-4 border-primary" : ""
                    }`}
                >
                  <div className="flex items-start space-x-3">
                    <Link href={`/profile/${notification.actor.username}`}>
                      <Avatar
                        src={notification.actor.avatar_url}
                        alt={notification.actor.username}
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          {getNotificationIcon(notification.type)}
                          <p className="text-sm">
                            <Link
                              href={`/profile/${notification.actor.username}`}
                              className="font-semibold hover:underline"
                            >
                              {notification.actor.full_name ||
                                notification.actor.username}
                            </Link>{" "}
                            {notification.content}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>

                      {notification.post && (
                        <Link
                          href={`/post/${notification.post.id}`}
                          className="block mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                          {notification.post.content}
                        </Link>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        {formatDistanceToNow(
                          new Date(notification.created_at),
                          { addSuffix: true },
                        )}
                      </p>
                    </div>

                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


