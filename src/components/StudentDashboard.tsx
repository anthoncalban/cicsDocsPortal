import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { CicsDocument } from '../types';
import { Search, Download, FileText, GraduationCap, LogOut, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const PROGRAMS = [
  'BS Computer Science',
  'BS Information Technology',
  'BS Information Systems',
  'Associate in Computer Technology'
];

export function StudentDashboard() {
  const { profile, logout, updateProfile } = useAuth();
  const [documents, setDocuments] = useState<CicsDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState('');

  useEffect(() => {
    if (!profile) return;

    const unsub = onSnapshot(
      query(collection(db, 'documents'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CicsDocument)));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'documents')
    );

    return () => unsub();
  }, [profile]);

  const handleProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) return;
    await updateProfile({ program: selectedProgram });
  };

  const handleDownload = async (docData: CicsDocument) => {
    if (profile?.isBlocked) return;
    
    try {
      // Log download
      await addDoc(collection(db, 'downloadLogs'), {
        userId: profile?.uid,
        documentId: docData.id,
        timestamp: new Date().toISOString()
      });

      // Update document download count
      const docRef = doc(db, 'documents', docData.id);
      await updateDoc(docRef, {
        downloadCount: increment(1)
      });

      // In a real app, we would trigger the actual file download here
      window.open(docData.url, '_blank');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'downloadLogs');
    }
  };

  if (profile?.isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-red-100 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
              <AlertCircle size={48} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Account Blocked</h1>
          <p className="text-stone-500 mb-8">Your account has been restricted. Please contact the CICS administrator for assistance.</p>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-2xl transition-all"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (!profile?.program) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-stone-200"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <GraduationCap size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-stone-900 mb-2 text-center tracking-tight">Welcome to CICS Portal</h1>
          <p className="text-stone-500 mb-8 text-center font-medium">Please select your undergraduate program to continue.</p>

          <form onSubmit={handleProgramSubmit} className="space-y-6">
            <div className="space-y-3">
              {PROGRAMS.map(program => (
                <label
                  key={program}
                  className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedProgram === program ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-stone-100 hover:border-stone-200 text-stone-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="program"
                    value={program}
                    checked={selectedProgram === program}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="hidden"
                  />
                  <span className="font-medium">{program}</span>
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={!selectedProgram}
              className="w-full py-4 px-6 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all shadow-lg"
            >
              Get Started
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <FileText size={24} />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-stone-900 tracking-tight">CICS Portal</h1>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-[0.2em]">{profile.program}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-stone-900">{profile.email}</span>
                <span className="text-xs text-stone-500">Student Account</span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                title="Logout"
              >
                <LogOut size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-12">
          <h2 className="text-4xl font-display font-bold text-stone-900 mb-2 tracking-tight">Academic Repository</h2>
          <p className="text-stone-500 font-medium italic">Access official documents for your program</p>
        </div>

        <div className="mb-10">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              placeholder="Search documents by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-stone-900"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-medium">Loading documents...</p>
          </div>
        ) : filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredDocs.map(doc => (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group bg-white rounded-[2rem] p-8 border border-stone-100 shadow-sm hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-300"
                >
                  <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 mb-6 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors duration-300">
                    <FileText size={28} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-stone-900 mb-2 tracking-tight line-clamp-1">{doc.title}</h3>
                  <p className="text-sm text-stone-500 mb-8 line-clamp-2 leading-relaxed h-10">{doc.description}</p>
                  <div className="flex items-center justify-between pt-6 border-t border-stone-50">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex items-center gap-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 active:scale-95"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center text-stone-300 mx-auto mb-6">
              <Search size={40} />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">No documents found</h3>
            <p className="text-stone-500">Try adjusting your search terms or check back later.</p>
          </div>
        )}
      </main>
    </div>
  );
}
