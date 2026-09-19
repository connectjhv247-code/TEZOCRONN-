import React from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  ShieldCheck, 
  FileText, 
  HelpCircle, 
  LogOut, 
  X, 
  ChevronRight,
  Bell,
  User as UserIcon
} from 'lucide-react';
import { modalZoomVariants, backdropVariants } from './PageTransition';

export type SystemMenuOption = 'settings' | 'notifications' | 'privacy' | 'terms' | 'faq' | 'logout';

interface AdditionalMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: SystemMenuOption) => void;
  userEmail?: string;
  userName?: string;
  onOpenProfile?: () => void;
}

export const AdditionalMenuModal: React.FC<AdditionalMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectOption,
  userEmail,
  userName,
  onOpenProfile,
}) => {
  if (!isOpen) return null;

  return (
    <motion.div 
      id="additional-menu-backdrop"
      onClick={onClose}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={backdropVariants}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <motion.div 
        id="additional-menu-modal"
        onClick={(e) => e.stopPropagation()}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={modalZoomVariants}
        className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl space-y-5 relative my-auto"
      >
        {/* Header with TEZOCRON logo and brand title */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-pink-500 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-[14px] bg-white dark:bg-zinc-900 flex items-center justify-center">
                <span className="font-black text-sm bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                  TZ
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                  TEZOCRON
                </h2>
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
              </div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                JMP (Jaz media parustarta)
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-additional-menu"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User preview chip - Clickable to view/edit user profile */}
        <div 
          id="menu-user-profile-card"
          onClick={() => {
            onClose();
            if (onOpenProfile) onOpenProfile();
          }}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-pink-50/40 to-transparent hover:from-blue-100/80 hover:to-pink-100/60 dark:from-zinc-800/80 dark:to-zinc-800/40 dark:hover:from-zinc-800 dark:hover:to-zinc-700/80 border border-blue-100/80 dark:border-zinc-700/80 transition cursor-pointer group shadow-xs active:scale-98"
          title="Click to view and edit your profile"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-pink-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                {userName || 'Member'}
              </p>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-400">
                View Profile
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
              {userEmail}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
        </div>

        {/* The system menu options */}
        <div className="space-y-2">
          {/* 1. Notifications */}
          <button
            type="button"
            id="menu-opt-notifications"
            onClick={() => onSelectOption('notifications')}
            className="w-full p-3.5 rounded-2xl flex items-center justify-between text-left bg-zinc-50/70 hover:bg-purple-50/80 dark:bg-zinc-800/40 dark:hover:bg-purple-950/40 border border-zinc-100 dark:border-zinc-800/80 hover:border-purple-200 dark:hover:border-purple-800 transition group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100/80 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors block">
                  Notifications
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  Relate requests, message alerts & system updates
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition" />
          </button>

          {/* 2. Settings */}
          <button
            type="button"
            id="menu-opt-settings"
            onClick={() => onSelectOption('settings')}
            className="w-full p-3.5 rounded-2xl flex items-center justify-between text-left bg-zinc-50/70 hover:bg-blue-50/80 dark:bg-zinc-800/40 dark:hover:bg-blue-950/40 border border-zinc-100 dark:border-zinc-800/80 hover:border-blue-200 dark:hover:border-blue-800 transition group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100/80 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors block">
                  Settings
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  Profile, alerts & data saver
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
          </button>

          {/* 3. Privacy Policy */}
          <button
            type="button"
            id="menu-opt-privacy-policy"
            onClick={() => onSelectOption('privacy')}
            className="w-full p-3.5 rounded-2xl flex items-center justify-between text-left bg-zinc-50/70 hover:bg-emerald-50/80 dark:bg-zinc-800/40 dark:hover:bg-emerald-950/40 border border-zinc-100 dark:border-zinc-800/80 hover:border-emerald-200 dark:hover:border-emerald-800 transition group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors block">
                  Privacy Policy
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  Data ownership & RBAC security
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
          </button>

          {/* 4. Terms of Service */}
          <button
            type="button"
            id="menu-opt-terms-of-service"
            onClick={() => onSelectOption('terms')}
            className="w-full p-3.5 rounded-2xl flex items-center justify-between text-left bg-zinc-50/70 hover:bg-pink-50/80 dark:bg-zinc-800/40 dark:hover:bg-pink-950/40 border border-zinc-100 dark:border-zinc-800/80 hover:border-pink-200 dark:hover:border-pink-800 transition group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-pink-100/80 dark:bg-pink-950 text-pink-600 dark:text-pink-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors block">
                  Terms of Service
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  Usage terms & community standards
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 group-hover:translate-x-0.5 transition" />
          </button>

          {/* 5. FAQ & Support */}
          <button
            type="button"
            id="menu-opt-faq-support"
            onClick={() => onSelectOption('faq')}
            className="w-full p-3.5 rounded-2xl flex items-center justify-between text-left bg-zinc-50/70 hover:bg-blue-50/80 dark:bg-zinc-800/40 dark:hover:bg-blue-950/40 border border-zinc-100 dark:border-zinc-800/80 hover:border-blue-200 dark:hover:border-blue-800 transition group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100/80 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors block">
                  FAQ & Support
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  Help center & JMP support desk
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
          </button>

          {/* 6. Logout */}
          <button
            type="button"
            id="menu-opt-logout"
            onClick={() => onSelectOption('logout')}
            className="w-full p-3.5 rounded-2xl flex items-center justify-between text-left bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 hover:border-rose-200 dark:hover:border-rose-800 transition group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block">
                  Logout
                </span>
                <span className="text-[10px] text-rose-600/70 dark:text-rose-400/70 block">
                  End current active session
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

