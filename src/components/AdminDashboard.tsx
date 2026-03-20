import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { CicsDocument, UserProfile, LoginLog, DownloadLog } from '../types';
import { Plus, Trash2, UserX, UserCheck, BarChart3, Users, FileText, LogOut, Search, Loader2, Calendar, Download, TrendingUp, Filter, User, ShieldCheck, Upload, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { format, subDays, subWeeks, subMonths, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

type Tab = 'documents' | 'users' | 'stats';
type StatsPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export function AdminDashboard() {
  const { profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [documents, setDocuments] = useState<CicsDocument[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [downloadLogs, setDownloadLogs] = useState<DownloadLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', description: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Stats states
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('daily');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

    const unsubDocs = onSnapshot(
      query(collection(db, 'documents'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CicsDocument)));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'documents')
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    const unsubLoginLogs = onSnapshot(
      collection(db, 'loginLogs'),
      (snapshot) => {
        console.log('Received login logs:', snapshot.docs.length);
        setLoginLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoginLog)));
      },
      (error) => {
        console.error('Error fetching login logs:', error);
        handleFirestoreError(error, OperationType.LIST, 'loginLogs');
      }
    );

    const unsubDownloadLogs = onSnapshot(
      collection(db, 'downloadLogs'),
      (snapshot) => {
        setDownloadLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DownloadLog)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'downloadLogs')
    );

    return () => {
      unsubDocs();
      unsubUsers();
      unsubLoginLogs();
      unsubDownloadLogs();
    };
  }, [profile]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title || !selectedFile) return;
    
    // Check file size (Firestore limit is 1MB per document)
    if (selectedFile.size > 1024 * 1024) {
      alert('File size exceeds 1MB. Please upload a smaller document.');
      return;
    }

    setUploading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileData = event.target?.result as string;
        
        const docData = {
          ...newDoc,
          url: fileData, // Store base64 data in url field
          uploadedBy: profile?.uid || 'admin',
          createdAt: new Date().toISOString(),
          downloadCount: 0
        };
        
        await addDoc(collection(db, 'documents'), docData);
        setNewDoc({ title: '', description: '' });
        setSelectedFile(null);
        setShowUploadModal(false);
      } catch (error) {
        console.error('Upload failed:', error);
        handleFirestoreError(error, OperationType.CREATE, 'documents');
      } finally {
        setUploading(false);
      }
    };
    
    reader.onerror = () => {
      console.error('File reading failed');
      setUploading(false);
    };
    
    reader.readAsDataURL(selectedFile);
  };

  const toggleBlockStatus = async (user: UserProfile) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { isBlocked: !user.isBlocked });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const toggleAdminRole = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'student' : 'admin';
    const confirmMsg = newRole === 'admin' 
      ? `Are you sure you want to promote ${user.email} to Admin? They will have full access to the management console.`
      : `Are you sure you want to demote ${user.email} to User?`;

    if (!confirm(confirmMsg)) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDoc(doc(db, 'documents', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `documents/${id}`);
    }
  };

  const statsData = useMemo(() => {
    let start = startOfDay(new Date());
    let end = endOfDay(new Date());

    if (statsPeriod === 'weekly') start = subWeeks(start, 1);
    else if (statsPeriod === 'monthly') start = subMonths(start, 1);
    else if (statsPeriod === 'custom' && customRange.start && customRange.end) {
      start = startOfDay(parseISO(customRange.start));
      end = endOfDay(parseISO(customRange.end));
    }

    const interval = { start, end };

    const filteredLogins = loginLogs.filter(log => isWithinInterval(parseISO(log.timestamp), interval));
    const filteredDownloads = downloadLogs.filter(log => isWithinInterval(parseISO(log.timestamp), interval));

    // Group by day for the chart
    const days: Record<string, { date: string, logins: number, downloads: number }> = {};
    let curr = start;
    while (curr <= end) {
      const d = format(curr, 'MMM dd');
      days[d] = { date: d, logins: 0, downloads: 0 };
      curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
    }

    filteredLogins.forEach(log => {
      const d = format(parseISO(log.timestamp), 'MMM dd');
      if (days[d]) days[d].logins++;
    });

    filteredDownloads.forEach(log => {
      const d = format(parseISO(log.timestamp), 'MMM dd');
      if (days[d]) days[d].downloads++;
    });

    return Object.values(days);
  }, [loginLogs, downloadLogs, statsPeriod, customRange]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <Loader2 className="animate-spin text-emerald-600" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-stone-900 tracking-tight">Admin Console</h1>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-[0.2em]">CICS Portal Management</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex gap-1">
                {(['documents', 'users', 'stats'] as Tab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === tab ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'
                    }`}
                  >
                    {tab === 'users' ? 'Users Log In' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <button onClick={logout} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                <LogOut size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeTab === 'documents' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-display font-bold text-stone-900 tracking-tight">Document Library</h2>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl transition-all shadow-lg"
              >
                <Plus size={20} />
                Upload Document
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map(doc => (
                <div key={doc.id} className="group bg-white rounded-[2rem] p-8 border border-stone-100 shadow-sm hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors duration-300">
                      <FileText size={28} />
                    </div>
                    <button onClick={() => handleDeleteDoc(doc.id)} className="p-2 text-stone-300 hover:text-red-500 transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <h3 className="text-xl font-display font-bold text-stone-900 mb-2 tracking-tight">{doc.title}</h3>
                  <p className="text-sm text-stone-500 mb-8 line-clamp-2 leading-relaxed">{doc.description}</p>
                  <div className="flex items-center justify-between pt-6 border-t border-stone-50">
                    <div className="flex items-center gap-2 text-stone-400">
                      <Download size={14} />
                      <span className="text-[10px] uppercase tracking-widest font-bold">{doc.downloadCount} downloads</span>
                    </div>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider">View PDF</a>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-display font-bold text-stone-900 tracking-tight mb-8">Users Log In Management</h2>
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Program</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Last Login</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.map(user => (
                    <tr key={user.uid} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-600">
                            <User size={20} />
                          </div>
                          <span className="font-semibold text-stone-900">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600">{user.program || 'Not set'}</td>
                      <td className="px-6 py-4 text-sm text-stone-500">
                        {user.lastLogin ? format(parseISO(user.lastLogin), 'MMM dd, HH:mm') : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          user.isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {user.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => toggleAdminRole(user)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.role === 'admin' ? 'text-amber-600 hover:bg-amber-50' : 'text-stone-400 hover:bg-stone-100'
                          }`}
                          title={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        >
                          <ShieldAlert size={20} />
                        </button>
                        <button
                          onClick={() => toggleBlockStatus(user)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.isBlocked ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={user.isBlocked ? 'Unblock User' : 'Block User'}
                        >
                          {user.isBlocked ? <UserCheck size={20} /> : <UserX size={20} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h2 className="text-2xl font-bold text-stone-900">Usage Analytics</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-white border border-stone-200 rounded-xl p-1 shadow-sm">
                  {(['daily', 'weekly', 'monthly', 'custom'] as StatsPeriod[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setStatsPeriod(p)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        statsPeriod === p ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {statsPeriod === 'custom' && (
                  <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-1.5 shadow-sm">
                    <input
                      type="date"
                      value={customRange.start}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                      className="text-xs outline-none"
                    />
                    <span className="text-stone-300">→</span>
                    <input
                      type="date"
                      value={customRange.end}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                      className="text-xs outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500 font-medium">Total Users</p>
                    <p className="text-3xl font-bold text-stone-900">{users.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Download size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500 font-medium">Total Downloads</p>
                    <p className="text-3xl font-bold text-stone-900">{downloadLogs.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500 font-medium">Total Logins</p>
                    <p className="text-3xl font-bold text-stone-900">{loginLogs.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
                <h3 className="text-lg font-bold text-stone-900 mb-8">Traffic Overview</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={statsData}>
                      <defs>
                        <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e5e5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="logins" stroke="#10b981" fillOpacity={1} fill="url(#colorLogins)" strokeWidth={3} />
                      <Area type="monotone" dataKey="downloads" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDownloads)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
                <h3 className="text-lg font-bold text-stone-900 mb-6">Recent Logins</h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {loginLogs.length > 0 ? (
                    loginLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10).map(log => {
                      const user = users.find(s => s.uid === log.userId);
                      return (
                        <div key={log.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-stone-400 shadow-sm">
                              <User size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-stone-900">{user?.email || 'Unknown User'}</p>
                              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{user?.role || 'User'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                            {format(parseISO(log.timestamp), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 text-stone-400">
                      <p className="text-sm font-medium">No login activity recorded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold text-stone-900 mb-6">Upload New Document</h3>
                <form onSubmit={handleUpload} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2 uppercase tracking-wider">Title</label>
                    <input
                      type="text"
                      required
                      value={newDoc.title}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="e.g., CICS Curriculum 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2 uppercase tracking-wider">Description</label>
                    <textarea
                      required
                      rows={3}
                      value={newDoc.description}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Brief summary of the document contents..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2 uppercase tracking-wider">Document File</label>
                    <div className="relative">
                      <input
                        type="file"
                        required
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="w-full flex items-center justify-center gap-3 px-4 py-8 bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl cursor-pointer hover:bg-stone-100 hover:border-emerald-500 transition-all group"
                      >
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-stone-400 group-hover:text-emerald-600 shadow-sm transition-colors">
                          <Upload size={24} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-stone-900">
                            {selectedFile ? selectedFile.name : 'Click to select file'}
                          </p>
                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                            {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'PDF, DOC, TXT (Max 1MB)'}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => {
                        setShowUploadModal(false);
                        setSelectedFile(null);
                      }}
                      className="flex-1 py-4 px-6 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-2xl transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Upload'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


