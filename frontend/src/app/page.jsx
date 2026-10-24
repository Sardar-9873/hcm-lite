'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import API from '../lib/api';

export default function HomePage() {
  const router = useRouter();
  const [statusText, setStatusText] = useState('Checking system status...');

  useEffect(() => {
    async function checkSystem() {
      try {
        // 1. Check karein ke kya first-run setup ho chuka hai ya nahi
        const res = await API.get('/setup/first-run');
        
        if (res.data.firstRun) {
          // Agar system bilkul naya hai toh /setup par bhej do
          router.replace('/setup');
          return;
        }

        // 2. Agar setup ho chuka hai, check karein user logged in hai ya nahi
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          router.replace('/login');
          return;
        }

        // 3. Agar logged in hai toh uske role ke mutabiq dashboard par redirect karein
        const user = JSON.parse(storedUser);
        if (user.role === 'Admin') {
          router.replace('/admin');
        } else if (user.role === 'HR') {
          router.replace('/hr');
        } else {
          router.replace('/employee');
        }
      } catch (err) {
        setStatusText('Backend server is offline or unreachable. Please start backend on port 5000.');
      }
    }

    checkSystem();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        {/* Loading Spinner */}
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        
        <h1 className="text-2xl font-bold tracking-tight">HCM Lite</h1>
        <p className="text-sm text-slate-400">{statusText}</p>

        {/* Manual navigation buttons agar backend off ho */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-medium rounded-lg"
          >
            Go to Login
          </button>
          <button
            onClick={() => router.push('/setup')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg border border-slate-700"
          >
            Go to First-Run Setup
          </button>
        </div>
      </div>
    </div>
  );
}