import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2, Info, X } from 'lucide-react';
import firebaseConfig from '../firebase-applet-config.json';

function DebugInfo() {
  const { user, profile } = useAuth();
  const [show, setShow] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {show ? (
        <div className="bg-white p-6 rounded-3xl shadow-2xl border border-stone-200 max-w-xs animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-bold text-stone-900">Firebase Debug Info</h4>
            <button onClick={() => setShow(false)} className="text-stone-400 hover:text-stone-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <p className="text-stone-400 uppercase font-bold tracking-tighter mb-1">Project ID</p>
              <p className="font-mono bg-stone-50 p-2 rounded-lg break-all">{firebaseConfig.projectId}</p>
            </div>
            <div>
              <p className="text-stone-400 uppercase font-bold tracking-tighter mb-1">Database ID</p>
              <p className="font-mono bg-stone-50 p-2 rounded-lg break-all">{firebaseConfig.firestoreDatabaseId}</p>
            </div>
            <div>
              <p className="text-stone-400 uppercase font-bold tracking-tighter mb-1">Auth Status</p>
              <p className="font-medium">{user ? `✅ Logged in as ${user.email}` : '❌ Not logged in'}</p>
            </div>
            {profile && (
              <div>
                <p className="text-stone-400 uppercase font-bold tracking-tighter mb-1">Profile Role</p>
                <p className="font-medium uppercase">{profile.role}</p>
              </div>
            )}
            <div className="pt-2 border-t border-stone-100">
              <p className="text-[10px] text-stone-400 italic">
                Check browser console (F12) for connection test results.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShow(true)}
          className="w-10 h-10 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        >
          <Info size={20} />
        </button>
      )}
    </div>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-emerald-600 mx-auto mb-4" size={48} />
          <p className="text-stone-500 font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  if (profile.role === 'admin') {
    return <AdminDashboard />;
  }

  return <StudentDashboard />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
        <DebugInfo />
      </AuthProvider>
    </ErrorBoundary>
  );
}
