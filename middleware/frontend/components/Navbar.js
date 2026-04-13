import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
            <path d="M10 6a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">ToxiGuard</span>
        </Link>
        <div className="relative">
          {!user ? (
            <div className="space-x-4">
              <Link href="/login" className="text-gray-700 hover:text-purple-600 transition">Login</Link>
              <Link href="/signup" className="bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700 transition">Sign Up</Link>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                  {user.username[0].toUpperCase()}
                </div>
                <span className="hidden md:inline">{user.username}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10"
                  >
                    {user.role === 'admin' ? (
                      <>
                        <Link href="/admin/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Dashboard</Link>
                        <Link href="/admin/users" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Users</Link>
                        <Link href="/admin/logs" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">All Logs</Link>
                        <Link href="/admin/settings" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Settings</Link>
                      </>
                      
                    ) : (
                      <>
                        <Link href="/user/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Dashboard</Link>
                        <Link href="/user/bots" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">My Bots</Link>
                        <Link href="/user/api-keys" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">API Keys</Link>
                        <Link href="/user/logs" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Message Logs</Link>
                      </>
                    )}
                    <button
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}