import Head from 'next/head';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function Layout({ children, title = 'ToxiGuard' }) {
  const { user } = useAuth();
  const isDashboard = user && (user.role === 'user' || user.role === 'admin');

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="AI-powered multilingual toxicity detection" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {!isDashboard ? (
        <>
          <Navbar />
          <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="container mx-auto px-4 py-8">{children}</div>
          </main>
        </>
      ) : (
        <div className="flex">
          <Sidebar />
          <div className="flex-1 ml-0 transition-all duration-300" style={{ marginLeft: 256 }}>
            <main className="min-h-screen bg-gray-100 p-6">{children}</main>
          </div>
        </div>
      )}
      <footer className="bg-gray-800 text-white text-center py-4 mt-8">
        <p>&copy; {new Date().getFullYear()} ToxiGuard – AI‑Powered Multilingual Toxicity Detection</p>
      </footer>
    </>
  );
}