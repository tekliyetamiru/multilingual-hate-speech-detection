'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AdminStats } from './components/AdminStats';
import { RecentReports } from './components/RecentReports';
import { UserGrowthChart } from './components/UserGrowthChart';
import { TopPosts } from './components/TopPosts';
import { ModerationQueue } from './components/ModerationQueue';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
    } else if (!session.user?.is_admin) {
      router.push('/dashboard/user');
    } else {
      setLoading(false);
    }
  }, [session, status, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-6">
            <AdminStats />
            <UserGrowthChart />
            <TopPosts />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <ModerationQueue />
            <RecentReports />
          </div>
        </div>
      </div>
    </div>
  );
}