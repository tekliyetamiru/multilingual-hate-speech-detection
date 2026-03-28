'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'react-hot-toast';

export function ModerationQueue() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/admin/reports?status=pending');
      const data = await response.json();
      setReports(data.reports);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (reportId: string, action: string, notes?: string) => {
    setProcessing(reportId);
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action, notes }),
      });
      if (response.ok) {
        toast.success(`Report ${action}d successfully`);
        setReports(prev => prev.filter(r => r.id !== reportId));
      } else {
        toast.error(`Failed to ${action} report`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} report`);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Moderation Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Moderation Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No pending reports</p>
            <p className="text-sm">All clear! 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Moderation Queue
          <Badge variant="destructive">{reports.length} pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reports.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">Reported by @{report.reporter_username}</p>
                  <p className="text-sm text-gray-500">Reason: {report.reason}</p>
                </div>
                <Badge variant="outline" className="ml-2">
                  {report.reported_post ? 'Post' : report.reported_comment ? 'Comment' : 'User'}
                </Badge>
              </div>
              
              {report.reported_post && (
                <div className="bg-white dark:bg-gray-700 p-3 rounded mb-3">
                  <p className="text-sm">Content: {report.reported_post.content}</p>
                </div>
              )}
              {report.reported_comment && (
                <div className="bg-white dark:bg-gray-700 p-3 rounded mb-3">
                  <p className="text-sm">Comment: {report.reported_comment.content}</p>
                </div>
              )}
              {report.reported_user && (
                <div className="bg-white dark:bg-gray-700 p-3 rounded mb-3">
                  <p className="text-sm">Reported user: @{report.reported_user.username}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleAction(report.id, 'dismiss')}
                  disabled={processing === report.id}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleAction(report.id, 'resolve')}
                  disabled={processing === report.id}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleAction(report.id, 'remove_content')}
                  disabled={processing === report.id}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}