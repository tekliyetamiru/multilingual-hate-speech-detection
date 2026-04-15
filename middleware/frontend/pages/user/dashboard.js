import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { motion } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function UserDashboard() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [botStats, setBotStats] = useState([]);
  const [trendData, setTrendData] = useState({ labels: [], counts: [] });
  const [announcements, setAnnouncements] = useState([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [msgsRes, statsRes, trendRes, annRes, creditsRes] = await Promise.all([
        api.get('/api/user/messages?limit=20'),
        api.get('/api/user/bot-stats'),
        api.get('/api/user/message-trend'),
        api.get('/api/announcements'),
        api.get('/api/user/credits')
      ]);
      setMessages(msgsRes.data);
      setBotStats(statsRes.data);
      setTrendData(trendRes.data);
      setAnnouncements(annRes.data.announcements || []);
      setCredits(creditsRes.data.credits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePurchase = async (amount) => {
    try {
      const response = await api.post('/api/user/create-payment', { amount });
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Payment initiation failed', error);
      alert('Payment service unavailable. Please try again later.');
    }
  };
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const chartData = {
    labels: trendData.labels,
    datasets: [{
      label: 'Messages',
      data: trendData.counts,
      borderColor: '#8B5CF6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      tension: 0.4,
      fill: true,
    }],
  };

  const totalMessages = botStats.reduce((sum, bot) => sum + bot.message_count, 0);
  const totalToxic = botStats.reduce((sum, bot) => sum + bot.toxic_count, 0);
  const toxicRate = totalMessages ? ((totalToxic / totalMessages) * 100).toFixed(1) : 0;

  if (loading) return <Layout title="Dashboard"><div className="text-center py-20">Loading dashboard...</div></Layout>;

  return (
    <Layout title="Dashboard">
      {/* Welcome Section with Credits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {user?.username}!</h1>
            <p className="text-purple-100 mt-1">Monitor your groups and keep them safe.</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Free Credits Remaining</p>
            <p className="text-3xl font-bold">{credits}</p>
            <button
              onClick={() => handlePurchase(100)}
              className="mt-2 bg-white text-purple-600 px-4 py-1 rounded-full text-sm font-semibold hover:bg-gray-100 transition"
            >
              Buy 1000 Credits (100 ETB)
            </button>
          </div>
        </div>
      </motion.div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
          <p className="font-semibold text-yellow-800">📢 Announcement</p>
          {announcements.map((ann, idx) => (
            <p key={idx} className="text-yellow-700">{ann.message}</p>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm uppercase tracking-wide">Total Messages</p>
              <p className="text-3xl font-bold">{totalMessages}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
          </div>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm uppercase tracking-wide">Toxic Messages</p>
              <p className="text-3xl font-bold">{totalToxic}</p>
            </div>
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm uppercase tracking-wide">Toxicity Rate</p>
              <p className="text-3xl font-bold">{toxicRate}%</p>
            </div>
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bot Performance Cards */}
      <h2 className="text-xl font-bold mb-4">🤖 Your Bots Performance</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {botStats.map((bot, idx) => (
          <motion.div
            key={bot.bot_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{bot.username}</h3>
                <p className="text-gray-500 text-sm">ID: {bot.bot_id}</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-semibold ${bot.toxic_rate > 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {bot.toxic_rate.toFixed(1)}% toxic
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-2xl font-bold">{bot.message_count}</p>
                <p className="text-xs text-gray-500">Messages</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-2xl font-bold text-red-600">{bot.toxic_count}</p>
                <p className="text-xs text-gray-500">Toxic</p>
              </div>
            </div>
          </motion.div>
        ))}
        {botStats.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">
            No bots yet. <a href="/user/bots" className="text-purple-600 hover:underline">Create one</a> to start monitoring.
          </div>
        )}
      </div>

      {/* Charts and Recent Messages */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">📈 7-Day Message Trend</h2>
          <Line data={chartData} options={{ responsive: true }} />
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">🕒 Recent Messages</h2>
          <div className="overflow-auto max-h-96">
            <table className="min-w-full">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Time</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Message</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Toxic</th>
                </tr>
              </thead>
              <tbody>
                {messages.slice(0, 10).map(msg => (
                  <tr key={msg.id} className={msg.is_toxic ? 'bg-red-50' : ''}>
                    <td className="text-sm py-2">{new Date(msg.timestamp).toLocaleTimeString()}</td>
                    <td className="text-sm truncate max-w-xs">{msg.text.slice(0, 50)}</td>
                    <td className="text-sm">{msg.is_toxic ? '⚠️ Yes' : '✅ No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => window.location.href = '/api/user/export-logs'}
            className="mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            Export CSV
          </button>
        </div>
      </div>
    </Layout>
  );
}