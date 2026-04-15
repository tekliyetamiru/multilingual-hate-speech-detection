'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Filter,
  Search,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { toast } from 'react-hot-toast';

interface Report {
  id: string;
  type: 'post' | 'comment' | 'user';
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  reporter_username: string;
  reporter_avatar: string;
  reported_user?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  reported_post?: {
    id: string;
    content: string;
    user: { username: string; full_name: string };
  };
  reported_comment?: {
    id: string;
    content: string;
    user: { username: string; full_name: string };
  };
}

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        status: 'pending',
        type: filterType,
      });
      const response = await fetch(`/api/admin/reports?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setReports(data.reports);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  }, [page, filterType]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAction = async (reportId: string, action: string) => {
    setActionLoading(reportId);
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action }),
      });
      if (response.ok) {
        toast.success(`Report ${action}d`);
        fetchReports(); // refresh list
      } else {
        toast.error(`Failed to ${action} report`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} report`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReports = reports.filter(report =>
    report.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.reporter_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Moderation Queue</h1>
        <Button variant="outline" onClick={fetchReports}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Pending Reports</p>
            <p className="text-2xl font-bold">{reports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Posts Reported</p>
            <p className="text-2xl font-bold">{reports.filter(r => r.reported_post).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Comments Reported</p>
            <p className="text-2xl font-bold">{reports.filter(r => r.reported_comment).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search reports..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="post">Posts</SelectItem>
                <SelectItem value="comment">Comments</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchReports}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No pending reports</h3>
              <p className="text-gray-500">All reports have been processed</p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar src={report.reporter_avatar} alt={report.reporter_username} size="sm" />
                      <div>
                        <p className="font-medium">Reported by @{report.reporter_username}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(report.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">Pending</Badge>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-red-500">Reason: {report.reason}</p>
                    {report.description && (
                      <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">{report.description}</p>
                    )}
                  </div>

                  {report.reported_post && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded mb-4">
                      <p className="text-sm font-medium">Reported Post:</p>
                      <p className="text-sm mt-1">"{report.reported_post.content}"</p>
                      <p className="text-xs text-gray-500 mt-1">by @{report.reported_post.user.username}</p>
                    </div>
                  )}

                  {report.reported_comment && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded mb-4">
                      <p className="text-sm font-medium">Reported Comment:</p>
                      <p className="text-sm mt-1">"{report.reported_comment.content}"</p>
                      <p className="text-xs text-gray-500 mt-1">by @{report.reported_comment.user.username}</p>
                    </div>
                  )}

                  {report.reported_user && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded mb-4">
                      <p className="text-sm font-medium">Reported User:</p>
                      <p className="text-sm mt-1">@{report.reported_user.username}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleAction(report.id, 'dismiss')}
                      disabled={actionLoading === report.id}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleAction(report.id, 'resolve')}
                      disabled={actionLoading === report.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleAction(report.id, 'remove_content')}
                      disabled={actionLoading === report.id}
                    >
                      <EyeOff className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                    {report.reported_user && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleAction(report.id, 'shadow_ban')}
                        disabled={actionLoading === report.id}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Shadow Ban
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}