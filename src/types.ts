export type UserRole = 'admin' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  program?: string;
  isBlocked?: boolean;
  lastLogin?: string;
}

export interface CicsDocument {
  id: string;
  title: string;
  description: string;
  url: string;
  uploadedBy: string;
  createdAt: string;
  downloadCount: number;
  category?: string;
  program?: string;
}

export interface DownloadLog {
  id: string;
  userId: string;
  documentId: string;
  timestamp: string;
}

export interface LoginLog {
  id: string;
  userId: string;
  timestamp: string;
}
