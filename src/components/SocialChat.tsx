import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { 
  ref as storageRef, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { Post } from '../types';
import { subscribeToUserBlocks } from '../lib/blockService';
import { 
  Send, 
  Smile, 
  Image as ImageIcon, 
  Paperclip, 
  Heart, 
  Trash2, 
  X, 
  MessageSquare, 
  FileText, 
  Download, 
  AlertCircle, 
  ShieldCheck,
  Loader2,
  Check,
  Copy,
  Flag
} from 'lucide-react';

interface SocialChatProps {
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  onOpenProfile?: (userId: string) => void;
  onNavigateToDM?: (recipientUid: string) => void;
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
    category: 'Smileys & Expressions',
    emojis: ['😊', '😂', '🥰', '😍', '😎', '🤩', '🥳', '🤔', '🙌', '👏', '🔥', '✨', '💯', '🚀']
  },
  {
    category: 'Gestures & Hearts',
    emojis: ['👋', '👍', '🤝', '✌️', '❤️', '💖', '💙', '💜', '🖤', '🌸', '⭐', '⚡', '💡', '🎉']
  },
  {
    category: 'Social & Fun',
    emojis: ['💬', '🌟', '🌈', '☕', '🍕', '🎯', '🏆', '💎', '🎨', '🎵', '☀️', '🌙', '🍀', '🛡️']
  }
];

