import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('Auth state changed:', currentUser ? `Logged in as ${currentUser.email}` : 'Logged out');
      setUser(currentUser);
      if (currentUser) {
        if (!currentUser.email?.endsWith('@neu.edu.ph')) {
          console.warn('Non-domain email detected, logging out...');
          await signOut(auth);
          alert('Only neu.edu.ph email addresses are allowed.');
          setLoading(false);
          return;
        }

        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          let userDoc;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (e) {
            console.error('Failed to fetch user profile, likely due to permissions:', e);
            // Don't throw here, let the flow continue so we can show a better error in the UI
          }

          if (userDoc?.exists()) {
            const data = userDoc.data() as UserProfile;
            setProfile(data);
            
            // Update last login
            await setDoc(userDocRef, { 
              lastLogin: new Date().toISOString() 
            }, { merge: true });
          } else {
            // Create new profile
            const adminEmails = ['anthonvan.calban@neu.edu.ph', 'jcesperanza@neu.edu.ph'];
            const isDefaultAdmin = currentUser.email ? adminEmails.includes(currentUser.email) : false;
            
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              role: isDefaultAdmin ? 'admin' : 'student',
              isBlocked: false,
              lastLogin: new Date().toISOString()
            };
            
            console.log('Creating new profile for:', currentUser.email);
            try {
              await setDoc(userDocRef, newProfile);
              setProfile(newProfile);
            } catch (e) {
              console.error('Failed to create user profile:', e);
            }
          }

          // Check if documents collection is empty and add sample documents
          // This runs for both new and existing users to ensure the library is populated
          try {
            const docsRef = collection(db, 'documents');
            const docsSnapshot = await getDocs(query(docsRef, limit(1)));
            if (docsSnapshot.empty) {
              console.log('Adding sample documents...');
              const sampleDocs = [
                {
                  title: 'CICS Curriculum 2024',
                  description: 'Complete curriculum for BSCS, BSIT, and BSIS programs for the academic year 2024-2025.',
                  url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                  uploadedBy: 'system',
                  createdAt: new Date().toISOString(),
                  downloadCount: 0,
                  category: 'Curriculum'
                },
                {
                  title: 'Student Handbook 2024',
                  description: 'Official student handbook containing rules, regulations, and academic policies of the university.',
                  url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                  uploadedBy: 'system',
                  createdAt: new Date().toISOString(),
                  downloadCount: 0,
                  category: 'Handbook'
                },
                {
                  title: 'Graduation Requirements',
                  description: 'Checklist of requirements for graduating students in the CICS department.',
                  url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                  uploadedBy: 'system',
                  createdAt: new Date().toISOString(),
                  downloadCount: 0,
                  category: 'Requirements'
                }
              ];
              for (const docData of sampleDocs) {
                await addDoc(docsRef, docData);
              }
              console.log('Sample documents added successfully');
            }
          } catch (e) {
            console.error('Failed to add sample documents:', e);
          }

          // Log login
          try {
            const logPath = 'loginLogs';
            await addDoc(collection(db, logPath), {
              userId: currentUser.uid,
              timestamp: new Date().toISOString()
            });
          } catch (e) {
            console.error('Failed to log login:', e);
          }
        } catch (error) {
          console.error('Auth sync error:', error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, data, { merge: true });
      setProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
