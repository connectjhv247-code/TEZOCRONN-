import React from 'react';
import { ShieldCheck, Lock, Eye, Server, CheckCircle2, ShieldAlert, Mail, Building, Users, FileText, Database } from 'lucide-react';

export const PrivacyPolicyView: React.FC = () => {
  return (
    <div id="privacy-policy-container" className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            Privacy Policy for Tezocron
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Last Updated: September 17, 2026 • Company: Jaz Media Parastata (JMP)
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs shadow-xs border border-emerald-200/60 dark:border-emerald-900/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Privacy Verified</span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-6 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
        
        {/* Company Header Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-emerald-50/50 to-transparent dark:from-blue-950/40 dark:to-emerald-950/30 border border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              Jaz Media Parastata (JMP)
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              App Name: Tezocron / Tezocron Extended
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-xs">
            Data Protection Compliant
          </span>
        </div>

        {/* 1. INTRODUCTION & SCOPE */}
        <section className="space-y-1.5">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 shrink-0" />
            1. INTRODUCTION & SCOPE
          </h4>
          <p className="pl-6">
            At Tezocron (operated by Jaz Media Parastata / JMP), we respect your privacy and are committed to protecting your personal data. This Privacy Policy outlines how we collect, process, store, and safeguard your information when you use the Tezocron web and mobile application.
          </p>
        </section>

        {/* 2. INFORMATION WE COLLECT */}
        <section className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Eye className="w-4 h-4 text-pink-600 shrink-0" />
            2. INFORMATION WE COLLECT
          </h4>
          <p className="pl-6">
            We collect information that you directly provide when using Tezocron:
          </p>
          <ul className="list-disc pl-11 space-y-1 text-zinc-600 dark:text-zinc-300">
            <li><strong>Account Information:</strong> Display name, email address, unique user ID (UID), and profile picture.</li>
            <li><strong>User Profile Details:</strong> Bio/about text, location, and user-selected privacy preferences.</li>
            <li><strong>Direct Messaging (DMs):</strong> Private text messages, shared images, and document attachments sent between authenticated users.</li>
            <li><strong>Social Content:</strong> Public posts, comments, reactions, and Relate connections shared on Tezocron.</li>
          </ul>
        </section>

        {/* 3. HOW WE USE YOUR INFORMATION */}
        <section className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600 shrink-0" />
            3. HOW WE USE YOUR INFORMATION
          </h4>
          <p className="pl-6">
            Your data is processed strictly to operate and improve Tezocron:
          </p>
          <ul className="list-disc pl-11 space-y-1 text-zinc-600 dark:text-zinc-300">
            <li>Authenticate users and secure account sessions via Firebase Auth.</li>
            <li>Deliver real-time private 1-to-1 Direct Messaging.</li>
            <li>Facilitate the social community feed and Relate user connections.</li>
            <li>Enforce user-selected privacy controls (such as email visibility options).</li>
            <li>Review abuse or fraud reports to maintain community safety.</li>
          </ul>
        </section>

        {/* 4. DATA STORAGE & SECURITY */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600 shrink-0" />
            4. DATA STORAGE & SECURITY
          </h4>
          <p className="pl-6">
            All persistent data is hosted in Google Firebase Firestore and Firebase Storage with encrypted transport (TLS/SSL). Database access is controlled via server-enforced security rules. Private Direct Messages are scoped strictly to sender and recipient accounts.
          </p>
        </section>

        {/* 5. PRIVACY CONTROLS & VISIBILITY */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
            5. PRIVACY CONTROLS & VISIBILITY
          </h4>
          <p className="pl-6">
            Tezocron empowers you with explicit visibility controls in your Profile settings:
          </p>
          <ul className="list-disc pl-11 space-y-1 text-zinc-600 dark:text-zinc-300">
            <li><strong>Email Visibility:</strong> Choose whether your email is Public, visible only to Related members, or Private.</li>
            <li><strong>Bio Visibility:</strong> Control who can read your bio (Public, Related, or Private).</li>
            <li><strong>Relate Statistics:</strong> Toggle whether your connection counts are displayed publicly.</li>
          </ul>
        </section>

        {/* 6. THIRD-PARTY SERVICES */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600 shrink-0" />
            6. THIRD-PARTY SERVICES
          </h4>
          <p className="pl-6">
            We do not sell, rent, or trade your personal data to advertisers or third parties. We use trusted infrastructure providers (Google Firebase for cloud storage and Google Play Billing for subscription management) solely to provide the application service.
          </p>
        </section>

        {/* 7. COMMUNITY SAFETY & REPORTING */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            7. COMMUNITY SAFETY & REPORTING
          </h4>
          <p className="pl-6">
            If you encounter harassment, fake accounts, or inappropriate content, use the in-app Block and Report options. Reports are reviewed by Jaz Media Parastata within 24 to 48 hours. You can also contact support directly at <a href="mailto:connectjhv247@gmail.com" className="text-blue-600 dark:text-blue-400 font-semibold underline">connectjhv247@gmail.com</a>.
          </p>
        </section>

        {/* 8. YOUR DATA RIGHTS & DELETION */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            8. YOUR DATA RIGHTS & DELETION
          </h4>
          <p className="pl-6">
            You have the right to access, edit, or delete your personal data. You can edit your profile information directly within the app or delete your posts. To request full account deletion and data removal, email <a href="mailto:connectjhv247@gmail.com" className="text-blue-600 dark:text-blue-400 font-semibold underline">connectjhv247@gmail.com</a>.
          </p>
        </section>

        {/* 9. CONTACT US */}
        <section className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Mail className="w-4 h-4 text-pink-600 shrink-0" />
            9. CONTACT US
          </h4>
          <div className="pl-6 space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
            <p className="font-bold">Jaz Media Parastata (JMP)</p>
            <p className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
              <span>Privacy & Support Email:</span>
              <a href="mailto:connectjhv247@gmail.com" className="underline">connectjhv247@gmail.com</a>
            </p>
          </div>
        </section>

      </div>
    </div>
  );
};

