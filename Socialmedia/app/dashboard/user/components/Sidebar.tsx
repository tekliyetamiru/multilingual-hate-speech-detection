"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
  Users,
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  Bookmark,
  Calendar,
  Video,
  Sparkles,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  user: any;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: "Home", href: "/dashboard/user", icon: Home },
    { name: "Messages", href: "/messages", icon: MessageCircle },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Saved", href: "/saved", icon: Bookmark },
  ];

  const profileSettings = [
    { name: "Profile", href: `/profile/${user.username}`, icon: User },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count');
      const data = await res.json();
      return data.unreadCount || 0;
    },
    enabled: !!user,
  });

  const { data: savedCount = 0 } = useQuery({
    queryKey: ['savedCount'],
    queryFn: async () => {
      const res = await fetch('/api/saved/count');
      const data = await res.json();
      return data.count || 0;
    },
    enabled: !!user,
  });

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:from-gray-800 dark:via-purple-900/10 dark:to-pink-900/10 rounded-2xl p-5 sticky top-20 shadow-xl border border-purple-100/50 dark:border-purple-900/30 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:border-purple-200/70 dark:hover:border-purple-800/50 animate-slideInLeft">
      
      {/* Decorative gradient orbs */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 dark:from-blue-500/10 dark:to-purple-500/10 rounded-full blur-3xl"></div>
      
      {/* Sparkle decoration */}
      <div className="absolute top-3 right-3 opacity-40">
        <Sparkles className="h-4 w-4 text-purple-500 dark:text-purple-400 animate-pulse" />
      </div>

      {/* User Info */}
      <div className="relative flex items-center space-x-3 mb-6 pb-5 border-b border-gradient-to-r from-transparent via-purple-200/50 to-transparent dark:via-purple-700/30">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-md opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
          <Avatar 
            src={user.avatar_url} 
            alt={user.username} 
            size="md" 
            className="relative ring-2 ring-white dark:ring-gray-700 shadow-lg transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 dark:text-white truncate text-lg bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            {user.name || user.username}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative space-y-1.5 mb-6">
        {navigation.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden",
                isActive
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 scale-[1.02]"
                  : "hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 hover:shadow-md hover:scale-[1.01]"
              )}
              style={{
                animation: `slideInLeft 0.3s ease-out ${index * 0.05}s backwards`,
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-100"></div>
              )}
              
              <div className="relative flex items-center space-x-3 flex-1 min-w-0">
                <div className={cn(
                  "p-2 rounded-lg transition-all duration-300",
                  isActive 
                    ? "bg-white/20 shadow-inner" 
                    : "group-hover:bg-purple-100 dark:group-hover:bg-purple-800/30"
                )}>
                  <item.icon className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive 
                      ? "text-white" 
                      : "text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400"
                  )} />
                </div>
                <span className={cn(
                  "font-medium truncate transition-all duration-300",
                  isActive 
                    ? "text-white" 
                    : "text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-300"
                )}>
                  {item.name}
                </span>
              </div>
              
              {/* Notification badges */}
              {item.name === "Notifications" && unreadCount > 0 && (
                <span className="relative z-10 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shrink-0 shadow-lg shadow-red-500/50 animate-bounce">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {item.name === 'Saved' && savedCount > 0 && (
                <span className="relative z-10 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shrink-0 shadow-lg shadow-purple-500/50 animate-pulse">
                  {savedCount > 99 ? '99+' : savedCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile & Settings Section */}
      <nav className="relative space-y-1.5 mb-6 pb-6 border-b border-gradient-to-r from-transparent via-purple-200/50 to-transparent dark:via-purple-700/30">
        {profileSettings.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden",
                isActive
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]"
                  : "hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 hover:shadow-md hover:scale-[1.01]"
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-100"></div>
              )}
              
              <div className="relative flex items-center space-x-3 flex-1 min-w-0">
                <div className={cn(
                  "p-2 rounded-lg transition-all duration-300",
                  isActive 
                    ? "bg-white/20 shadow-inner" 
                    : "group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800/30"
                )}>
                  <item.icon className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive 
                      ? "text-white" 
                      : "text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                  )} />
                </div>
                <span className={cn(
                  "font-medium truncate transition-all duration-300",
                  isActive 
                    ? "text-white" 
                    : "text-gray-700 dark:text-gray-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300"
                )}>
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <Button
        variant="ghost"
        className="relative w-full justify-start text-red-600 dark:text-red-400 hover:text-white font-medium px-4 py-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-500 hover:shadow-lg hover:shadow-red-500/30 hover:scale-[1.02] group overflow-hidden"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative flex items-center">
          <div className="p-2 rounded-lg group-hover:bg-white/20 transition-all duration-300">
            <LogOut className="h-5 w-5 mr-2" />
          </div>
          <span>Logout</span>
        </div>
      </Button>
    </div>
  );
}