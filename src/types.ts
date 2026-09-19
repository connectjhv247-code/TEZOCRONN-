export interface UserPrivacySettings {
  emailVisibility: 'public' | 'related' | 'private';
  bioVisibility: 'public' | 'related' | 'private';
  showRelateStatus: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  location?: string;
  createdAt: string;
  role: string;
  privacySettings?: UserPrivacySettings;
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  category: string;
  dueDate?: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  category: string;
  ownerId: string;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  authorPhotoURL?: string;
  content: string;
  likes: string[]; // array of user UIDs
  relatesCount: number;
  createdAt: string;
  attachmentType?: 'image' | 'file';
  attachmentUrl?: string; // Data URL or storage link
  attachmentName?: string;
  attachmentSize?: string;
}

export interface RelateItem {
  id: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  thought: string;
  category: string;
  supportCount: number;
  supporters: string[]; // array of user UIDs
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientEmail: string;
  participants: string[]; // [senderId, recipientId] or user identifiers for secure query
  text: string;
  createdAt: string;
  read: boolean;
  attachmentType?: 'image' | 'file';
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: string;
}

export interface Relationship {
  id: string;
  userId: string; // The user who related
  targetUserId: string; // The target user related to
  targetUserName?: string;
  targetUserEmail?: string;
  createdAt: string;
}

export type NotificationType = 'relate' | 'dm' | 'system';

export interface AppNotification {
  id: string;
  recipientUid: string;
  senderUid: string;
  senderName?: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  targetUid?: string;
}

