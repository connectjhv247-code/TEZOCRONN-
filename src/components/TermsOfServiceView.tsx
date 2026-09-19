import React from 'react';
import { FileText, ShieldAlert, CheckCircle, Scale, Building, Mail, AlertTriangle, ShieldCheck, Lock, CreditCard } from 'lucide-react';

export const TermsOfServiceView: React.FC = () => {
  return (
    <div id="terms-of-service-container" className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            Terms of Service for Tezocron
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Last Updated: September 17, 2026 • Company: Jaz Media Parastata (JMP)
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400 font-bold text-xs shadow-xs border border-pink-200/60 dark:border-pink-900/60">
          <Scale className="w-3.5 h-3.5" />
          <span>Official Terms</span>
        </div>
      </div>

      {/* Main Document Card */}
      <div className="bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-6 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
        
        {/* Company Header Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-pink-50/50 to-transparent dark:from-blue-950/40 dark:to-pink-950/30 border border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              Jaz Media Parastata (JMP)
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              App Name: Tezocron / Tezocron Extended
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-xs">
            Effective Sept 17, 2026
          </span>
        </div>

        {/* 1. ACCEPTANCE OF TERMS */}
        <section className="space-y-1.5">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
            1. ACCEPTANCE OF TERMS
          </h4>
          <p className="pl-6">
            By downloading, accessing, or using Tezocron Extended operated by Jaz Media Parastata, you agree to be bound by these Terms. If you do not agree, please do not use the App.
          </p>
        </section>

        {/* 2. ELIGIBILITY */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-pink-600 shrink-0" />
            2. ELIGIBILITY
          </h4>
          <p className="pl-6">
            You must be at least 16 years old to use Tezocron.
          </p>
        </section>

        {/* 3. ACCOUNT REGISTRATION */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 shrink-0" />
            3. ACCOUNT REGISTRATION
          </h4>
          <p className="pl-6">
            You must provide accurate information. You are responsible for keeping your password confidential and for all activity under your account.
          </p>
        </section>

        {/* 4. ACCEPTABLE USE */}
        <section className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            4. ACCEPTABLE USE
          </h4>
          <p className="pl-6">
            You agree not to:
          </p>
          <ul className="list-disc pl-11 space-y-1 text-zinc-600 dark:text-zinc-300">
            <li>Use the App for any unlawful purpose</li>
            <li>Harass, abuse, threaten, or harm another person</li>
            <li>Impersonate any person or entity or create fake accounts</li>
            <li>Upload viruses, malware, or spam</li>
            <li>Attempt to hack, scrape, or reverse-engineer the App</li>
            <li>Post sexual, nude, violent, or hateful content</li>
          </ul>
        </section>

        {/* 5. USER CONTENT */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            5. USER CONTENT
          </h4>
          <p className="pl-6">
            You retain ownership of content you post. By posting, you grant Jaz Media Parastata a non-exclusive, worldwide, royalty-free license to use, store, and display that content solely to operate and improve Tezocron. You are responsible for your content.
          </p>
        </section>

        {/* 6. COMMUNITY SAFETY */}
        <section className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            6. COMMUNITY SAFETY
          </h4>
          <p className="pl-6">
            If you experience abuse: Use the Block and Report buttons in the App. For fake accounts or fraud, use Report. If Block/Report does not work, contact customer care at <a href="mailto:connectjhv247@gmail.com" className="text-blue-600 dark:text-blue-400 font-semibold underline">connectjhv247@gmail.com</a>. We review all reports within 24-48 hours.
          </p>
        </section>

        {/* 7. INTELLECTUAL PROPERTY */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-pink-600 shrink-0" />
            7. INTELLECTUAL PROPERTY
          </h4>
          <p className="pl-6">
            The App design, logo, features, and original content are owned by Jaz Media Parastata (JMP) and protected by law. You may not copy or distribute any part without written permission.
          </p>
        </section>

        {/* 8. SUBSCRIPTIONS AND PAYMENTS */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-600 shrink-0" />
            8. SUBSCRIPTIONS AND PAYMENTS
          </h4>
          <p className="pl-6">
            Certain features require a paid subscription called Tezocron extended. All payments are processed by Google Play Billing. Prices are listed in the App and may change with notice. Subscriptions renew automatically unless canceled in Google Play Store before the renewal date. Refunds are handled according to Google Play policies.
          </p>
        </section>

        {/* 9. TERMINATION */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            9. TERMINATION
          </h4>
          <p className="pl-6">
            We may suspend or terminate your account if you violate these Terms. You may delete your account at any time.
          </p>
        </section>

        {/* 10. DISCLAIMERS */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
            10. DISCLAIMERS
          </h4>
          <p className="pl-6">
            The App is provided "as is" and "as available" without warranties of any kind.
          </p>
        </section>

        {/* 11. LIMITATION OF LIABILITY */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-600 shrink-0" />
            11. LIMITATION OF LIABILITY
          </h4>
          <p className="pl-6">
            To the maximum extent permitted by law, Jaz Media Parastata shall not be liable for any indirect or consequential damages arising from your use of the App.
          </p>
        </section>

        {/* 12. CHANGES TO TERMS */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-pink-600 shrink-0" />
            12. CHANGES TO TERMS
          </h4>
          <p className="pl-6">
            We may update these Terms. Continued use after changes means you accept the new Terms.
          </p>
        </section>

        {/* 13. GOVERNING LAW */}
        <section className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600 shrink-0" />
            13. GOVERNING LAW
          </h4>
          <p className="pl-6">
            These Terms are governed by the laws of the Federal Republic of Nigeria.
          </p>
        </section>

        {/* 14. CONTACT US */}
        <section className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Mail className="w-4 h-4 text-pink-600 shrink-0" />
            14. CONTACT US
          </h4>
          <div className="pl-6 space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
            <p className="font-bold">Jaz Media Parastata (JMP)</p>
            <p className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
              <span>Email:</span>
              <a href="mailto:connectjhv247@gmail.com" className="underline">connectjhv247@gmail.com</a>
            </p>
          </div>
        </section>

      </div>
    </div>
  );
};

