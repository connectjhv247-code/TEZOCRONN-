import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile 
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Loader2, 
  KeyRound, 
  ArrowLeft,
  CheckCircle2,
  Mail,
  Lock,
  User as UserIcon,
  Sparkles
} from 'lucide-react';

interface AuthViewProps {
  onSuccess?: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot_password';

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setResetSuccessMessage(null);
  };

  const switchMode = (newMode: AuthMode) => {
    clearMessages();
    setMode(newMode);
  };

  const handleSignInOrSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          throw new Error('Please enter your full name.');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: displayName.trim() });
        
        // Save initial user profile to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email || email.trim(),
          displayName: displayName.trim(),
          photoURL: '',
          bio: '',
          location: '',
          createdAt: new Date().toISOString(),
          role: 'Member',
          privacySettings: {
            emailVisibility: 'related',
            bioVisibility: 'public',
            showRelateStatus: true,
          }
        });
      } else if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Authentication error:', err);
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email address or password. Please verify your credentials.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters long.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address format.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Access temporarily disabled due to multiple failed login attempts. Please try again later or reset your password.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setError('Please enter your registered email address to receive a password reset link.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSuccessMessage(`Password reset link sent to ${email.trim()}. Please check your inbox and follow the instructions.`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      let msg = err.message || 'Failed to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No user account found with this email address.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address format.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearMessages();
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Upsert user profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'TEZOCRON User',
        createdAt: new Date().toISOString(),
        role: 'Member'
      }, { merge: true });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing authentication.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site.');
      } else {
        setError(err.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Container with TEZOCRON Blue, White, and Pink modern aesthetic */}
      <div className="relative p-7 sm:p-8 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl border border-blue-100 dark:border-zinc-800 shadow-xl shadow-blue-500/5 dark:shadow-none overflow-hidden">
        
        {/* Subtle Decorative Ambient Accents in Blue and Pink */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-pink-400/15 dark:bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-500/15 dark:bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-pink-500 text-white font-extrabold text-xl mb-3.5 shadow-lg shadow-blue-500/25 border-2 border-white/60 dark:border-zinc-800">
            TZ
          </div>
          
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            {mode === 'signin' && 'Sign in to TEZOCRON'}
            {mode === 'signup' && 'Create TEZOCRON Account'}
            {mode === 'forgot_password' && 'Reset Your Password'}
          </h2>
          
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 flex items-center justify-center gap-1.5">
            <span className="font-semibold text-blue-600 dark:text-blue-400">JMP</span>
            <span>•</span>
            <span>Jaz media parustarta</span>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div 
            id="auth-error-alert" 
            className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert (e.g. password reset) */}
        {resetSuccessMessage && (
          <div 
            id="auth-success-alert"
            className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed"
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
            <span>{resetSuccessMessage}</span>
          </div>
        )}

        {/* Forgot Password Screen View */}
        {mode === 'forgot_password' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4 relative">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Enter your registered account email and we'll send you a secure Firebase link to reset your password.
            </p>

            <div>
              <label htmlFor="auth-reset-email" className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  id="auth-reset-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-send-password-reset"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-[0.99] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Send Reset Link
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                id="btn-back-to-login"
                onClick={() => switchMode('signin')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          /* Sign In & Sign Up Screen View */
          <form onSubmit={handleSignInOrSignUp} className="space-y-4 relative">
            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-display-name" className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    id="auth-display-name"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Jaz Media User"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  id="auth-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password" className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    id="btn-forgot-password"
                    onClick={() => switchMode('forgot_password')}
                    className="text-xs font-medium text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 transition hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  id="auth-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Login Button with Blue/Pink Modern Accent */}
            <button
              type="submit"
              id="btn-auth-submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-blue-700 to-pink-600 hover:opacity-95 active:scale-[0.99] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'signup' ? (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Login to TEZOCRON
                </>
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        {mode !== 'forgot_password' && (
          <>
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200/80 dark:border-zinc-800" />
              </div>
              <span className="relative px-3 bg-white dark:bg-zinc-900 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Or
              </span>
            </div>

            {/* Continue with Google Option */}
            <button
              type="button"
              id="btn-auth-google"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-zinc-50 hover:bg-zinc-100/80 dark:bg-zinc-800 dark:hover:bg-zinc-750 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-medium rounded-xl flex items-center justify-center gap-2.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Toggle between Login and Registration */}
            <div className="mt-6 text-center text-xs text-zinc-600 dark:text-zinc-400">
              {mode === 'signup' ? (
                <p>
                  Already have a TEZOCRON account?{' '}
                  <button
                    type="button"
                    id="btn-toggle-to-signin"
                    onClick={() => switchMode('signin')}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    Login here
                  </button>
                </p>
              ) : (
                <p>
                  New to TEZOCRON?{' '}
                  <button
                    type="button"
                    id="btn-toggle-to-signup"
                    onClick={() => switchMode('signup')}
                    className="text-pink-600 dark:text-pink-400 font-bold hover:underline cursor-pointer"
                  >
                    Create an account
                  </button>
                </p>
              )}
            </div>
          </>
        )}

        {/* Security badge */}
        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>Secured with Firebase Authentication</span>
        </div>
      </div>
    </div>
  );
};
