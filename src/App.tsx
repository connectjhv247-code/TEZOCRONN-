import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { auth, db, testConnection } from './firebase';
import { AuthView } from './AuthView';
import { LoadingScreen } from './components/LoadingScreen';
import { SocialChat } from './components/SocialChat';
import { RelateView } from './components/RelateView';
import { DirectMessages } from './components/DirectMessages';
import { UserProfileModal } from './components/UserProfileModal';
import { AdditionalMenuModal, SystemMenuOption } from './components/AdditionalMenuModal';
import { SettingsView } from './components/SettingsView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { TermsOfServiceView } from './components/TermsOfServiceView';
import { FAQSupportView } from './components/FAQSupportView';
import { NotificationsView } from './components/NotificationsView';
import { PageTransition, modalZoomVariants, backdropVariants } from './components/PageTransition';
import { 
  MessageSquare, 
  HeartHandshake, 
  Send, 
  Menu, 
  LogOut, 
  Sparkles,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Bell,
  User as UserIcon
} from 'lucide-react';

type MainNavTab = 'social_chat' | 'relate' | 'dm' | 'notifications' | 'settings' | 'privacy' | 'terms' | 'faq';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ displayName?: string; role?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MainNavTab>('social_chat');
  const [selectedDmRecipient, setSelectedDmRecipient] = useState<string | undefined>(undefined);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    // Validate connection
    testConnection();

    // Listen to real Firebase Authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        
        // Listen to live updates on the current user profile document
        const unsubUserDoc = onSnapshot(userDocRef, async (snap: DocumentSnapshot) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as any);
          } else {
            const initialProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Member',
              photoURL: user.photoURL || '',
              createdAt: new Date().toISOString(),
              role: 'Member',
              privacySettings: {
                emailVisibility: 'related',
                bioVisibility: 'public',
                showRelateStatus: true,
              }
            };
            try {
              await setDoc(userDocRef, initialProfile, { merge: true });
              setUserProfile(initialProfile);
            } catch (err) {
              console.error('Initial profile creation error:', err);
            }
          }
          setAuthLoading(false);
        });

        return () => unsubUserDoc();
      } else {
        setUserProfile(null);
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setActiveTab('social_chat');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // 1. Initial Launch: Show TEZOCRON loading screen while Firebase verifies auth session
  if (authLoading) {
    return <LoadingScreen />;
  }

  // 2. Unauthenticated: Open Login/Create Account Screen directly
  // 6. Do not allow unauthenticated users to access private app features
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50/40 via-white to-pink-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md my-auto">
          <AuthView onSuccess={() => {
            // Callback triggers state update via onAuthStateChanged
          }} />
        </div>
      </div>
    );
  }

  // 3 & 4 & 5. Authenticated: TEZOCRON Home Screen (Modern social-media/chatting dashboard)
  const currentUserName = userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Member';
  const currentUserEmail = currentUser.email || '';

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans antialiased selection:bg-pink-500 selection:text-white">
      
      {/* Top Navigation Bar with TEZOCRON blue, white, and pink system */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-pink-500 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-white dark:bg-zinc-900 flex items-center justify-center">
                <span className="font-black text-sm bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                  TZ
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-lg tracking-tight text-zinc-900 dark:text-white">
                  TEZOCRON
                </h1>
                <span className="w-2 h-2 rounded-full bg-pink-500" />
              </div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                JMP (Jaz media parustarta)
              </p>
            </div>
          </div>

          {/* Center Navigation for Desktop: Social Chat, Relate, DM, Notifications */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60">
            <button
              type="button"
              id="nav-tab-social-chat"
              onClick={() => setActiveTab('social_chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'social_chat'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Social Chat</span>
            </button>

            <button
              type="button"
              id="nav-tab-relate"
              onClick={() => setActiveTab('relate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'relate'
                  ? 'bg-white dark:bg-zinc-900 text-pink-600 dark:text-pink-400 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <HeartHandshake className="w-4 h-4" />
              <span>Relate</span>
            </button>

            <button
              type="button"
              id="nav-tab-dm"
              onClick={() => setActiveTab('dm')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'dm'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>DM</span>
            </button>

            <button
              type="button"
              id="nav-tab-notifications"
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>
          </nav>

          {/* Right Action Controls: Additional Menu & Logout */}
          <div className="flex items-center gap-2">
            {/* Bell Icon Quick Button for Mobile / All screen sizes */}
            <button
              type="button"
              id="btn-quick-notifications"
              onClick={() => setActiveTab('notifications')}
              className={`p-2 rounded-2xl border transition cursor-pointer flex items-center justify-center ${
                activeTab === 'notifications'
                  ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500'
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Additional Menu button with modern TEZOCRON rounded design */}
            <button
              type="button"
              id="btn-open-additional-menu"
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-blue-50 to-pink-50 hover:from-blue-100 hover:to-pink-100 dark:from-blue-950/60 dark:to-pink-950/40 dark:hover:from-blue-900/60 dark:hover:to-pink-900/50 border border-blue-200/80 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              title="Open System Menu"
            >
              <Menu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Menu</span>
            </button>

            {/* Logout button */}
            <button
              type="button"
              id="btn-sign-out"
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div 
            id="logout-confirm-backdrop"
            onClick={() => setShowLogoutConfirm(false)}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={backdropVariants}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div 
              id="logout-confirm-modal"
              onClick={(e) => e.stopPropagation()}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={modalZoomVariants}
              className="w-full max-w-xs sm:max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden text-center space-y-4 my-auto"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
                <LogOut className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>

              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Confirm Log Out
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Are you sure you want to log out of your TEZOCRON account?
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  id="btn-cancel-logout"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 px-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-logout"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    handleSignOut();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md shadow-rose-500/20 cursor-pointer"
                >
                  Confirm Log Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dashboard Canvas */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
        
        {/* Back navigation pill if viewing a menu page (Settings, Privacy, Terms, FAQ, Notifications) */}
        {activeTab !== 'social_chat' && activeTab !== 'relate' && activeTab !== 'dm' && (
          <div className="mb-4">
            <button
              type="button"
              id="btn-back-to-social"
              onClick={() => setActiveTab('social_chat')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer shadow-xs active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Social Chat</span>
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Tab 1: Social Chat Screen */}
          {activeTab === 'social_chat' && (
            <PageTransition keyId="social_chat">
              <SocialChat
                currentUserId={currentUser.uid}
                currentUserName={currentUserName}
                currentUserEmail={currentUserEmail}
                onOpenProfile={(uid) => setProfileModalUserId(uid)}
                onNavigateToDM={(recipientUid) => {
                  setSelectedDmRecipient(recipientUid);
                  setActiveTab('dm');
                }}
              />
            </PageTransition>
          )}

          {/* Tab 2: Relate Screen */}
          {activeTab === 'relate' && (
            <PageTransition keyId="relate">
              <RelateView
                currentUserId={currentUser.uid}
                currentUserName={currentUserName}
                currentUserEmail={currentUserEmail}
                onNavigateToDM={(recipient) => {
                  setSelectedDmRecipient(recipient);
                  setActiveTab('dm');
                }}
                onOpenProfile={(uid) => setProfileModalUserId(uid)}
              />
            </PageTransition>
          )}

          {/* Tab 3: DM Screen */}
          {activeTab === 'dm' && (
            <PageTransition keyId="dm">
              <DirectMessages
                currentUserId={currentUser.uid}
                currentUserName={currentUserName}
                currentUserEmail={currentUserEmail}
                initialRecipient={selectedDmRecipient}
                onOpenProfile={(uid) => setProfileModalUserId(uid)}
              />
            </PageTransition>
          )}

          {/* Tab 4: Notifications Screen */}
          {activeTab === 'notifications' && (
            <PageTransition keyId="notifications">
              <NotificationsView
                currentUserId={currentUser.uid}
                onNavigateToDM={(recipient) => {
                  setSelectedDmRecipient(recipient);
                  setActiveTab('dm');
                }}
                onOpenProfile={(uid) => setProfileModalUserId(uid)}
                onNavigateToRelate={() => setActiveTab('relate')}
              />
            </PageTransition>
          )}

          {/* Menu Option Screen 1: Settings */}
          {activeTab === 'settings' && (
            <PageTransition keyId="settings">
              <SettingsView
                currentUser={currentUser}
                currentUserName={currentUserName}
                onUpdateName={(newName) => {
                  setUserProfile((prev) => ({
                    displayName: newName,
                    role: prev?.role || 'Member',
                  }));
                }}
              />
            </PageTransition>
          )}

          {/* Menu Option Screen 2: Privacy Policy */}
          {activeTab === 'privacy' && (
            <PageTransition keyId="privacy">
              <PrivacyPolicyView />
            </PageTransition>
          )}

          {/* Menu Option Screen 3: Terms of Service */}
          {activeTab === 'terms' && (
            <PageTransition keyId="terms">
              <TermsOfServiceView />
            </PageTransition>
          )}

          {/* Menu Option Screen 4: FAQ & Support */}
          {activeTab === 'faq' && (
            <PageTransition keyId="faq">
              <FAQSupportView currentUserEmail={currentUserEmail} />
            </PageTransition>
          )}
        </AnimatePresence>
      </main>

      {/* Additional Menu Modal */}
      <AnimatePresence>
        {menuOpen && (
          <AdditionalMenuModal
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            userName={currentUserName}
            userEmail={currentUserEmail}
            onOpenProfile={() => setProfileModalUserId(currentUser.uid)}
            onSelectOption={(option: SystemMenuOption) => {
              setMenuOpen(false);
              if (option === 'logout') {
                setShowLogoutConfirm(true);
              } else if (option === 'settings') {
                setActiveTab('settings');
              } else if (option === 'notifications') {
                setActiveTab('notifications');
              } else if (option === 'privacy') {
                setActiveTab('privacy');
              } else if (option === 'terms') {
                setActiveTab('terms');
              } else if (option === 'faq') {
                setActiveTab('faq');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Real User Profile Modal */}
      <AnimatePresence>
        {Boolean(profileModalUserId) && (
          <UserProfileModal
            isOpen={Boolean(profileModalUserId)}
            onClose={() => setProfileModalUserId(null)}
            userId={profileModalUserId}
            currentUserId={currentUser.uid}
            currentUserName={currentUserName}
            currentUserEmail={currentUserEmail}
            onNavigateToDM={(recipient) => {
              setSelectedDmRecipient(recipient);
              setActiveTab('dm');
            }}
            onProfileUpdated={(updated) => {
              if (updated.uid === currentUser.uid) {
                setUserProfile({
                  displayName: updated.displayName,
                  role: updated.role,
                });
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Mobile Navigation Bar at the bottom of the screen */}
      <div 
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-3 py-2.5 border-t border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg shadow-lg shadow-black/5"
      >
        <button
          type="button"
          id="mobile-nav-social-chat"
          onClick={() => setActiveTab('social_chat')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl text-[11px] font-bold transition cursor-pointer ${
            activeTab === 'social_chat'
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 shadow-xs'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span>Social Chat</span>
        </button>

        <button
          type="button"
          id="mobile-nav-relate"
          onClick={() => setActiveTab('relate')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl text-[11px] font-bold transition cursor-pointer ${
            activeTab === 'relate'
              ? 'text-pink-600 dark:text-pink-400 bg-pink-50/80 dark:bg-pink-950/60 shadow-xs'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <HeartHandshake className="w-5 h-5" />
          <span>Relate</span>
        </button>

        <button
          type="button"
          id="mobile-nav-dm"
          onClick={() => setActiveTab('dm')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl text-[11px] font-bold transition cursor-pointer ${
            activeTab === 'dm'
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 shadow-xs'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Send className="w-5 h-5" />
          <span>DM</span>
        </button>
      </div>
    </div>
  );
}
