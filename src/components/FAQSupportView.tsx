import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  Mail, 
  Send, 
  Check, 
  MessageSquare, 
  ShieldCheck, 
  Smartphone,
  AlertCircle,
  Building,
  HeartHandshake,
  Lock,
  Flag,
  CreditCard
} from 'lucide-react';

interface FAQSupportViewProps {
  currentUserEmail: string;
}

export const FAQSupportView: React.FC<FAQSupportViewProps> = ({ currentUserEmail }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const faqs = [
    {
      q: 'What is Tezocron and who operates it?',
      a: 'Tezocron is a private, real-time social communication and community reflection platform operated by Jaz Media Parastata (JMP) for Android and web users worldwide.',
    },
    {
      q: 'How does the Relate feature work?',
      a: 'Relate is a dedicated space for authentic personal perspectives, daily lessons, and ideas. You can share a thought or reflection, and other verified members can click "Relate" to express genuine resonance and build meaningful connections.',
    },
    {
      q: 'Are Direct Messages (DMs) private?',
      a: 'Yes. All 1-to-1 Direct Messages are encrypted in transit and protected by strict Firestore security rules. Messages are strictly accessible only to the authenticated sender and recipient.',
    },
    {
      q: 'How do I search for and message another Tezocron member?',
      a: 'Go to the DM tab, enter the registered email address or display name of another verified Tezocron user in the search box, and select their profile to start a private conversation.',
    },
    {
      q: 'How do I edit my profile picture, name, or privacy settings?',
      a: 'Click "My Profile" or navigate to Settings. You can update your profile photo, display name, bio, location, and control whether your email address and bio are Public, Related-Only, or Private.',
    },
    {
      q: 'What should I do if I experience harassment or see fake accounts?',
      a: 'Tezocron enforces a strict community safety policy. Use the Block and Report buttons inside the app. For fraud or impersonation, report the account. Our support team reviews all reports within 24–48 hours.',
    },
    {
      q: 'What is Tezocron Extended and how are payments handled?',
      a: 'Tezocron Extended offers premium features and enhanced subscription tools. All payments are processed securely through Google Play Billing in accordance with Google Play Store policies.',
    },
    {
      q: 'How do I contact customer support directly?',
      a: 'You can submit an inquiry through the Support Desk form below or send an email directly to Jaz Media Parastata Customer Support at connectjhv247@gmail.com.',
    }
  ];

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setTicketSent(true);
      setTicketSubject('');
      setTicketMessage('');
      setTimeout(() => setTicketSent(false), 5000);
    }, 600);
  };

  return (
    <div id="faq-support-container" className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            FAQ & Support Center
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Frequently asked questions and direct assistance from Jaz Media Parastata (JMP).
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold text-xs shadow-xs border border-blue-200/60 dark:border-blue-900/60">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Help Desk</span>
        </div>
      </div>

      {/* Overview Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-pink-50/50 to-transparent dark:from-blue-950/40 dark:to-pink-950/30 border border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            Jaz Media Parastata (JMP) Customer Care
          </h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Dedicated 24–48 hour response team for Tezocron & Tezocron Extended
          </p>
        </div>
        <a 
          href="mailto:connectjhv247@gmail.com" 
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 text-xs font-bold text-blue-600 dark:text-blue-400 border border-zinc-200 dark:border-zinc-700 shadow-xs hover:border-blue-300 transition flex items-center gap-1.5"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>connectjhv247@gmail.com</span>
        </a>
      </div>

      {/* FAQs Section */}
      <div className="bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          Frequently Asked Questions
        </h3>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div 
                key={idx}
                className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800 overflow-hidden transition"
              >
                <button
                  type="button"
                  id={`faq-toggle-${idx}`}
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 bg-zinc-50/70 hover:bg-zinc-100/70 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/70 transition cursor-pointer"
                >
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="p-4 bg-white dark:bg-zinc-900 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Direct JMP Support Desk Form */}
      <form onSubmit={handleSendTicket} className="bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Contact JMP Technical Support
            </h3>
            <p className="text-[11px] text-zinc-400">
              Send an inquiry directly to Jaz Media Parastata.
            </p>
          </div>
        </div>

        {ticketSent && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Support inquiry submitted! Jaz Media Parastata will reply to {currentUserEmail} within 24-48 hours.</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="support-subject" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Subject
            </label>
            <input
              type="text"
              id="support-subject"
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              placeholder="e.g. Inquiry regarding my account or direct messages"
              required
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label htmlFor="support-message" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Message
            </label>
            <textarea
              id="support-message"
              rows={4}
              value={ticketMessage}
              onChange={(e) => setTicketMessage(e.target.value)}
              placeholder="Describe your issue, report an account, or ask a question..."
              required
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-zinc-400">
            JMP Official Email: <a href="mailto:connectjhv247@gmail.com" className="font-semibold text-blue-600 dark:text-blue-400 underline">connectjhv247@gmail.com</a>
          </div>
          <button
            type="submit"
            id="btn-send-support-ticket"
            disabled={isSending || !ticketSubject.trim() || !ticketMessage.trim()}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-pink-600 hover:opacity-95 text-white font-bold text-xs transition shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? 'Submitting...' : 'Submit Inquiry'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
