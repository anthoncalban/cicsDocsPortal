import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, getDocFromServer, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
console.log('Initializing Firebase with Project ID:', firebaseConfig.projectId);
console.log('Using Firestore Database ID:', firebaseConfig.firestoreDatabaseId);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore - use default if ID is '(default)' or missing
const databaseId = firebaseConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseConfig.firestoreDatabaseId;
export const db = getFirestore(app, databaseId);
export const googleProvider = new GoogleAuthProvider();

// Restrict to neu.edu.ph domain and prompt for account selection
googleProvider.setCustomParameters({
  hd: 'neu.edu.ph',
  prompt: 'select_account'
});

async function testConnection() {
  console.log('Testing Firestore connection...');
  try {
    // Try to write a small test document to confirm write access
    const testRef = doc(db, 'connection_tests', 'last_test');
    await setDoc(testRef, {
      timestamp: new Date().toISOString(),
      message: 'Connection test from app'
    });
    console.log('✅ Firestore connection test successful! Data was written to "connection_tests" collection.');
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("CRITICAL: The client is offline. This usually means the Firestore Database ID or Project ID in firebase-applet-config.json is incorrect or the database hasn't been provisioned yet.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
