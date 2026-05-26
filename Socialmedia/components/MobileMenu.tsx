"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Menu, X, Home, Heart, MessageCircle, User, LogOut, Settings, Sparkles } from "lucide-react";
import { signOut } from "next-auth/react";

const menuItems = [
  { href: "/dashboard/user", label: "Home", icon: Home, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/40" },
  { href: "/notifications", label: "Notifications", icon: Heart, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-100 dark:bg-pink-900/40" },
  { href: "/messages", label: "Messages", icon: MessageCircle, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/40" },
  { href: "/settings", label: "Settings", icon: Settings, color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-800" },
];

export function MobileMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
      {/* Header */}
      <div className="relative overflow-hidden flex items-center justify-between px-4 h-[60px] bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl border-b border-purple-100/70 dark:border-purple-900/30 shadow-sm">
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-pink-400/20 dark:bg-pink-500/10 rounded-full blur-2xl" />

        <div className="relative flex items-center gap-3">
          {/* ✅ Requested Home / back-to-home button */}
          <Link
            href="/dashboard/user"
            onClick={closeMenu}
            aria-label="Back to home"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 active:scale-95 transition-all hover:shadow-purple-500/50"
          >
            <Home className="h-[18px] w-[18px]" />
          </Link>

          <Link
            href="/dashboard/user"
            onClick={closeMenu}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h1 className="text-xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400 bg-clip-text text-transparent">
              SocialHub
            </h1>
          </Link>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30 active:scale-95 transition-all"
          aria-label="Toggle menu"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          ) : (
            <Menu className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          )}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-[60px] bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={closeMenu}
          />

          {/* Menu */}
          <nav className="relative border-t border-purple-100 dark:border-purple-900/40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl animate-slideInDown overflow-hidden">
            <div className="absolute -top-10 right-0 w-40 h-40 bg-purple-400/15 dark:bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-400/15 dark:bg-pink-500/10 rounded-full blur-3xl" />

            <div className="relative flex flex-col p-3 gap-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 hover:shadow-md active:scale-[0.99]"
                >
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${item.bg} shadow-sm group-hover:scale-110 transition-transform`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                    {item.label}
                  </span>
                </Link>
              ))}

              <div className="my-1 h-px bg-gradient-to-r from-transparent via-purple-200 dark:via-purple-800 to-transparent" />

              {session?.user ? (
                <Link
                  href={`/profile/${session.user.username || session.user.email?.split('@')[0]}`}
                  onClick={closeMenu}
                  className="group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 hover:shadow-md active:scale-[0.99]"
                >
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 shadow-sm group-hover:scale-110 transition-transform">
                    <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                    Profile
                  </span>
                </Link>
              ) : null}

              <button
                onClick={() => {
                  signOut();
                  closeMenu();
                }}
                className="group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/30 dark:hover:to-pink-900/30 hover:shadow-md active:scale-[0.99] text-left"
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 shadow-sm group-hover:scale-110 transition-transform">
                  <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
                </span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  Logout
                </span>
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

