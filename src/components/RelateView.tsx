import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where,
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Relationship } from '../types';
import { sendNotification } from '../lib/notificationService';
import { subscribeToUserBlocks } from '../lib/blockService';
import { 
  HeartHandshake, 
  Search, 
  X, 
  UserCheck, 
  UserPlus, 
  ShieldCheck, 
  MessageCircle, 
  Sparkles, 
  AlertCircle,
  Users,
  CheckCircle2,
  Calendar,
  ExternalLink
} from 'lucide-react';

interface RelateViewProps {
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  onNavigateToDM?: (recipientIdentifier: string) => void;
  onOpenProfile?: (userId: string) => void;
}

type RelateFilterTab = 'all' | 'related' | 'incoming';

export const RelateView: React.FC<RelateViewProps> = ({
  currentUserId,
  currentUserName,
  currentUserEmail,
  onNavigateToDM,
  onOpenProfile,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [myRelationships, setMyRelationships] = useState<Relationship[]>([]);
  const [incomingRelationships, setIncomingRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<RelateFilterTab>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Block state
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const [blockedByUids, setBlockedByUids] = useState<string[]>([]);

  // Subscribe to real-time block relationships
  useEffect(() => {
    const activeUid = auth.currentUser?.uid || currentUserId;
    if (!activeUid || !auth.currentUser) return;

    const unsubBlocks = subscribeToUserBlocks(activeUid, ({ blockedUids: bu, blockedByUids: bbu }) => {
      setBlockedUids(bu);
      setBlockedByUids(bbu);
    });

    return () => unsubBlocks();
  }, [currentUserId]);

  // 1. Fetch real Firebase users from Firestore
  useEffect(() => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);

    // Listen to real users collection in Firebase
    const usersUnsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const fetchedUsers: UserProfile[] = snapshot.docs.map((d) => ({
          uid: d.id,
          ...d.data(),
        })) as UserProfile[];

        setUsers(fetchedUsers);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load real Firebase users:', err);
        setError('Unable to sync members from Firebase.');
        setLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, 'users');
        } catch {
          // Handled
        }
      }
    );

    return () => usersUnsubscribe();
  }, []);

  // 2. Fetch relationships where current user is the initiator (userId == currentUserId)
  useEffect(() => {
    const activeUid = auth.currentUser?.uid || currentUserId;
    if (!activeUid || !auth.currentUser) return;

    const relQuery = query(
      collection(db, 'relationships'),
      where('userId', '==', auth.currentUser.uid)
    );

    const relUnsubscribe = onSnapshot(
      relQuery,
      (snapshot) => {
        const rels: Relationship[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Relationship[];
        setMyRelationships(rels);
      },
      (err) => {
        console.error('Failed to load my relationships:', err);
        try {
          handleFirestoreError(err, OperationType.LIST, 'relationships');
        } catch {
          // Handled
        }
      }
    );

    return () => relUnsubscribe();
  }, [currentUserId]);

  // 3. Fetch relationships where current user is the target (targetUserId == currentUserId)
  useEffect(() => {
    const activeUid = auth.currentUser?.uid || currentUserId;
    if (!activeUid || !auth.currentUser) return;

    const incomingQuery = query(
      collection(db, 'relationships'),
      where('targetUserId', '==', auth.currentUser.uid)
    );

    const incomingUnsubscribe = onSnapshot(
      incomingQuery,
      (snapshot) => {
        const rels: Relationship[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Relationship[];
        setIncomingRelationships(rels);
      },
      (err) => {
        console.error('Failed to load incoming relationships:', err);
        try {
          handleFirestoreError(err, OperationType.LIST, 'relationships');
        } catch {
          // Handled
        }
      }
    );

    return () => incomingUnsubscribe();
  }, [currentUserId]);

  // Set of target user UIDs the current user has related to
  const relatedTargetIds = useMemo(() => {
    return new Set(myRelationships.map((r) => r.targetUserId));
  }, [myRelationships]);

  // Set of user UIDs who have related to the current user
  const incomingUserIds = useMemo(() => {
    return new Set(incomingRelationships.map((r) => r.userId));
  }, [incomingRelationships]);

  // Filter out the current user (Requirement 9: Users must not be able to relate to themselves)
  // Only real Firebase users appear (Requirement 1 & 3 & 4 & 5)
  const otherRealUsers = useMemo(() => {
    const activeUid = auth.currentUser?.uid || currentUserId;
    return users.filter((u) => u.uid !== activeUid);
  }, [users, currentUserId]);

  // Filter users based on active tab and search query
  const filteredUsers = useMemo(() => {
    // Filter out users who are blocked or have blocked current user
    let list = otherRealUsers.filter(u => !blockedUids.includes(u.uid) && !blockedByUids.includes(u.uid));

    if (filterTab === 'related') {
      list = list.filter((u) => relatedTargetIds.has(u.uid));
    } else if (filterTab === 'incoming') {
      list = list.filter((u) => incomingUserIds.has(u.uid));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((u) => {
        const nameMatch = u.displayName?.toLowerCase().includes(q);
        const emailMatch = u.email?.toLowerCase().includes(q);
        return nameMatch || emailMatch;
      });
    }

    return list;
  }, [otherRealUsers, filterTab, searchQuery, relatedTargetIds, incomingUserIds, blockedUids, blockedByUids]);

  const handleRelate = async (targetUser: UserProfile) => {
    const activeUid = auth.currentUser?.uid || currentUserId;
    if (!activeUid) {
      setError('You must be signed in to relate to users.');
      return;
    }

    if (targetUser.uid === activeUid) {
      setError('You cannot relate to yourself.');
      return;
    }

    if (blockedUids.includes(targetUser.uid) || blockedByUids.includes(targetUser.uid)) {
      setError('Cannot relate to this member. Account interaction between you and this member has been restricted.');
      return;
    }

    setActionInProgress(targetUser.uid);
    setError(null);
    setActionNotice(null);

    const relationshipDocId = `${activeUid}_${targetUser.uid}`;

    try {
      const senderNameResolved = currentUserName || auth.currentUser?.displayName || currentUserEmail.split('@')[0];

      // 1. Save the relationship in Firebase first
      await setDoc(doc(db, 'relationships', relationshipDocId), {
        id: relationshipDocId,
        userId: activeUid,
        targetUserId: targetUser.uid,
        targetUserName: targetUser.displayName || targetUser.email.split('@')[0],
        targetUserEmail: targetUser.email || '',
        createdAt: new Date().toISOString(),
      });

      // 2. Create real notification for recipient with customId to prevent duplicate notifications
      await sendNotification({
        recipientUid: targetUser.uid,
        senderUid: activeUid,
        senderName: senderNameResolved,
        type: 'relate',
        title: 'New Relate Connection',
        body: `${senderNameResolved} connected with you on TEZOCRON Relate.`,
        targetUid: activeUid,
        customId: `relate_${activeUid}_${targetUser.uid}`,
      }).catch(err => console.warn('Notification send warning:', err));

      setActionNotice(`You are now related to ${targetUser.displayName || 'this user'}.`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error('Relate action error:', err);
      setError('Failed to establish relation. Please try again.');
      try {
        handleFirestoreError(err, OperationType.CREATE, `relationships/${relationshipDocId}`);
      } catch {
        // Logged
      }
    } finally {
      setActionInProgress(null);
    }
  };

  // Requirement 7: When user taps Unrelate, remove relationship from Firebase
  const handleUnrelate = async (targetUserId: string, targetUserName?: string) => {
    const activeUid = auth.currentUser?.uid || currentUserId;
    if (!activeUid) return;

    setActionInProgress(targetUserId);
    setError(null);
    setActionNotice(null);

    const relationshipDocId = `${activeUid}_${targetUserId}`;

    try {
      await deleteDoc(doc(db, 'relationships', relationshipDocId));
      setActionNotice(`You have unrelated from ${targetUserName || 'this user'}.`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error('Unrelate action error:', err);
      setError('Failed to remove relation. Please try again.');
      try {
        handleFirestoreError(err, OperationType.DELETE, `relationships/${relationshipDocId}`);
      } catch {
        // Logged
      }
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header Banner with TEZOCRON Blue, White, and Pink Identity */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600/10 via-pink-500/10 to-transparent border border-blue-100/80 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              TEZOCRON Relate
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-400">
              Verified Network
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
            Discover and connect with authentic TEZOCRON members. Build mutual bonds and view live connection statuses across the platform.
          </p>
        </div>

        {/* Real Dynamic Stats (Pure counts of real Firestore items, no fake stats) */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
              You Relate To
            </span>
            <span className="text-base font-black text-blue-600 dark:text-blue-400">
              {myRelationships.length}
            </span>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
              Relating To You
            </span>
            <span className="text-base font-black text-pink-600 dark:text-pink-400">
              {incomingRelationships.length}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications & Error Alerts */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
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

      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Users Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            id="relate-search-users-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search real members by name or email..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs transition"
          />
          {searchQuery && (
            <button
              type="button"
              id="btn-clear-relate-search"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 self-start sm:self-auto">
          <button
            type="button"
            id="tab-filter-all"
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterTab === 'all'
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Discover ({otherRealUsers.length})
          </button>
          <button
            type="button"
            id="tab-filter-related"
            onClick={() => setFilterTab('related')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterTab === 'related'
                ? 'bg-white dark:bg-zinc-900 text-pink-600 dark:text-pink-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Related ({myRelationships.length})
          </button>
          <button
            type="button"
            id="tab-filter-incoming"
            onClick={() => setFilterTab('incoming')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterTab === 'incoming'
                ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Relating to You ({incomingRelationships.length})
          </button>
        </div>
      </div>

      {/* Profile Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-400 text-xs space-y-2">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p>Syncing verified TEZOCRON users from Firebase...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        /* Zero Fake Data: True Authentic Empty States */
        <div 
          id="relate-empty-state" 
          className="p-10 rounded-3xl bg-white/95 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 text-center space-y-3"
        >
          <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-blue-50 to-pink-50 dark:from-blue-950/40 dark:to-pink-950/40 border border-blue-100 dark:border-zinc-800 flex items-center justify-center text-pink-600 dark:text-pink-400 shadow-xs">
            <Users className="w-7 h-7" />
          </div>
          
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            {searchQuery 
              ? `No members found matching "${searchQuery}"`
              : filterTab === 'related' 
                ? 'You have not related to any users yet'
                : filterTab === 'incoming'
                  ? 'No members have related to you yet'
                  : 'No other registered TEZOCRON members yet'}
          </h3>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            {searchQuery 
              ? 'Try searching with a different name or full email address.'
              : filterTab === 'related'
                ? 'Switch to the Discover tab to browse registered users and tap Relate to connect.'
                : filterTab === 'incoming'
                  ? 'Share your TEZOCRON profile or post in Social Chat so other members can discover and relate to you.'
                  : 'To test relating with real Firebase accounts, create or sign in to a second account in a private/incognito window. Only authentic Firebase-authenticated users will appear here.'}
          </p>

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-200 transition cursor-pointer"
            >
              Clear Search Query
            </button>
          )}
        </div>
      ) : (
        <div 
          id="relate-user-cards-grid" 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredUsers.map((user) => {
            const isRelated = relatedTargetIds.has(user.uid);
            const relatesToMe = incomingUserIds.has(user.uid);
            const isMutual = isRelated && relatesToMe;
            const isBusy = actionInProgress === user.uid;

            // Formatted date from real user profile
            const joinedDate = user.createdAt 
              ? new Date(user.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' })
              : 'Registered member';

            return (
              <div
                key={user.uid}
                id={`user-card-${user.uid}`}
                className="bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Accent top gradient highlight */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-pink-500 to-blue-400 opacity-60 group-hover:opacity-100 transition" />

                <div>
                  {/* Top card bar: Avatar & Relation Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    
                    {/* Profile Picture (clickable) */}
                    <div 
                      onClick={() => onOpenProfile && onOpenProfile(user.uid)}
                      className="relative shrink-0 cursor-pointer group/avatar"
                      title="View member profile"
                    >
                      {user.photoURL && (user.photoURL.startsWith('http') || user.photoURL.startsWith('data:image')) ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User profile'}
                          className="w-13 h-13 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 shadow-xs group-hover/avatar:ring-2 group-hover/avatar:ring-pink-500 transition"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-pink-500 p-0.5 shadow-md shadow-blue-500/10 flex items-center justify-center group-hover/avatar:scale-105 transition">
                          <div className="w-full h-full rounded-[14px] bg-white dark:bg-zinc-900 flex items-center justify-center text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-pink-600">
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}

                      {/* Online/Verified indicator */}
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-xs" title="Verified Account">
                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                      </span>
                    </div>

                    {/* Relation status badges */}
                    <div className="flex flex-col items-end gap-1">
                      {isMutual ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-400 border border-pink-200 dark:border-pink-900/60 shadow-2xs">
                          Mutual Relate
                        </span>
                      ) : isRelated ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 shadow-2xs">
                          Related
                        </span>
                      ) : relatesToMe ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60 shadow-2xs">
                          Relates to You
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Member
                        </span>
                      )}
                    </div>
                  </div>

                  {/* User Name & Details */}
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => onOpenProfile && onOpenProfile(user.uid)}
                      className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate block text-left hover:text-pink-600 dark:hover:text-pink-400 transition cursor-pointer"
                    >
                      {user.displayName || 'TEZOCRON Member'}
                    </button>
                    
                    {/* Privacy-aware email display */}
                    {user.privacySettings?.emailVisibility === 'private' || 
                     (user.privacySettings?.emailVisibility === 'related' && !isRelated && !isMutual) ? (
                      <span className="text-[11px] text-zinc-400 italic block mt-0.5">
                        Email hidden by privacy settings
                      </span>
                    ) : (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate block mt-0.5">
                        {user.email}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Joined {joinedDate}</span>
                      </div>

                      {onOpenProfile && (
                        <button
                          type="button"
                          onClick={() => onOpenProfile(user.uid)}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-pink-600 dark:hover:text-pink-400 cursor-pointer"
                        >
                          View Profile
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Controls: Relate / Unrelate & Message */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2">
                  
                  {/* Relate / Unrelate Button */}
                  {isRelated ? (
                    /* Requirement 7: Option to Unrelate */
                    <button
                      type="button"
                      id={`btn-unrelate-${user.uid}`}
                      disabled={isBusy}
                      onClick={() => handleUnrelate(user.uid, user.displayName)}
                      className="flex-1 py-2 px-3 rounded-2xl border border-pink-200 dark:border-pink-900/70 bg-pink-50/70 hover:bg-rose-50 text-pink-700 hover:text-rose-700 dark:bg-pink-950/30 dark:text-pink-300 dark:hover:bg-rose-950/50 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                      title="Tap to Unrelate from this user"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                      <span>Unrelate</span>
                    </button>
                  ) : (
                    /* Requirement 6: Relate Button */
                    <button
                      type="button"
                      id={`btn-relate-${user.uid}`}
                      disabled={isBusy}
                      onClick={() => handleRelate(user)}
                      className="flex-1 py-2 px-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-pink-600 hover:opacity-95 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                      title="Relate to this user"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Relate</span>
                    </button>
                  )}

                  {/* Send Direct Message Shortcut */}
                  {onNavigateToDM && (
                    <button
                      type="button"
                      id={`btn-message-${user.uid}`}
                      onClick={() => onNavigateToDM(user.email || user.uid)}
                      className="p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer shadow-xs"
                      title={`Send direct message to ${user.displayName || user.email}`}
                    >
                      <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