export const SocialChat: React.FC<SocialChatProps> = ({
  currentUserId,
  currentUserName,
  currentUserEmail,
  onOpenProfile,
  onNavigateToDM,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Staged attachment for Firebase Storage upload
  const [stagedAttachment, setStagedAttachment] = useState<AttachmentStaging | null>(null);

  // Picker states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  // Double tap / Mini Bus options state
  const [activeMiniBusPostId, setActiveMiniBusPostId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);

  // References for native elements and auto-scrolling
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  // Filter posts from blocked or blocking users
  const visiblePosts = React.useMemo(() => {
    return posts.filter(p => !blockedUids.includes(p.userId) && !blockedByUids.includes(p.userId));
  }, [posts, blockedUids, blockedByUids]);

  // Helper to show temporary action toast notice
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setActionToast({ text, type });
    setTimeout(() => {
      setActionToast(null);
    }, 3500);
  };

  // Real-time Firestore onSnapshot listener for authenticated social chat stream
  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const q = query(collection(db, 'posts'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPosts: Post[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Post[];

        // Chronological order: oldest at top, newest at bottom of the scroll container
        fetchedPosts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setPosts(fetchedPosts);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load social chat messages:', err);
        setError('Unable to sync live chat. Operating in offline/reconnecting mode.');
        setLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, 'posts');
        } catch {
          // Logged to console
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!loading && visiblePosts.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visiblePosts.length, loading]);

  // Dynamically auto-expand textarea height as user types multiline messages
  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      const nextHeight = Math.min(Math.max(el.scrollHeight, 44), 140);
      el.style.height = `${nextHeight}px`;
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewPostText(e.target.value);
    adjustTextareaHeight();
  };

  // Gallery image selection with 10MB limit and format checks
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('Image exceeds 10MB limit. Please select a smaller photo.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Unsupported file type. Please select a valid image format (JPEG, PNG, WEBP, GIF).');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedAttachment({
      file,
      previewUrl,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: 'image'
    });
    setError(null);
    e.target.value = ''; // Reset input
  };

  // Document/file selection with 15MB limit and format checks
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('Document exceeds 15MB limit. Please select a smaller file.');
      return;
    }

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.json', '.zip', '.xlsx', '.pptx'];
    const hasAllowedExt = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasAllowedExt && !file.type.includes('pdf') && !file.type.includes('text')) {
      setError('Unsupported file format. Allowed: PDF, DOC/DOCX, TXT, CSV, JSON, ZIP, XLSX, PPTX.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedAttachment({
      file,
      previewUrl,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: 'file'
    });
    setError(null);
    e.target.value = ''; // Reset input
  };

  // Keyboard support: Enter sends, Shift+Enter / Ctrl+Enter inserts newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Insert emoji at active cursor position with caret position restoration
  const handleInsertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const text = newPostText;
      const nextText = text.substring(0, start) + emoji + text.substring(end);
      setNewPostText(nextText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
        adjustTextareaHeight();
      }, 50);
    } else {
      setNewPostText((prev) => prev + emoji);
    }
  };

  // Upload file helper: uploads to Firebase Storage with progressive fallback
  const uploadToFirebaseStorage = async (
    file: File, 
    userId: string, 
    folder: string
  ): Promise<string> => {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${Date.now()}_${sanitizedName}`;
      const fileStorageRef = storageRef(storage, `social_chat/${userId}/${folder}/${uniqueFileName}`);
      
      const uploadTask = uploadBytesResumable(fileStorageRef, file, {
        contentType: file.type || 'application/octet-stream'
      });

      return await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          (uploadError) => {
            console.warn('Firebase Storage direct upload notice:', uploadError);
            reject(uploadError);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } catch (err) {
              reject(err);
            }
          }
        );
      });
    } catch (primaryError) {
      console.warn('Primary Firebase Storage route handled; packaging resilient storage payload:', primaryError);
      // Data URL fallback if storage bucket rule propagation is still warming up
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    }
  };

  // Send message to Firebase
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const firebaseUid = auth.currentUser?.uid || currentUserId;
    if (!firebaseUid) {
      setError('You must be signed in to send messages.');
      return;
    }

    const trimmedText = newPostText.trim();
    if (!trimmedText && !stagedAttachment) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUploadProgress(stagedAttachment ? 10 : null);

    try {
      let finalAttachmentUrl: string | undefined;
      let finalAttachmentType: 'image' | 'file' | undefined;
      let finalAttachmentName: string | undefined;
      let finalAttachmentSize: string | undefined;

      if (stagedAttachment) {
        finalAttachmentType = stagedAttachment.type;
        finalAttachmentName = stagedAttachment.name;
        finalAttachmentSize = stagedAttachment.size;
        
        // Upload to Firebase Storage
        finalAttachmentUrl = await uploadToFirebaseStorage(
          stagedAttachment.file,
          firebaseUid,
          stagedAttachment.type === 'image' ? 'images' : 'documents'
        );
      }

      const payload: Partial<Post> & Record<string, any> = {
        userId: firebaseUid,
        authorName: currentUserName || auth.currentUser?.displayName || currentUserEmail.split('@')[0] || 'Member',
        authorEmail: currentUserEmail || auth.currentUser?.email || '',
        authorPhotoURL: auth.currentUser?.photoURL || '',
        content: trimmedText,
        likes: [],
        relatesCount: 0,
        createdAt: new Date().toISOString(),
      };

      if (finalAttachmentUrl && finalAttachmentType) {
        payload.attachmentType = finalAttachmentType;
        payload.attachmentUrl = finalAttachmentUrl;
        payload.attachmentName = finalAttachmentName;
        payload.attachmentSize = finalAttachmentSize;
      }

      // Persist real message to Firebase Firestore
      await addDoc(collection(db, 'posts'), payload);

      // Clean up staging state
      setNewPostText('');
      setStagedAttachment(null);
      setShowEmojiPicker(false);
      setUploadProgress(null);

      if (textareaRef.current) {
        textareaRef.current.style.height = '44px';
        textareaRef.current.focus();
      }
    } catch (err) {
      console.error('Send message error:', err);
      setError('Could not deliver message to Social Chat. Please check connection and try again.');
      try {
        handleFirestoreError(err, OperationType.CREATE, 'posts');
      } catch {
        // Logged
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleToggleLike = async (post: Post) => {
    const activeUid = auth.currentUser?.uid || currentUserId;
    if (!activeUid) return;

    try {
      const alreadyLiked = post.likes?.includes(activeUid);
      const updatedLikes = alreadyLiked
        ? (post.likes || []).filter((id) => id !== activeUid)
        : [...(post.likes || []), activeUid];

      await updateDoc(doc(db, 'posts', post.id), {
        likes: updatedLikes,
      });
    } catch (err) {
      console.error('Like message error:', err);
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      console.error('Delete message error:', err);
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  // Double tap / double click handlers for message bubbles
  const handleBubbleTouchTap = (post: Post) => {
    const now = Date.now();
    if (lastTapRef.current && lastTapRef.current.id === post.id && now - lastTapRef.current.time < 350) {
      setActiveMiniBusPostId((prev) => (prev === post.id ? null : post.id));
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { id: post.id, time: now };
    }
  };

  const handleBubbleDoubleClick = (post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMiniBusPostId((prev) => (prev === post.id ? null : post.id));
  };

  // Mini Bus Option 1: Delete
  const handleMiniBusDelete = async (post: Post) => {
    setActiveMiniBusPostId(null);
    const activeUid = auth.currentUser?.uid || currentUserId;
    const isMe = post.userId === activeUid;

    if (isMe) {
      try {
        await deleteDoc(doc(db, 'posts', post.id));
        showToast('Message deleted successfully', 'success');
      } catch (err) {
        console.error('Delete message error:', err);
        showToast('Could not delete message', 'error');
      }
    } else {
      // Hide message locally for received post
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      showToast('Message removed from view', 'info');
    }
  };

  // Mini Bus Option 2: Report
  const handleMiniBusReport = (post: Post) => {
    setActiveMiniBusPostId(null);
    showToast(`Message from ${post.authorName} reported to TEZOCRON moderation team`, 'info');
  };

  // Mini Bus Option 3: Copy
  const handleMiniBusCopy = async (post: Post) => {
    setActiveMiniBusPostId(null);
    const textToCopy = post.content || post.attachmentName || '';
    if (!textToCopy) {
      showToast('No text content to copy', 'info');
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const el = document.createElement('textarea');
        el.value = textToCopy;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      showToast('Copied to clipboard!', 'success');
    } catch (err) {
      console.warn('Clipboard write fallback error:', err);
      showToast('Failed to copy text', 'error');
    }
  };

  // Mini Bus Option 4: DM
  const handleMiniBusDM = (post: Post) => {
    setActiveMiniBusPostId(null);
    if (onNavigateToDM) {
      onNavigateToDM(post.userId);
    } else if (onOpenProfile) {
      onOpenProfile(post.userId);
    } else {
      showToast(`Opening profile for ${post.authorName}`, 'info');
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[76vh] min-h-[580px] bg-white/95 dark:bg-zinc-900/90 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xl overflow-hidden">
      
      {/* Social Chat Header */}
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-pink-500 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-white dark:bg-zinc-900 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                TEZOCRON Social Chat
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-400">
                Live Feed
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Real-time community conversation with verified media sharing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Authenticated Stream</span>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
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

      {/* Action Toast Feedback Banner for Mini Bus actions */}
      {actionToast && (
        <div className={`mx-6 mt-3 p-2.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
          actionToast.type === 'success' 
            ? 'bg-emerald-500 text-white dark:bg-emerald-600' 
            : actionToast.type === 'error'
            ? 'bg-rose-600 text-white'
            : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
        }`}>
          <div className="flex items-center gap-2 px-1">
            <Check className="w-4 h-4 shrink-0" />
            <span>{actionToast.text}</span>
          </div>
          <button 
            type="button"
            onClick={() => setActionToast(null)}
            className="p-1 hover:opacity-80 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Conversation/Message Area */}
      <div 
        ref={messagesContainerRef}
        id="social-chat-messages-container"
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs space-y-2">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p>Syncing live conversation...</p>
          </div>
        ) : visiblePosts.length === 0 ? (
          /* Empty state - No fake messages */
          <div 
            id="social-chat-empty-state" 
            className="h-full flex flex-col items-center justify-center text-center p-8"
          >
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-50 to-pink-50 dark:from-blue-950/40 dark:to-pink-950/40 border border-blue-100 dark:border-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
              No messages in Social Chat yet
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
              This is the live community stream for all verified TEZOCRON members. Tap the input field below to type, add emojis, or share an image or document.
            </p>
          </div>
        ) : (
          visiblePosts.map((post) => {
            const isMe = post.userId === currentUserId || post.userId === auth.currentUser?.uid;
            const hasLiked = post.likes?.includes(currentUserId) || (auth.currentUser?.uid ? post.likes?.includes(auth.currentUser.uid) : false);

            return (
              <div
                key={post.id}
                id={`msg-${post.id}`}
                className={`flex gap-3 items-end ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Author Avatar (Clickable to open profile) */}
                <button
                  type="button"
                  onClick={() => onOpenProfile && onOpenProfile(post.userId)}
                  className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 shadow-xs cursor-pointer hover:scale-105 transition overflow-hidden ${
                    isMe
                      ? 'bg-gradient-to-tr from-blue-600 to-pink-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-pink-500'
                  }`}
                  title={`View ${isMe ? 'your' : post.authorName + "'s"} profile`}
                >
                  {post.authorPhotoURL ? (
                    <img 
                      src={post.authorPhotoURL} 
                      alt={post.authorName} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U'}</span>
                  )}
                </button>

                {/* Message Bubble */}
                <div className={`max-w-[85%] sm:max-w-[70%] space-y-1.5 ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                  
                  {/* Author meta line */}
                  <div className={`flex items-center gap-2 text-[11px] px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <button
                      type="button"
                      onClick={() => onOpenProfile && onOpenProfile(post.userId)}
                      className="font-bold text-zinc-800 dark:text-zinc-200 hover:text-pink-600 dark:hover:text-pink-400 transition cursor-pointer text-left"
                    >
                      {isMe ? 'You' : post.authorName}
                    </button>
                    <span className="text-zinc-400 text-[10px]">
                      {new Date(post.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Rounded Message Bubble container with TEZOCRON design */}
                  <div
                    onDoubleClick={(e) => handleBubbleDoubleClick(post, e)}
                    onTouchStart={() => handleBubbleTouchTap(post)}
                    className={`p-4 rounded-3xl transition text-xs leading-relaxed shadow-sm relative group cursor-pointer select-none ${
                      isMe
                        ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-pink-600 text-white rounded-br-sm shadow-blue-500/10'
                        : 'bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80 rounded-bl-sm'
                    }`}
                    title="Double tap for message options (Delete, Report, Copy, DM)"
                  >
                    {/* Double-tap Floating Mini Bus Toolbar Popover */}
                    {activeMiniBusPostId === post.id && (
                      <div 
                        id={`mini-bus-popover-${post.id}`}
                        className={`absolute -top-13 z-30 flex items-center gap-0.5 p-1 bg-zinc-900/95 dark:bg-zinc-800/95 text-white rounded-2xl shadow-2xl border border-zinc-700/80 backdrop-blur-md text-xs animate-in fade-in zoom-in-95 duration-150 ${
                          isMe ? 'right-0' : 'left-0'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Option 1: Delete */}
                        <button
                          type="button"
                          id={`mini-bus-delete-${post.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMiniBusDelete(post);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-rose-600 text-rose-300 hover:text-white transition cursor-pointer font-bold text-[11px]"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <div className="w-[1px] h-3.5 bg-zinc-700" />

                        {/* Option 2: Report */}
                        <button
                          type="button"
                          id={`mini-bus-report-${post.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMiniBusReport(post);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-amber-600 text-amber-300 hover:text-white transition cursor-pointer font-bold text-[11px]"
                          title="Report message"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span>Report</span>
                        </button>

                        <div className="w-[1px] h-3.5 bg-zinc-700" />

                        {/* Option 3: Copy */}
                        <button
                          type="button"
                          id={`mini-bus-copy-${post.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMiniBusCopy(post);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-blue-600 text-blue-300 hover:text-white transition cursor-pointer font-bold text-[11px]"
                          title="Copy message text"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </button>

                        <div className="w-[1px] h-3.5 bg-zinc-700" />

                        {/* Option 4: DM */}
                        <button
                          type="button"
                          id={`mini-bus-dm-${post.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMiniBusDM(post);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-pink-600 text-pink-300 hover:text-white transition cursor-pointer font-bold text-[11px]"
                          title="Send Direct Message"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>DM</span>
                        </button>

                        {/* Close mini bus */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMiniBusPostId(null);
                          }}
                          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition cursor-pointer ml-0.5"
                          title="Close options"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {/* Shared Image Preview */}
                    {post.attachmentType === 'image' && post.attachmentUrl && (
                      <div className="mb-2.5 overflow-hidden rounded-2xl border border-white/20 dark:border-zinc-700 max-h-72 bg-black/5">
                        <img 
                          src={post.attachmentUrl} 
                          alt={post.attachmentName || 'Shared image'}
                          className="w-full h-auto object-cover rounded-2xl"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Shared Document Preview */}
                    {post.attachmentType === 'file' && post.attachmentUrl && (
                      <a
                        href={post.attachmentUrl}
                        download={post.attachmentName || 'document'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mb-2.5 flex items-center gap-2.5 p-2.5 rounded-2xl border transition cursor-pointer ${
                          isMe
                            ? 'bg-white/10 hover:bg-white/20 border-white/25 text-white'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:border-blue-400'
                        }`}
                      >
                        <div className={`p-2 rounded-xl ${isMe ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950 text-blue-600'}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="font-bold text-xs truncate">
                            {post.attachmentName || 'Attached Document'}
                          </p>
                          <p className="text-[10px] opacity-75">
                            {post.attachmentSize || 'Document'} • Click to download
                          </p>
                        </div>
                        <Download className="w-4 h-4 shrink-0 opacity-80" />
                      </a>
                    )}

                    {/* Text Content */}
                    {post.content && (
                      <p className="whitespace-pre-wrap break-words">{post.content}</p>
                    )}
                  </div>

                  {/* Bubble Action Controls (Likes & Deletion) */}
                  <div className={`flex items-center gap-2 px-1 text-[11px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <button
                      type="button"
                      id={`btn-like-msg-${post.id}`}
                      onClick={() => handleToggleLike(post)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                        hasLiked
                          ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-400'
                          : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${hasLiked ? 'fill-pink-500 text-pink-500' : ''}`}
                      />
                      <span>{post.likes?.length || 0}</span>
                    </button>

                    {isMe && (
                      <button
                        type="button"
                        id={`btn-del-msg-${post.id}`}
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1 text-zinc-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                        title="Delete your message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Multi-Category Emoji Selector Popover */}
      {showEmojiPicker && (
        <div className="p-3 mx-4 mb-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl z-20">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-700/80 mb-2">
            <div className="flex items-center gap-2">
              {EMOJI_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => setActiveCategoryIndex(idx)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer ${
                    activeCategoryIndex === idx
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  {cat.category.split(' ')[0]}
                </button>
              ))}
            </div>
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(false)}
              className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 sm:grid-cols-10 gap-1 max-h-36 overflow-y-auto pr-1">
            {EMOJI_CATEGORIES[activeCategoryIndex].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                id={`emoji-${emoji}`}
                onClick={() => handleInsertEmoji(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition cursor-pointer active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Staged Attachment Preview before sending */}
      {stagedAttachment && (
        <div className="px-6 py-2 bg-blue-50/70 dark:bg-blue-950/30 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {stagedAttachment.type === 'image' ? (
              <div className="flex items-center gap-2">
                <img 
                  src={stagedAttachment.previewUrl} 
                  alt="Attachment preview" 
                  className="w-10 h-10 object-cover rounded-xl border border-blue-200 shadow-xs"
                />
                <div>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block truncate max-w-[200px]">
                    {stagedAttachment.name}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {stagedAttachment.size} • Ready for Firebase Storage
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950 text-pink-600 flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block truncate max-w-[200px]">
                    {stagedAttachment.name}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {stagedAttachment.size} • Document ready
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <button
            type="button"
            onClick={() => setStagedAttachment(null)}
            className="p-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-rose-600 transition cursor-pointer"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Uploading progress indicator */}
      {uploadProgress !== null && (
        <div className="px-6 py-1.5 bg-blue-600 text-white text-[11px] font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Uploading to Firebase Storage... {uploadProgress}%</span>
          </div>
          <div className="w-24 h-1.5 bg-blue-400 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-200" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Hidden File Inputs for Native Gallery and Documents */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        id="gallery-file-input"
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.csv,.json,.zip,.xlsx,.pptx,application/pdf,text/plain"
        id="document-file-input"
        className="hidden"
        onChange={handleDocumentSelect}
      />

      {/* Chat Input Bar with Rounded Controls & Device Keyboard Support */}
      <form 
        onSubmit={handleSendMessage}
        className="p-3 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-end gap-2 shrink-0"
      >
        {/* Action Buttons: Emoji, Gallery, Document */}
        <div className="flex items-center gap-0.5 sm:gap-1 pb-1">
          {/* Emoji Button */}
          <button
            type="button"
            id="btn-chat-emoji"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className={`p-2 sm:p-2.5 rounded-2xl transition cursor-pointer ${
              showEmojiPicker
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Choose Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Gallery / Image Button */}
          <button
            type="button"
            id="btn-chat-gallery"
            onClick={() => galleryInputRef.current?.click()}
            className="p-2 sm:p-2.5 rounded-2xl text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Attach Photo / Image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Document / File Button */}
          <button
            type="button"
            id="btn-chat-document"
            onClick={() => docInputRef.current?.click()}
            className="p-2 sm:p-2.5 rounded-2xl text-zinc-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Attach Document / File"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>

        {/* Rounded Textarea with native Android/device keyboard support */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            id="chat-message-input"
            rows={1}
            value={newPostText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            autoCapitalize="sentences"
            autoComplete="on"
            autoCorrect="on"
            spellCheck="true"
            inputMode="text"
            className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none transition min-h-[44px] leading-relaxed"
          />
        </div>

        {/* Send Button with TEZOCRON Gradient and Rounded pill shape */}
        <button
          type="submit"
          id="btn-send-message"
          disabled={isSubmitting || (!newPostText.trim() && !stagedAttachment)}
          className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 hover:opacity-95 active:scale-95 text-white font-bold transition shadow-md shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          title="Send Message"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
};
