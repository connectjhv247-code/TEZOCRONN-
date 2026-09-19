import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc 
} from 'firebase/firestore';
import { 
  ref as storageRef, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { DirectMessage, UserProfile } from '../types';
import { sendNotification } from '../lib/notificationService';
import { subscribeToUserBlocks } from '../lib/blockService';
import { 
  MessageCircle, 
  Send, 
  User as UserIcon, 
  Search, 
  ShieldCheck, 
  ShieldAlert,
  AlertCircle,
  Smile,
  Image as ImageIcon,
  Paperclip,
  X,
  FileText,
  Download,
  Loader2,
  Check,
  Plus
} from 'lucide-react';

interface DirectMessagesProps {
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  initialRecipient?: string;
  onOpenProfile?: (identifier: string) => void;
}

interface AttachmentStaging {
  file: File;
  previewUrl: string;
  name: string;
  size: string;
  type: 'image' | 'file';
}

const EMOJI_CATEGORIES = [
  {
    category: 'Expressions',
    emojis: ['😊', '😂', '🥰', '😍', '😎', '🤩', '🥳', '🤔', '🙌', '👏', '🔥', '✨', '💯', '🚀']
  },
  {
    category: 'Hearts & Vibes',
    emojis: ['👋', '👍', '🤝', '✌️', '❤️', '💖', '💙', '💜', '🖤', '🌸', '⭐', '⚡', '💡', '🎉']
  },
  {
    category: 'Activity & Fun',
    emojis: ['💬', '🌟', '🌈', '☕', '🍕', '🎯', '🏆', '💎', '🎨', '🎵', '☀️', '🌙', '🍀', '🛡️']
  }
];

export const DirectMessages: React.FC<DirectMessagesProps> = ({
  currentUserId,
  currentUserName,
  currentUserEmail,
  initialRecipient,
  onOpenProfile,
}) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetRecipient, setTargetRecipient] = useState(initialRecipient || '');
  const [msgText, setMsgText] = useState('');
  const [selectedPeer, setSelectedPeer] = useState<string | null>(initialRecipient || null);
  const [error, setError] = useState<string | null>(null);

  // Emojis and attachments state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [stagedAttachment, setStagedAttachment] = useState<AttachmentStaging | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedPeer]);

  useEffect(() => {
    if (initialRecipient) {
      setSelectedPeer(initialRecipient);
    }
  }, [initialRecipient]);

  // Fetch registered Firebase users for quick user selection
  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersList: UserProfile[] = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        })) as UserProfile[];
        setRegisteredUsers(usersList);
      },
      (err) => {
        console.error('Error fetching registered users:', err);
      }
    );
    return () => unsubUsers();
  }, []);

  // Sync real Direct Messages from Firestore
  useEffect(() => {
    setLoading(true);
    setError(null);

    const activeUid = auth.currentUser?.uid || currentUserId;
    if (!activeUid || !auth.currentUser) {
      setLoading(false);
      return;
    }

    const sentQuery = query(
      collection(db, 'dms'),
      where('senderId', '==', auth.currentUser.uid)
    );

    const receivedQuery = query(
      collection(db, 'dms'),
      where('recipientId', '==', auth.currentUser.uid)
    );

    let sentMessages: DirectMessage[] = [];
    let receivedMessages: DirectMessage[] = [];

    const mergeAndSort = () => {
      const all = [...sentMessages, ...receivedMessages];
      const map = new Map<string, DirectMessage>();
      all.forEach((m) => map.set(m.id, m));
      const deduplicated = Array.from(map.values());
      deduplicated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(deduplicated);
      setLoading(false);
    };

    const unsubSent = onSnapshot(
      sentQuery,
      (snapshot) => {
        sentMessages = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as DirectMessage[];
        mergeAndSort();
      },
      (err) => {
        console.error('Sent DMs load error:', err);
        setError('Unable to sync sent direct messages.');
        setLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, 'dms');
        } catch {
          // Handled
        }
      }
    );

    const unsubReceived = onSnapshot(
      receivedQuery,
      (snapshot) => {
        receivedMessages = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as DirectMessage[];
        mergeAndSort();
      },
      (err) => {
        console.error('Received DMs load error:', err);
        setError('Unable to sync incoming direct messages.');
        setLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, 'dms');
        } catch {
          // Handled
        }
      }
    );

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [currentUserId]);

  // Extract unique conversation peers
  const activeUid = auth.currentUser?.uid || currentUserId;
  
  const conversationPeers = Array.from(
    new Set(
      messages.map((m) => {
        if (m.senderId === activeUid) {
          return m.recipientId || m.recipientEmail;
        }
        return m.senderId;
      })
    )
  );

  // Helper to format file sizes
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Convert file to Base64 data URL for inline preview & storage fallback
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file must be under 10MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedAttachment({
      file,
      previewUrl,
      name: file.name,
      size: formatFileSize(file.size),
      type: 'image',
    });
    setError(null);
  };

  const handleDocumentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('File must be smaller than 15MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedAttachment({
      file,
      previewUrl,
      name: file.name,
      size: formatFileSize(file.size),
      type: 'file',
    });
    setError(null);
  };

  const clearStagedAttachment = () => {
    if (stagedAttachment?.previewUrl) {
      URL.revokeObjectURL(stagedAttachment.previewUrl);
    }
    setStagedAttachment(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddEmoji = (emoji: string) => {
    setMsgText((prev) => prev + emoji);
  };

  // Block state
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const [blockedByUids, setBlockedByUids] = useState<string[]>([]);

  // Subscribe to real-time user blocks
  useEffect(() => {
    const activeUid = auth.currentUser?.uid || currentUserId;
    if (!activeUid || !auth.currentUser) return;

    const unsubBlocks = subscribeToUserBlocks(activeUid, ({ blockedUids: bu, blockedByUids: bbu }) => {
      setBlockedUids(bu);
      setBlockedByUids(bbu);
    });

    return () => unsubBlocks();
  }, [currentUserId]);

  const activePeerUser = React.useMemo(() => {
    if (!selectedPeer) return null;
    return registeredUsers.find(u => u.uid === selectedPeer || u.email.toLowerCase() === selectedPeer.toLowerCase()) || null;
  }, [selectedPeer, registeredUsers]);

  const activePeerUid = activePeerUser?.uid;
  const isPeerBlockedByMe = React.useMemo(() => Boolean(activePeerUid && blockedUids.includes(activePeerUid)), [activePeerUid, blockedUids]);
  const isPeerBlockedMe = React.useMemo(() => Boolean(activePeerUid && blockedByUids.includes(activePeerUid)), [activePeerUid, blockedByUids]);
  const isInteractionRestricted = React.useMemo(() => isPeerBlockedByMe || isPeerBlockedMe, [isPeerBlockedByMe, isPeerBlockedMe]);

  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = selectedPeer || targetRecipient.trim();
    if (!recipient || (!msgText.trim() && !stagedAttachment)) return;

    if (!activeUid) {
      setError('You must be signed in to send a direct message.');
      return;
    }

    if (isInteractionRestricted) {
      setError('Direct messaging unavailable. Account interaction between you and this member has been restricted.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let attachmentUrl: string | undefined = undefined;
    let attachmentType: 'image' | 'file' | undefined = undefined;
    let attachmentName: string | undefined = undefined;
    let attachmentSize: string | undefined = undefined;

    try {
      if (stagedAttachment) {
        attachmentType = stagedAttachment.type;
        attachmentName = stagedAttachment.name;
        attachmentSize = stagedAttachment.size;

        try {
          const fileRef = storageRef(
            storage, 
            `dms/${activeUid}_${Date.now()}_${stagedAttachment.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
          );
          const uploadTask = uploadBytesResumable(fileRef, stagedAttachment.file);

          attachmentUrl = await new Promise((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(Math.round(progress));
              },
              (err) => reject(err),
              async () => {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadUrl);
              }
            );
          });
        } catch (uploadErr) {
          console.warn('Storage upload fallback to Data URL:', uploadErr);
          attachmentUrl = await fileToDataUrl(stagedAttachment.file);
        }
      }

      // Resolve recipient details
      const targetUserObj = registeredUsers.find(u => u.uid === recipient || u.email === recipient);
      const resolvedRecipientId = targetUserObj ? targetUserObj.uid : recipient;
      const resolvedRecipientEmail = targetUserObj ? targetUserObj.email : recipient;

      const senderNameResolved = currentUserName || auth.currentUser?.displayName || currentUserEmail.split('@')[0];

      await addDoc(collection(db, 'dms'), {
        senderId: activeUid,
        senderName: senderNameResolved,
        recipientId: resolvedRecipientId,
        recipientEmail: resolvedRecipientEmail,
        participants: [activeUid, resolvedRecipientId],
        text: msgText.trim(),
        createdAt: new Date().toISOString(),
        read: false,
        ...(attachmentUrl && {
          attachmentType,
          attachmentUrl,
          attachmentName,
          attachmentSize
        })
      });

      // Send real notification event to recipient
      sendNotification({
        recipientUid: resolvedRecipientId,
        senderUid: activeUid,
        senderName: senderNameResolved,
        type: 'dm',
        title: 'New Direct Message',
        body: msgText.trim() ? `${senderNameResolved}: "${msgText.trim().slice(0, 60)}${msgText.trim().length > 60 ? '...' : ''}"` : `${senderNameResolved} sent you an attachment.`,
        targetUid: activeUid,
      }).catch(err => console.warn('Notification send warning:', err));

      setMsgText('');
      clearStagedAttachment();
      setShowEmojiPicker(false);
      setUploadProgress(null);

      if (!selectedPeer) {
        setSelectedPeer(resolvedRecipientId);
      }
    } catch (err) {
      console.error('Send DM error:', err);
      setError('Could not deliver direct message. Please try again.');
      try {
        handleFirestoreError(err, OperationType.CREATE, 'dms');
      } catch {
        // Handled
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter messages for active thread
  const activeConversation = selectedPeer
    ? messages.filter((m) => {
        return (
          (m.senderId === activeUid && (m.recipientId === selectedPeer || m.recipientEmail === selectedPeer)) ||
          (m.recipientId === activeUid && (m.senderId === selectedPeer || m.senderName === selectedPeer || m.recipientEmail === selectedPeer))
        );
      })
    : [];

  // Filtered users for user picker
  const filteredUsers = registeredUsers.filter(u => {
    if (u.uid === activeUid) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return u.displayName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
  });

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Sidebar: Conversations & User Search */}
      <div className="bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col h-[560px]">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Direct Messages
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Private conversations on TEZOCRON
          </p>
        </div>

        {/* Search registered users */}
        <div className="mb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              id="search-users-dm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user by name or email..."
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-zinc-900 dark:text-zinc-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Registered Users Filter List (When Searching) */}
        {searchQuery ? (
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Search Results
            </span>
            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs">
                No registered TEZOCRON user found matching "{searchQuery}"
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.uid}
                  type="button"
                  id={`btn-user-${user.uid}`}
                  onClick={() => {
                    setSelectedPeer(user.uid);
                    setSearchQuery('');
                  }}
                  className={`w-full p-3 rounded-2xl text-left flex items-center gap-3 transition cursor-pointer ${
                    selectedPeer === user.uid
                      ? 'bg-gradient-to-r from-blue-50 to-pink-50 dark:from-blue-950/50 dark:to-pink-950/30 border border-blue-200 dark:border-blue-900'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border border-transparent'
                  }`}
                >
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-pink-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      user.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate block">
                      {user.displayName}
                    </span>
                    <span className="text-[10px] text-zinc-400 truncate block">
                      {user.email}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          /* Active Conversations List */
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Active Conversations
            </span>
            {conversationPeers.length === 0 ? (
              <div 
                id="dm-conversations-empty" 
                className="py-12 text-center text-zinc-400 text-xs flex flex-col items-center justify-center h-4/5"
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">No active chats</p>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-[200px]">
                  Search for a user above to start messaging privately!
                </p>
              </div>
            ) : (
              conversationPeers.map((peerId) => {
                const peerUser = registeredUsers.find(u => u.uid === peerId || u.email === peerId);
                const displayName = peerUser?.displayName || peerId;
                const email = peerUser?.email || '';

                // Last message preview
                const threadMsgs = messages.filter(
                  m => (m.senderId === peerId || m.recipientId === peerId || m.recipientEmail === peerId)
                );
                const lastMsg = threadMsgs[threadMsgs.length - 1];

                return (
                  <button
                    key={peerId}
                    type="button"
                    id={`btn-chat-with-${peerId.replace(/[^a-zA-Z0-9]/g, '_')}`}
                    onClick={() => {
                      setSelectedPeer(peerId);
                    }}
                    className={`w-full p-3 rounded-2xl text-left flex items-center gap-3 transition cursor-pointer ${
                      selectedPeer === peerId
                        ? 'bg-gradient-to-r from-blue-50 to-pink-50 dark:from-blue-950/50 dark:to-pink-950/30 border border-blue-200 dark:border-blue-900'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border border-transparent'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-pink-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {peerUser?.photoURL ? (
                        <img src={peerUser.photoURL} alt={displayName} className="w-full h-full rounded-2xl object-cover" />
                      ) : (
                        displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                          {displayName}
                        </span>
                        {lastMsg && (
                          <span className="text-[9px] text-zinc-400 shrink-0">
                            {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 truncate block">
                        {lastMsg ? (lastMsg.attachmentType ? `[${lastMsg.attachmentType.toUpperCase()}] ${lastMsg.text || 'Shared attachment'}` : lastMsg.text) : 'Tap to open chat'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Main Right Stage: Chat Stage */}
      <div className="md:col-span-2 bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col h-[560px]">
        {/* Stage Header */}
        <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div>
            {selectedPeer ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenProfile?.(activePeerUser?.uid || selectedPeer)}
                  className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-pink-600 dark:hover:text-pink-400 transition cursor-pointer text-left flex items-center gap-2"
                  title="View user profile"
                >
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-pink-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {activePeerUser?.displayName ? activePeerUser.displayName.charAt(0).toUpperCase() : selectedPeer.charAt(0).toUpperCase()}
                  </div>
                  <span>{activePeerUser?.displayName || selectedPeer}</span>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full ml-1">
                    Profile
                  </span>
                </button>
              </div>
            ) : (
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Select a Chat
              </h3>
            )}
            <span className="text-[11px] text-zinc-400">
              {selectedPeer ? (activePeerUser?.email || 'Direct user thread') : 'Private end-to-end user exchange'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Encrypted Firestore</span>
          </div>
        </div>

        {error && (
          <div className="my-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
          {!selectedPeer ? (
            <div 
              id="dm-stage-empty" 
              className="h-full flex flex-col items-center justify-center text-center p-6"
            >
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-blue-50 to-pink-50 dark:from-blue-950/50 dark:to-pink-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 shadow-inner">
                <MessageCircle className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                Private Direct Messaging
              </p>
              <p className="text-xs text-zinc-400 max-w-xs mt-1 leading-relaxed">
                Select an existing conversation or search for a real user on TEZOCRON to start exchanging instant private messages.
              </p>
            </div>
          ) : activeConversation.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 text-xs">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2 text-zinc-400">
                <Smile className="w-5 h-5" />
              </div>
              <p className="font-medium">No messages in this conversation yet.</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Send a greeting below to start chatting!</p>
            </div>
          ) : (
            activeConversation.map((m) => {
              const isMe = m.senderId === activeUid;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-3xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-gradient-to-tr from-blue-600 to-pink-600 text-white rounded-br-xs shadow-md shadow-blue-500/10'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-xs'
                    }`}
                  >
                    {/* Attachment preview inside message bubble */}
                    {m.attachmentUrl && (
                      <div className="mb-2.5">
                        {m.attachmentType === 'image' ? (
                          <div className="rounded-2xl overflow-hidden max-h-60 bg-black/10">
                            <img
                              src={m.attachmentUrl}
                              alt={m.attachmentName || 'Shared photo'}
                              className="w-full h-auto object-cover max-h-60"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <a
                            href={m.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-3 p-2.5 rounded-2xl transition ${
                              isMe 
                                ? 'bg-white/20 hover:bg-white/30 text-white' 
                                : 'bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            <FileText className="w-5 h-5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs truncate">{m.attachmentName || 'Attachment File'}</p>
                              {m.attachmentSize && <p className="text-[10px] opacity-80">{m.attachmentSize}</p>}
                            </div>
                            <Download className="w-4 h-4 shrink-0" />
                          </a>
                        )}
                      </div>
                    )}

                    {m.text && <p className="whitespace-pre-wrap font-medium">{m.text}</p>}
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 px-1">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        {selectedPeer && (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 relative">
            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-3 left-0 z-50 bg-white dark:bg-zinc-900 rounded-3xl p-4 shadow-xl border border-zinc-200 dark:border-zinc-800 w-80 max-w-[calc(100vw-2rem)]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-pink-500" /> Choose Emoji
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-3 pr-1">
                  {EMOJI_CATEGORIES.map((cat) => (
                    <div key={cat.category}>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        {cat.category}
                      </span>
                      <div className="grid grid-cols-7 gap-1">
                        {cat.emojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleAddEmoji(emoji)}
                            className="w-8 h-8 flex items-center justify-center text-lg rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Staged Attachment Badge */}
            {stagedAttachment && (
              <div className="mb-3 p-2.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {stagedAttachment.type === 'image' ? (
                    <img
                      src={stagedAttachment.previewUrl}
                      alt="Attachment preview"
                      className="w-10 h-10 rounded-xl object-cover border border-blue-300 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {stagedAttachment.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {stagedAttachment.size} • Ready to send
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearStagedAttachment}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-rose-600 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Progress Indicator */}
            {isSubmitting && uploadProgress !== null && (
              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                  <span>Uploading attachment...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-pink-600 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {isInteractionRestricted ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-center space-y-1 shadow-xs">
                <div className="flex items-center justify-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Direct Messaging Unavailable</span>
                </div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400">
                  {isPeerBlockedByMe 
                    ? 'You have blocked this member. Unblock them in their profile to send messages.' 
                    : 'Account interaction between you and this member has been restricted.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendDM} className="flex items-center gap-2">
                {/* Emoji Button */}
                <button
                  type="button"
                  id="btn-dm-emoji"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2.5 rounded-2xl transition cursor-pointer shrink-0 ${
                    showEmojiPicker
                      ? 'bg-pink-100 dark:bg-pink-950 text-pink-600'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  title="Add Emojis"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Gallery / Image Button */}
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  id="btn-dm-gallery"
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer shrink-0"
                  title="Share Image"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* Document / File Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleDocumentFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  id="btn-dm-document"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer shrink-0"
                  title="Attach Document"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  id="dm-message-input"
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder={
                    activePeerUser 
                      ? `Message ${activePeerUser.displayName}...` 
                      : 'Write a private message...'
                  }
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  id="btn-send-dm"
                  disabled={isSubmitting || (!msgText.trim() && !stagedAttachment)}
                  className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 hover:opacity-95 text-white transition shadow-md shadow-blue-500/20 disabled:opacity-40 cursor-pointer shrink-0 flex items-center justify-center min-w-[42px]"
                  aria-label="Send direct message"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
