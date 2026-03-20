import React from 'react';
import { useAuth } from './AuthContext';
import { LogIn, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-stone-200/50 p-12 border border-stone-100 text-center"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <ShieldCheck size={32} />
          </div>
        </div>
        
        <h1 className="text-4xl font-display font-bold text-stone-900 mb-10 tracking-tight">
          CICS Portal
        </h1>

        <div className="space-y-6">
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 py-4 px-8 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-2xl transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] group"
          >
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
            Sign in with Google
          </button>
          
          <div className="flex items-center gap-2 px-2">
            <div className="h-[1px] flex-1 bg-stone-100" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400">
              @neu.edu.ph only
            </span>
            <div className="h-[1px] flex-1 bg-stone-100" />
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-stone-50 flex items-center justify-center gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-stone-600">Operational</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-1">Version</p>
            <span className="text-xs font-medium text-stone-600">v2.4.0</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
