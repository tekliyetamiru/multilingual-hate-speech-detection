import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import Layout from '../../components/Layout';
import api from '../../lib/api';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await api.get('/api/user/api-keys');
      setKeys(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      await api.post('/api/user/api-keys', { name });
      setName('');
      await fetchKeys();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteKey = async (id) => {
    if (confirm('Delete this API key?')) {
      try {
        await api.delete(`/api/user/api-keys/${id}`);
        await fetchKeys();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <ProtectedRoute>
      <Layout title="API Keys">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">Create New API Key</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Key Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Creating...' : 'Create Key'}
              </button>
            </form>
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">Your API Keys</h2>
            {keys.length === 0 ? (
              <p className="text-gray-500">No API keys created yet.</p>
            ) : (
              <div className="space-y-4">
                {keys.map(key => (
                  <div key={key.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{key.name}</h3>
                        <p className="text-sm text-gray-500 font-mono">{key.key}</p>
                        <p className="text-xs text-gray-400">Created: {new Date(key.created_at).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => deleteKey(key.id)} className="text-red-500 hover:text-red-700">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}