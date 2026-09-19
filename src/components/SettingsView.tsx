import React, { useState } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  User as UserIcon, 
  Bell, 
  Shield, 
  Moon, 
  Sun, 
  Check, 
  Smartphone, 
  Save, 
  AlertCircle 
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: User | null;
  currentUserName: string;
  onUpdateName?: (newName: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  currentUserName,
  onUpdateName,
}) => {
  const [displayName, setDisplayName] = useState(currentUserName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // App notification and interaction preferences (stored in localStorage for immediate client persistence)
  const [notifyLikes, setNotifyLikes] = useState(() => {
    return localStorage.getItem('tezocron_notify_likes') !== 'false';
  });
  const [notifyDMs, setNotifyDMs] = useState(() => {
    return localStorage.getItem('tezocron_notify_dms') !== 'false';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('tezocron_sound') !== 'false';
  });
  const [dataSaver, setDataSaver] = useState(() => {
    return localStorage.getItem('tezocron_datasaver') === 'true';
  });

  const handleToggleLikes = () => {
    const next = !notifyLikes;
    setNotifyLikes(next);
    localStorage.setItem('tezocron_notify_likes', String(next));
  };

  const handleToggleDMs = () => {
    const next = !notifyDMs;
    setNotifyDMs(next);
    localStorage.setItem('tezocron_notify_dms', String(next));
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('tezocron_sound', String(next));
  };

  const handleToggleDataSaver = () => {
    const next = !dataSaver;
    setDataSaver(next);
    localStorage.setItem('tezocron_datasaver', String(next));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !displayName.trim()) return;
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(currentUser, {
        displayName: displayName.trim(),
      });

      // 2. Update Firestore user document
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: displayName.trim(),
      });

      if (onUpdateName) {
        onUpdateName(displayName.trim());
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Save profile error:', err);
      setError('Could not update profile. Please try again.');
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      } catch {
        // error captured
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="settings-view-container" className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            Account & App Settings
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your personal TEZOCRON profile, notifications, and application preferences.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold text-xs">
          Settings Active
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Profile changes updated across TEZOCRON.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Profile Customization */}
      <form onSubmit={handleSaveProfile} className="bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <UserIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Profile Identity
            </h3>
            <p className="text-[11px] text-zinc-400">
              Your public persona visible to others in Social Chat and Direct Messages.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="settings-display-name" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              id="settings-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              required
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label htmlFor="settings-email" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Email (Registered Account)
            </label>
            <input
              type="email"
              id="settings-email"
              value={currentUser?.email || ''}
              disabled
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-zinc-400 font-mono">
            UID: {currentUser?.uid}
          </div>
          <button
            type="submit"
            id="btn-save-settings-profile"
            disabled={isSaving || displayName.trim() === currentUserName}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs transition shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>

      {/* Section 2: Notifications Preferences */}
      <div className="bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Notification Preferences
            </h3>
            <p className="text-[11px] text-zinc-400">
              Control what activities alert you across TEZOCRON.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Direct Message Notifications
              </p>
              <p className="text-[11px] text-zinc-400">
                Receive visual alerts when other verified members message you.
              </p>
            </div>
            <button
              type="button"
              id="btn-toggle-dm-notifications"
              onClick={handleToggleDMs}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                notifyDMs ? 'bg-blue-600 justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Social Chat Reactions & Relates
              </p>
              <p className="text-[11px] text-zinc-400">
                Receive alerts when members like your posts or support your perspectives.
              </p>
            </div>
            <button
              type="button"
              id="btn-toggle-reactions-notifications"
              onClick={handleToggleLikes}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                notifyLikes ? 'bg-pink-600 justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Auditory Alerts & Sound FX
              </p>
              <p className="text-[11px] text-zinc-400">
                Play subtle auditory feedback on message delivery and reactions.
              </p>
            </div>
            <button
              type="button"
              id="btn-toggle-sound"
              onClick={handleToggleSound}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                soundEnabled ? 'bg-blue-600 justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Data & Connectivity */}
      <div className="bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Data & Mobile Optimization
            </h3>
            <p className="text-[11px] text-zinc-400">
              Settings tuned for mobile network bandwidth and battery efficiency.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Data Saver Mode
            </p>
            <p className="text-[11px] text-zinc-400">
              Optimizes Firestore payload bandwidth for mobile connectivity.
            </p>
          </div>
          <button
            type="button"
            id="btn-toggle-data-saver"
            onClick={handleToggleDataSaver}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
              dataSaver ? 'bg-blue-600 justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>
      </div>
    </div>
  );
};
