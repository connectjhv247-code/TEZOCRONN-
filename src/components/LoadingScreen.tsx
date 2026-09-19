import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div 
      id="tezocron-loading-screen" 
      className="fixed inset-0 z-50 bg-gradient-to-b from-white via-blue-50/40 to-pink-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center justify-center p-6 select-none"
    >
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-pink-400/20 dark:bg-pink-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Main brand card */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Animated Brand Emblem */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-blue-500 to-pink-500 p-0.5 shadow-2xl shadow-blue-500/30 flex items-center justify-center">
            <div className="w-full h-full rounded-[22px] bg-white dark:bg-zinc-900 flex items-center justify-center">
              <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                TZ
              </span>
            </div>
          </div>
          <div className="absolute -top-1 -right-1 p-1 bg-pink-500 text-white rounded-full shadow-md animate-bounce">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Brand Titles */}
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-1.5">
          TEZOCRON
        </h1>
        <div className="flex items-center gap-2 mb-6">
          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
            JMP
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Jaz media parustarta
          </span>
        </div>

        {/* Loading Spinner & Status */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 shadow-sm text-xs font-medium text-zinc-600 dark:text-zinc-300">
          <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
          <span>Authenticating workspace session...</span>
        </div>
      </div>
    </div>
  );
};
