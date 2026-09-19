import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { saveUserProfileInDb, subscribeToUserProfileDb } from '../lib/userProfileService';
import { sendNotification } from '../lib/notificationService';
import { blockUser, unblockUser, subscribeToUserBlocks } from '../lib/blockService';
import { UserProfile, UserPrivacySettings, Relationship } from '../types';
import { modalZoomVariants, backdropVariants } from './PageTransition';
import { 
  X, 
  User as UserIcon, 
  Mail, 
  Calendar, 
  HeartHandshake, 
  UserCheck, 
  UserPlus, 
  Edit3, 
  Lock, 
  Eye, 
  EyeOff, 
  Globe, 
  Users, 
  Upload, 
  Trash2, 
  Check, 
  AlertCircle, 
  MessageCircle, 
  ShieldCheck, 
  ShieldAlert,
  MapPin, 
  Sparkles,
  Camera
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  onNavigateToDM?: (recipientIdentifier: string) => void;
  onProfileUpdated?: (updatedProfile: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentUserId,
  currentUserName,
  currentUserEmail,
  onNavigateToDM,
  onProfileUpdated,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPrivacy, setEditPrivacy] = useState<UserPrivacySettings>({
    emailVisibility: 'related',
    bioVisibility: 'public',
    showRelateStatus: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Relate state for this specific profile
  const [myRelationship, setMyRelationship] = useState<Relationship | null>(null);
  const [incomingRelationship, setIncomingRelationship] = useState<Relationship | null>(null);
  const [totalRelatesTo, setTotalRelatesTo] = useState<number>(0);
  const [totalRelatesFrom, setTotalRelatesFrom] = useState<number>(0);
  const [isRelateActionBusy, setIsRelateActionBusy] = useState(false);

  // Block state
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const [blockedByUids, setBlockedByUids] = useState<string[]>([]);
  const [isBlockActionBusy, setIsBlockActionBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = useMemo(() => {
    return Boolean(userId && currentUserId && userId === currentUserId);
  }, [userId, currentUserId]);

  // Subscribe to real-time blocks
  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    const unsubBlocks = subscribeToUserBlocks(currentUserId, ({ blockedUids: bu, blockedByUids: bbu }) => {
      setBlockedUids(bu);
      setBlockedByUids(bbu);
    });
    return () => unsubBlocks();
  }, [isOpen, currentUserId]);

  const isBlockedByMe = useMemo(() => Boolean(userId && blockedUids.includes(userId)), [userId, blockedUids]);
  const hasBlockedMe = useMemo(() => Boolean(userId && blockedByUids.includes(userId)), [userId, blockedByUids]);
  const isInteractionRestricted = useMemo(() => isBlockedByMe || hasBlockedMe, [isBlockedByMe, hasBlockedMe]);

  // 1. Fetch live target user profile from Firestore with privacy filtering database function
  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null);
      setIsEditing(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToUserProfileDb(
      currentUserId,
      userId,
      (sanitizedData, isRel) => {
        setProfile(sanitizedData);
        
        // Pre-populate edit form state if not already actively editing
        if (!isEditing) {
          setEditDisplayName(sanitizedData.displayName || '');
          setEditPhotoURL(sanitizedData.photoURL || '');
          setEditBio(sanitizedData.bio || '');
          setEditLocation(sanitizedData.location || '');
          setEditPrivacy(sanitizedData.privacySettings || {
            emailVisibility: 'related',
            bioVisibility: 'public',
            showRelateStatus: true,
          });
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, userId, currentUserId]);

  // 2. Fetch Relate relationships between current user and target user
  useEffect(() => {
    if (!isOpen || !userId || !currentUserId) return;

    // Check if current user relates to target user
    const myRelQuery = query(
      collection(db, 'relationships'),
      where('userId', '==', currentUserId),
      where('targetUserId', '==', userId)
    );
    const unsubMy = onSnapshot(myRelQuery, (snap) => {
      if (!snap.empty) {
        setMyRelationship({ id: snap.docs[0].id, ...snap.docs[0].data() } as Relationship);
      } else {
        setMyRelationship(null);
      }
    });

    // Check if target user relates to current user
    const incomingRelQuery = query(
      collection(db, 'relationships'),
      where('userId', '==', userId),
      where('targetUserId', '==', currentUserId)
    );
    const unsubIncoming = onSnapshot(incomingRelQuery, (snap) => {
      if (!snap.empty) {
        setIncomingRelationship({ id: snap.docs[0].id, ...snap.docs[0].data() } as Relationship);
      } else {
        setIncomingRelationship(null);
      }
    });

    // Also fetch target user's total relate counts
    const outTotalQuery = query(collection(db, 'relationships'), where('userId', '==', userId));
    const unsubOut = onSnapshot(outTotalQuery, (snap) => {
      setTotalRelatesTo(snap.size);
    });

    const inTotalQuery = query(collection(db, 'relationships'), where('targetUserId', '==', userId));
    const unsubIn = onSnapshot(inTotalQuery, (snap) => {
      setTotalRelatesFrom(snap.size);
    });

    return () => {
      unsubMy();
      unsubIncoming();
      unsubOut();
      unsubIn();
    };
  }, [isOpen, userId, currentUserId]);

  const isRelated = Boolean(myRelationship);
  const relatesToMe = Boolean(incomingRelationship);
  const isMutual = isRelated && relatesToMe;

  // 3. Privacy evaluations
  const canViewEmail = useMemo(() => {
    if (isOwner) return true;
    const setting = profile?.privacySettings?.emailVisibility || 'related';
    if (setting === 'public') return true;
    if (setting === 'related') return isRelated || isMutual;
    return false; // 'private'
  }, [isOwner, profile?.privacySettings?.emailVisibility, isRelated, isMutual]);

  const canViewBio = useMemo(() => {
    if (isOwner) return true;
    const setting = profile?.privacySettings?.bioVisibility || 'public';
    if (setting === 'public') return true;
    if (setting === 'related') return isRelated || isMutual;
    return false; // 'private'
  }, [isOwner, profile?.privacySettings?.bioVisibility, isRelated, isMutual]);

  const showRelateStatsToViewer = useMemo(() => {
    if (isOwner) return true;
    const emailSetting = profile?.privacySettings?.emailVisibility;
    const bioSetting = profile?.privacySettings?.bioVisibility;
    if (emailSetting === 'private' && bioSetting === 'private') return false;
    if ((emailSetting === 'related' || bioSetting === 'related') && !(isRelated || isMutual)) return false;
    return profile?.privacySettings?.showRelateStatus ?? true;
  }, [isOwner, profile?.privacySettings?.emailVisibility, profile?.privacySettings?.bioVisibility, profile?.privacySettings?.showRelateStatus, isRelated, isMutual]);

  // Handle image upload with auto downscaling for efficient direct Firestore persistence
  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFileError('Please select a valid image file (PNG, JPEG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('Image is too large. Please choose a photo under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress and scale to max 320x320 for instant load and lightweight Firestore doc size
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setEditPhotoURL(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Relate / Unrelate action from profile
  const handleToggleRelate = async () => {
    if (!userId || !currentUserId || isOwner) return;
    if (isInteractionRestricted) {
      setError('Cannot connect with this member because account interaction has been restricted.');
      return;
    }
    setIsRelateActionBusy(true);
    setError(null);

    const docId = `${currentUserId}_${userId}`;
    try {
      if (isRelated) {
        await deleteDoc(doc(db, 'relationships', docId));
      } else {
        const senderNameResolved = currentUserName || auth.currentUser?.displayName || currentUserEmail.split('@')[0];

        // 1. Save relationship document in Firebase
        await setDoc(doc(db, 'relationships', docId), {
          id: docId,
          userId: currentUserId,
          targetUserId: userId,
          targetUserName: profile?.displayName || profile?.email.split('@')[0] || 'Member',
          targetUserEmail: profile?.email || '',
          createdAt: new Date().toISOString(),
        });

        // 2. Send real event notification to target user with customId to prevent duplicate notifications
        await sendNotification({
          recipientUid: userId,
          senderUid: currentUserId,
          senderName: senderNameResolved,
          type: 'relate',
          title: 'New Relate Connection',
          body: `${senderNameResolved} connected with you on TEZOCRON Relate.`,
          targetUid: currentUserId,
          customId: `relate_${currentUserId}_${userId}`,
        }).catch(err => console.warn('Notification send warning:', err));
      }
    } catch (err) {
      console.error('Relate toggle error:', err);
      setError('Could not update connection. Please try again.');
      try {
        handleFirestoreError(err, isRelated ? OperationType.DELETE : OperationType.CREATE, `relationships/${docId}`);
      } catch {
        // Handled
      }
    } finally {
      setIsRelateActionBusy(false);
    }
  };

  // Handle Block / Unblock action
  const handleToggleBlock = async () => {
    if (!userId || !currentUserId || isOwner) return;
    setIsBlockActionBusy(true);
    setError(null);

    try {
      if (isBlockedByMe) {
        await unblockUser(currentUserId, userId);
      } else {
        await blockUser(currentUserId, userId);
      }
    } catch (err) {
      console.error('Block toggle error:', err);
      setError('Failed to update block status. Please try again.');
    } finally {
      setIsBlockActionBusy(false);
    }
  };

  // Handle saving profile updates to Firebase using saveUserProfileInDb database function
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !currentUserId) return;
    if (!editDisplayName.trim()) {
      setError('Please enter a display name.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    const updatedData: Partial<UserProfile> = {
      displayName: editDisplayName.trim(),
      photoURL: editPhotoURL.trim(),
      bio: editBio.trim(),
      location: editLocation.trim(),
      privacySettings: editPrivacy,
    };

    try {
      // Execute database function to save profile changes & propagate display name across posts
      const savedProfile = await saveUserProfileInDb(currentUserId, updatedData);

      setProfile(savedProfile);
      if (onProfileUpdated) {
        onProfileUpdated(savedProfile);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to update profile in Firebase:', err);
      setError('Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      id="user-profile-modal-backdrop"
      onClick={onClose}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={backdropVariants}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <motion.div 
        id="user-profile-card"
        onClick={(e) => e.stopPropagation()}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={modalZoomVariants}
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-7 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl relative my-auto overflow-hidden"
      >
        {/* Decorative TEZOCRON Top Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-pink-500 to-blue-400" />

        {/* Header with Close and Edit Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-pink-500 p-0.5 shadow-xs flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-white dark:bg-zinc-900 flex items-center justify-center">
                <span className="font-black text-xs bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                  TZ
                </span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                {isOwner ? 'Your TEZOCRON Profile' : 'Member Profile'}
              </h3>
              <p className="text-[10px] text-zinc-400">
                Authentic Firebase Verified Account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isOwner && !isEditing && (
              <button
                type="button"
                id="btn-edit-profile-trigger"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-blue-50 to-pink-50 hover:from-blue-100 hover:to-pink-100 dark:from-blue-950/60 dark:to-pink-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Edit Profile</span>
              </button>
            )}

            <button
              type="button"
              id="btn-close-profile-modal"
              onClick={onClose}
              className="p-2 rounded-2xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Close profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alerts and notifications */}
        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {saveSuccess && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Profile information updated in Firebase!</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-2 text-zinc-400 text-xs">
            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <p>Loading profile from Firebase...</p>
          </div>
        ) : !profile ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No profile information available.
          </div>
        ) : isEditing ? (
          /* ========================================================================= */
          /* EDIT PROFILE FORM                                                        */
          /* ========================================================================= */
          <form onSubmit={handleSaveProfile} className="mt-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Edit Your Profile
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Update your identity, personal photo, and privacy preferences.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Profile Picture Upload Container */}
            <div className="p-4 rounded-3xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group shrink-0">
                {editPhotoURL ? (
                  <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-pink-500 shadow-md">
                    <img 
                      src={editPhotoURL} 
                      alt="Profile preview" 
                      className="w-full h-full object-cover rounded-3xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-blue-500 to-pink-500 p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full rounded-[22px] bg-white dark:bg-zinc-900 flex items-center justify-center text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-pink-600">
                      {editDisplayName ? editDisplayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </div>
                )}
                
                {/* Upload overlay button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white cursor-pointer"
                  title="Upload photo"
                >
                  <Camera className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Profile Picture
                </p>
                <p className="text-[10px] text-zinc-400">
                  Upload an authentic photo from your device. No placeholder stock photos allowed.
                </p>
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:border-pink-500 hover:text-pink-600 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>

                  {editPhotoURL && (
                    <button
                      type="button"
                      onClick={() => setEditPhotoURL('')}
                      className="px-3 py-1.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer"
                      title="Remove profile picture"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileSelect}
                  className="hidden"
                />

                {fileError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{fileError}</p>
                )}
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label htmlFor="edit-profile-name" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Name <span className="text-pink-600">*</span>
              </label>
              <input
                type="text"
                id="edit-profile-name"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Bio / Motto Input */}
            <div>
              <label htmlFor="edit-profile-bio" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Bio / About Me
              </label>
              <textarea
                id="edit-profile-bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Write a brief intro about yourself..."
                rows={2}
                maxLength={180}
                className="w-full px-4 py-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
              />
              <div className="flex justify-end text-[10px] text-zinc-400 mt-0.5">
                {editBio.length}/180
              </div>
            </div>

            {/* Location Input */}
            <div>
              <label htmlFor="edit-profile-location" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Location (Optional)
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  id="edit-profile-location"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA or London, UK"
                  className="w-full pl-9 pr-4 py-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Privacy Settings Section */}
            <div className="p-4 rounded-3xl bg-blue-50/40 dark:bg-zinc-800/60 border border-blue-100 dark:border-zinc-700/80 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-100 dark:border-zinc-700">
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Profile Details Visibility & Privacy
                </h5>
              </div>

              {/* Profile Details Visibility Options */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Who can view your profile details (email, bio, location, & stats)?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPrivacy({ emailVisibility: 'public', bioVisibility: 'public', showRelateStatus: true })}
                    className={`py-2 px-2.5 rounded-2xl text-[11px] font-bold border transition text-center cursor-pointer ${
                      editPrivacy.emailVisibility === 'public' && editPrivacy.bioVisibility === 'public'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    Public
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPrivacy({ emailVisibility: 'related', bioVisibility: 'related', showRelateStatus: true })}
                    className={`py-2 px-2.5 rounded-2xl text-[11px] font-bold border transition text-center cursor-pointer ${
                      editPrivacy.emailVisibility === 'related' || editPrivacy.bioVisibility === 'related'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    Related Only
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPrivacy({ emailVisibility: 'private', bioVisibility: 'private', showRelateStatus: false })}
                    className={`py-2 px-2.5 rounded-2xl text-[11px] font-bold border transition text-center cursor-pointer ${
                      editPrivacy.emailVisibility === 'private' && editPrivacy.bioVisibility === 'private'
                        ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 border-zinc-800 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    Private
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5 leading-snug">
                  {editPrivacy.emailVisibility === 'public' && editPrivacy.bioVisibility === 'public' && 'Your profile details (email, bio, location) are visible to all members.'}
                  {(editPrivacy.emailVisibility === 'related' || editPrivacy.bioVisibility === 'related') && 'Your profile details are visible strictly to members connected via Relate.'}
                  {editPrivacy.emailVisibility === 'private' && editPrivacy.bioVisibility === 'private' && 'Your profile details are private and visible only to you.'}
                </p>
              </div>

              {/* Relate Status Visibility Toggle */}
              <div className="pt-2 border-t border-blue-100/60 dark:border-zinc-700/60 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                    Display Relate Connections Count
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    Show how many members you relate with on your profile
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="toggle-edit-relate-status"
                  checked={editPrivacy.showRelateStatus}
                  onChange={(e) => setEditPrivacy((p) => ({ ...p, showRelateStatus: e.target.checked }))}
                  className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-profile"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-pink-600 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 hover:opacity-95 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Saving to Firebase...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================================= */
          /* PROFILE DISPLAY VIEW                                                     */
          /* ========================================================================= */
          <div className="mt-5 space-y-6">
            
            {/* Top Identity Block: Profile Picture, Name, Badges */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              
              {/* Rounded Profile Picture Container */}
              <div className="relative shrink-0">
                {profile.photoURL && profile.photoURL.startsWith('http') || (profile.photoURL && profile.photoURL.startsWith('data:image')) ? (
                  <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-pink-500/80 shadow-md">
                    <img 
                      src={profile.photoURL} 
                      alt={profile.displayName} 
                      className="w-full h-full object-cover rounded-3xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-blue-500 to-pink-500 p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full rounded-[22px] bg-white dark:bg-zinc-900 flex items-center justify-center text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-pink-600">
                      {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : profile.email.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}

                {/* Verified Account Badge */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-xs" title="Firebase Verified Member">
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              {/* Name, Role & Member Badges */}
              <div className="text-center sm:text-left flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                    {profile.displayName || 'TEZOCRON Member'}
                  </h3>

                  {isOwner && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-400">
                      You
                    </span>
                  )}
                </div>

                {/* Role and Location */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400 border border-pink-200/60 dark:border-pink-900/60">
                    {profile.role || 'Member'}
                  </span>
                  {profile.location && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-zinc-400" />
                      <span>{profile.location}</span>
                    </span>
                  )}
                </div>

                {/* Relate Status Badge */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {isOwner ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-50 to-pink-50 dark:from-blue-950/40 dark:to-pink-950/40 border border-blue-200/60 dark:border-blue-900/60 text-blue-700 dark:text-blue-300">
                      <HeartHandshake className="w-3.5 h-3.5 text-pink-500" />
                      <span>Verified Profile</span>
                    </span>
                  ) : isMutual ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-bold bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-400 border border-pink-200 dark:border-pink-900/80 shadow-xs">
                      <HeartHandshake className="w-3.5 h-3.5 text-pink-600" />
                      <span>Mutual Relate</span>
                    </span>
                  ) : isRelated ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-900/80 shadow-xs">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>You Relate</span>
                    </span>
                  ) : relatesToMe ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-900/80 shadow-xs">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span>Relates to You</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      <UserPlus className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Not Related Yet</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Relate Stats Container (Rounded Card) */}
            {showRelateStatsToViewer && (
              <div className="grid grid-cols-2 gap-3 p-4 rounded-3xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                    {isOwner ? 'You Relate To' : 'Relates To'}
                  </span>
                  <span className="text-base font-black text-blue-600 dark:text-blue-400">
                    {totalRelatesTo}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                    {isOwner ? 'Relating To You' : 'Related By'}
                  </span>
                  <span className="text-base font-black text-pink-600 dark:text-pink-400">
                    {totalRelatesFrom}
                  </span>
                </div>
              </div>
            )}

            {/* Restricted Interaction Banner */}
            {isInteractionRestricted && !isOwner && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 shadow-xs">
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    Account Interaction Restricted
                  </p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 leading-snug">
                    {isBlockedByMe 
                      ? 'You have blocked this member. Unblock them to restore messaging and Relate features.'
                      : 'Interactions between your account and this member are currently restricted.'}
                  </p>
                </div>
              </div>
            )}

            {/* Profile Information List (Subject to App Privacy Settings) */}
            <div className="space-y-3">
              
              {/* Email Address Block with Privacy Enforcement */}
              <div className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Email Address
                    </p>
                    
                    {canViewEmail ? (
                      /* Permitted to view email */
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate select-all">
                        {profile.email}
                      </p>
                    ) : (
                      /* Restricted by user privacy setting */
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          <Lock className="w-3.5 h-3.5 text-pink-500" />
                          <span>Hidden per member privacy settings</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-snug">
                          {profile.privacySettings?.emailVisibility === 'related' 
                            ? 'This member only shares their email with members who Relate to them.'
                            : 'This member has set their email address to private.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Privacy Badge */}
                <div className="shrink-0">
                  {canViewEmail ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                      Visible
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Protected</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Bio / About Block */}
              {profile.bio && (
                <div className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1">
                    About
                  </p>
                  {canViewBio ? (
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {profile.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 italic flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-zinc-400" />
                      <span>Bio hidden per user privacy preferences.</span>
                    </p>
                  )}
                </div>
              )}

              {/* Member Since Date */}
              <div className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Member Since
                  </p>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : 'Verified Account'}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Action Buttons (Relate / Unrelate / Direct Message / Edit) */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              {isOwner ? (
                /* Owner Action: Edit Profile */
                <button
                  type="button"
                  id="btn-edit-profile-action"
                  onClick={() => setIsEditing(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-pink-600 hover:opacity-95 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile & Privacy</span>
                </button>
              ) : (
                /* Non-Owner Actions: Relate / Unrelate & Send DM & Block */
                <>
                  {isRelated ? (
                    <button
                      type="button"
                      id="btn-profile-unrelate"
                      disabled={isRelateActionBusy || isInteractionRestricted}
                      onClick={handleToggleRelate}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-2xl border border-pink-200 dark:border-pink-900/70 bg-pink-50 hover:bg-rose-50 text-pink-700 hover:text-rose-700 dark:bg-pink-950/40 dark:text-pink-300 text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      <UserCheck className="w-4 h-4 text-pink-600" />
                      <span>{isRelateActionBusy ? 'Updating...' : 'Unrelate'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="btn-profile-relate"
                      disabled={isRelateActionBusy || isInteractionRestricted}
                      onClick={handleToggleRelate}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-pink-600 hover:opacity-95 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{isRelateActionBusy ? 'Updating...' : 'Relate'}</span>
                    </button>
                  )}

                  {onNavigateToDM && (
                    <button
                      type="button"
                      id="btn-profile-send-dm"
                      disabled={isInteractionRestricted}
                      onClick={() => {
                        if (isInteractionRestricted) return;
                        onClose();
                        onNavigateToDM(profile.email || profile.uid);
                      }}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Send Direct Message</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id="btn-profile-toggle-block"
                    disabled={isBlockActionBusy}
                    onClick={handleToggleBlock}
                    className={`py-2.5 px-4 rounded-2xl border text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                      isBlockedByMe 
                        ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/60 dark:border-rose-900/80 dark:text-rose-300 hover:bg-rose-100' 
                        : 'bg-zinc-100 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>{isBlockActionBusy ? 'Updating...' : isBlockedByMe ? 'Unblock Member' : 'Block Member'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
